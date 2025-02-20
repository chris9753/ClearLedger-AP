# /config/settings.py
import os
from dotenv import load_dotenv

load_dotenv()

# No longer needed for OpenAI API key (decided to run local model); kept for potential future environment variables
# Add project-specific settings if needed (e.g., confidence thresholds)
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.8))