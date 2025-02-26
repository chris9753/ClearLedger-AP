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
from db import InvoiceDB  # Import InvoiceDB for database operations
from setup_s3 import upload_to_s3, BUCKET_NAME
import boto3
from botocore.exceptions import ClientError
from io import BytesIO

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

def process_invoice_and_save(pdf_content: bytes, invoice_id: str) -> dict:
    """Process and upload invoice PDF to S3, returning the S3 URL."""
    try:
        s3_client = boto3.client("s3")
        s3_key = f"invoices/{invoice_id}.pdf"
        
        # Upload directly from bytes to S3
        s3_client.upload_fileobj(
            BytesIO(pdf_content),
            BUCKET_NAME,
            s3_key,
            ExtraArgs={'ContentType': 'application/pdf'}
        )
        
        # Generate the S3 URL
        pdf_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}"
        logger.info(f"Successfully uploaded invoice {invoice_id} to S3: {pdf_url}")
        
        return {
            "invoice_id": invoice_id,
            "pdf_url": pdf_url
        }
    except ClientError as e:
        logger.error(f"Failed to upload invoice {invoice_id} to S3: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload invoice to S3: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error uploading invoice {invoice_id} to S3: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing invoice: {str(e)}"
        )

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
        db = InvoiceDB()

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
                    extracted_data = result.get('extracted_data', {})
                    
                    try:
                        # Upload PDF to S3
                        with open(pdf_path, 'rb') as pdf_file:
                            s3_result = process_invoice_and_save(pdf_file.read(), extracted_data['invoice_number'])
                        
                        # Save to database
                        db_entry = {
                            'invoice_number': extracted_data['invoice_number'],
                            'vendor_name': extracted_data['vendor_name'],
                            'invoice_date': extracted_data['invoice_date'],
                            'total_amount': float(extracted_data['total_amount']),
                            'status': 'valid' if extracted_data.get('confidence', 0) >= 0.7 else 'needs_review',
                            'pdf_url': s3_result['pdf_url']
                        }
                        
                        db.insert_invoice(db_entry)
                        processed += 1
                        logger.info(f"Successfully processed and saved invoice {pdf_path.name} to S3")
                        
                        if extracted_data.get('confidence', 0) < 0.7:
                            save_anomaly({
                                "file_name": pdf_path.name,
                                "invoice_number": extracted_data['invoice_number'],
                                "vendor_name": extracted_data['vendor_name'],
                                "reason": "Low confidence extraction",
                                "confidence": extracted_data['confidence'],
                                "review_status": "needs_review",
                                "type": "low_confidence"
                            })
                            
                    except Exception as save_error:
                        failed += 1
                        logger.error(f"Failed to save invoice {pdf_path.name}: {str(save_error)}")
                        await manager.broadcast({
                            "type": "error",
                            "file": pdf_path.name,
                            "error": f"Save error: {str(save_error)}"
                        })

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
                    temp_path.unlink()

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
            result = await workflow.process_invoice(str(temp_path))
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
            
            # Save PDF to S3
            s3_result = process_invoice_and_save(content, invoice_id)
            logger.info(f"Saved PDF for invoice {invoice_id} to S3: {s3_result['pdf_url']}")
            
            # Save to database
            db = InvoiceDB()
            db_entry = {
                'invoice_number': extracted_data['invoice_number'],
                'vendor_name': extracted_data['vendor_name'],
                'invoice_date': extracted_data['invoice_date'],
                'total_amount': float(extracted_data['total_amount']),
                'status': 'valid' if extracted_data.get('confidence', 0) >= 0.7 else 'needs_review',
                'pdf_url': s3_result['pdf_url']
            }
            
            try:
                db.insert_invoice(db_entry)
                logger.info(f"Saved invoice {invoice_id} to database")
            except Exception as db_error:
                logger.error(f"Failed to save invoice to database: {str(db_error)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save invoice to database: {str(db_error)}"
                )
            
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
            
            return {
                "status": "success",
                "detail": "Invoice processed and saved to S3 and database successfully",
                "extracted_data": extracted_data,
                "pdf_url": s3_result['pdf_url']
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
    """Get all invoices from the SQLite database."""
    try:
        logger.info("Fetching all invoices from database")
        db = InvoiceDB()
        invoices = db.get_all_invoices()  # This now returns empty list on error
        
        # Transform decimal/date values to be JSON serializable
        for invoice in invoices:
            invoice['total_amount'] = float(invoice['total_amount'])
            if isinstance(invoice.get('created_at'), datetime):
                invoice['created_at'] = invoice['created_at'].isoformat()
        
        logger.info(f"Successfully retrieved {len(invoices)} invoices from database")
        return invoices
    except Exception as e:
        logger.error(f"Error fetching invoices from database: {str(e)}")
        return []  # Return empty list instead of 500 error

def load_json_file(filepath: Path) -> list:
    try:
        if filepath.exists():
            with open(filepath, 'r') as f:
                return json.load(f)
        logger.debug(f"File not found: {filepath}")
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing {filepath}: {e}")
    except Exception as e:
        logger.error(f"Unexpected error reading {filepath}: {e}")
    return []

@app.get("/api/invoice_pdf/{invoice_id}")
async def get_invoice_pdf(invoice_id: str):
    """Get PDF for an invoice by streaming from S3."""
    if not invoice_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice ID is required"
        )

    logger.debug(f"Looking for PDF for invoice_id: {invoice_id}")

    # Get invoice from database to get S3 URL
    try:
        db = InvoiceDB()
        invoice = db.get_invoice_by_id(invoice_id)
        if not invoice:
            raise HTTPException(
                status_code=404,
                detail=f"Invoice {invoice_id} not found"
            )
        
        if not invoice['pdf_url']:
            raise HTTPException(
                status_code=404,
                detail=f"PDF URL not found for invoice {invoice_id}"
            )
        
        # Extract the S3 key from the URL
        s3_key = f"invoices/{invoice_id}.pdf"
        
        try:
            # Get the PDF from S3
            s3_client = boto3.client("s3")
            response = s3_client.get_object(
                Bucket=BUCKET_NAME,
                Key=s3_key
            )
            
            # Stream the PDF content
            from fastapi.responses import StreamingResponse
            return StreamingResponse(
                response['Body'].iter_chunks(),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'inline; filename="{invoice_id}.pdf"',
                    "Cache-Control": "no-cache"
                }
            )
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if (error_code == 'NoSuchKey'):
                raise HTTPException(
                    status_code=404,
                    detail=f"PDF not found in S3 for invoice {invoice_id}"
                )
            else:
                logger.error(f"S3 error retrieving PDF for invoice {invoice_id}: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to retrieve PDF from S3: {str(e)}"
                )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving PDF for invoice {invoice_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving PDF: {str(e)}"
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
        # Convert update data to database format
        db = InvoiceDB()
        
        # First check if invoice exists by trying to get it
        existing_invoice = db.get_invoice_by_id(invoice_id)
        if not existing_invoice:
            raise HTTPException(
                status_code=404,
                detail=f"Invoice {invoice_id} not found"
            )
        
        # Prepare update data
        db_entry = {
            'invoice_number': update_data.invoice_number,
            'vendor_name': update_data.vendor_name,
            'invoice_date': update_data.invoice_date,
            'total_amount': update_data.total_amount,
            'status': update_data.validation_status or existing_invoice['status'],
            'pdf_url': existing_invoice['pdf_url']  # Keep existing PDF URL
        }
        
        # Update the database
        success = db.update_invoice_status(invoice_id, db_entry['status'])
        if not success:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to update invoice {invoice_id}"
            )
            
        return {
            "status": "success",
            "message": f"Invoice {invoice_id} updated successfully",
            "updated_invoice": db.get_invoice_by_id(invoice_id)
        }
        
    except HTTPException:
        raise
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