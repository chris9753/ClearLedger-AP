# validator_agent.py

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
import asyncio
from datetime import datetime
from config.logging_config import setup_logging
from agents.base_agent import BaseAgent
from models.invoice import InvoiceData
from models.validation_schema import ValidationResult
from data_processing.anomaly_detection import AnomalyDetector

logger = setup_logging()

class InvoiceValidationAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.anomaly_detector = AnomalyDetector()

    async def run(self, invoice_data: InvoiceData) -> ValidationResult:
        logger.info(f"Validating invoice data: {invoice_data.invoice_number}")
        errors = {}
        if not invoice_data.vendor_name:
            errors["vendor_name"] = "Missing"
        if not invoice_data.invoice_number:
            errors["invoice_number"] = "Missing"
        if not invoice_data.invoice_date:
            errors["invoice_date"] = "Missing"
        if not invoice_data.total_amount:
            errors["total_amount"] = "Missing"
        else:
            try:
                total = float(invoice_data.total_amount)
                if total < 0:
                    errors["total_amount"] = "Negative value not allowed"
            except ValueError:
                errors["total_amount"] = "Invalid numeric format"
        if invoice_data.invoice_date:
            try:
                datetime.strptime(str(invoice_data.invoice_date), "%Y-%m-%d")
            except ValueError:
                errors["invoice_date"] = "Invalid date format (expected YYYY-MM-DD)"
        if invoice_data.confidence < 0.8:
            errors["confidence"] = f"Low confidence score: {invoice_data.confidence}"
        anomaly_errors = await asyncio.to_thread(self.anomaly_detector.detect_anomalies, invoice_data)
        errors.update(anomaly_errors)
        validation_result = ValidationResult(
            status="failed" if errors else "valid",
            errors=errors
        )
        logger.info(f"Validation completed: {validation_result}")
        return validation_result