# /workflows/orchestrator.py

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
from config.logging_config import setup_logging
from agents.extractor_agent import InvoiceExtractionAgent
from agents.validator_agent import InvoiceValidationAgent
from agents.matching_agent import PurchaseOrderMatchingAgent

logger = setup_logging()

class InvoiceProcessingWorkflow:
    def __init__(self):
        self.extraction_agent = InvoiceExtractionAgent()
        self.validation_agent = InvoiceValidationAgent()
        self.matching_agent = PurchaseOrderMatchingAgent()

    def process_invoice(self, document_path: str) -> dict:
        """Orchestrate extraction, validation, and PO matching of an invoice."""
        logger.info(f"Starting invoice processing for: {document_path}")
        
        # Step 1: Extract data
        try:
            extracted_data = self.extraction_agent.run(document_path)
            logger.info(f"Extraction completed: {extracted_data}")
        except Exception as e:
            logger.error(f"Extraction failed: {str(e)}")
            return {"status": "error", "message": str(e)}

        # Step 2: Validate extracted data
        try:
            validation_result = self.validation_agent.run(extracted_data)
            logger.info(f"Validation completed: {validation_result}")
            if validation_result.status != "valid":
                logger.warning(f"Skipping PO matching due to validation failure: {validation_result}")
                return {
                    "extracted_data": extracted_data.model_dump(),
                    "validation_result": validation_result.model_dump(),
                    "matching_result": {"status": "skipped", "po_number": None, "match_confidence": 0.0}
                }
        except Exception as e:
            logger.error(f"Validation failed: {str(e)}")
            return {"status": "error", "message": str(e)}

        # Step 3: Match with PO
        try:
            matching_result = self.matching_agent.run(extracted_data)
            logger.info(f"Matching completed: {matching_result}")
        except Exception as e:
            logger.error(f"Matching failed: {str(e)}")
            return {"status": "error", "message": str(e)}

        # Compile result
        result = {
            "extracted_data": extracted_data.model_dump(),
            "validation_result": validation_result.model_dump(),
            "matching_result": matching_result
        }
        logger.info(f"Invoice processing completed: {document_path}")
        return result

if __name__ == "__main__":
    import os
    workflow = InvoiceProcessingWorkflow()
    raw_dir = "data/raw/invoices/"
    sample_pdf = os.path.join(raw_dir, "invoice_0_missing_product_code.pdf")
    if not os.path.exists(sample_pdf):
        logger.error(f"Sample PDF not found: {sample_pdf}")
        raise FileNotFoundError(f"Sample PDF not found: {sample_pdf}")
    result = workflow.process_invoice(sample_pdf)
    print(result)