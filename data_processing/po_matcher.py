import pandas as pd
from fuzzywuzzy import fuzz
from models.invoice import InvoiceData  # Adjust import based on your structure
from config.logging_config import logger

class POMatcher:
    def __init__(self, vendor_data_path: str = "data/raw/vendor_data.csv"):
        self.vendor_data = pd.read_csv(vendor_data_path)
    
    def match_invoice(self, invoice: InvoiceData) -> tuple:
        best_match = None
        best_score = 0
        for _, row in self.vendor_data.iterrows():
            score = fuzz.token_set_ratio(invoice.vendor_name, row['Vendor Name'])
            if score > best_score:
                best_score = score
                best_match = row['Approved PO List']  # Single PO number
        confidence = best_score / 100.0 if best_match else 0.0
        logger.info(f"Matched invoice to PO {best_match} with confidence {confidence}")
        return best_match, confidence