from agents.extractor_agent import InvoiceExtractionAgent
from agents.validator_agent import InvoiceValidationAgent
from agents.human_review_agent import HumanReviewAgent
from config.logging_config import logger

class Pipeline:
    def __init__(self):
        self.extraction_agent = InvoiceExtractionAgent()
        self.validation_agent = InvoiceValidationAgent()
        self.review_agent = HumanReviewAgent()

    async def run(self, document_path: str):
        extracted_data = await self.extraction_agent.run(document_path)
        validation_result = await self.validation_agent.run(extracted_data)
        if validation_result.status != "valid":
            review_result = await self.review_agent.run(extracted_data, validation_result)
            logger.info(f"Pipeline completed with review for {document_path}")
            return {"extracted_data": extracted_data, "validation_result": validation_result, "review_result": review_result}
        logger.info(f"Pipeline completed without review for {document_path}")
        return {"extracted_data": extracted_data, "validation_result": validation_result}