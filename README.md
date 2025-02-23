# 📊 Clear Ledger AP (Next.js Frontend)

## 🎯 Overview

This repository contains the Next.js frontend version of the Clear Ledger AP, an intelligent solution leveraging LangChain's multi-agent workflow to automate invoice extraction, validation, and purchase order (PO) matching. Built for the "Technical Challenge: Intelligent Invoice Processing with LangChain Multi-Agent Workflow," it aims to reduce manual processing time by 75% and minimize errors. A Streamlit frontend version is available in another repository for those interested in a simpler, Python-based interface, but this README focuses on the Next.js frontend version.

## 📋 Key Features

- Processes PDFs from:
  - data/raw/invoices/ (35 invoices)
  - data/raw/test_samples/ (3 PDFs)
- Integrates multiple agents for extraction, validation, PO matching, human review, and fallback procedures
- Implements RAG-based error handling and performance monitoring
- Utilizes async processing with robust error handling, structured logging, and retries
- Modern Next.js frontend with pages for uploading invoices, viewing results, reviewing flagged cases, and tracking metrics

## 📅 Development Timeline

### Day 1: Project Planning and Setup
- Organized a 10-day workflow and analyzed challenge requirements
- Initialized repository with FastAPI backend and Next.js frontend structure
- Installed initial dependencies (langchain==0.2.16, pdfplumber, pytesseract)

### Day 2: Invoice Extraction and Validation
- Developed InvoiceExtractionAgent and InvoiceValidationAgent with Pydantic models
- Implemented PDF parsing, OCR, and anomaly detection

### Day 3: Advanced Error Handling and RAG
- Integrated FAISS-based RAG for error handling
- Switched from Mistral 7B to OpenAI's gpt-4o-mini API for reliable extraction
- Added performance monitoring and fallback mechanisms

### Day 4: PO Matching and Frontend Transition
- Implemented PurchaseOrderMatchingAgent with fuzzy matching
- Migrated from initial Streamlit frontend to Next.js for scalability

## 🔍 Overall Project Structure

```
agents/: Contains agents for extraction, validation, matching, and fallback
api/: RESTful API endpoints
config/: Configuration files
data/: Raw PDFs and processed outputs
data_processing/: Modules for parsing, OCR, and RAG
models/: Pydantic models
workflows/: Pipeline orchestration
tests/: Testing suites
frontend-nextjs/: Next.js frontend code
  ├── public/: Static assets
  └── src/
      ├── components/: Reusable components
      ├── pages/: Routes
      └── styles/: CSS files
```

## ✅ Completed (Days 1–4)
- Backend Development: Multi-agent system implementation
- Initial Frontend: Streamlit frontend (streamlit-frontend branch)
- Transition to Next.js: Migrated for production use
- Model Transition: Switched to OpenAI gpt-4o-mini API
- RAG Integration: FAISS-based error handling

## 🚀 New Frontend: Next.js Highlights
- Upload Page: Single and batch uploads with deduplication
- Invoices Page: Lists processed invoices with status indicators
- Review Page: Full field editing, PDF previews, and seamless updates
- Metrics Page: Tracks total invoices, valid invoices, and processing times
- Improvements: Enhanced form validation, toast notifications, and optimized state management

## 📈 Remaining Workflow (Days 5–10)
- Day 5: Dockerize application, set up CI/CD, develop analytics dashboard
- Day 6: Expand documentation, enhance test coverage, refactor code
- Day 7: Conduct end-to-end testing, optimize performance, prepare submission

## 🔧 Setup and Usage Instructions

### 📋 Project Overview
The system combines a FastAPI backend and a Next.js frontend to automate invoice processing with human review capabilities.

### 📦 Prerequisites
- Python 3.12 or higher
- Node.js and npm
- Virtual environment (recommended)
- Git
- Sample invoice PDFs and vendor_data.csv

### ⚙️ Setup Instructions

1. **Clone the Repository**
```bash
git clone <repository-url>
cd clear_ledger_nextjs
```

2. **Create and Activate Virtual Environment**
```bash
python -m venv venv
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

3. **Install Backend Dependencies**
```bash
pip install -r requirements.txt
```

4. **Install Frontend Dependencies**
```bash
cd frontend-nextjs
npm install
cd ..
```

5. **Verify Data Structure**
- Ensure PDFs are in data/raw/invoices/ and data/raw/test_samples/
- Verify data/raw/vendor_data.csv exists

### 🚀 Running the Application

1. **Start Backend Services**
```bash
# Terminal 1: Main API
python -m uvicorn api.app:app --reload --port 8000

# Terminal 2: Human Review API
python -m uvicorn api.human_review_api:app --reload --port 8001
```

2. **Start Frontend**
```bash
cd frontend-nextjs
npm run dev
```

3. **Access the Application**
- Browser: http://localhost:3000
- Main API: http://localhost:8000
- Review API: http://localhost:8001

### 🧪 Testing the System

1. **Upload Invoices**
- Go to http://localhost:3000/upload
- Upload a PDF
- Submit to process

2. **View Results**
- http://localhost:3000/invoices: Processed invoices
- http://localhost:3000/review: Flagged invoices
- http://localhost:3000/metrics: Performance data

3. **Review and Correct**
- Edit flagged invoices on the review page
- Submit corrections

4. **Faulty Invoice Handling**
- RAG compares invoices against known errors
- High-confidence invoices (≥0.9) process automatically

### 📝 Important Notes
- Duplicate invoices are flagged by invoice_number
- Low confidence (<0.9) triggers human review
- Processing is asynchronous
- Metrics and logs are stored for analysis

### 📦 Setup / Installation

**Backend Dependencies**
```bash
pip install -r requirements.txt
```

**Frontend Dependencies**
```bash
cd frontend-nextjs
npm install react-hook-form yup @hookform/resolvers react-hot-toast react-pdf
```

### 📢 Recent Updates
- Added form validation with react-hook-form and yup
- Implemented toast notifications with react-hot-toast
- Improved PDF previews with react-pdf
- Enhanced backend with OpenAI API and stricter linting/testing