# /agents/human_review_agent.py

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
import asyncio
from config.logging_config import setup_logging
from agents.base_agent import BaseAgent
from models.invoice import InvoiceData

logger = setup_logging()

class HumanReviewAgent(BaseAgent):
    def __init__(self):
        super().__init__()

    async def run(self, invoice_data: InvoiceData, validation_result: dict) -> dict:
        logger.info(f"Reviewing invoice: {invoice_data.invoice_number}")
        if invoice_data.confidence < 0.8 or validation_result["status"] != "valid":
            review_task = {
                "status": "needs_review",
                "invoice_data": invoice_data.model_dump(),
                "validation_errors": validation_result["errors"]
            }
        else:
            review_task = {"status": "approved", "invoice_data": invoice_data.model_dump()}
        logger.info(f"Review result: {review_task}")
        return review_task