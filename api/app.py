import sys
import os
import shutil
import asyncio  # Add asyncio import
import time  # Add time import
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
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse  # Add StreamingResponse
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
        self.heartbeat_interval = 15  # seconds
        self._heartbeat_tasks = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self._heartbeat_tasks[websocket] = asyncio.create_task(self._heartbeat(websocket))
        logger.info("WebSocket client connected")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            if websocket in self._heartbeat_tasks:
                self._heartbeat_tasks[websocket].cancel()
                del self._heartbeat_tasks[websocket]
            logger.info("WebSocket client disconnected")

    async def _heartbeat(self, websocket: WebSocket):
        """Send periodic heartbeat to keep connection alive."""
        try:
            while True:
                await asyncio.sleep(self.heartbeat_interval)
                try:
                    await websocket.send_json({"type": "heartbeat"})
                except Exception as e:
                    logger.error(f"Heartbeat failed: {str(e)}")
                    self.disconnect(websocket)
                    break
        except asyncio.CancelledError:
            pass

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
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
    """WebSocket endpoint for process progress updates."""
    await manager.connect(websocket)
    try:
        while True:
            try:
                # Wait for messages with a timeout
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=manager.heartbeat_interval * 2
                )
                
                # Handle client messages if needed
                if isinstance(data, dict):
                    message_type = data.get('type')
                    if message_type == 'heartbeat_ack':
                        continue
                    elif message_type == 'start_processing':
                        # Client indicates they're ready to receive updates
                        await websocket.send_json({
                            "type": "status",
                            "message": "Connected and ready for processing updates"
                        })
                
            except asyncio.TimeoutError:
                # No message received within timeout, connection might be stale
                continue
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                logger.warning("Received invalid JSON message")
                continue
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {str(e)}")
                break
    
    except Exception as e:
        logger.error(f"WebSocket connection error: {str(e)}")
    finally:
        manager.disconnect(websocket)

async def broadcast_progress(message: dict):
    await manager.broadcast(message)

@app.post("/api/process_all_invoices")
async def process_all_invoices():
    pdf_dir = Path("data/raw/invoices")
    try:
        if not pdf_dir.exists():
            raise HTTPException(status_code=404, detail=f"Invoice directory not found: {pdf_dir}")

        pdf_files = list(pdf_dir.glob("*.pdf"))
        if not pdf_files:
            return {"status": "completed", "message": "No PDF files found to process", "processed": 0}

        workflow = InvoiceProcessingWorkflow()
        total_files = len(pdf_files)
        processed = 0
        failed = 0
        db = InvoiceDB()

        for i, pdf_path in enumerate(pdf_files, 1):
            temp_path = Path(f"data/temp/{uuid.uuid4()}.pdf")
            logger.info(f"Starting processing of invoice {pdf_path.name} ({i}/{total_files})")
            
            try:
                shutil.copy2(pdf_path, temp_path)
                await manager.broadcast({
                    "type": "progress", "current": i, "total": total_files,
                    "failed": failed, "currentFile": pdf_path.name
                })

                try:
                    # Add timeout to processing
                    result = await asyncio.wait_for(
                        workflow.process_invoice(str(temp_path), save_pdf=False),
                        timeout=60.0  # 60-second timeout per invoice
                    )
                    
                    if result.get("status") == "error":
                        failed += 1
                        error_msg = result.get('message', 'Unknown error')
                        logger.error(f"Failed to process {pdf_path.name}: {error_msg}")
                        await manager.broadcast({
                            "type": "error",
                            "file": pdf_path.name,
                            "error": error_msg
                        })
                        continue

                    extracted_data = result.get('extracted_data', {})
                    if not extracted_data:
                        failed += 1
                        logger.error(f"No data extracted from {pdf_path.name}")
                        continue

                    invoice_id = extracted_data.get('invoice_number')
                    if not invoice_id:
                        failed += 1
                        logger.error(f"No invoice number found in {pdf_path.name}")
                        continue

                    # Upload to S3 with timeout
                    try:
                        async with asyncio.timeout(30.0):  # 30-second timeout for S3 upload
                            with open(pdf_path, 'rb') as pdf_file:
                                s3_result = process_invoice_and_save(pdf_file.read(), invoice_id)
                    except asyncio.TimeoutError:
                        failed += 1
                        logger.error(f"S3 upload timeout for {pdf_path.name}")
                        continue

                    # Prepare database entry with new fields
                    db_entry = {
                        'invoice_number': invoice_id,
                        'vendor_name': extracted_data.get('vendor_name', ''),
                        'invoice_date': extracted_data.get('invoice_date', ''),
                        'total_amount': float(extracted_data.get('total_amount', 0)),
                        'status': 'valid' if extracted_data.get('confidence', 0) >= 0.7 else 'needs_review',
                        'pdf_url': s3_result.get('pdf_url', ''),
                        'confidence': extracted_data.get('confidence', 0.0),
                        'total_time': result.get('processing_time', 0.0)
                    }

                    # Save to database with validation
                    try:
                        if all(db_entry.values()):  # Ensure all required fields have values
                            db.insert_invoice(db_entry)
                            processed += 1
                            logger.info(f"Successfully processed invoice {pdf_path.name}")
                        else:
                            failed += 1
                            logger.error(f"Invalid database entry for {pdf_path.name}: {db_entry}")
                    except Exception as db_error:
                        failed += 1
                        logger.error(f"Database error for {pdf_path.name}: {str(db_error)}")
                        continue

                    # Handle low confidence cases
                    if extracted_data.get('confidence', 0) < 0.7:
                        save_anomaly({
                            "file_name": pdf_path.name,
                            "invoice_number": invoice_id,
                            "vendor_name": extracted_data.get('vendor_name'),
                            "reason": "Low confidence extraction",
                            "confidence": extracted_data.get('confidence', 0),
                            "review_status": "needs_review",
                            "type": "low_confidence"
                        })

                except asyncio.TimeoutError:
                    failed += 1
                    logger.error(f"Processing timeout for {pdf_path.name}")
                    await manager.broadcast({
                        "type": "error",
                        "file": pdf_path.name,
                        "error": "Processing timed out"
                    })
                except Exception as process_error:
                    failed += 1
                    logger.error(f"Error processing {pdf_path.name}: {str(process_error)}")
                    await manager.broadcast({
                        "type": "error",
                        "file": pdf_path.name,
                        "error": str(process_error)
                    })

            except Exception as e:
                failed += 1
                logger.error(f"Unhandled error for {pdf_path.name}: {str(e)}")
                await manager.broadcast({
                    "type": "error",
                    "file": pdf_path.name,
                    "error": str(e)
                })
            finally:
                if temp_path.exists():
                    temp_path.unlink()  # Clean up temp file

            # Add a small delay between files to prevent resource exhaustion
            await asyncio.sleep(0.5)

        # Broadcast final status
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
        logger.error(f"Batch processing error: {str(e)}")
        return {"status": "error", "message": f"Batch processing failed: {str(e)}"}
    finally:
        # Ensure any remaining temp files are cleaned up
        for temp_file in Path("data/temp").glob("*.pdf"):
            try:
                temp_file.unlink()
            except Exception as e:
                logger.error(f"Failed to clean up temp file {temp_file}: {str(e)}")

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
                'pdf_url': s3_result['pdf_url'],
                'confidence': extracted_data.get('confidence', 0.0),
                'total_time': result.get('processing_time', 0.0)
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

@app.get("/api/invoice_pdf/{invoice_number}")
async def get_invoice_pdf(invoice_number: str):
    """Get PDF for an invoice by streaming from S3."""
    if not invoice_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice number is required"
        )
    logger.debug(f"Looking for PDF for invoice_number: {invoice_number}")
    
    try:
        db = InvoiceDB()
        # Query by invoice_number instead of id
        query_result = db.get_all_invoices()
        invoice = next((inv for inv in query_result if inv['invoice_number'] == invoice_number), None)
        
        if not invoice:
            raise HTTPException(
                status_code=404,
                detail=f"Invoice {invoice_number} not found"
            )
        
        if not invoice['pdf_url']:
            raise HTTPException(
                status_code=404,
                detail=f"PDF URL not found for invoice {invoice_number}"
            )
        
        # Rest of the function remains the same
        try:
            from urllib.parse import urlparse
            parsed_url = urlparse(invoice['pdf_url'])
            path_parts = parsed_url.path.lstrip('/').split('/')
            if len(path_parts) < 2:
                raise ValueError("Invalid S3 URL format")
            bucket_name = parsed_url.netloc.split('.')[0]
            s3_key = '/'.join(path_parts)
        except Exception as e:
            logger.error(f"Error parsing S3 URL {invoice['pdf_url']}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Invalid S3 URL format: {str(e)}"
            )
        
        try:
            # Get the PDF from S3 with exponential backoff retry
            s3_client = boto3.client('s3')
            max_retries = 3
            retry_delay = 1
            
            for attempt in range(max_retries):
                try:
                    response = s3_client.get_object(
                        Bucket=bucket_name,
                        Key=s3_key
                    )
                    break
                except ClientError as s3_error:
                    if attempt == max_retries - 1:
                        raise
                    error_code = s3_error.response['Error']['Code']
                    if error_code in ['NoSuchKey', 'NoSuchBucket']:
                        raise
                    logger.warning(f"S3 get attempt {attempt + 1} failed, retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                    retry_delay *= 2
            
            return StreamingResponse(
                response['Body'].iter_chunks(),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'inline; filename="{invoice["invoice_number"]}.pdf"',
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no"  # Disable nginx buffering if using it
                }
            )
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code in ['NoSuchKey', 'NoSuchBucket']:
                logger.error(f"PDF not found in S3: {bucket_name}/{s3_key}")
                raise HTTPException(
                    status_code=404,
                    detail=f"PDF not found in S3 for invoice {invoice_number}"
                )
            else:
                logger.error(f"S3 error retrieving PDF for invoice {invoice_number}: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to retrieve PDF from S3: {str(e)}"
                )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving PDF for invoice {invoice_number}: {str(e)}")
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
        db = InvoiceDB()
        
        # First check if invoice exists
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
            'confidence': update_data.confidence or existing_invoice.get('confidence', 0.0)
        }
        
        # Update the database with all fields
        success = db.update_invoice_status(invoice_id, db_entry['status'], update_data=db_entry)
        if not success:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to update invoice {invoice_id}"
            )
            
        # Fetch the updated invoice
        updated_invoice = db.get_invoice_by_id(invoice_id)
        if not updated_invoice:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch updated invoice {invoice_id}"
            )
            
        return {
            "status": "success",
            "message": f"Invoice {invoice_id} updated successfully",
            "updated_invoice": updated_invoice
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