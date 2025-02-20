# validator_agent.py

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
from datetime import datetime
from config.logging_config import setup_logging
from agents.base_agent import BaseAgent
from models.invoice import InvoiceData
from models.validation_schema import ValidationResult

logger = setup_logging()

class InvoiceValidationAgent(BaseAgent):
    def __init__(self):
        super().__init__()

    def run(self, invoice_data: InvoiceData) -> ValidationResult:
        """Validate invoice data for errors, missing fields, and anomalies."""
        logger.info(f"Validating invoice data: {invoice_data.invoice_number}")
        errors = {}

        # Check for missing required fields
        if not invoice_data.vendor_name:
            errors["vendor_name"] = "Missing"
        if not invoice_data.invoice_number:
            errors["invoice_number"] = "Missing"
        if not invoice_data.invoice_date:
            errors["invoice_date"] = "Missing"
        if not invoice_data.total_amount:
            errors["total_amount"] = "Missing"
        else:
            # Validate total_amount format and range
            try:
                total = float(invoice_data.total_amount)
                if total < 0:
                    errors["total_amount"] = "Negative value not allowed"
            except ValueError:
                errors["total_amount"] = "Invalid numeric format"

        # Validate invoice_date format (YYYY-MM-DD assumed)
        if invoice_data.invoice_date:
            try:
                datetime.strptime(str(invoice_data.invoice_date), "%Y-%m-%d")
            except ValueError:
                errors["invoice_date"] = "Invalid date format (expected YYYY-MM-DD)"

        # Basic anomaly check: confidence too low
        if invoice_data.confidence < 0.8:  # Adjustable threshold
            errors["confidence"] = f"Low confidence score: {invoice_data.confidence}"

        validation_result = ValidationResult(
            status="failed" if errors else "valid",
            errors=errors
        )
        logger.info(f"Validation completed: {validation_result}")
        return validation_result

if __name__ == "__main__":
    sample_data = InvoiceData(
        vendor_name="ABC Corp Ltd.",
        invoice_number="INV-2024-001",
        invoice_date="2024-02-18",
        total_amount="7595.00",
        confidence=0.955
    )
    agent = InvoiceValidationAgent()
    result = agent.run(sample_data)
    print(result.model_dump_json(indent=2))