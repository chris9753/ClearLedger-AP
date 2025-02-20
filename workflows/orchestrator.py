# /workflows/orchestrator.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
import asyncio
from config.logging_config import logger  # Import singleton logger
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

        try:
            extracted_data = await self._retry_with_backoff(lambda: self.extraction_agent.run(document_path))
            logger.info(f"Extraction completed: {extracted_data}")
        except Exception as e:
            logger.error(f"Extraction failed after retries: {str(e)}")
            return {"status": "error", "message": str(e)}

        try:
            validation_result = await self._retry_with_backoff(lambda: self.validation_agent.run(extracted_data))
            logger.info(f"Validation completed: {validation_result}")
            if validation_result.status != "valid":
                logger.warning(f"Skipping PO matching due to validation failure: {validation_result}")
                return {
                    "extracted_data": extracted_data.model_dump(),
                    "validation_result": validation_result.model_dump(),
                    "matching_result": {"status": "skipped", "po_number": None, "match_confidence": 0.0},
                    "review_result": {"status": "skipped", "invoice_data": extracted_data.model_dump()}
                }
        except Exception as e:
            logger.error(f"Validation failed after retries: {str(e)}")
            return {"status": "error", "message": str(e)}

        try:
            matching_result = await self._retry_with_backoff(lambda: self.matching_agent.run(extracted_data))
            logger.info(f"Matching completed: {matching_result}")
        except Exception as e:
            logger.error(f"Matching failed after retries: {str(e)}")
            return {"status": "error", "message": str(e)}

        try:
            review_result = await self._retry_with_backoff(lambda: self.review_agent.run(extracted_data, validation_result))
            logger.info(f"Review completed: {review_result}")
        except Exception as e:
            logger.error(f"Review failed after retries: {str(e)}")
            return {"status": "error", "message": str(e)}

        result = {
            "extracted_data": extracted_data.model_dump(),
            "validation_result": validation_result.model_dump(),
            "matching_result": matching_result,
            "review_result": review_result
        }
        logger.info(f"Invoice processing completed: {document_path}")
        logger.debug(f"Final result: {result}")
        return result

async def main():
    workflow = InvoiceProcessingWorkflow()
    raw_dir = "data/raw/invoices/"
    sample_pdf = os.path.join(raw_dir, "invoice_0_missing_product_code.pdf")
    if not os.path.exists(sample_pdf):
        logger.error(f"Sample PDF not found: {sample_pdf}")
        raise FileNotFoundError(f"Sample PDF not found: {sample_pdf}")
    result = await workflow.process_invoice(sample_pdf)
    print(result)

if __name__ == "__main__":
    asyncio.run(main())