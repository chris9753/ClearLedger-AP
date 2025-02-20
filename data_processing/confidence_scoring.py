# /data_processing/confidence_scoring.py (Updated)
from typing import Dict

def compute_confidence_score(extracted_data: Dict) -> float:
    if not extracted_data or not isinstance(extracted_data, dict):
        return 0.0
    confidences = [field["confidence"] for field in extracted_data.values() if "confidence" in field]
    return sum(confidences) / len(confidences) if confidences else 0.0