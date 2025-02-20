# /data_processing/document_parser.py (Updated)
import pdfplumber
import os

def extract_text_from_pdf(pdf_path: str) -> str:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        if not text.strip():
            raise ValueError(f"No text extracted from PDF: {pdf_path}")
        return text
    except Exception as e:
        raise RuntimeError(f"Failed to parse PDF {pdf_path}: {str(e)}")