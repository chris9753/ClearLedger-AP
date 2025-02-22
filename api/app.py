print("Starting api/app.py")
import sys
print("sys imported")
import os
print("os imported")
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
print("Path adjusted")
from fastapi import FastAPI, UploadFile, File, HTTPException
print("FastAPI imported")
from workflows.orchestrator import InvoiceProcessingWorkflow
print("Workflow imported")
import json
print("json imported")
from pathlib import Path
print("Path imported")
import uuid
print("uuid imported")

# Ensure temp directory exists at startup
Path("data/temp").mkdir(parents=True, exist_ok=True)
print("Temp directory ensured")

app = FastAPI(title="Brim Invoice Processing API")
print("App created")
workflow = InvoiceProcessingWorkflow()
print("Workflow instance created")

OUTPUT_FILE = Path("data/processed/structured_invoices.json")

def save_invoice(invoice_data: dict):
    """Save invoice data to the structured_invoices.json file."""
    try:
        # Create the file with empty array if it doesn't exist
        if not OUTPUT_FILE.exists():
            OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
            with OUTPUT_FILE.open('w') as f:
                json.dump([], f)

        # Read existing data, append new invoice, and write back
        with OUTPUT_FILE.open('r+') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []  # Start fresh if file is corrupted
            
            data.append(invoice_data)
            f.seek(0)
            f.truncate()
            json.dump(data, f, indent=4)
            print(f"Invoice saved successfully: {invoice_data.get('invoice_number', 'unknown')}")
            
    except Exception as e:
        print(f"Error saving invoice: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving invoice: {str(e)}")

@app.post("/api/upload_invoice")
async def upload_invoice(file: UploadFile = File(...)):
    """Process an uploaded invoice PDF."""
    try:
        temp_path = Path(f"data/temp/{uuid.uuid4()}.pdf")
        temp_path.parent.mkdir(exist_ok=True)
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        result = await workflow.process_invoice(str(temp_path))
        # Save the processed invoice data
        save_invoice(result['extracted_data'])
        
        temp_path.unlink()
        return result  # Returns full result including timings from orchestrator
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing invoice: {str(e)}")

@app.get("/api/invoices")
async def get_invoices():
    """Fetch all processed invoices."""
    try:
        if not OUTPUT_FILE.exists():
            print(f"Warning: {OUTPUT_FILE} does not exist. Returning empty list.")
            return []
        
        try:
            with OUTPUT_FILE.open("r") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error reading invoices - malformed JSON: {e}")
            return []
    except Exception as e:
        print(f"Error reading invoices: {e}")
        return []  # Return empty list instead of raising an exception