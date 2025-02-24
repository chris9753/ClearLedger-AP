import sys
import os
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
        """Send message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {str(e)}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

# Initialize connection manager
manager = ConnectionManager()

# Initialize workflow
workflow = InvoiceProcessingWorkflow()

# Track active WebSocket connections
active_connections: List[WebSocket] = []

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
        """Create all necessary directories and initialize storage"""
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

# New helper function to process and save PDF content
def process_invoice_and_save(pdf_content: bytes, invoice_id: str):
    """Save PDF content to processed directory for the given invoice_id"""
    pdf_path = StorageConfig.get_pdf_path(invoice_id)
    with open(pdf_path, "wb") as f:
        f.write(pdf_content)
    return {"invoice_id": invoice_id}

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom exception handler to ensure consistent error responses"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.websocket("/ws/process_progress")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Echo back progress updates (useful for testing)
            await websocket.send_json({
                "type": "progress",
                "message": f"Received: {data}"
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket)

# Update the broadcast_progress function to use the manager
async def broadcast_progress(message: dict):
    await manager.broadcast(message)

# Update process_all_invoices to send more detailed progress updates
@app.post("/api/process_all_invoices")
async def process_all_invoices():
    import asyncio
    # Simulate processing invoices and send progress updates via WebSocket
    for i in range(1, 4):
        await asyncio.sleep(1)  # Simulate work
        await manager.broadcast({
            "type": "progress",
            "message": f"{i * 33}"
        })
    return {"message": "All invoices processed"}

def save_invoice(invoice_data: dict):
    """Save invoice data to the structured_invoices.json file.
    If an invoice with the same invoice_number exists, it will be updated instead of creating a duplicate."""
    try:
        os.makedirs(StorageConfig.INVOICES_FILE.parent, exist_ok=True)
        try:
            with StorageConfig.INVOICES_FILE.open('r') as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = []
            
        # Check for existing invoice and update it
        for idx, inv in enumerate(data):
            if inv.get('invoice_number') == invoice_data.get('invoice_number'):
                data[idx] = invoice_data
                break
        else:
            # No existing invoice found, append new one
            data.append(invoice_data)
            
        with StorageConfig.INVOICES_FILE.open('w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        logger.error(f"Error saving invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving invoice: {str(e)}")


def validate_pdf_content(content: bytes) -> bool:
    """Validate that content is a proper PDF file"""
    # Check PDF magic number
    if not content.startswith(b'%PDF-'):
        return False
    # Check for PDF end marker
    if not any(marker in content[-1024:] for marker in [b'%%EOF', b'%%EOF\n', b'%%EOF\r\n']):
        return False
    return True

@app.post("/api/upload_invoice")
async def upload_invoice(file: UploadFile = File(...)):
    """Upload and process an invoice file"""
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )
        
    if not file.filename.lower().endswith('.pdf'):
        return {
            "status": "error",
            "detail": "Only PDF files are allowed",
            "type": "validation_error"
        }

    temp_path = StorageConfig.get_temp_path()
    try:
        content = await file.read()
        
        if not validate_pdf_content(content):
            return {
                "status": "error",
                "detail": "Invalid or corrupted PDF file",
                "type": "validation_error"
            }
            
        with open(temp_path, "wb") as f:
            f.write(content)
            
        try:
            result = await workflow.process_invoice(str(temp_path))
            extracted_data = result.get('extracted_data')
            if not extracted_data:
                return {
                    "status": "error",
                    "detail": "Could not extract any data from the file",
                    "type": "extraction_error"
                }
            
            if not extracted_data.get('invoice_number'):
                return {
                    "status": "error",
                    "detail": "Could not find invoice number in the document",
                    "type": "extraction_error"
                }
            
            # Save PDF using the new helper function instead of copying
            invoice_id = extracted_data['invoice_number']
            process_invoice_and_save(content, invoice_id)
            logger.info(f"Saved PDF for invoice {invoice_id} to {StorageConfig.get_pdf_path(invoice_id)}")
            
            save_invoice(result['extracted_data'])
            
            return {
                "status": "success",
                "detail": "Invoice processed successfully",
                "extracted_data": extracted_data
            }
            
        except Exception as process_error:
            logger.error(f"Error processing invoice {file.filename}: {str(process_error)}")
            return {
                "status": "error",
                "detail": f"Failed to process invoice: {str(process_error)}",
                "type": "processing_error"
            }
    except Exception as e:
        logger.error(f"Unexpected error processing {file.filename}: {str(e)}")
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
    """Serve a processed invoice PDF file"""
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
            
        # Find the invoice by ID
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
            
        # Update only the fields that were provided
        update_dict = update_data.dict(exclude_unset=True)
        invoices[invoice_index].update(update_dict)
        
        # Save the updated invoices back to file
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
    """Retrieve all anomalies from data/processed/anomalies.json"""
    try:
        if not StorageConfig.ANOMALIES_FILE.exists():
            return []
        with StorageConfig.ANOMALIES_FILE.open("r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading anomalies: {str(e)}")
        return []

def save_anomaly(anomaly_data: dict):
    """Save anomaly data to the anomalies.json file"""
    try:
        os.makedirs(StorageConfig.PROCESSED_DIR, exist_ok=True)
        try:
            with StorageConfig.ANOMALIES_FILE.open('r') as f:
                anomalies = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            anomalies = []
            
        # Check for existing anomaly and update it
        for idx, anomaly in enumerate(anomalies):
            if anomaly.get('file_name') == anomaly_data.get('file_name'):
                anomalies[idx] = anomaly_data
                break
        else:
            # No existing anomaly found, append new one
            anomalies.append(anomaly_data)
            
        with StorageConfig.ANOMALIES_FILE.open('w') as f:
            json.dump(anomalies, f, indent=4)
    except Exception as e:
        logger.error(f"Error saving anomaly: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving anomaly: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
         "api.app:app",
         host="0.0.0.0",
         port=8000,
         reload=True,
         ws='auto',  # Enable WebSocket support
         ws_ping_interval=20.0,
         ws_ping_timeout=20.0
    )