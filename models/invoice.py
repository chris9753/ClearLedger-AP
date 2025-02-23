# Defines the schema for an invoice (invoice number, total amount, vendor, etc.).

from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from typing import Optional
from decimal import Decimal

class InvoiceData(BaseModel):
    """Pydantic model for structured invoice data with confidence scoring."""
    vendor_name: str = Field(..., description="Name of the vendor/supplier")
    invoice_number: str = Field(..., description="Unique invoice identifier")
    invoice_date: date = Field(..., description="Date of invoice issuance")
    total_amount: Decimal = Field(..., description="Total invoice amount")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Overall confidence score of extraction")
    po_number: Optional[str] = Field(None, description="Purchase Order reference number")
    tax_amount: Optional[Decimal] = Field(None, description="Tax amount if specified")
    currency: Optional[str] = Field(None, description="Invoice currency code")
    
    # Replace previous validator for invoice_date with stricter format check
    @field_validator("invoice_date", mode="before")
    def validate_invoice_date(cls, value):
        if isinstance(value, str):
            try:
                # Ensure the date is in YYYY-MM-DD format
                return datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("Invoice date must be in YYYY-MM-DD format")
        return value

    # Validator for total_amount to ensure it's positive
    @field_validator("total_amount")
    def validate_total_amount(cls, value):
        if value <= 0:
            raise ValueError("Total amount must be positive")
        return value

    class Config:
        json_encoders = {date: lambda v: v.isoformat()}
        json_schema_extra = {
            "example": {
                "vendor_name": "ABC Company",
                "invoice_number": "INV-2024-001",
                "invoice_date": "2024-02-18",
                "total_amount": "1500.00",
                "confidence": 0.95,
                "po_number": "PO-2024-001",
                "tax_amount": "150.00",
                "currency": "USD"
            }
        }