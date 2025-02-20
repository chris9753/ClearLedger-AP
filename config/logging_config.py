# /config/logging_config.py
import logging
from pythonjsonlogger import jsonlogger

# Singleton logger
_logger = None

def setup_logging(verbose=False):
    """Configure structured JSON logging with optional verbosity."""
    global _logger
    if _logger is None:
        _logger = logging.getLogger("InvoiceProcessing")
        log_level = logging.DEBUG if verbose else logging.INFO
        _logger.setLevel(log_level)
        handler = logging.StreamHandler()
        formatter = jsonlogger.JsonFormatter(
            '%(asctime)s %(name)s %(levelname)s %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        _logger.handlers = [handler]  # Single handler
        _logger.debug("Logging initialized with verbose mode" if verbose else "Logging initialized with info mode")
    return _logger

# Export logger for direct import
logger = setup_logging(verbose=True)  # Default to verbose for debugging

if __name__ == "__main__":
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")