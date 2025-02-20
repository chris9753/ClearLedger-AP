# /data_processing/ocr_helper.py (Updated)

import pytesseract
from PIL import Image
import logging
from pathlib import Path
from config.logging_config import setup_logging

logger = setup_logging()

def ocr_process_image(image_path: str) -> str:
    try:
        if not Path(image_path).exists():
            logger.error(f"Image file not found: {image_path}")
            raise FileNotFoundError(f"Image file not found: {image_path}")
        logger.info(f"Processing image with OCR: {image_path}")
        with Image.open(image_path) as img:
            text = pytesseract.image_to_string(img)
        if not text.strip():
            logger.warning(f"No text extracted from image: {image_path}")
            raise ValueError(f"No text extracted from image: {image_path}")
        logger.info(f"Successfully performed OCR on {image_path}")
        return text.strip()
    except Exception as e:
        logger.error(f"Error performing OCR on {image_path}: {str(e)}")
        raise RuntimeError(f"Failed to process image {image_path}: {str(e)}")