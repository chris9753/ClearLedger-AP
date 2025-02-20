# extractor_agent.py

# /agents/extractor_agent.py (Updated)
from typing import Dict
from langchain.agents import AgentExecutor, create_structured_chat_agent
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain.tools import BaseTool
import json

from data_processing.document_parser import extract_text_from_pdf
from data_processing.ocr_helper import ocr_process_image
from data_processing.confidence_scoring import compute_confidence_score
from models.invoice import InvoiceData
from config.settings import OPENAI_API_KEY

class InvoiceExtractionTool(BaseTool):
    name = "invoice_extraction_tool"
    description = "Extracts structured invoice data from text with confidence scores."

    def _run(self, invoice_text: str) -> Dict:
        try:
            extracted_data = self._extract_fields(invoice_text)
            confidence = compute_confidence_score(extracted_data)
            return {"data": extracted_data, "confidence": confidence}
        except Exception as e:
            return {"error": f"Extraction failed: {str(e)}", "confidence": 0.0}

    def _extract_fields(self, text: str) -> Dict:
        # Placeholder; in practice, use LLM parsing here
        return {
            "vendor_name": {"value": "Sample Vendor", "confidence": 0.95},
            "invoice_number": {"value": "INV12345", "confidence": 0.98},
            "invoice_date": {"value": "2025-01-15", "confidence": 0.90},
            "total_amount": {"value": 1500.00, "confidence": 0.99}
        }

class InvoiceExtractionAgent:
    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set in config.settings")
        self.llm = ChatOpenAI(model="gpt-4o", api_key=OPENAI_API_KEY)  # Updated model
        self.tools = [InvoiceExtractionTool()]
        self.agent = self._create_extraction_agent()

    def _create_extraction_agent(self) -> AgentExecutor:
        system_prompt = SystemMessagePromptTemplate.from_template(
            """
            You are an expert invoice data extraction agent. Your goal is to parse invoice documents with high accuracy,
            extracting key financial information (vendor name, invoice number, invoice date, total amount) with precise confidence scoring.
            Use the provided tools and return structured JSON data.
            """
        )
        human_prompt = HumanMessagePromptTemplate.from_template(
            "Extract structured data from the following invoice text:\n{invoice_text}"
        )
        prompt = ChatPromptTemplate.from_messages([system_prompt, human_prompt])

        agent = create_structured_chat_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt,
            verbose=True,
            handle_parsing_errors=True
        )
        return AgentExecutor(agent=agent, tools=self.tools, verbose=True)

    def extract(self, document_path: str) -> InvoiceData:
        # Case-insensitive file type check
        if document_path.lower().endswith(".pdf"):
            invoice_text = extract_text_from_pdf(document_path)
        else:
            invoice_text = ocr_process_image(document_path)

        result = self.agent.invoke({"invoice_text": invoice_text})
        if "error" in result["output"]:
            raise RuntimeError(result["output"]["error"])

        extracted_data = result["output"]["data"]
        confidence = result["output"]["confidence"]

        try:
            invoice_data = InvoiceData(
                vendor_name=extracted_data["vendor_name"]["value"],
                invoice_number=extracted_data["invoice_number"]["value"],
                invoice_date=extracted_data["invoice_date"]["value"],
                total_amount=extracted_data["total_amount"]["value"],
                confidence=confidence
            )
            return invoice_data
        except KeyError as e:
            raise ValueError(f"Missing field in extracted data: {str(e)}")
        

def _extract_fields(self, text: str) -> Dict:
    import logging
    from config.logging_config import setup_logging
    logger = setup_logging()

    if not text or not isinstance(text, str):
        logger.error("Invalid invoice text provided")
        return {}

    # Placeholder LLM logic (replace with actual parsing)
    fields = {
        "vendor_name": {"value": "Sample Vendor", "confidence": 0.95},
        "invoice_number": {"value": "INV12345", "confidence": 0.98},
        "invoice_date": {"value": "2025-01-15", "confidence": 0.90},
        "total_amount": {"value": 1500.00, "confidence": 0.99}
    }

    # Basic edge case checks
    for field, data in fields.items():
        if not data["value"]:
            logger.warning(f"Missing or empty {field}")
            data["confidence"] = 0.0

    logger.info("Fields extracted successfully")
    return fields

if __name__ == "__main__":
    agent = InvoiceExtractionAgent()
    sample_pdf = "data/test_samples/sample_invoice.pdf"
    try:
        result = agent.extract(sample_pdf)
        print(result.model_dump_json())
    except Exception as e:
        print(f"Error: {str(e)}")