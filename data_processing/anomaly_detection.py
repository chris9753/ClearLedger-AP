# Detects invoice anomalies

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import logging
from typing import List, Dict
from config.logging_config import setup_logging
from models.invoice import InvoiceData

logger = setup_logging()

class AnomalyDetector:
    def __init__(self):
        self.past_invoices: List[InvoiceData] = []  # In-memory storage for simplicity; Day 8 can use a DB

    def detect_anomalies(self, invoice_data: InvoiceData, past_invoices: List[InvoiceData] = None) -> Dict[str, str]:
        """Detect anomalies in invoice data."""
        logger.info(f"Detecting anomalies for invoice: {invoice_data.invoice_number}")
        anomalies = {}
        past_invoices = past_invoices or self.past_invoices

        # Check for duplicates by invoice number
        for past in past_invoices:
            if past.invoice_number == invoice_data.invoice_number:
                anomalies["duplicate"] = f"Duplicate invoice number: {invoice_data.invoice_number}"
                break

        # Check total amount outlier (simple heuristic: >2x median of past totals)
        if past_invoices:
            totals = [float(p.total_amount) for p in past_invoices if p.total_amount]
            if totals:
                median_total = sorted(totals)[len(totals) // 2]
                current_total = float(invoice_data.total_amount)
                if current_total > 2 * median_total or current_total < 0.5 * median_total:
                    anomalies["total_amount"] = f"Unusual total: {current_total} (median: {median_total})"

        # Update past invoices
        self.past_invoices.append(invoice_data)
        logger.info(f"Anomaly detection result: {anomalies}")
        return anomalies

if __name__ == "__main__":
    detector = AnomalyDetector()
    sample_data = InvoiceData(
        vendor_name="ABC Corp Ltd.",
        invoice_number="INV-2024-001",
        invoice_date="2024-02-18",
        total_amount="7595.00",
        confidence=0.955
    )
    past_invoices = [
        InvoiceData(vendor_name="XYZ Inc.", invoice_number="INV-2024-002", invoice_date="2024-02-17", total_amount="1000.00", confidence=0.9)
    ]
    result = detector.detect_anomalies(sample_data, past_invoices)
    print(result)