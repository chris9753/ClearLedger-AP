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

```python 
/clear_ledger_project
├── agents/
│   ├── base_agent.py             # Base agent class for shared functionality
│   ├── extractor_agent.py        # Extracts data from invoices using OpenAI GPT-4o-mini
│   ├── validator_agent.py        # Validates fields and detects anomalies
│   ├── matching_agent.py         # Matches POs using fuzzy logic
│   ├── human_review_agent.py     # Routes flagged invoices for manual review
│   └── fallback_agent.py         # Regex-based backup extraction
│
├── api/
│   ├── app.py                    # Main FastAPI backend with upload and invoice retrieval endpoints
│   ├── human_review_api.py       # FastAPI endpoints for human review (wrapper around review_api.py)
│   └── review_api.py             # Core review API logic for manual corrections
│
├── config/
│   ├── settings.py               # API keys, paths, configs
│   ├── logging_config.py         # Structured JSON logging setup
│   └── monitoring.py             # Performance tracking for agent workflows
│
├── data/
│   ├── raw/
│   │   ├── invoices/             # 35 raw invoice PDFs
│   │   ├── test_samples/         # 5 test-case PDFs for RAG (e.g., invoice_standard_example.pdf)
│   │   └── vendor_data.csv       # PO reference data
│   ├── processed/
│   │   ├── structured_invoices.json  # Processed invoice results
│   │   └── corrections.json      # Human review corrections
│   └── temp/                     # Temporary directory for uploaded PDFs
│
├── data_processing/
│   ├── document_parser.py        # PDF parsing logic
│   ├── ocr_helper.py             # Pytesseract wrapper for OCR
│   ├── anomaly_detection.py      # Flags outliers and duplicates
│   ├── confidence_scoring.py     # Computes extraction confidence
│   └── rag_helper.py             # FAISS-based RAG for error detection
│
├── models/
│   ├── invoice.py                # Pydantic model for invoice data
│   └── validation_schema.py      # Pydantic schema for data validation
│
├── workflows/
│   └── orchestrator.py           # Orchestrates the multi-agent pipeline
│
├── frontend/
│   └── app.py                    # Streamlit frontend for upload, table, and review
│
├── tests/
│   ├── test_agents.py            # Unit tests for agents
│   └── test_workflows.py         # Integration tests for workflows
│
├── requirements.txt              # Project dependencies
├── README.md                     # Project documentation
└── architecture_diagram.png      # System architecture diagram
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

## Model Transition and Backend Updates

- **Initial Challenge**: We started with a local Mistral 7B model for invoice extraction but encountered inconsistent JSON output, leading to persistent parsing errors that stalled progress.
- **Switch to OpenAI API**: On Day 3, we replaced the 7B model with OpenAI’s gpt-4o-mini API using an API key (purchased $5 credits), improving reliability and eliminating local hosting needs.
- **Extractor Agent Fixes**: Updated `agents/extractor_agent.py` to use OpenAI API calls, set a default confidence score of 0.95 for successful extractions, and removed unnecessary LangChain dependencies originally used with Mistral.
- **Confidence Scoring Adjustments**: Modified `data_processing/confidence_scoring.py` to handle OpenAI’s flat JSON output, ensuring accurate confidence scores instead of defaulting to 0.0.
- **Orchestrator Enhancements**: Fixed `workflows/orchestrator.py` to serialize InvoiceData correctly (converting datetime.date and Decimal to strings), resolved indentation errors that prevented `process_invoice` execution, and ensured all invoices are processed and saved to `data/processed/structured_invoices.json`.
- **Serialization Success**: Overcame "Object of type date is not JSON serializable" errors by using an extracted_dict with string conversions, validated by successful JSON output.
- **Impact**: These changes resulted in a robust backend pipeline—extraction, validation, PO matching, and review now run end-to-end, processing multiple invoices with high accuracy and saving structured data reliably.

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

## ✅ Completed (Days 1–4)
- **InvoiceExtractionAgent:** Integration with Mistral 7B, strict JSON parsing, RAG integration, and fallback mechanisms
- **InvoiceValidationAgent:** Field validation with anomaly detection
- **PurchaseOrderMatchingAgent:** Fuzzy matching with vendor data and CSV fixes
- **Human Review API:** FastAPI endpoints for manual invoice corrections
- **FAISS-based RAG:** Classification of error-prone invoices
- **Async Processing & Error Handling:** Retries, structured logging, and enhanced error capture
- **Monitoring:** Execution time tracking integrated into the pipeline
- **Frontend development:** Successfully implemented the Streamlit frontend for uploading invoices, viewing processed data, and reviewing flagged cases (due to time constrains, I picked this option
instead of react/next.js)
- Integrated the frontend with the FastAPI backend, allowing seamless communication between the UI and the invoice processing system.
- Resolved issues with module imports and file paths, ensuring the system runs smoothly.
- Tested the end-to-end functionality, including uploading a PDF invoice, processing it, and reviewing the results.


## New Frontend Branch: react-nextjs-frontend

### Frontend Migration and Feature Enhancements
Transitioned from Streamlit to a modern React/Next.js frontend while maintaining the FastAPI backend infrastructure.

#### 🎯 Key Improvements
1. **Enhanced Review Capabilities**
   - Full invoice field editing (Vendor, Invoice Number, Date, Total Amount)
   - Seamless updates via `/api/update_invoice` endpoint
   - PDF viewing and preview functionality:
     - New tab viewing with `/api/invoice_pdf/{invoice_number}`
     - Inline previews using `react-pdf`
     - Enhanced PDF file handling in `data/processed/`

2. **Data Management**
   - Implemented deduplication logic in `save_invoice`
   - Automatic overwrite of existing entries with same `invoice_number`
   - Clean metrics display without duplicates

3. **RAG Helper Integration**
   - Full integration with processing workflow
   - Improved accuracy in both single and batch processing
   - Reduced manual review requirements
   - Matching previous Streamlit performance benchmarks

4. **Metrics Improvements**
   - Accurate "Valid Invoices" counting
   - Fixed `validation_status` propagation
   - Added processing time tracking
   - Eliminated "unknown" status occurrences

#### 🐛 Bug Fixes and Optimizations
- Resolved invoice date display issues across all pages
- Fixed validation status propagation
- Optimized PDF access and file paths
- Enhanced batch processing efficiency
- Refined CORS settings for security

#### 🔧 Technical Updates
- FormData handling improvements
- Path corrections for file operations
- Enhanced error handling and logging
- Optimized state management

### Current State

#### 📤 Upload Functionality
- Reliable single and batch uploads
- Complete data display
- Effective deduplication

#### 📋 Pages Overview
1. **Invoices Page**
   - Complete invoice listing
   - Accurate status indicators
   - Duplicate-free display

2. **Review Page**
   - Comprehensive field editing
   - PDF viewing options
   - Seamless data updates

3. **Metrics Page**
   - Total invoice count
   - Valid invoice tracking
   - Processing time metrics
   - Accurate status reporting

#### 🔍 RAG Helper Performance
- Successfully integrated
- Enhanced accuracy
- Reduced manual intervention
- Consistent processing results

### Future Enhancements
1. **Performance**
   - Batch processing optimization
   - RAG helper edge case handling

2. **Security**
   - Production CORS refinement
   - API endpoint authentication

3. **Testing**
   - Ongoing user feedback integration
   - UX improvement monitoring

4. **Documentation**
   - Continuous updates
   - Technical documentation expansion

---

## 🚀 Remaining Workflow (Days 5–10)

### Day 5 – Deployment & Post-Processing Analytics
- Dockerize the applications (Both React/Next.js and Streamlit)
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
```

---

## 🔧 Setup and Usage Instructions

### 📋 Project Overview
The Clear Ledger AP is a comprehensive multi-agent solution featuring a Streamlit frontend and FastAPI backend. It's designed to streamline invoice processing through automated extraction, validation, PO matching, and human review workflows.

### 📦 Prerequisites
- Python 3.12 or higher
- Virtual environment (recommended)
- Git installed
- Sample invoice PDFs and vendor data (provided in repository)

### ⚙️ Setup Instructions
1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd clear_ledger_project
   ```

2. **Create and Activate Virtual Environment**
   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate it
   # On Linux/Mac:
   source venv/bin/activate
   # On Windows:
   venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Verify Data Structure**
   - Ensure sample PDFs exist in:
     - `data/raw/invoices/` (main invoice directory)
     - `data/test_samples/` (contains `invoice_standard_example.pdf`)
   - Verify `data/raw/vendor_data.csv` is present

### 🚀 Running the Application
1. **Start the Backend Services**
   Open three separate terminals and run:

   ```bash
   # Terminal 1: Main API
   python -m uvicorn api.app:app --reload --port 8000

   # Terminal 2: Human Review API
   python -m uvicorn api.human_review_api:app --reload --port 8001

   # Terminal 3: Streamlit Frontend
   streamlit run frontend/app.py
   ```

2. **Access the Application**
   - Open your browser and navigate to `http://localhost:8501`
   - The main API will be available at `http://localhost:8000`
   - The review API will be available at `http://localhost:8001`

### 🧪 Testing the System

1. **Upload and Process Invoices**
   - Navigate to the "Upload" page
   - Upload a sample PDF (e.g., `data/test_samples/invoice_standard_example.pdf`)
   - Click "Submit" to process

2. **View Results**
   - "Invoices" page: Click "Refresh" to see processed invoices
   - "Review" page: Check flagged invoices (confidence < 0.9 or validation errors)
   - "Metrics" page: View performance data (extraction times, confidence scores)

3. **Review and Correct**
   - Review flagged invoices on the "Review" page
   - Submit corrections if needed
   - Monitor reprocessing status

4. **Note on Faulty Invoice Handling**
   - The system uses RAG (Retrieval-Augmented Generation) with a vector database to handle faulty invoices
   - During processing, each invoice is compared against stored 'poor quality' examples from `data/test_samples/`
   - This allows automatic identification and correction of common errors
   - Many faulty invoices are processed with high confidence (≥0.9) without manual intervention
   - Human review is only triggered for:
     - Invoices with confidence scores below 0.9
     - Significant validation errors not resolved by RAG

### 📝 Important Notes
- Extraction timing data is included in API responses and displayed in the metrics dashboard
- Duplicate invoices (same invoice_number) are automatically flagged
- Low confidence scores (< 0.9) trigger human review
- The system processes PDFs asynchronously, so there might be a brief delay before results appear
- All processing metrics and logs are stored for analysis

