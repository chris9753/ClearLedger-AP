from typing import Dict, Any
import logging
from config.logging_config import setup_logging

logger = setup_logging()

def compute_confidence_score(extracted_data: Dict[str, Any]) -> float:
    try:
        if not extracted_data:
            logger.warning("Empty extracted data received")
            return 0.0
        confidences = [field["confidence"] for field in extracted_data.values() if isinstance(field, dict) and "confidence" in field]
        if not confidences:
            logger.warning("No confidence scores found in extracted data")
            return 0.0
        avg_confidence = sum(confidences) / len(confidences)
        logger.info(f"Computed average confidence score: {avg_confidence:.2f}")
        return avg_confidence
    except Exception as e:
        logger.error(f"Error computing confidence score: {str(e)}")
        return 0.0