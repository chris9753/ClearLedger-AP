# 📊 Clear Ledger AP (Next.js Frontend)

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Node.js](https://img.shields.io/badge/Node.js-Latest-green.svg)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-Latest-black.svg)](https://nextjs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT4-412991.svg)](https://openai.com/)

*An intelligent invoice processing system leveraging LangChain's multi-agent workflow*

[Overview](#-overview) •
[Features](#-key-features) •
[Development Journey](#-development-journey) •
[Architecture](#-architecture) •
[Setup Guide](#-setup-guide) •
[Usage](#-usage-guide) •
[Progress](#-project-progress)

</div>

## 🎯 Overview

This repository houses the Next.js frontend version of the Clear Ledger AP, built as a technical challenge response. The system demonstrates an intelligent solution that leverages LangChain's multi-agent workflow to automate invoice processing, aiming to reduce manual processing time by 75% while minimizing errors.

> 💡 *A Streamlit frontend version is available in a separate repository for those interested in a simpler, Python-based interface.*

## 📋 Key Features

- **Automated Processing Pipeline**
  - Processes PDFs from configurable directories:
    - `data/raw/invoices/` (35 invoices)
    - `data/raw/test_samples/` (3 PDFs)
  - Multi-agent system for extraction, validation, and matching
  - RAG-based error handling with FAISS
  - Asynchronous processing with robust error management

- **Modern Frontend Interface**
  - Next.js-powered dashboard
  - Real-time processing updates
  - Interactive invoice review system
  - Comprehensive metrics visualization

- **Enterprise-Grade Architecture**
  - FastAPI backend with WebSocket support
  - Structured logging and monitoring
  - Comprehensive test coverage
  - Containerized deployment ready

## 📅 Development Journey

### Week 1: Foundation & Core Development

#### Day 1: Project Planning and Setup
- 🎯 **Objectives Achieved**
  - Organized detailed 10-day development roadmap
  - Analyzed technical challenge requirements
  - Initialized project structure
  
- 🛠️ **Technical Implementation**
  - Set up FastAPI backend and Next.js frontend
  - Installed core dependencies:
    - LangChain (0.2.16)
    - PDF processing (pdfplumber)
    - OCR capabilities (pytesseract)

#### Day 2: Invoice Processing Foundation
- 🎯 **Objectives Achieved**
  - Implemented core extraction logic
  - Established validation framework
  
- 🛠️ **Technical Implementation**
  - Developed InvoiceExtractionAgent with Pydantic models
  - Implemented PDF parsing and OCR pipeline
  - Created validation system with anomaly detection

#### Day 3: Intelligence & Error Handling
- 🎯 **Objectives Achieved**
  - Enhanced system reliability
  - Improved extraction accuracy
  
- 🛠️ **Technical Implementation**
  - Integrated FAISS-based RAG for error handling
  - Migrated from Mistral 7B to OpenAI's gpt-4o-mini API
  - Implemented performance monitoring
  - Added fallback mechanisms

#### Day 4: Advanced Features & Frontend
- 🎯 **Objectives Achieved**
  - Completed PO matching system
  - Enhanced user interface
  
- 🛠️ **Technical Implementation**
  - Built PurchaseOrderMatchingAgent with fuzzy matching
  - Migrated from Streamlit to Next.js
  - Implemented advanced frontend features

#### Day 5: System Refinement
- 🎯 **Objectives Achieved**
  - Resolved critical system issues
  - Enhanced user experience
  
- 🛠️ **Technical Fixes**
  1. **WebSocket Connectivity**
     - Issue: Connection failures during batch processing
     - Solution: Implemented proper WebSocket handling
     
  2. **File Upload Reliability**
     - Issue: 422 errors with invalid files
     - Solution: Enhanced error handling and user feedback
     
  3. **PDF Viewing System**
     - Issue: 404 errors in PDF preview
     - Solution: Restructured PDF storage and serving
     
  4. **Data Format Consistency**
     - Issue: Date format inconsistencies
     - Solution: Standardized date handling (yyyy-MM-dd)
     
  5. **Batch Processing UX**
     - Issue: Multiple submission issues
     - Solution: Implemented proper loading states and safeguards

### Day 6: Project Refinement and Optimization
- **Objectives Achieved**: Streamlined project structure, removed redundant files, and optimized integration for production deployment.
- **Technical Fixes**:
  - Merged `api/human_review_api.py` into `api/review_api.py`, consolidating review functionality into a single API module running on port 8000, eliminating redundancy.
  - Removed `workflows/pipeline.py` as its functionality is fully covered by `workflows/orchestrator.py`, ensuring a single, robust workflow manager.
  - Reviewed `frontend-nextjs/public/` directory and removed unnecessary SVG files (e.g., `file.svg`, `globe.svg`) not referenced in the application, reducing build size.
  - Verified `frontend-nextjs/src/pages/anomalies.tsx` integration, confirming it’s linked to the backend via `lib/api.ts` for anomaly retrieval, and kept as a functional page.
  - Ensured `lib/api.ts` only handles API client logic without duplicating backend processing, maintaining clear separation of concerns.

## 🏗️ Architecture

### Project Structure
```
clear_ledger_nextjs/
├── Dockerfile
├── main.py
├── package.json
├── package-lock.json
├── README.md
├── requirements.txt
├── .gitignore
├── agents/
│   ├── __init__.py
│   ├── base_agent.py
│   ├── extractor_agent.py
│   ├── fallback_agent.py
│   ├── human_review_agent.py
│   ├── matching_agent.py
│   ├── validator_agent.py
│   └── __pycache__/
│       └── … (compiled files)
├── api/
│   ├── __init__.py
│   ├── app.py
│   ├── review_api.py  <!-- consolidated review functionality -->
│   └── __pycache__/
│       └── … (compiled files)
├── config/
│   ├── __init__.py
│   ├── logging_config.py
│   ├── monitoring.py
│   ├── settings.py
│   └── __pycache__/
│       └── … (compiled files)
├── data/
│   ├── processed/
│   │   └── anomalies.json
│   │   └── structured_invoices.json
│   ├── raw/
│   │   └── invoices/ *pdfs
│   │   └── test_invoice.txt
│   │   └── vendor_data.csv
│   ├── temp/
│   │   └── … (temporary files)
│   └── test_samples/
│       └── … (sample faulty invoices for rag_helper.py)
├── data_processing/
│   ├── __init__.py
│   ├── anomaly_detection.py
│   ├── confidence_scoring.py
│   ├── document_parser.py
│   ├── ocr_helper.py
│   ├── po_matcher.py
│   ├── rag_helper.py
│   └── __pycache__/
│       └── … (compiled files)
├── frontend-nextjs/
│   ├── eslint.config.mjs
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── lib/
│   │   └── api.ts
│   ├── public/
│   │   └── next.svg
│   │   └── vercel.svg
│   │   └── window.svg
│   └── src/
│       ├── pages/
│       │   ├── _app.tsx
│       │   ├── anomalies.tsx  <!-- functional page for anomaly review -->
│       │   ├── index.tsx
│       │   ├── invoices.tsx
│       │   ├── metrics.tsx
│       │   └── review.tsx
│       │   └── upload.tsx
│       ├── components/
│       │   └── Layout.tsx
│       └── styles/
│           └── globals.css
├── models/
│   ├── __init__.py
│   ├── invoice.py
│   ├── validation_schema.py
│   └── __pycache__/
│       └── … (compiled files)
├── tests/
│   ├── __init__.py
│   ├── load_tests.py
│   ├── test_agents.py
│   ├── test_endpoints.py
│   ├── test_frontend.js
│   ├── test_utils.py
│   └── test_workflows.py
└── workflows/
    ├── __init__.py
    ├── orchestrator.py  <!-- sole workflow manager -->
    └── __pycache__/
        └── … (compiled files)
```
### Architecture Diagram
```
+-------------------+       +-------------------+
|   Streamlit UI    |       |    Next.js UI     |
| (Python-based)    |       | (Production-ready)|
| - Streamlit       |       | - React, Next.js  |
|   Dashboard       |       | - Tailwind CSS    |
+-------------------+       +-------------------+
           |                         |
           +-----------+-------------+
                       |
                +------+------+
                | FastAPI     |
                | Backend     |
                | - WebSocket |
                |   Support   |
                +------+------+
                       |
           +-----------+-------------+
           |                         |
+-------------------+       +-------------------+
|   Extraction      |       |   Validation      |
|   Agent           |       |   Agent           |
| - gpt-4o-mini     |       | - Pydantic Models |
| - pdfplumber      |       |                   |
| - pytesseract     |       +-------------------+
+-------------------+                |
           |                         |
           +-----------+-------------+
                       |
                +------+------+
                | PO Matching |
                |    Agent    |
                | - Fuzzy      |
                |   Matching   |
                +------+------+
                       |
                +------+------+
                | Human Review|
                |    Agent    |
                | - Confidence|
                |   < 0.9     |
                +------+------+
                       |
                +------+------+
                | Fallback    |
                |    Agent    |
                | - FAISS RAG  |
                +------+------+
                       |
                +------+------+
                | Data Storage|
                | - structured|
                |   _invoices |
                | - anomalies  |
                +------+------+
```

## 🔧 Setup Guide

### Prerequisites
- Python 3.12+
- Node.js (Latest LTS)
- Virtual environment tool
- Git
- Sample data files

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd clear_ledger_nextjs
   ```

2. **Python Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # OR
   venv\Scripts\activate     # Windows
   ```

3. **Backend Setup**
   ```bash
   pip install -r requirements.txt
   sudo apt-get install libblas-dev liblapack-dev
   ```

4. **Frontend Setup**
   ```bash
   cd frontend-nextjs
   npm install
   ```

5. **Environment Configuration**
   ```bash
   echo "OPENAI_API_KEY=your_api_key_here" > .env
   ```

6. **Data Verification**
   - Confirm presence of:
     - PDFs in `data/raw/invoices/`
     - Test files in `data/raw/test_samples/`
     - `data/raw/vendor_data.csv`

## 🚀 Usage Guide

### Starting Services

1. **Backend API**
   ```bash
   # Terminal 1: Main API (includes review functionality)
   python -m uvicorn api.review_api:app --reload --port 8000
   ```

2. **Frontend Application**
   ```bash
   cd frontend-nextjs
   npm run dev
   ```

### Accessing the System

- **Main Application**: http://localhost:3000
- **API Endpoints**:
  - Main API: http://localhost:8000

### Core Workflows

1. **Invoice Processing**
   - Navigate to http://localhost:3000/upload
   - Upload invoice PDF(s)
   - Monitor processing status

2. **Results Management**
   - Processed invoices: `/invoices`
   - Flagged items: `/review`
   - Performance metrics: `/metrics`

3. **Review Process**
   - Access review interface
   - Edit flagged invoices
   - Submit corrections

### System Behavior

- **Duplicate Detection**: Automatic flagging by invoice_number
- **Confidence Thresholds**:
  - ≥0.9: Automatic processing
  - <0.9: Human review required
- **Processing Mode**: Asynchronous execution
- **Data Persistence**: Metrics and logs maintained

## 📈 Project Progress

### Completed (Days 1-6)
- ✅ Multi-agent system implementation
- ✅ Frontend migration (Streamlit → Next.js)
- ✅ OpenAI API integration
- ✅ RAG-based error handling
- ✅ Critical system improvements
- ✅ Day 6: Project Refinement and Optimization

### Remaining Tasks (Days 7-8)
- 📋 Day 7: Documentation & Testing
- 📋 Day 8: Performance Optimization & Submission

### Recent Enhancements
- 🆕 Form validation (react-hook-form + yup)
- 🆕 Toast notifications (react-hot-toast)
- 🆕 PDF preview system (react-pdf)
- 🆕 Enhanced error handling and WebSocket stability
- 🆕 Removed unused SVGs and confirmed anomalies page integration

---

<div align="center">

**Built with ❤️ for the Technical Challenge**

</div>