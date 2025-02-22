#Handles rare cases & errors

import re
from agents.base_agent import BaseAgent
from models.invoice import InvoiceData
from decimal import Decimal
from config.logging_config import logger
from data_processing.document_parser import extract_text_from_pdf
from data_processing.ocr_helper import ocr_process_image

class FallbackAgent(BaseAgent):
    def run(self, document_path: str) -> InvoiceData:
        # Extract text based on file type
        if document_path.lower().endswith(".pdf"):
            text = extract_text_from_pdf(document_path)
        else:
            text = ocr_process_image(document_path)
        
        # Define regex patterns for key fields
        patterns = {
            "vendor_name": r"Vendor: (.+)",
            "invoice_number": r"Invoice #: (.+)",
            "invoice_date": r"Date: (\d{4}-\d{2}-\d{2})",
            "total_amount": r"Total: \$?(\d+\.\d{2})"
        }
        
        # Extract fields using regex
        extracted_data = {}
        for field, pattern in patterns.items():
            match = re.search(pattern, text)
            if match:
                extracted_data[field] = {"value": match.group(1), "confidence": 0.8}
            else:
                # Set default values for missing fields
                if field == "total_amount":
                    extracted_data[field] = {"value": "0.00", "confidence": 0.0}
                else:
                    extracted_data[field] = {"value": "Unknown", "confidence": 0.0}
        
        # Compute overall confidence
        confidence = sum([data["confidence"] for data in extracted_data.values()]) / len(extracted_data)
        
        # Create and return InvoiceData object
        invoice_data = InvoiceData(
            vendor_name=extracted_data["vendor_name"]["value"],
            invoice_number=extracted_data["invoice_number"]["value"],
            invoice_date=extracted_data["invoice_date"]["value"],
            total_amount=Decimal(extracted_data["total_amount"]["value"]),
            confidence=confidence
        )
        logger.info(f"Fallback extraction completed for {document_path}")
        return invoice_data