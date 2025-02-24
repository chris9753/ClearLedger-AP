# 📊 Clear Ledger AP (Next.js Frontend)

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.24-black.svg)](https://nextjs.org/)
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

#### Day 6: Stabilization and Bug Fixes
- 🎯 **Objectives Achieved**
  - Stabilized backend operations
  - Resolved frontend compatibility issues
  - Fixed critical bugs in processing pipeline
  
- 🛠️ **Technical Implementation**
  1. **Backend Stabilization**
     - Fixed `uvicorn.run()` configuration
     - Optimized WebSocket connections
     - Enhanced error logging

  2. **Node.js Environment**
     - Updated to Node.js 20
     - Resolved dependency conflicts
     - Converted Next.js configuration

  3. **Frontend Fixes**
     - Implemented proper PDF validation
     - Enhanced review page logic
     - Fixed invoice processing feedback
     - Added robust error handling

  4. **Configuration Updates**
     - Migrated from `next.config.ts` to `next.config.js`
     - Updated package dependencies
     - Optimized build configuration


- **More Technical Fixes**:
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
│   └── src/
│       ├── pages/
│       │   ├── _app.tsx
│       │   ├── anomalies.tsx  
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
- Node.js 20.x
- Virtual environment tool
- Git
- OpenAI API key
- Sample data files

### Step-by-Step Installation

1. **Clone Repository**
  ```bash
  git clone <repository-url>
  cd clear_ledger_nextjs
  ```

2. **Create Environment File**
  ```bash
  # Create .env file in root directory
  echo "OPENAI_API_KEY=your_api_key_here" > .env
  ```

3. **Setup Node.js**
  ```bash
  nvm install 20
  nvm use 20
  ```

4. **Python Environment Setup**
  ```bash
  python -m venv venv
  source venv/bin/activate  # Linux/Mac
  # OR
  venv\Scripts\activate     # Windows
  pip install -r requirements.txt
  sudo apt-get install libblas-dev liblapack-dev
  ```

5. **Frontend Installation**
  ```bash
  cd frontend-nextjs
  npm install
  ```

6. **Start Services**
  ```bash
  # Terminal 1: Backend API
  python -m uvicorn api.app:app --reload --port 8000

  # Terminal 2: Frontend
  cd frontend-nextjs
  npm run dev
  ```

### System Access
- Frontend: http://localhost:3000
- API: http://localhost:8000

### Core Workflows

1. **Process Invoices**
  - Upload at `/upload`
  - View at `/invoices`
  - Review at `/review`
  - Monitor at `/metrics`

2. **System Features**
  - Automatic duplicate detection
  - Confidence scoring (≥0.9 auto-process, <0.9 review)
  - Asynchronous processing
  - Comprehensive logging

### Dependencies

#### Frontend
- Next.js ^14.2.24
- React ^18.2.0
- React Hook Form ^7.50.1
- TailwindCSS ^3.4.1
- TypeScript ^5.3.3

#### Backend
- FastAPI
- LangChain
- OpenAI
- PDFPlumber
- Pytesseract

## 📈 Project Progress

### Completed (Days 1-6)
- ✅ Multi-agent system implementation
- ✅ Frontend migration (Streamlit → Next.js)
- ✅ OpenAI API integration
- ✅ RAG-based error handling
- ✅ Critical system improvements
- ✅ Day 6: Project Refinement and Optimization

### Remaining Tasks (Days 7-8)
- 📋 Day 7: Dockerize, CI/CD, and Documentation & Testing
- 📋 Day 8: Performance Optimization & Submission

### Recent Enhancements
- 🆕 Form validation (react-hook-form + yup)
- 🆕 Toast notifications (react-hot-toast)
- 🆕 PDF preview system (react-pdf)
- 🆕 Enhanced error handling and WebSocket stability
- 🆕 Removed unused SVGs and confirmed anomalies page integration

## 🔍 Troubleshooting Guide

### Common Issues and Solutions

1. **Invalid PDF Processing**
   - Issue: `TypeError: Cannot read properties of undefined (reading 'vendor_name')`
   - Solution: Check if `extracted_data` exists before accessing properties
   - Location: Review error handling in frontend PDF processing components

2. **Invoice Processing List**
   - Issue: 'Process All Invoices' not showing complete list
   - Solution: Verify `/api/process_all_invoices` endpoint response
   - Check: Frontend `fetchInvoices` implementation

3. **Review Page Logic**
   - Issue: Valid invoices appearing in review tab
   - Solution: Adjust backend confidence threshold logic
   - Location: Check review flagging criteria in `api/app.py`

4. **Anomaly Detection**
   - Issue: Invalid PDFs not appearing in anomalies
   - Solution: Verify `_save_anomaly_entry` function
   - Check: Frontend `fetchAnomalies` implementation

5. **WebSocket Connection**
   - Issue: Processing status updates not showing
   - Solution: Ensure WebSocket connection is properly initialized
   - Location: Check frontend WebSocket setup and error handling

---

<div align="center">

**Built with ❤️ for the Technical Challenge**

</div>