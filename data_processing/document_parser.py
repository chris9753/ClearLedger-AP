# /data_processing/document_parser.py (Updated)

import pdfplumber
import os
import logging
from config.logging_config import setup_logging

logger = setup_logging()

def extract_text_from_pdf(pdf_path: str) -> str:
    if not os.path.exists(pdf_path):
        logger.error(f"PDF file not found: {pdf_path}")
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    try:
        logger.info(f"Extracting text from PDF: {pdf_path}")
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        if not text.strip():
            logger.warning(f"No text extracted from PDF: {pdf_path}")
            raise ValueError(f"No text extracted from PDF: {pdf_path}")
        logger.info(f"Text extraction completed for {pdf_path}")
        return text
    except Exception as e:
        logger.error(f"Failed to parse PDF {pdf_path}: {str(e)}")
        raise RuntimeError(f"Failed to parse PDF {pdf_path}: {str(e)}")