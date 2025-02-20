# /data_processing/ocr_helper.py (Updated)
import pytesseract
from PIL import Image
import os

def ocr_process_image(image_path: str) -> str:
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")
    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        if not text.strip():
            raise ValueError(f"No text extracted from image: {image_path}")
        return text
    except Exception as e:
        raise RuntimeError(f"Failed to process image {image_path}: {str(e)}")