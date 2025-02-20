# Handles structured logging for debugging & monitoring.
# /config/logging_config.py

import logging
from pythonjsonlogger import jsonlogger

logger = logging.getLogger("InvoiceProcessing")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(jsonlogger.JsonFormatter())
logger.handlers = [handler]  # Single handler to reduce duplicates

def setup_logging():
    return logger