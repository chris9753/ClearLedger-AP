# 📊 Clear Ledger AP

## 🎯 Overview
An intelligent invoice processing system leveraging LangChain's multi-agent workflow to automate extraction, validation, and purchase order (PO) matching. Built for the "Technical Challenge: Intelligent Invoice Processing with LangChain Multi-Agent Workflow" to reduce manual processing time by 75% and minimize errors.

### 📋 Key Features
- Processes PDFs from:
    - `data/raw/invoices/` (35 invoices)
    - `data/raw/test_samples/` (3 PDFs)
- Integrates extraction, validation, matching, and human review
- Implements async processing and robust error handling

## 📅 Development Timeline

### Day 1: Project Planning and Setup
#### 🎯 Goal
Establish a solid foundation for the 10-day development process.

#### 🔨 Activities
- Organized detailed 10-day workflow
- Analyzed "Technical Challenge" requirements
- Reserved AI tools:
    - GPT-4 Turbo
    - Claude 3.5
    - GitHub Copilot X
    - LangSmith
- Project structure:
    ```bash
    /clear_ledger_project
    ├── agents/
    ├── config/
    ├── data/
    ├── data_processing/
    ├── models/
    ├── workflows/
    ├── tests/
    ├── README.md
    ├── requirements.txt
    ├── Dockerfile
    ```

#### 🏁 Outcome
- Initialized GitHub repo
- Installed dependencies:
    - `langchain==0.2.16`
    - `pdfplumber`
    - `pytesseract`
- Cloned dataset
- Prepared for extraction agent development

### Day 2: Invoice Extraction Agent
#### 🔧 Implementation Details
- **InvoiceExtractionAgent** (`agents/extractor_agent.py`)
    - Uses LangChain 0.2.16 + Mistral 7B (Ollama)
    - Extracts structured data from PDFs

#### 🛠️ Components
1. **PDF Parsing & OCR**
     - `data_processing/document_parser.py` (pdfplumber)
     - `data_processing/ocr_helper.py` (pytesseract)

2. **Data Models**
     - `InvoiceData` Model with Pydantic v2
     - Supports required and optional fields
     - Uses `Decimal` precision
    3. **Processing Features**
        - Confidence scoring
        - JSON logging
        - Error handling

    #### 📊 Sample Output
    ```json
    {
        "vendor_name": "ABC Corp Ltd.",
        "invoice_number": "INV-2024-001",
        "invoice_date": "2024-02-18",
        "total_amount": "7595.00",
        "confidence": 0.955
    }
    ```

    #### Build the Invoice Validation Agent & Refine Extraction
    ##### 🔧 Implementation Details
    - Implemented **InvoiceValidationAgent** (`agents/validator_agent.py`)
    - Validates extracted data for missing fields and format errors
    - Added anomaly detection for duplicates and outliers
    - Created workflow orchestration for extraction and validation

    ##### 🛠️ Improvements
    - Enhanced error handling with try-except blocks
    - Processed PDFs from multiple subdirectories
    - Added Pydantic v2 validation models

    ##### 📊 Sample Output
    ```json
    {
      "extracted_data": {...},
      "validation_result": {"status": "valid", "errors": {}}
    }
    ```

    #### PO Matching Agent & Multi-Agent Coordination
    ##### 🔧 Implementation Details
    - Implemented **PurchaseOrderMatchingAgent** with fuzzy matching
    - Enhanced workflow orchestration for full pipeline integration
    - Fixed CSV column mismatches
    - Added comprehensive logging

    ##### 📊 Sample Output
    ```json
    {
      "extracted_data": {...},
      "validation_result": {"status": "valid", "errors": {}},
      "matching_result": {"status": "unmatched", "po_number": null, "match_confidence": 0.0}
    }
    ```

    #### Error Handling, Edge Cases & Human-in-the-Loop
    ##### 🔧 Implementation Details
    - Added async processing with retry mechanism
    - Implemented human review for low-confidence cases
    - Optimized logging configuration
    - Enhanced async compatibility across all agents

    ##### 🛠️ Improvements
    - Fixed asyncio dependencies
    - Adjusted extraction prompts
    - Enhanced error handling

    ##### 📊 Sample Output
    ```json
    {
      "extracted_data": {
        "vendor_name": "ABC Corp Ltd.",
        "invoice_number": "INV-2024-001",
        "invoice_date": "2024-02-18",
        "total_amount": "7595.00",
        "confidence": 0.955,
        "po_number": null,
        "tax_amount": null,
        "currency": null
      },
      "validation_result": {
        "status": "valid",
        "errors": {}
      },
      "matching_result": {
        "status": "unmatched",
        "po_number": null,
        "match_confidence": 0.0
      },
      "review_result": {
        "status": "approved",
        "invoice_data": {...}
      }
    }
    ```

- Implemented a human-in-the-loop verification UI in **api/review_api.py** using FastAPI. This provides endpoints for retrieving review requests and submitting manual corrections, leveraging a "veteran reviewer" prompt for LLM-assisted review.

- Updated **agents/extractor_agent.py** to enhance the LLM prompt. The prompt now enforces JSON-only output for improved parsing reliability, particularly for challenging invoices (e.g. invoices missing a product code).

- Added a FAISS-based RAG integration module in **data_processing/rag_helper.py**. This module stores error invoices and classifies new invoices by similarity, reducing unnecessary human intervention.

- Continued to leverage verbose logging for debugging and performance tracking across the system.

## Overall Project Structure

- **agents/**: Implements various agents including extraction, validation, matching, human review, and fallback.
- **api/**: Provides RESTful APIs including endpoints for human review (e.g., **review_api.py**).
- **data_processing/**: Contains modules for document parsing, OCR, confidence scoring, anomaly detection, and RAG integration.

## 🚀 Setup Guide

### Dependencies
```bash
pip install -r requirements.txt
```

### Key Packages
- `langchain==0.2.16`
- `langchain_community==0.2.16`
- `pdfplumber>=0.10.0`
- `pytesseract>=0.3.10`
- `pydantic>=2.0.0`
- `fuzzywuzzy>=0.18.0`
- `aiofiles>=23.2.1`

### Ollama Setup
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull mistral:7b
ollama run mistral:7b "test"
```

### Data Verification
1. Ensure PDFs are in:
     - `data/raw/invoices/`
     - `data/raw/test_samples/`
2. Verify `vendor_data.csv` in `data/raw/`

### Execution
```bash
python workflows/orchestrator.py
```


## Next Steps

Proceed to implement additional Day 6 deliverables focusing on UI enhancements and edge-case handling.

## 🔜 Next Steps
### Remaining Tasks (Days 3-10):

#### Day 3:

##### Refine error handling (async processing, retry mechanisms).
##### Expand edge-case testing.
##### Develop initial human-in-the-loop mechanism (CLI or basic UI).

#### Day 4:

##### Fully implement human-in-the-loop verification UI (FastAPI + Streamlit).
##### Add API enhancements: authentication, caching, rate limiting.
##### Enhance orchestrator with fallback strategies.
##### Integrate comprehensive monitoring.

#### Day 5:

##### Develop a basic frontend UI (upload page, review panel, invoice table).
##### Build API endpoints to support frontend interactions.
##### Implement performance benchmarking and tracking.

#### Day 6:

##### Dockerize the application.
##### Set up CI/CD pipelines.
##### Plan and begin deployment strategy (AWS Lambda/GCP Cloud Run).
##### Add post-processing analytics (dashboard, anomaly detection visualizations).

#### Day 7:

##### Write detailed documentation (README, architecture diagram, performance report).
##### Conduct extensive unit, integration, and load testing.
##### Final code refactoring and cleanup.

#### Day 8:

##### Run full end-to-end testing across the system.
##### Optimize performance metrics and finalize benchmarks.
##### Record the final video demo.
##### Prepare final submission (push to GitHub, compile deliverables, draft submission email).