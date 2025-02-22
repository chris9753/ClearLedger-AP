import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
import asyncio
import json
from config.logging_config import logger  # Import singleton logger
from config.monitoring import Monitoring  # Import Monitoring class
from agents.extractor_agent import InvoiceExtractionAgent
from agents.validator_agent import InvoiceValidationAgent
from agents.matching_agent import PurchaseOrderMatchingAgent
from agents.human_review_agent import HumanReviewAgent

class InvoiceProcessingWorkflow:
    def __init__(self):
        logger.debug("Initializing workflow agents")
        self.extraction_agent = InvoiceExtractionAgent()
        self.validation_agent = InvoiceValidationAgent()
        self.matching_agent = PurchaseOrderMatchingAgent()
        self.review_agent = HumanReviewAgent()

    async def _retry_with_backoff(self, func, max_retries=3, base_delay=1):
        logger.debug(f"Starting retry mechanism with max_retries={max_retries}, base_delay={base_delay}")
        for attempt in range(max_retries):
            try:
                result = await func()
                logger.debug(f"Retry attempt {attempt + 1} succeeded")
                return result
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"All {max_retries} retries failed: {str(e)}")
                    raise
                delay = base_delay * (2 ** attempt)
                logger.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying in {delay}s...")
                await asyncio.sleep(delay)

    async def process_invoice(self, document_path: str) -> dict:
        logger.info(f"Starting invoice processing for: {document_path}")
        logger.debug(f"Processing pipeline initiated for document: {document_path}")

        monitoring = Monitoring()
        extraction_time = None
        validation_time = None
        matching_time = None
        review_time = None

        try:
            monitoring.start_timer("extraction")
            extracted_data = await self._retry_with_backoff(lambda: self.extraction_agent.run(document_path))
            extraction_time = monitoring.stop_timer("extraction")
            logger.info(f"Extraction completed: {extracted_data}")
            extracted_dict = {
                "vendor_name": extracted_data.vendor_name,
                "invoice_number": extracted_data.invoice_number,
                "invoice_date": extracted_data.invoice_date.strftime("%Y-%m-%d"),
                "total_amount": str(extracted_data.total_amount),
                "confidence": extracted_data.confidence,
                "po_number": extracted_data.po_number,
                "tax_amount": extracted_data.tax_amount,
                "currency": extracted_data.currency
            }
        except Exception as e:
            logger.error(f"Extraction failed after retries: {str(e)}")
            extraction_time = monitoring.stop_timer("extraction")
            invoice_entry = {
                "status": "error",
                "message": str(e),
                "extraction_time": extraction_time,
                "validation_time": 0,
                "matching_time": 0,
                "review_time": 0,
                "total_time": extraction_time
            }
            self._save_invoice_entry(invoice_entry)
            return invoice_entry

        # Validation
        try:
            monitoring.start_timer("validation")
            validation_result = await self._retry_with_backoff(lambda: self.validation_agent.run(extracted_data))
            validation_time = monitoring.stop_timer("validation")
            logger.info(f"Validation completed: {validation_result}")
            if validation_result.status != "valid":
                logger.warning(f"Skipping PO matching due to validation failure: {validation_result}")
                invoice_entry = {
                    **extracted_dict,
                    "validation_status": validation_result.status,
                    "validation_errors": validation_result.errors,
                    "matching_status": "skipped",
                    "review_status": "skipped",
                    "extraction_time": extraction_time,
                    "validation_time": validation_time,
                    "matching_time": 0,
                    "review_time": 0,
                    "total_time": extraction_time + validation_time
                }
                self._save_invoice_entry(invoice_entry)
                return {
                    "extracted_data": extracted_dict,
                    "validation_result": validation_result.model_dump(),
                    "matching_result": {"status": "skipped", "po_number": None, "match_confidence": 0.0},
                    "review_result": {"status": "skipped", "invoice_data": extracted_dict},
                    "extraction_time": extraction_time,
                    "validation_time": validation_time,
                    "matching_time": 0,
                    "review_time": 0,
                    "total_time": extraction_time + validation_time
                }
        except Exception as e:
            logger.error(f"Validation failed after retries: {str(e)}")
            validation_time = monitoring.stop_timer("validation")
            invoice_entry = {
                **extracted_dict,
                "status": "error",
                "message": str(e),
                "extraction_time": extraction_time,
                "validation_time": validation_time,
                "matching_time": 0,
                "review_time": 0,
                "total_time": extraction_time + validation_time
            }
            self._save_invoice_entry(invoice_entry)
            return invoice_entry

        # Matching
        try:
            monitoring.start_timer("matching")
            matching_result = await self._retry_with_backoff(lambda: self.matching_agent.run(extracted_data))
            matching_time = monitoring.stop_timer("matching")
            logger.info(f"Matching completed: {matching_result}")
        except Exception as e:
            logger.error(f"Matching failed after retries: {str(e)}")
            matching_time = monitoring.stop_timer("matching")
            invoice_entry = {
                **extracted_dict,
                "validation_status": validation_result.status,
                "matching_status": "error",
                "matching_error": str(e),
                "review_status": "skipped",
                "extraction_time": extraction_time,
                "validation_time": validation_time,
                "matching_time": matching_time,
                "review_time": 0,
                "total_time": extraction_time + validation_time + matching_time
            }
            self._save_invoice_entry(invoice_entry)
            return invoice_entry

        # Review
        try:
            monitoring.start_timer("review")
            review_result = await self._retry_with_backoff(lambda: self.review_agent.run(extracted_data, validation_result))
            review_time = monitoring.stop_timer("review")
            logger.info(f"Review completed: {review_result}")
        except Exception as e:
            logger.error(f"Review failed after retries: {str(e)}")
            review_time = monitoring.stop_timer("review")
            invoice_entry = {
                **extracted_dict,
                "validation_status": validation_result.status,
                "matching_status": matching_result["status"],
                "review_status": "error",
                "review_error": str(e),
                "extraction_time": extraction_time,
                "validation_time": validation_time,
                "matching_time": matching_time,
                "review_time": review_time,
                "total_time": extraction_time + validation_time + matching_time + review_time
            }
            self._save_invoice_entry(invoice_entry)
            return invoice_entry

        # All steps completed successfully
        total_time = extraction_time + validation_time + matching_time + review_time
        invoice_entry = {
            **extracted_dict,
            "validation_status": validation_result.status,
            "matching_status": matching_result["status"],
            "review_status": review_result["status"],
            "extraction_time": extraction_time,
            "validation_time": validation_time,
            "matching_time": matching_time,
            "review_time": review_time,
            "total_time": total_time
        }
        self._save_invoice_entry(invoice_entry)

        result = {
            "extracted_data": extracted_dict,
            "validation_result": validation_result.model_dump(),
            "matching_result": matching_result,
            "review_result": review_result,
            "extraction_time": extraction_time,
            "validation_time": validation_time,
            "matching_time": matching_time,
            "review_time": review_time,
            "total_time": total_time
        }
        logger.info(f"Invoice processing completed: {document_path}")
        logger.debug(f"Final result: {result}")
        return result

    def _save_invoice_entry(self, invoice_entry, output_file="data/processed/structured_invoices.json"):
        try:
            os.makedirs("data/processed", exist_ok=True)
            try:
                with open(output_file, "r") as f:
                    all_invoices = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                all_invoices = []
            all_invoices.append(invoice_entry)
            with open(output_file, "w") as f:
                json.dump(all_invoices, f, indent=4)
            logger.info(f"Saved invoice entry to {output_file}")
        except Exception as e:
            logger.error(f"Failed to save invoice entry: {str(e)}")

async def main():
    workflow = InvoiceProcessingWorkflow()
    invoice_dir = "data/raw/invoices/"
    for filename in os.listdir(invoice_dir):
        if filename.endswith(".pdf"):
            document_path = os.path.join(invoice_dir, filename)
            try:
                logger.info(f"Starting invoice processing for: {document_path}")
                result = await workflow.process_invoice(document_path)
                logger.info(f"Processed {filename}: {result}")
                print(f"Result for {filename}: {result}")
            except Exception as e:
                logger.error(f"Failed to process {filename}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())