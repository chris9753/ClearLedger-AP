from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import json
import uuid
from pathlib import Path
from glob import glob
from shutil import copyfile
from typing import Optional
from pydantic import BaseModel, Field
from config.logging_config import logger  # Add logger import

from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.responses import FileResponse

from workflows.orchestrator import InvoiceProcessingWorkflow

# Ensure temp directory exists at startup
Path('data/temp').mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Brim Invoice Processing API")
workflow = InvoiceProcessingWorkflow()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Update to use consistent path across the application
INVOICES_FILE = Path("data/processed/structured_invoices.json")


@app.get("/api/process_all_invoices")
async def process_all_invoices():
    invoice_files = glob("data/raw/invoices/*.pdf")
    if not invoice_files:
        return {"message": "No invoices found in data/raw/invoices/"}
    results = []
    for file in invoice_files:
        result = await workflow.process_invoice(file)
        save_invoice(result['extracted_data'])
        results.append(result)
    return {"message": f"Processed {len(results)} invoices"}


def save_invoice(invoice_data: dict):
    """Save invoice data to the structured_invoices.json file.
    If an invoice with the same invoice_number exists, it will be updated instead of creating a duplicate."""
    try:
        os.makedirs(INVOICES_FILE.parent, exist_ok=True)
        try:
            with INVOICES_FILE.open('r') as f:
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
            
        with INVOICES_FILE.open('w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        logger.error(f"Error saving invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving invoice: {str(e)}")


@app.post("/api/upload_invoice")
async def upload_invoice(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    temp_path = Path(f"data/temp/{uuid.uuid4()}.pdf")
    try:
        temp_path.parent.mkdir(exist_ok=True)
        content = await file.read()
        
        # Basic PDF validation
        if not content.startswith(b'%PDF'):
            raise HTTPException(status_code=400, detail="Invalid PDF file format")
            
        with open(temp_path, "wb") as f:
            f.write(content)
            
        try:
            result = await workflow.process_invoice(str(temp_path))
        except Exception as process_error:
            logger.error(f"Error processing invoice {file.filename}: {str(process_error)}")
            raise HTTPException(
                status_code=422, 
                detail=f"Failed to process invoice: {str(process_error)}"
            )
        
        # Only save valid PDFs
        extracted_data = result.get('extracted_data')
        if extracted_data and extracted_data.get('invoice_number'):
            invoice_id = extracted_data['invoice_number']
            pdf_save_path = f"data/processed/{invoice_id}.pdf"
            os.makedirs("data/processed", exist_ok=True)
            import shutil
            shutil.copy(str(temp_path), pdf_save_path)
            save_invoice(result['extracted_data'])
        else:
            logger.warning(f"Invalid invoice data from {file.filename}: {extracted_data}")
            raise HTTPException(
                status_code=422,
                detail="Could not extract valid invoice data from file"
            )

        return result
    except HTTPException:
        raise  # Re-raise HTTP exceptions as is
    except Exception as e:
        logger.error(f"Unexpected error processing {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
    finally:
        if temp_path.exists():
            temp_path.unlink()


@app.get("/api/invoices")
async def get_invoices():
    try:
        if not INVOICES_FILE.exists():
            return []
        with INVOICES_FILE.open("r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading invoices: {str(e)}")
        return []


@app.get("/api/invoice_pdf/{invoice_id}")
async def get_invoice_pdf(invoice_id: str):
    pdf_path = f"data/processed/{invoice_id}.pdf"
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"{invoice_id}.pdf")


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
        if not INVOICES_FILE.exists():
            raise HTTPException(status_code=404, detail="No invoices found")
            
        with INVOICES_FILE.open('r') as f:
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
                detail=f"Invoice {invoice_id} not found in {str(INVOICES_FILE)}"
            )
            
        # Update only the fields that were provided
        update_dict = update_data.dict(exclude_unset=True)
        invoices[invoice_index].update(update_dict)
        
        # Save the updated invoices back to file
        with INVOICES_FILE.open('w') as f:
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