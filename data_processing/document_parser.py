# /data_processing/document_parser.py (Updated)

import pdfplumber
from typing import Optional
import logging
from pathlib import Path
from config.logging_config import setup_logging

logger = setup_logging()

def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        if not Path(pdf_path).exists():
            logger.error(f"PDF file not found: {pdf_path}")
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        logger.info(f"Extracting text from PDF: {pdf_path}")
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(page.extract_text() for page in pdf.pages if page.extract_text())
        if not text:
            logger.warning(f"No text content extracted from {pdf_path}")
            raise ValueError(f"No text extracted from PDF: {pdf_path}")
        logger.info(f"Successfully extracted text from {pdf_path}")
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF {pdf_path}: {str(e)}")
        raise RuntimeError(f"Failed to parse PDF {pdf_path}: {str(e)}")