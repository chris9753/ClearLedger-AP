from typing import Dict, Any
from langchain.agents import AgentExecutor, create_structured_chat_agent
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain.tools import BaseTool
import logging
from config.logging_config import setup_logging

from agents.base_agent import BaseAgent
from data_processing.document_parser import extract_text_from_pdf
from data_processing.ocr_helper import ocr_process_image
from data_processing.confidence_scoring import compute_confidence_score
from models.invoice import InvoiceData
from config.settings import OPENAI_API_KEY

logger = setup_logging()

class InvoiceExtractionTool(BaseTool):
    name = "invoice_extraction_tool"
    description = "Extracts structured invoice data from text with confidence scores."

    def _run(self, invoice_text: str) -> Dict:
        try:
            logger.info("Starting invoice text extraction")
            extracted_data = self._extract_fields(invoice_text)
            confidence = compute_confidence_score(extracted_data)
            logger.info(f"Extraction completed with confidence: {confidence}")
            return {"data": extracted_data, "confidence": confidence}
        except Exception as e:
            logger.error(f"Extraction failed: {str(e)}")
            return {"error": str(e), "confidence": 0.0}

    def _extract_fields(self, text: str) -> Dict:
        # Placeholder—should use LLM in production
        fields = {
            "vendor_name": {"value": "Sample Vendor", "confidence": 0.95},
            "invoice_number": {"value": "INV12345", "confidence": 0.98},
            "invoice_date": {"value": "2025-01-15", "confidence": 0.90},
            "total_amount": {"value": "1500.00", "confidence": 0.99}
        }
        logger.info("Fields extracted successfully")
        return fields

class InvoiceExtractionAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        if not OPENAI_API_KEY:
            logger.error("OPENAI_API_KEY is not set")
            raise ValueError("OPENAI_API_KEY is not set in config.settings")
        self.llm = ChatOpenAI(model="gpt-4o", api_key=OPENAI_API_KEY)
        self.tools = [InvoiceExtractionTool()]
        self.agent = self._create_extraction_agent()

    def _create_extraction_agent(self) -> AgentExecutor:
        system_prompt = SystemMessagePromptTemplate.from_template(
            """You are an expert invoice data extraction agent..."""
        )
        human_prompt = HumanMessagePromptTemplate.from_template(
            "Extract structured data from this invoice text:\n{invoice_text}"
        )
        prompt = ChatPromptTemplate.from_messages([system_prompt, human_prompt])
        agent = create_structured_chat_agent(llm=self.llm, tools=self.tools, prompt=prompt, verbose=True)
        return AgentExecutor(agent=agent, tools=self.tools, verbose=True)

    def run(self, document_path: str) -> InvoiceData:
        logger.info(f"Processing document: {document_path}")
        if document_path.lower().endswith(".pdf"):
            invoice_text = extract_text_from_pdf(document_path)
        else:
            invoice_text = ocr_process_image(document_path)
        result = self.agent.invoke({"invoice_text": invoice_text})
        extracted_data = result["output"]["data"]
        confidence = result["output"]["confidence"]
        invoice_data = InvoiceData(**{k: v["value"] for k, v in extracted_data.items()}, confidence=confidence)
        logger.info(f"Successfully extracted invoice data with confidence {confidence}")
        return invoice_data

if __name__ == "__main__":
    import os
    agent = InvoiceExtractionAgent()
    raw_dir = "data/raw/"
    sample_pdf = next((f for f in os.listdir(raw_dir) if f.lower().endswith(".pdf")), None)
    if not sample_pdf:
        logger.error("No PDF found in data/raw/")
        raise FileNotFoundError("No PDF found in data/raw/")
    sample_pdf = os.path.join(raw_dir, sample_pdf)
    try:
        result = agent.run(sample_pdf)
        print(result.model_dump_json())
    except Exception as e:
        logger.error(f"Error during execution: {str(e)}")
        print(f"Error: {str(e)}")