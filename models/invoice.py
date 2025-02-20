# Defines the schema for an invoice (invoice number, total amount, vendor, etc.).

from pydantic import BaseModel, Field, validator
from datetime import date
from typing import Optional

class InvoiceData(BaseModel):
    vendor_name: str = Field(..., description="Name of the vendor issuing the invoice")
    invoice_number: str = Field(..., description="Unique invoice identifier")
    invoice_date: date = Field(..., description="Date the invoice was issued")
    total_amount: float = Field(..., ge=0, description="Total amount due on the invoice")
    confidence: float = Field(..., ge=0, le=1, description="Overall confidence score of the extraction")

    @validator("invoice_date", pre=True)
    def parse_date(cls, value):
        if isinstance(value, str):
            return date.fromisoformat(value)
        return value

    class Config:
        json_encoders = {
            date: lambda v: v.isoformat()
        }