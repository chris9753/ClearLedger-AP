# 📊 Clear Ledger AP

## 🎯 Overview
An intelligent invoice processing system leveraging LangChain's multi-agent workflow to automate extraction, validation, and purchase order (PO) matching. Built for the "Technical Challenge: Intelligent Invoice Processing with LangChain Multi-Agent Workflow" to reduce manual processing time by 75% and minimize errors.

## 📋 Key Features
- Processes PDFs from:
  - `data/raw/invoices/` (35 invoices)
  - `data/raw/test_samples/` (3 PDFs)
- Integrates multiple agents for extraction, validation, matching, human review, and fallback procedures
- Implements RAG-based error handling and performance monitoring
- Utilizes async processing with robust error handling, structured logging, and retries

---

## 📅 Development Timeline

### Day 1: Project Planning and Setup
#### 🎯 Goal
Establish a solid foundation for the 10-day development process.

#### 🔨 Activities
- Organized a detailed 10-day workflow
- Analyzed "Technical Challenge" requirements
- Reserved AI tools:
  - GPT-o3-mini 
  - Claude 3.5 Sonnet
  - GitHub Copilot 
  - Grok3


- Defined project structure:

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
- Initialized GitHub repository
- Installed dependencies:
  - `langchain==0.2.16`
  - `pdfplumber`
  - `pytesseract`
- Cloned dataset
- Prepared for extraction agent development

---

### Day 2: Invoice Extraction Agent
#### 🔧 Implementation Details
- **InvoiceExtractionAgent** (`agents/extractor_agent.py`):
  - Utilizes LangChain 0.2.16 with Mistral 7B (Ollama)
  - Extracts structured data from PDFs

#### 🛠️ Components
1. **PDF Parsing & OCR**
   - `data_processing/document_parser.py` (pdfplumber)
   - `data_processing/ocr_helper.py` (pytesseract)

2. **Data Models**
   - `InvoiceData` model built with Pydantic v2
   - Supports required and optional fields with Decimal precision

3. **Processing Features**
   - Confidence scoring
   - JSON logging
   - Error handling with fallback mechanisms

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

#### Invoice Validation & Extraction Refinement
- **InvoiceValidationAgent** (`agents/validator_agent.py`):
  - Validates extracted data for missing fields and format inconsistencies
  - Adds anomaly detection for duplicates and outliers
  - Orchestrates extraction and validation workflows

**Improvements:**
- Enhanced error handling using try-except blocks
- Processed PDFs from multiple subdirectories
- Introduced Pydantic v2 validation models

#### 📊 Sample Output
```json
{
  "extracted_data": { ... },
  "validation_result": { "status": "valid", "errors": {} }
}
```

#### PO Matching & Multi-Agent Coordination
- **PurchaseOrderMatchingAgent**:
  - Implements fuzzy matching for purchase order validation
  - Integrates full pipeline orchestration
  - Resolves CSV column mismatches
  - Provides comprehensive logging

#### 📊 Sample Output
```json
{
  "extracted_data": { ... },
  "validation_result": { "status": "valid", "errors": {} },
  "matching_result": { "status": "unmatched", "po_number": null, "match_confidence": 0.0 }
}
```

#### Error Handling, Edge Cases & Human-in-the-Loop
- Added async processing with retry mechanisms
- **Human Review API** implemented in `api/review_api.py` using FastAPI to allow manual corrections via a “veteran reviewer” prompt
- Optimized logging configuration and enhanced async compatibility

**Improvements:**
- Fixed asyncio dependencies
- Adjusted extraction prompts
- Enhanced error handling

#### 📊 Sample Output
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
    "invoice_data": { ... }
  }
}
```

Additional Enhancements:
- Updated LLM prompt in `agents/extractor_agent.py` to enforce JSON-only output, improving parsing reliability
- Integrated FAISS-based RAG module in `data_processing/rag_helper.py` to store error invoices and classify new ones, reducing the need for human intervention
- Maintained verbose logging for effective debugging and performance tracking

---

### Day 3: Advanced Error Handling, RAG Integration, and Extraction Refinement

#### 🎯 Goals
- Enhance error handling using RAG to preemptively address edge cases
- Refine the extraction agent for consistent and reliable output
- Introduce performance monitoring to track pipeline efficiency

#### 🔨 Activities
- **Terminal Analysis:**
  - Ran `python workflows/orchestrator.py` and observed AgentExecutor processing
  - Noted narrative text in LLM JSON-like output causing parsing failures
  - Identified inconsistent formatting in `total_amount` (e.g., "1793.7" vs. "1793.70")

- **Extraction Agent Refinement:**
  - Updated prompt in `agents/extractor_agent.py` to enforce strict JSON-only response
  - Added post-processing with regex to clean any extraneous narrative text

- **Enhanced Error Handling with RAG:**
  - Integrated FAISS-based RAG in `data_processing/rag_helper.py` to classify invoices against known error cases
  - Updated extraction logic to log warnings if an invoice is similar to known error-prone cases

- **Fallback Mechanism:**
  - Added `agents/fallback_agent.py` implementing regex-based extraction as a backup

- **Monitoring:**
  - Developed `config/monitoring.py` to log execution times and integrate performance tracking in `workflows/orchestrator.py`
- **Data Persistence:**
  - Saved processed results in `data/processed/structured_invoices.json` for further analysis

#### 🛠️ Challenges and Solutions
- **LLM Narrative Output:**
  - Challenge: LLM output wrapping JSON in narrative text
  - Solution: Enforce JSON-only output and apply regex cleaning, with fallback extraction if necessary

- **Inconsistent Formatting:**
  - Challenge: Variations in `total_amount` formatting
  - Solution: Standardize post-processing to ensure two decimal places

#### 📊 Expected Sample Output
```json
{
  "vendor_name": "Solis Inc",
  "invoice_number": "IN_3515484",
  "invoice_date": "2025-01-30",
  "total_amount": "1793.70",
  "confidence": 0.95
}
```

#### 📝 Notes for CEO
- **Progress:** Ahead of schedule; already integrating advanced features (monitoring and full pipeline orchestration) on Day 3
- **Challenges:** Addressed LLM output consistency with prompt refinement and regex cleaning
- **Next Steps:** Finalize parsing reliability and commence frontend development on Day 4

---

## 🔍 Overall Project Structure
- **agents/**: Contains various agents for extraction (`extractor_agent.py`), validation (`validator_agent.py`), matching (`matching_agent.py`), and fallback (`fallback_agent.py`)
- **api/**: RESTful API endpoints (e.g., `review_api.py` for human-in-the-loop review)
- **config/**: Configuration files including monitoring and logging settings
- **data/**: Raw PDFs (`data/raw/invoices/`, `data/raw/test_samples/`) and processed outputs (`data/processed/structured_invoices.json`)
- **data_processing/**: Modules for document parsing, OCR, anomaly detection, and RAG integration (`document_parser.py`, `ocr_helper.py`, `rag_helper.py`)
- **models/**: Pydantic models such as `InvoiceData`
- **workflows/**: Orchestration of the processing pipeline (`orchestrator.py`)
- **tests/**: Testing suites and placeholder for future tests

---

## ✅ Completed (Days 1–3)
- **InvoiceExtractionAgent:** Integration with Mistral 7B, strict JSON parsing, RAG integration, and fallback mechanisms
- **InvoiceValidationAgent:** Field validation with anomaly detection
- **PurchaseOrderMatchingAgent:** Fuzzy matching with vendor data and CSV fixes
- **Human Review API:** FastAPI endpoints for manual invoice corrections
- **FAISS-based RAG:** Classification of error-prone invoices
- **Async Processing & Error Handling:** Retries, structured logging, and enhanced error capture
- **Monitoring:** Execution time tracking integrated into the pipeline

---

## 🚀 Remaining Workflow (Days 4–10)

### Day 4 – Frontend Development & Integration
- Build a basic frontend (Streamlit/Next.js) for invoice upload, review panel, and results display
- Integrate frontend with backend APIs
- Benchmark processing times and confidence scores

### Day 5 – Deployment & Post-Processing Analytics
- Dockerize the application
- Set up CI/CD Pipeline with GitHub Actions
- Develop an analytics dashboard for trends, anomalies, and key performance metrics

### Day 6 – Documentation & Comprehensive Testing
- Finalize and expand documentation (README, architecture diagrams, performance reports)
- Enhance test coverage with unit, integration, and edge case tests
- Code refactoring and cleanup

### Day 7 – Finalization & Submission
- Conduct full end-to-end testing on diverse invoice samples
- Optimize performance (retry logic, FAISS indexing)
- Record a demo video showcasing system workflow and performance highlights
- Prepare final submission packaging (GitHub push, deliverables, submission email)

---

## 🚀 Setup Guide

### Dependencies
```bash
pip install -r requirements.txt
```

### Key Packages
- langchain==0.2.16
- pdfplumber (>=0.10.0)
- pytesseract (>=0.3.10)
- pydantic (>=2.0.0)
- fuzzywuzzy (>=0.18.0)
- aiofiles (>=23.2.1)

### Ollama Setup
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull mistral:7b
ollama run mistral:7b "test"
```

### Data Verification
1. Ensure PDFs are located in:
   - `data/raw/invoices/`
   - `data/raw/test_samples/`
2. Verify presence of `vendor_data.csv` in `data/raw/`

### Execution
```bash
python workflows/orchestrator.py