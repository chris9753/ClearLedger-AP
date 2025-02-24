import sys
import os
import shutil
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.middleware.cors import CORSMiddleware
import json
import uuid
from pathlib import Path
from glob import glob
from shutil import copyfile
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import FastAPI, UploadFile, File, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from config.logging_config import logger

from workflows.orchestrator import InvoiceProcessingWorkflow

app = FastAPI()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if (websocket in self.active_connections):
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {str(e)}")
                disconnected.append(connection)
        for connection in disconnected:
            self.disconnect(connection)

# Initialize connection manager
manager = ConnectionManager()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# File storage configuration
class StorageConfig:
    BASE_DIR = Path("data")
    RAW_DIR = BASE_DIR / "raw" / "invoices"
    PROCESSED_DIR = BASE_DIR / "processed"
    TEMP_DIR = BASE_DIR / "temp"
    ANOMALIES_FILE = PROCESSED_DIR / "anomalies.json"
    INVOICES_FILE = PROCESSED_DIR / "structured_invoices.json"

    @classmethod
    def initialize(cls):
        for directory in [cls.RAW_DIR, cls.PROCESSED_DIR, cls.TEMP_DIR]:
            directory.mkdir(parents=True, exist_ok=True)
        logger.info("Storage directories initialized")

    @classmethod
    def get_pdf_path(cls, invoice_id: str) -> Path:
        return cls.PROCESSED_DIR / f"{invoice_id}.pdf"

    @classmethod
    def get_temp_path(cls) -> Path:
        return cls.TEMP_DIR / f"{uuid.uuid4()}.pdf"

# Initialize storage
StorageConfig.initialize()

def process_invoice_and_save(pdf_content: bytes, invoice_id: str):
    pdf_path = StorageConfig.get_pdf_path(invoice_id)
    with open(pdf_path, "wb") as f:
        f.write(pdf_content)
    return {"invoice_id": invoice_id}

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.websocket("/ws/process_progress")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({
                "type": "progress",
                "message": f"Received: {data}"
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket)

async def broadcast_progress(message: dict):
    await manager.broadcast(message)

@app.post("/api/process_all_invoices")
async def process_all_invoices():
    pdf_dir = Path("data/raw/invoices")
    try:
        if not pdf_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Invoice directory not found: {pdf_dir}"
            )
        
        pdf_files = list(pdf_dir.glob("*.pdf"))
        if not pdf_files:
            return {
                "status": "completed",
                "message": "No PDF files found to process",
                "processed": 0
            }

        workflow = InvoiceProcessingWorkflow()
        total_files = len(pdf_files)
        processed = 0
        failed = 0

        for i, pdf_path in enumerate(pdf_files, 1):
            temp_path = Path(f"data/temp/{uuid.uuid4()}.pdf")
            try:
                shutil.copy2(pdf_path, temp_path)
                await manager.broadcast({
                    "type": "progress",
                    "current": i,
                    "total": total_files,
                    "failed": failed,
                    "currentFile": pdf_path.name
                })

                result = await workflow.process_invoice(str(temp_path), save_pdf=False)
                if result.get("status") == "error":
                    failed += 1
                    logger.error(f"Failed to process {pdf_path.name}: {result.get('message')}")
                else:
                    processed += 1
                    logger.info(f"Successfully processed {pdf_path.name}")

            except Exception as e:
                failed += 1
                logger.error(f"Error processing {pdf_path.name}: {str(e)}")
                await manager.broadcast({
                    "type": "error",
                    "file": pdf_path.name,
                    "error": str(e)
                })
            finally:
                if temp_path.exists():
                    temp_path.unlink()  # Delete temp file

        await manager.broadcast({
            "type": "complete",
            "message": f"Processed {processed} files, {failed} failed",
            "current": total_files,
            "total": total_files
        })

        return {
            "status": "completed",
            "message": f"Processed {processed} files, {failed} failed",
            "processed": processed,
            "failed": failed,
            "total": total_files
        }

    except Exception as e:
        logger.error(f"Error in batch processing: {str(e)}")
        return {
            "status": "error",
            "message": f"Batch processing failed: {str(e)}"
        }

def save_invoice(invoice_data: dict):
    try:
        os.makedirs(StorageConfig.INVOICES_FILE.parent, exist_ok=True)
        try:
            with StorageConfig.INVOICES_FILE.open('r') as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = []
        for idx, inv in enumerate(data):
            if inv.get('invoice_number') == invoice_data.get('invoice_number'):
                data[idx] = invoice_data
                break
        else:
            data.append(invoice_data)
        with StorageConfig.INVOICES_FILE.open('w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        logger.error(f"Error saving invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving invoice: {str(e)}")

def validate_pdf_content(content: bytes) -> tuple[bool, str]:
    if not content.startswith(b'%PDF-'):
        return False, "File does not start with PDF header"
    if not any(marker in content[-1024:] for marker in [b'%%EOF', b'%%EOF\n', b'%%EOF\r\n']):
        return False, "File is missing PDF end marker"
    return True, ""

def save_anomaly(anomaly_data: dict):
    try:
        os.makedirs(StorageConfig.PROCESSED_DIR, exist_ok=True)
        try:
            with StorageConfig.ANOMALIES_FILE.open('r') as f:
                anomalies = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            anomalies = []
        anomaly_data.update({
            "timestamp": datetime.utcnow().isoformat(),
            "review_status": anomaly_data.get("review_status", "needs_review")
        })
        for idx, anomaly in enumerate(anomalies):
            if anomaly.get('file_name') == anomaly_data.get('file_name'):
                anomalies[idx] = anomaly_data
                break
        else:
            anomalies.append(anomaly_data)
        with StorageConfig.ANOMALIES_FILE.open('w') as f:
            json.dump(anomalies, f, indent=4)
        logger.info(f"Saved anomaly: {anomaly_data.get('file_name')}")
    except Exception as e:
        logger.error(f"Error saving anomaly: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving anomaly: {str(e)}")

@app.post("/api/upload_invoice")
async def upload_invoice(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )

    temp_path = StorageConfig.get_temp_path()
    try:
        content = await file.read()
        is_valid_pdf, error_message = validate_pdf_content(content)
        if not is_valid_pdf:
            anomaly_data = {
                "file_name": file.filename,
                "reason": f"Invalid PDF format: {error_message}",
                "confidence": 0.0,
                "review_status": "needs_review",
                "type": "invalid_pdf"
            }
            save_anomaly(anomaly_data)
            return {
                "status": "error",
                "detail": f"Invalid PDF file: {error_message}",
                "type": "validation_error"
            }
            
        with open(temp_path, "wb") as f:
            f.write(content)
            
        try:
            workflow = InvoiceProcessingWorkflow()
            result = await workflow.process_invoice(str(temp_path))  # Default save_pdf=True
            extracted_data = result.get('extracted_data')
            
            if not extracted_data:
                anomaly_data = {
                    "file_name": file.filename,
                    "reason": "Failed to extract any data from file",
                    "confidence": 0.0,
                    "review_status": "needs_review",
                    "type": "extraction_error"
                }
                save_anomaly(anomaly_data)
                return {
                    "status": "error",
                    "detail": "Could not extract any data from the file",
                    "type": "extraction_error"
                }
            
            if not extracted_data.get('invoice_number'):
                anomaly_data = {
                    "file_name": file.filename,
                    "reason": "No invoice number found",
                    "confidence": extracted_data.get('confidence', 0.0),
                    "review_status": "needs_review",
                    "type": "missing_data"
                }
                save_anomaly(anomaly_data)
                return {
                    "status": "error",
                    "detail": "Could not find invoice number in the document",
                    "type": "extraction_error"
                }
            
            invoice_id = extracted_data['invoice_number']
            process_invoice_and_save(content, invoice_id)
            logger.info(f"Saved PDF for invoice {invoice_id}")
            
            if extracted_data.get('confidence', 0) < 0.7:
                anomaly_data = {
                    "file_name": file.filename,
                    "invoice_number": invoice_id,
                    "vendor_name": extracted_data.get('vendor_name'),
                    "reason": "Low confidence extraction",
                    "confidence": extracted_data['confidence'],
                    "review_status": "needs_review",
                    "type": "low_confidence"
                }
                save_anomaly(anomaly_data)
            
            save_invoice(result['extracted_data'])
            
            return {
                "status": "success",
                "detail": "Invoice processed successfully",
                "extracted_data": extracted_data
            }
            
        except Exception as process_error:
            logger.error(f"Error processing invoice {file.filename}: {str(process_error)}")
            anomaly_data = {
                "file_name": file.filename,
                "reason": f"Processing error: {str(process_error)}",
                "confidence": 0.0,
                "review_status": "needs_review",
                "type": "processing_error"
            }
            save_anomaly(anomaly_data)
            return {
                "status": "error",
                "detail": f"Failed to process invoice: {str(process_error)}",
                "type": "processing_error"
            }
    except Exception as e:
        logger.error(f"Unexpected error processing {file.filename}: {str(e)}")
        anomaly_data = {
            "file_name": file.filename,
            "reason": f"System error: {str(e)}",
            "confidence": 0.0,
            "review_status": "needs_review",
            "type": "system_error"
        }
        save_anomaly(anomaly_data)
        return {
            "status": "error",
            "detail": f"Error processing file: {str(e)}",
            "type": "system_error"
        }
    finally:
        if temp_path.exists():
            temp_path.unlink()

@app.get("/api/invoices")
async def get_invoices():
    try:
        if not StorageConfig.INVOICES_FILE.exists():
            return []
        with StorageConfig.INVOICES_FILE.open("r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading invoices: {str(e)}")
        return []

@app.get("/api/invoice_pdf/{invoice_id}")
async def get_invoice_pdf(invoice_id: str):
    if not invoice_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice ID is required"
        )

    pdf_path = StorageConfig.get_pdf_path(invoice_id)
    logger.debug(f"Looking for PDF at path: {pdf_path}")
    if not pdf_path.exists():
        logger.warning(f"PDF not found for invoice {invoice_id} at {pdf_path}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PDF not found for invoice {invoice_id}"
        )
    if not pdf_path.is_file():
        logger.error(f"Path exists but is not a file: {pdf_path}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid PDF file path"
        )
    
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"{invoice_id}.pdf",
        headers={"Cache-Control": "no-cache"}
    )

class InvoiceUpdate(BaseModel):
    vendor_name: str
    invoice_number: str
    invoice_date: str
    total_amount: float
    validation_status: Optional[str] = Field(default=None)
    confidence: Optional[float] = Field(default=None)

@app.put("/api/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, update_data: InvoiceUpdate):
    try:
        if not StorageConfig.INVOICES_FILE.exists():
            raise HTTPException(status_code=404, detail="No invoices found")
            
        with StorageConfig.INVOICES_FILE.open('r') as f:
            invoices = json.load(f)
            
        invoice_index = None
        for idx, invoice in enumerate(invoices):
            if invoice.get('invoice_number') == invoice_id:
                invoice_index = idx
                break
                
        if invoice_index is None:
            raise HTTPException(
                status_code=404, 
                detail=f"Invoice {invoice_id} not found in {str(StorageConfig.INVOICES_FILE)}"
            )
            
        update_dict = update_data.dict(exclude_unset=True)
        invoices[invoice_index].update(update_dict)
        
        with StorageConfig.INVOICES_FILE.open('w') as f:
            json.dump(invoices, f, indent=4)
            
        return {
            "status": "success",
            "message": f"Invoice {invoice_id} updated successfully",
            "updated_invoice": invoices[invoice_index]
        }
        
    except Exception as e:
        logger.error(f"Error updating invoice {invoice_id}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error updating invoice: {str(e)}"
        )

@app.get("/api/anomalies")
async def get_anomalies():
    try:
        if not StorageConfig.ANOMALIES_FILE.exists():
            return []
        with StorageConfig.ANOMALIES_FILE.open("r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading anomalies: {str(e)}")
        return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
         "api.app:app",
         host="0.0.0.0",
         port=8000,
         reload=True,
         ws='auto',
         ws_ping_interval=20.0,
         ws_ping_timeout=20.0
    )