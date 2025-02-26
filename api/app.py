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
        self.heartbeat_interval = 30  # seconds
        self.last_message = {}  # Store last message per connection

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.last_message[id(websocket)] = time.time()
        
        # Send initial connection confirmation
        try:
            await websocket.send_json({
                "type": "connection_status",
                "status": "connected"
            })
        except Exception as e:
            logger.error(f"Error sending connection confirmation: {e}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if id(websocket) in self.last_message:
            del self.last_message[id(websocket)]

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
                self.last_message[id(connection)] = time.time()
            except WebSocketDisconnect:
                dead_connections.append(connection)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                dead_connections.append(connection)
        
        # Clean up dead connections
        for dead in dead_connections:
            self.disconnect(dead)

    async def check_connections(self):
        """Periodic check of connection health"""
        current_time = time.time()
        dead_connections = []
        for connection in self.active_connections:
            last_msg_time = self.last_message.get(id(connection), 0)
            if current_time - last_msg_time > self.heartbeat_interval * 2:
                dead_connections.append(connection)
        
        for dead in dead_connections:
            self.disconnect(dead)

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
        
        # Start by broadcasting the initial count
        await manager.broadcast({
            "type": "progress", 
            "current": 0, 
            "total": len(pdf_files),
            "failed": 0, 
            "processed": 0,
            "skipped": 0
        })
        
        workflow = InvoiceProcessingWorkflow()
        total_files = len(pdf_files)
        processed = 0
        failed = 0
        skipped = 0
        db = InvoiceDB()
        batch_size = 5

        # Process in batches
        for batch_start in range(0, len(pdf_files), batch_size):
            batch_end = min(batch_start + batch_size, len(pdf_files))
            batch_files = pdf_files[batch_start:batch_end]
            batch_results = []
            
            # First, extract invoice numbers from batch to check duplicates
            for pdf_path in batch_files:
                temp_path = Path(f"data/temp/{uuid.uuid4()}.pdf")
                try:
                    shutil.copy2(pdf_path, temp_path)
                    result = await workflow.process_invoice(str(temp_path), save_pdf=False)
                    if result and result.get('extracted_data', {}).get('invoice_number'):
                        batch_results.append({
                            'path': pdf_path,
                            'extracted_data': result.get('extracted_data'),
                            'processing_result': result
                        })
                    else:
                        failed += 1
                        await manager.broadcast({
                            "type": "error",
                            "file": pdf_path.name,
                            "error": "Failed to extract data"
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

            if batch_results:
                # Check for duplicates efficiently
                invoice_numbers = [r['extracted_data']['invoice_number'] for r in batch_results]
                duplicates = db.batch_check_duplicates(invoice_numbers)
                
                # Process non-duplicates
                to_process = []
                for result in batch_results:
                    invoice_number = result['extracted_data']['invoice_number']
                    if duplicates.get(invoice_number):
                        skipped += 1
                        await manager.broadcast({
                            "type": "warning",
                            "file": result['path'].name,
                            "message": "Skipped duplicate invoice"
                        })
                        continue
                    
                    # Upload to S3
                    try:
                        with open(result['path'], 'rb') as pdf_file:
                            s3_result = process_invoice_and_save(pdf_file.read(), invoice_number)
                            
                            # Prepare database entry
                            extracted_data = result['extracted_data']
                            to_process.append({
                                'invoice_number': invoice_number,
                                'vendor_name': extracted_data.get('vendor_name', ''),
                                'invoice_date': extracted_data.get('invoice_date', ''),
                                'total_amount': float(extracted_data.get('total_amount', 0)),
                                'status': 'valid' if extracted_data.get('confidence', 0) >= 0.7 else 'needs_review',
                                'pdf_url': s3_result.get('pdf_url', ''),
                                'confidence': extracted_data.get('confidence', 0.0),
                                'total_time': result['processing_result'].get('total_time', 0.0)
                            })
                    except Exception as e:
                        failed += 1
                        logger.error(f"S3 upload error for {result['path'].name}: {str(e)}")
                        await manager.broadcast({
                            "type": "error",
                            "file": result['path'].name,
                            "error": f"S3 upload failed: {str(e)}"
                        })
                
                # Batch insert into database
                if to_process:
                    insert_results = db.batch_insert_invoices(to_process)
                    for (success, _, error), result in zip(insert_results, to_process):
                        if success:
                            processed += 1
                            # Check confidence and save anomaly if needed
                            if result['confidence'] < 0.7:
                                save_anomaly({
                                    "file_name": f"{result['invoice_number']}.pdf",
                                    "invoice_number": result['invoice_number'],
                                    "vendor_name": result['vendor_name'],
                                    "reason": "Low confidence extraction",
                                    "confidence": result['confidence'],
                                    "review_status": "needs_review",
                                    "type": "low_confidence"
                                })
                        else:
                            failed += 1
                            logger.error(f"Database error for invoice {result['invoice_number']}: {error}")
            
            # Update progress after batch
            current_progress = min(batch_end, total_files)
            await manager.broadcast({
                "type": "progress", 
                "current": current_progress, 
                "total": total_files,
                "failed": failed, 
                "processed": processed,
                "skipped": skipped,
                "currentFile": batch_files[-1].name if batch_files else None
            })
            
            # Small delay between batches
            await asyncio.sleep(0.2)
        
        # Final status
        summary_message = f"Processing complete: {processed} processed, {failed} failed, {skipped} skipped"
        await manager.broadcast({
            "type": "complete",
            "message": summary_message,
            "processed": processed,
            "failed": failed,
            "skipped": skipped,
            "total": total_files
        })
        
        return {
            "status": "completed",
            "message": summary_message,
            "processed": processed,
            "failed": failed,
            "skipped": skipped,
            "total": total_files
        }
        
    except Exception as e:
        logger.error(f"Batch processing error: {str(e)}")
        await manager.broadcast({
            "type": "error",
            "error": f"Batch processing failed: {str(e)}"
        })
        return {"status": "error", "message": str(e)}
    finally:
        # Cleanup temp files
        try:
            for temp_file in Path("data/temp").glob("*.pdf"):
                try:
                    temp_file.unlink()
                except Exception as e:
                    logger.error(f"Failed to clean up temp file {temp_file}: {str(e)}")
        except Exception:
            pass

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
            
            # Check if invoice already exists before processing
            db = InvoiceDB()
            existing_invoice = db.get_invoice_by_number(invoice_id)
            
            if existing_invoice:
                logger.info(f"Invoice {invoice_id} already exists in the database")
                return {
                    "status": "warning", 
                    "detail": "This invoice has already been processed",
                    "type": "duplicate_invoice",
                    "extracted_data": extracted_data,
                    "existing_invoice": {
                        "invoice_number": existing_invoice["invoice_number"],
                        "vendor_name": existing_invoice["vendor_name"],
                        "invoice_date": existing_invoice["invoice_date"],
                        "total_amount": float(existing_invoice["total_amount"]),
                        "status": existing_invoice["status"],
                        "pdf_url": existing_invoice["pdf_url"]
                    }
                }
            
            # Save PDF to S3
            s3_result = process_invoice_and_save(content, invoice_id)
            logger.info(f"Saved PDF for invoice {invoice_id} to S3: {s3_result['pdf_url']}")
            
            # Save to database with improved error handling
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
            
            is_new, db_id, error_message = db.insert_invoice(db_entry)
            
            if error_message:
                if "already exists" in error_message:
                    return {
                        "status": "warning",
                        "detail": "This invoice has already been processed",
                        "type": "duplicate_invoice",
                        "extracted_data": extracted_data
                    }
                else:
                    logger.error(f"Database error: {error_message}")
                    return {
                        "status": "error",
                        "detail": f"Database error: {error_message}",
                        "type": "database_error"
                    }
            
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
async def get_invoices(
    page: int = 1,
    per_page: int = 10,
    sort_by: str = "created_at",
    order: str = "desc"
):
    """Get invoices from the SQLite database with pagination."""
    try:
        logger.info(f"Fetching invoices page {page}, {per_page} per page")
        db = InvoiceDB()
        total_count = db.get_invoice_count()
        invoices = db.get_invoices_paginated(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            order=order
        )
        
        # Transform decimal/date values to be JSON serializable
        for invoice in invoices:
            invoice['total_amount'] = float(invoice['total_amount'])
            if isinstance(invoice.get('created_at'), datetime):
                invoice['created_at'] = invoice['created_at'].isoformat()
        
        logger.info(f"Retrieved {len(invoices)} invoices for page {page}")
        return {
            "data": invoices,
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_items": total_count,
                "total_pages": -(-total_count // per_page)  # Ceiling division
            }
        }
    except Exception as e:
        logger.error(f"Error fetching invoices from database: {str(e)}")
        return {
            "data": [],
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_items": 0,
                "total_pages": 0
            }
        }

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
    """Get PDF for an invoice by streaming efficiently from S3."""
    if not invoice_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice number is required"
        )
    logger.info(f"Looking for PDF for invoice_number: {invoice_number}")
    
    try:
        db = InvoiceDB()
        invoice = None
        
        # First try the direct invoice number lookup
        invoice_data = db.get_invoice_by_number(invoice_number)
        if invoice_data:
            invoice = invoice_data
        
        # If not found, try to query from all invoices as fallback
        if not invoice:
            query_result = db.get_all_invoices()
            invoice = next((inv for inv in query_result if inv['invoice_number'] == invoice_number), None)
        
        if not invoice:
            logger.error(f"Invoice {invoice_number} not found in database")
            raise HTTPException(
                status_code=404,
                detail=f"Invoice {invoice_number} not found"
            )
        
        if not invoice.get('pdf_url'):
            logger.error(f"PDF URL missing for invoice {invoice_number}")
            raise HTTPException(
                status_code=404,
                detail=f"PDF URL not found for invoice {invoice_number}"
            )
        
        pdf_url = invoice['pdf_url']
        logger.info(f"Found PDF URL for invoice {invoice_number}: {pdf_url}")
        
        # Parse S3 URL more robustly
        try:
            from urllib.parse import urlparse
            parsed_url = urlparse(pdf_url)
            
            # Handle the bucket name extraction more robustly
            bucket_name = None
            if parsed_url.netloc.endswith('s3.amazonaws.com'):
                bucket_name = parsed_url.netloc.split('.')[0]
            else:
                # Handle custom domain or other URL formats
                bucket_name = parsed_url.netloc.split('.')[0]
            
            # Extract the key more carefully
            path_parts = parsed_url.path.strip('/').split('/')
            if len(path_parts) < 1:
                raise ValueError("Invalid S3 URL path")
            
            s3_key = '/'.join(path_parts)
            
            logger.info(f"Parsed S3 URL - Bucket: {bucket_name}, Key: {s3_key}")
        except Exception as e:
            logger.error(f"Failed to parse S3 URL {pdf_url}: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Invalid S3 URL format: {str(e)}"
            )
        
        # Configure boto3 with timeouts
        try:
            import boto3
            from botocore.config import Config
            
            # Configure with explicit timeouts to prevent hanging requests
            s3_config = Config(
                connect_timeout=5,  # 5 seconds for connection timeout
                read_timeout=20,    # 20 seconds for read timeout
                retries={'max_attempts': 3}
            )
            
            s3_client = boto3.client('s3', config=s3_config)
            
            try:
                # Get the file metadata first to verify it exists
                head_response = s3_client.head_object(
                    Bucket=bucket_name,
                    Key=s3_key
                )
                
                # Check if it's a valid PDF by content type
                content_type = head_response.get('ContentType', '')
                if 'application/pdf' not in content_type and not content_type.startswith('binary/'):
                    logger.warning(f"S3 object content type is not PDF: {content_type}")
                    # Continue anyway, but log the warning
                
                file_size = head_response.get('ContentLength', 0)
                logger.info(f"PDF file size: {file_size} bytes")
                
                # Get the PDF from S3
                response = s3_client.get_object(
                    Bucket=bucket_name,
                    Key=s3_key
                )
                
                return StreamingResponse(
                    response['Body'].iter_chunks(chunk_size=8192),  # Use optimal chunk size
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f'inline; filename="{invoice_number}.pdf"',
                        "Content-Length": str(file_size),
                        "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
                        "X-Accel-Buffering": "no",  # Disable nginx buffering if using it
                        "Access-Control-Allow-Origin": "*"  # Allow CORS for direct access testing
                    }
                )
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')
                
                if error_code in ['NoSuchKey', 'NoSuchBucket', '404']:
                    logger.error(f"PDF not found in S3: {bucket_name}/{s3_key}, Error: {error_code}")
                    raise HTTPException(
                        status_code=404,
                        detail=f"PDF not found in S3 for invoice {invoice_number}"
                    )
                else:
                    logger.error(f"S3 error retrieving PDF: {str(e)}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to retrieve PDF from S3: {str(e)}"
                    )
            
        except ClientError as e:
            logger.error(f"S3 client error for PDF {invoice_number}: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"S3 error: {str(e)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error retrieving PDF for invoice {invoice_number}: {str(e)}")
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

@app.get("/api/metrics")
async def get_metrics():
    """Get processing metrics and statistics."""
    try:
        db = InvoiceDB()
        total_invoices = db.get_invoice_count()
        
        # Get status breakdown
        status_counts = db.get_status_counts()
        
        # Get confidence metrics
        confidence_metrics = db.get_confidence_metrics()
        
        # Get processing time metrics
        time_metrics = db.get_processing_time_metrics()
        
        # Get last 24h metrics
        recent_metrics = db.get_recent_metrics()
        
        return {
            "total_invoices": total_invoices,
            "status_breakdown": status_counts,
            "confidence_metrics": confidence_metrics,
            "processing_metrics": time_metrics,
            "recent_activity": recent_metrics
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        return {
            "total_invoices": 0,
            "status_breakdown": {},
            "confidence_metrics": {},
            "processing_metrics": {},
            "recent_activity": {}
        }

@app.get("/api/anomalies")
async def get_anomalies(
    page: int = 1,
    per_page: int = 10,
    status: Optional[str] = None
):
    """Get anomalies with pagination and filtering."""
    try:
        if not StorageConfig.ANOMALIES_FILE.exists():
            return {
                "data": [],
                "pagination": {
                    "current_page": page,
                    "per_page": per_page,
                    "total_items": 0,
                    "total_pages": 0
                }
            }

        with StorageConfig.ANOMALIES_FILE.open("r") as f:
            all_anomalies = json.load(f)

        # Filter by status if provided
        if status:
            all_anomalies = [a for a in all_anomalies if a.get('review_status') == status]

        # Sort by timestamp descending
        all_anomalies.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

        # Calculate pagination
        total_items = len(all_anomalies)
        total_pages = -(-total_items // per_page)  # Ceiling division
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        return {
            "data": all_anomalies[start_idx:end_idx],
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_items": total_items,
                "total_pages": total_pages
            }
        }
    except Exception as e:
        logger.error(f"Error reading anomalies: {str(e)}")
        return {
            "data": [],
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_items": 0,
                "total_pages": 0
            }
        }

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