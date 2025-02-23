from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import json
import uuid
from pathlib import Path
from glob import glob
from shutil import copyfile
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import FastAPI, UploadFile, File, HTTPException, status, WebSocket
from fastapi.responses import FileResponse, JSONResponse
from config.logging_config import logger

from workflows.orchestrator import InvoiceProcessingWorkflow

app = FastAPI()

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

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom exception handler to ensure consistent error responses"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.websocket("/ws/process_progress")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except:
        active_connections.remove(websocket)

async def broadcast_progress(message: dict):
    """Broadcast progress updates to all connected clients"""
    for connection in active_connections.copy():  # Use copy to avoid modification during iteration
        try:
            await connection.send_json(message)
        except:
            if connection in active_connections:
                active_connections.remove(connection)

@app.get("/api/process_all_invoices")
async def process_all_invoices():
    invoice_files = glob(str(StorageConfig.RAW_DIR / "*.pdf"))
    if not invoice_files:
        return {"message": "No invoices found in data/raw/invoices/"}
    
    total = len(invoice_files)
    logger.info(f"Starting batch processing of {total} invoices")
    results = []
    failed = 0
    
    for index, file in enumerate(invoice_files, 1):
        try:
            # Send progress update
            await broadcast_progress({
                "type": "progress",
                "current": index,
                "total": total,
                "failed": failed,
                "currentFile": os.path.basename(file)
            })
            
            # Process invoice
            with open(file, 'rb') as f:
                content = f.read()
            
            temp_path = StorageConfig.get_temp_path()
            try:
                with open(temp_path, 'wb') as f:
                    f.write(content)
                
                result = await workflow.process_invoice(str(temp_path))
                save_invoice(result['extracted_data'])
                results.append(result)
                
            finally:
                if temp_path.exists():
                    temp_path.unlink()
                    
        except Exception as e:
            failed += 1
            logger.error(f"Failed to process {file}: {str(e)}")
            await broadcast_progress({
                "type": "error",
                "file": os.path.basename(file),
                "error": str(e)
            })
    
    successful = len(results)
    final_result = {
        "message": f"Processed {successful} invoices successfully" + 
                  (f", {failed} failed" if failed > 0 else ""),
        "successful": successful,
        "failed": failed,
        "total": total
    }
    
    # Send final status
    await broadcast_progress({
        "type": "complete",
        **final_result
    })
    
    return final_result


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
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    temp_path = StorageConfig.get_temp_path()
    try:
        content = await file.read()
        
        # Validate PDF content
        if not validate_pdf_content(content):
            raise HTTPException(status_code=400, detail="Invalid or corrupted PDF file")
            
        with open(temp_path, "wb") as f:
            f.write(content)
            
        try:
            result = await workflow.process_invoice(str(temp_path))
            
            # Only save valid PDFs
            extracted_data = result.get('extracted_data')
            if extracted_data and extracted_data.get('invoice_number'):
                invoice_id = extracted_data['invoice_number']
                pdf_path = StorageConfig.get_pdf_path(invoice_id)
                
                # Copy the PDF to processed directory with invoice number as filename
                import shutil
                shutil.copy(str(temp_path), str(pdf_path))
                logger.info(f"Saved PDF for invoice {invoice_id} to {pdf_path}")
                
                # Save structured data
                save_invoice(result['extracted_data'])
            else:
                logger.warning(f"Invalid invoice data from {file.filename}: {extracted_data}")
                raise HTTPException(
                    status_code=422,
                    detail="Could not extract valid invoice data from file"
                )

            return result
            
        except Exception as process_error:
            logger.error(f"Error processing invoice {file.filename}: {str(process_error)}")
            raise HTTPException(
                status_code=422, 
                detail=f"Failed to process invoice: {str(process_error)}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
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

    try:
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving PDF for invoice {invoice_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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