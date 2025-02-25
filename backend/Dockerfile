FROM python:3.12-slim

# Install system dependencies, including Tesseract and Curl
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-only PyTorch explicitly using the correct index URL
RUN pip install torch==2.6.0+cpu --index-url https://download.pytorch.org/whl/cpu

# Then install other dependencies from requirements.txt
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "8000"]