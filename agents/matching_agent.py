# /agents/matching_agent.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
import asyncio
import pandas as pd
from fuzzywuzzy import fuzz
from config.logging_config import logger  # Import singleton logger
from agents.base_agent import BaseAgent
from models.invoice import InvoiceData

class PurchaseOrderMatchingAgent(BaseAgent):
    def __init__(self, po_file="data/raw/vendor_data.csv"):
        super().__init__()
        self.po_data = self._load_po_data(po_file)

    def _load_po_data(self, po_file: str) -> pd.DataFrame:
        logger.debug(f"Loading PO data from: {po_file}")
        try:
            df = pd.read_csv(po_file)
            required_columns = ["Vendor Name", "Approved PO List"]
            if not all(col in df.columns for col in required_columns):
                raise ValueError("PO CSV missing required columns: 'Vendor Name', 'Approved PO List'")
            logger.info(f"Loaded PO data from {po_file} with {len(df)} entries")
            logger.debug(f"PO data columns: {df.columns.tolist()}")
            return df
        except Exception as e:
            logger.error(f"Failed to load PO data: {str(e)}")
            raise

    async def run(self, invoice_data: InvoiceData) -> dict:
        logger.info(f"Matching invoice: {invoice_data.invoice_number}")
        logger.debug(f"Invoice data for matching: {invoice_data.model_dump()}")
        matches = []
        for _, po in self.po_data.iterrows():
            logger.debug(f"Comparing with PO: {po['Approved PO List']}")
            vendor_similarity = fuzz.token_sort_ratio(
                str(invoice_data.vendor_name).lower(),
                str(po["Vendor Name"]).lower()
            )
            match_confidence = vendor_similarity / 100
            logger.debug(f"Vendor similarity score: {vendor_similarity} (confidence: {match_confidence})")
            if match_confidence > 0.85:
                matches.append({
                    "po_number": po["Approved PO List"],
                    "match_confidence": match_confidence
                })
        if matches:
            best_match = max(matches, key=lambda x: x["match_confidence"])
            result = {
                "status": "matched",
                "po_number": best_match["po_number"],
                "match_confidence": best_match["match_confidence"]
            }
            logger.debug(f"Best match found: {best_match}")
        else:
            result = {
                "status": "unmatched",
                "po_number": None,
                "match_confidence": 0.0
            }
            logger.debug("No matches found above threshold")
        logger.info(f"Matching result: {result}")
        return result

if __name__ == "__main__":
    async def main():
        agent = PurchaseOrderMatchingAgent()
        sample_data = InvoiceData(
            vendor_name="ABC Corp Ltd.",
            invoice_number="INV-2024-001",
            invoice_date="2024-02-18",
            total_amount="7595.00",
            confidence=0.955
        )
        result = await agent.run(sample_data)
        print(result)
    asyncio.run(main())