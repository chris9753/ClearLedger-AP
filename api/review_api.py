from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI(title="Invoice Human Review API")

class ReviewRequest(BaseModel):
    invoice_id: str
    corrections: dict
    reviewer_notes: str

class ReviewResponse(BaseModel):
    status: str
    message: str
    updated_invoice: dict = None

@app.get("/review/{invoice_id}", response_model=ReviewResponse)
async def get_review(invoice_id: str):
    return ReviewResponse(
        status="pending",
        message=f"Review needed for invoice {invoice_id}",
        updated_invoice={}
    )

@app.post("/review", response_model=ReviewResponse)
async def submit_review(review: ReviewRequest):
    veteran_reviewer_prompt = (
        "You are a veteran invoice reviewer. Review the provided corrections and determine the final invoice data. "
        "Return only a JSON object with fields: status and updated_invoice, without any extra commentary."
    )
    return ReviewResponse(
        status="reviewed",
        message="Invoice reviewed successfully",
        updated_invoice=review.corrections
    )

@app.post("/submit_correction", response_model=ReviewResponse)
async def submit_correction(correction: ReviewRequest):
    try:
        # Save correction to a file (replace with database logic as needed)
        with open("data/processed/corrections.json", "a") as f:
            json.dump(correction.dict(), f)
            f.write("\n")
        return ReviewResponse(
            status="corrected",
            message=f"Correction submitted for invoice {correction.invoice_id}",
            updated_invoice=correction.corrections
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)