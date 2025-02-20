# /data_processing/ocr_helper.py (Updated)

import pytesseract
from PIL import Image
import os
import logging
from config.logging_config import setup_logging

logger = setup_logging()

def ocr_process_image(image_path: str) -> str:
    if not os.path.exists(image_path):
        logger.error(f"Image file not found: {image_path}")
        raise FileNotFoundError(f"Image file not found: {image_path}")
    try:
        logger.info(f"Processing image with OCR: {image_path}")
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        if not text.strip():
            logger.warning(f"No text extracted from image: {image_path}")
            raise ValueError(f"No text extracted from image: {image_path}")
        logger.info(f"OCR completed for {image_path}")
        return text
    except Exception as e:
        logger.error(f"Failed to process image {image_path}: {str(e)}")
        raise RuntimeError(f"Failed to process image {image_path}: {str(e)}")