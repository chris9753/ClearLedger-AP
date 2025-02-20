# /config/settings.py
import os
from dotenv import load_dotenv

# Load environment variables from .env file (optional but recommended)
load_dotenv()

# Retrieve the API key from the environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not set in environment")