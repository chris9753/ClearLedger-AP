from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import json
import uuid
from pathlib import Path
from glob import glob
from shutil import copyfile
from pydantic import BaseModel

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

OUTPUT_FILE = Path("data/structured_invoice.json")


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
    """Save invoice data to the structured_invoices.json file.\n    If an invoice with the same invoice_number exists, it will be updated instead of creating a duplicate."""
    try:
        if not OUTPUT_FILE.exists():
            OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
            with OUTPUT_FILE.open('w') as f:
                json.dump([], f)
        with OUTPUT_FILE.open('r+') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
            data = [inv for inv in data if inv.get('invoice_number') != invoice_data.get('invoice_number')]
            data.append(invoice_data)
            f.seek(0)
            f.truncate()
            json.dump(data, f, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving invoice: {str(e)}")


@app.post("/api/upload_invoice")
async def upload_invoice(file: UploadFile = File(...)):
    temp_path = Path(f"data/temp/{uuid.uuid4()}.pdf")
    try:
        temp_path.parent.mkdir(exist_ok=True)
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        result = await workflow.process_invoice(str(temp_path))
        save_invoice(result['extracted_data'])
        temp_path.unlink()
        return result
    except Exception as e:
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=500, detail=f"Error processing invoice: {str(e)}")


@app.get("/api/invoices")
async def get_invoices():
    try:
        if not OUTPUT_FILE.exists():
            return []
        with OUTPUT_FILE.open("r") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        return []
    except Exception as e:
        return []


@app.get("/api/invoice_pdf/{invoice_number}")
async def get_invoice_pdf(invoice_number: str):
    pdf_path = f"data/processed/{invoice_number}.pdf"
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"{invoice_number}.pdf")


class InvoiceUpdate(BaseModel):
    vendor_name: str
    invoice_number: str
    invoice_date: str
    total_amount: float


@app.put("/api/invoices/{invoice_number}")
async def update_invoice(invoice_number: str, update_data: InvoiceUpdate):
    try:
        if not OUTPUT_FILE.exists():
            raise HTTPException(status_code=404, detail="No invoices found")
        with OUTPUT_FILE.open('r') as f:
            invoices = json.load(f)
        invoice_found = False
        for invoice in invoices:
            if invoice['invoice_number'] == invoice_number:
                invoice.update({
                    'vendor_name': update_data.vendor_name,
                    'invoice_number': update_data.invoice_number,
                    'invoice_date': update_data.invoice_date,
                    'total_amount': update_data.total_amount
                })
                invoice_found = True
                break
        if not invoice_found:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} not found")
        with OUTPUT_FILE.open('w') as f:
            json.dump(invoices, f, indent=4)
        return {"message": f"Invoice {invoice_number} updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating invoice: {str(e)}")