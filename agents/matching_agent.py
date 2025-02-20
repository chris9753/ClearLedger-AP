#Matches invoices to POs

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
import pandas as pd
from fuzzywuzzy import fuzz
from config.logging_config import setup_logging
from agents.base_agent import BaseAgent
from models.invoice import InvoiceData

logger = setup_logging()

class PurchaseOrderMatchingAgent(BaseAgent):
    def __init__(self, po_file="data/raw/vendor_data.csv"):
        super().__init__()
        self.po_data = self._load_po_data(po_file)

    def _load_po_data(self, po_file: str) -> pd.DataFrame:
        """Load PO data from CSV."""
        try:
            df = pd.read_csv(po_file)
            required_columns = ["PO Number", "Vendor Name", "Total Amount"]
            if not all(col in df.columns for col in required_columns):
                raise ValueError("PO CSV missing required columns: 'PO Number', 'Vendor Name', 'Total Amount'")
            logger.info(f"Loaded PO data from {po_file} with {len(df)} entries")
            return df
        except Exception as e:
            logger.error(f"Failed to load PO data: {str(e)}")
            raise

    def run(self, invoice_data: InvoiceData) -> dict:
        """Match invoice data with purchase orders."""
        logger.info(f"Matching invoice: {invoice_data.invoice_number}")
        matches = []
        invoice_total = float(invoice_data.total_amount)

        for _, po in self.po_data.iterrows():
            vendor_similarity = fuzz.token_sort_ratio(
                str(invoice_data.vendor_name).lower(),
                str(po["Vendor Name"]).lower()
            )
            amount_similarity = 100 if abs(invoice_total - float(po["Total Amount"])) < 0.01 else max(0, 100 - abs(invoice_total - float(po["Total Amount"])) / invoice_total * 100)
            match_confidence = (vendor_similarity * 0.6 + amount_similarity * 0.4) / 100

            if match_confidence > 0.85:  # Adjustable threshold
                matches.append({
                    "po_number": po["PO Number"],
                    "match_confidence": match_confidence
                })

        if matches:
            best_match = max(matches, key=lambda x: x["match_confidence"])
            result = {
                "status": "matched",
                "po_number": best_match["po_number"],
                "match_confidence": best_match["match_confidence"]
            }
        else:
            result = {
                "status": "unmatched",
                "po_number": None,
                "match_confidence": 0.0
            }
        logger.info(f"Matching result: {result}")
        return result

if __name__ == "__main__":
    sample_data = InvoiceData(
        vendor_name="ABC Corp Ltd.",
        invoice_number="INV-2024-001",
        invoice_date="2024-02-18",
        total_amount="7595.00",
        confidence=0.955
    )
    agent = PurchaseOrderMatchingAgent()
    result = agent.run(sample_data)
    print(result)