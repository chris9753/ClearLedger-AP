# /agents/extractor_agent.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, Any
from langchain.agents import AgentExecutor, create_structured_chat_agent
from langchain_community.llms import Ollama
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain.tools import BaseTool
import logging
from config.logging_config import setup_logging
from agents.base_agent import BaseAgent
from data_processing.document_parser import extract_text_from_pdf
from data_processing.ocr_helper import ocr_process_image
from data_processing.confidence_scoring import compute_confidence_score
from models.invoice import InvoiceData
from decimal import Decimal

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
        # Placeholder for Day 2; Day 4 will use Mistral 7B for real parsing
        fields = {
            "vendor_name": {"value": "ABC Corp Ltd.", "confidence": 0.95},
            "invoice_number": {"value": "INV-2024-001", "confidence": 0.98},
            "invoice_date": {"value": "2024-02-18", "confidence": 0.90},
            "total_amount": {"value": "7595.00", "confidence": 0.99}
        }
        logger.info("Fields extracted successfully (placeholder)")
        return fields

class InvoiceExtractionAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.llm = Ollama(model="mistral:7b")
        self.tools = [InvoiceExtractionTool()]
        self.agent = self._create_extraction_agent()

    def _create_extraction_agent(self) -> AgentExecutor:
        system_prompt = SystemMessagePromptTemplate.from_template(
            """
            You are an expert invoice data extraction agent. Your goal is to parse invoice documents with high accuracy,
            extracting key financial information (vendor name, invoice number, invoice date, total amount) with precise confidence scoring.
            Use the following tools: {tool_names}
            Keep track of your steps in the agent_scratchpad.
            """
        )
        human_prompt = HumanMessagePromptTemplate.from_template(
            """
            Extract structured data from this invoice text:
            {invoice_text}
            Tools available: {tools}
            Agent scratchpad: {agent_scratchpad}
            """
        )
        prompt = ChatPromptTemplate.from_messages([system_prompt, human_prompt])
        agent = create_structured_chat_agent(llm=self.llm, tools=self.tools, prompt=prompt)
        return AgentExecutor(agent=agent, tools=self.tools, verbose=True, handle_parsing_errors=True)  # Added error handling

    def run(self, document_path: str) -> InvoiceData:
        logger.info(f"Processing document: {document_path}")
        if document_path.lower().endswith(".pdf"):
            invoice_text = extract_text_from_pdf(document_path)
        else:
            invoice_text = ocr_process_image(document_path)
        result = self.agent.invoke({
            "invoice_text": invoice_text,
            "agent_scratchpad": "",
            "tools": [t.name for t in self.tools],
            "tool_names": ", ".join([t.name for t in self.tools])
        })
        extracted_data = result["output"]["data"]
        confidence = result["output"]["confidence"]
        invoice_data = InvoiceData(
            vendor_name=extracted_data["vendor_name"]["value"],
            invoice_number=extracted_data["invoice_number"]["value"],
            invoice_date=extracted_data["invoice_date"]["value"],
            total_amount=Decimal(str(extracted_data["total_amount"]["value"])),
            confidence=confidence
        )
        logger.info(f"Successfully extracted invoice data with confidence {confidence}")
        return invoice_data

if __name__ == "__main__":
    import os
    agent = InvoiceExtractionAgent()
    raw_dir = "data/raw/"
    invoice_dirs = ["invoices", "test_samples"]
    sample_pdf = None
    for sub_dir in invoice_dirs:
        dir_path = os.path.join(raw_dir, sub_dir)
        if os.path.exists(dir_path):
            pdfs = [f for f in os.listdir(dir_path) if f.lower().endswith(".pdf")]
            if pdfs:
                sample_pdf = os.path.join(dir_path, pdfs[0])
                break
    if not sample_pdf:
        logger.error("No PDF found in data/raw/invoices/ or data/raw/test_samples/")
        raise FileNotFoundError("No PDF found in data/raw/invoices/ or data/raw/test_samples/")
    try:
        result = agent.run(sample_pdf)
        print(result.model_dump_json())
    except Exception as e:
        logger.error(f"Error during execution: {str(e)}")
        print(f"Error: {str(e)}")