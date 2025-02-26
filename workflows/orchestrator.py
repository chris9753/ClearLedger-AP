import sys
import os
from pathlib import Path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
import asyncio
import json
import shutil
import uuid
from config.logging_config import logger  # Import singleton logger
from config.monitoring import Monitoring  # Import Monitoring class
from agents.extractor_agent import InvoiceExtractionAgent
from agents.validator_agent import InvoiceValidationAgent
from agents.matching_agent import PurchaseOrderMatchingAgent
from agents.human_review_agent import HumanReviewAgent
from db import InvoiceDB  # Import the InvoiceDB class
from setup_s3 import upload_to_s3  # Import the S3 upload function

# Constants
PROCESSED_DIR = Path("data/processed")
TEMP_DIR = Path("data/temp")
INVOICES_FILE = PROCESSED_DIR / "structured_invoices.json"
ANOMALIES_FILE = PROCESSED_DIR / "anomalies.json"

class InvoiceProcessingWorkflow:
    def __init__(self):
        logger.debug("Initializing workflow agents")
        self.extraction_agent = InvoiceExtractionAgent()
        self.validation_agent = InvoiceValidationAgent()
        self.matching_agent = PurchaseOrderMatchingAgent()
        self.review_agent = HumanReviewAgent()
        self.db = InvoiceDB()  # Initialize database connection
        # Create necessary directories
        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        TEMP_DIR.mkdir(parents=True, exist_ok=True)

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

    async def process_invoice(self, document_path: str, save_pdf: bool = True) -> dict:
        logger.info(f"Starting invoice processing for: {document_path}")
        logger.debug(f"Processing pipeline initiated for document: {document_path}")

        # Save a copy of the original PDF if it's not already in temp
        if not str(document_path).startswith(str(TEMP_DIR)):
            temp_pdf = TEMP_DIR / f"{uuid.uuid4()}.pdf"
            shutil.copy2(document_path, temp_pdf)
            document_path = str(temp_pdf)

        monitoring = Monitoring()
        extraction_time = None
        validation_time = None
        matching_time = None
        review_time = None
        pdf_url = None

        try:
            monitoring.start_timer("extraction")
            extracted_data = await self._retry_with_backoff(lambda: self.extraction_agent.run(document_path))
            extraction_time = monitoring.stop_timer("extraction")
            logger.info(f"Extraction completed: {extracted_data}")
            
            # Determine review status based on confidence
            review_status = "needs_review" if extracted_data.confidence < 0.90 else "complete"
            
            extracted_dict = {
                "vendor_name": extracted_data.vendor_name,
                "invoice_number": extracted_data.invoice_number,
                "invoice_date": extracted_data.invoice_date.strftime("%Y-%m-%d"),
                "total_amount": str(extracted_data.total_amount),
                "confidence": extracted_data.confidence,
                "po_number": extracted_data.po_number,
                "tax_amount": extracted_data.tax_amount,
                "currency": extracted_data.currency,
                "validation_status": "pending",
                "review_status": review_status
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
            
            extracted_dict["validation_status"] = validation_result.status
            
            if validation_result.status != "valid":
                extracted_dict["review_status"] = "needs_review"
                logger.warning(f"Invoice validation failed: {validation_result}")
                if "vendor_name" not in extracted_dict or not extracted_dict["vendor_name"]:
                    extracted_dict["confidence"] = 0.1
                    extracted_dict["file_name"] = os.path.basename(document_path)
                    extracted_dict["reason"] = "Non-invoice document detected"
                    invoice_entry = {
                        **extracted_dict,
                        "validation_errors": validation_result.errors,
                        "matching_status": "skipped",
                        "extraction_time": extraction_time,
                        "validation_time": validation_time,
                        "matching_time": 0,
                        "review_time": 0,
                        "total_time": extraction_time + validation_time
                    }
                    self._save_anomaly_entry(invoice_entry)
                    return {
                        "anomaly": True,
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
            if "'vendor_name'" in str(e):
                invoice_entry.update({
                    "review_status": "needs_review",
                    "confidence": 0.1,
                    "file_name": os.path.basename(document_path),
                    "reason": "Non-invoice document detected"
                })
                self._save_anomaly_entry(invoice_entry)
            else:
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

        # Save the PDF and upload to S3
        try:
            if save_pdf and extracted_dict.get('invoice_number'):
                pdf_path = PROCESSED_DIR / f"{extracted_dict['invoice_number']}.pdf"
                shutil.copy2(document_path, pdf_path)
                logger.info(f"Saved PDF for invoice {extracted_dict['invoice_number']} to {pdf_path}")
                
                # Upload to S3
                logger.info(f"Uploading invoice {extracted_dict['invoice_number']} to S3")
                pdf_url = upload_to_s3(str(pdf_path))
                logger.info(f"Successfully uploaded to S3: {pdf_url}")
                
                # Save to database
                db_entry = {
                    'invoice_number': extracted_dict['invoice_number'],
                    'vendor_name': extracted_dict['vendor_name'],
                    'invoice_date': extracted_dict['invoice_date'],
                    'total_amount': float(extracted_dict['total_amount']),
                    'status': review_result["status"],
                    'pdf_url': pdf_url
                }
                
                try:
                    invoice_id = self.db.insert_invoice(db_entry)
                    logger.info(f"Invoice {extracted_dict['invoice_number']} inserted into database with ID {invoice_id}")
                except Exception as db_error:
                    logger.error(f"Failed to insert invoice into database: {str(db_error)}")
        except Exception as s3_error:
            logger.error(f"Failed during S3 upload or database insertion: {str(s3_error)}")
            pdf_url = None

        result = {
            "extracted_data": extracted_dict,
            "validation_result": validation_result.model_dump(),
            "matching_result": matching_result,
            "review_result": review_result,
            "extraction_time": extraction_time,
            "validation_time": validation_time,
            "matching_time": matching_time,
            "review_time": review_time,
            "total_time": total_time,
            "pdf_url": pdf_url  # Include the S3 URL in the result
        }
        logger.info(f"Invoice processing completed: {document_path}")
        logger.debug(f"Final result: {result}")
        return result

    def _save_invoice_entry(self, invoice_entry):
        try:
            PROCESSED_DIR.mkdir(exist_ok=True)
            try:
                with open(INVOICES_FILE, "r") as f:
                    all_invoices = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                all_invoices = []
            for idx, inv in enumerate(all_invoices):
                if inv.get('invoice_number') == invoice_entry.get('invoice_number'):
                    all_invoices[idx] = invoice_entry
                    break
            else:
                all_invoices.append(invoice_entry)
            with open(INVOICES_FILE, "w") as f:
                json.dump(all_invoices, f, indent=4)
            logger.info(f"Saved invoice entry to {INVOICES_FILE}")
        except Exception as e:
            logger.error(f"Failed to save invoice entry: {str(e)}")

    def _save_anomaly_entry(self, anomaly_entry):
        try:
            PROCESSED_DIR.mkdir(exist_ok=True)
            try:
                with open(ANOMALIES_FILE, "r") as f:
                    all_anomalies = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                all_anomalies = []
            is_duplicate = False
            for idx, anomaly in enumerate(all_anomalies):
                if (anomaly.get('file_name') == anomaly_entry.get('file_name') or 
                    anomaly.get('invoice_number') == anomaly_entry.get('invoice_number')):
                    all_anomalies[idx] = anomaly_entry
                    is_duplicate = True
                    break
            if not is_duplicate:
                all_anomalies.append(anomaly_entry)
            with open(ANOMALIES_FILE, "w") as f:
                json.dump(all_anomalies, f, indent=4)
            logger.info(f"Saved anomaly entry to {ANOMALIES_FILE}")
        except Exception as e:
            logger.error(f"Failed to save anomaly entry: {str(e)}")

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