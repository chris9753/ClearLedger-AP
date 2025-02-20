# Clear Ledger AP

## Overview
An intelligent invoice processing system leveraging LangChain’s multi-agent workflow to automate extraction, validation, and PO matching. Built for the "Technical Challenge: Intelligent Invoice Processing with LangChain Multi-Agent Workflow" to reduce manual processing time and errors.

## Day 1: Project Planning and Setup
- **Goal**: Establish a solid foundation for the 10-day development process.
- **Activities**:
  - Organized the workflow for the subsequent 9 days, breaking down the challenge into actionable steps.
  - Thoroughly understood the project requirements from the "Technical Challenge" document, focusing on extraction, validation, and human-in-the-loop verification.
  - Created a specific 10-day plan of action to ensure systematic progress and meet evaluation criteria.
  - Reserved AI tools: GPT-4 Turbo, Claude 3.5, GitHub Copilot X, LangSmith, and others for research, coding, and debugging.
- **Outcome**: Set up the project structure in `/clear_ledger_project/`, initialized GitHub repo, and prepared for Day 2’s extraction agent development.

## Day 2 Progress
- **Implemented `InvoiceExtractionAgent`** (`agents/extractor_agent.py`) using LangChain 0.2.16 and local Mistral 7B (via Ollama) to extract structured data (vendor name, invoice number, date, total amount) from PDFs in `data/raw/invoices/` (35 invoices) and `data/raw/test_samples/` (3 PDFs: `corrupt_invoice.pdf`, `edge_case_invoice.pdf`, `valid_invoice.pdf`).
- **Added PDF Parsing and OCR**: Integrated `data_processing/document_parser.py` (pdfplumber) and `data_processing/ocr_helper.py` (pytesseract), successfully extracting text from `invoice_0_missing_product_code.pdf`.
- **Defined `InvoiceData` Model**: Created `models/invoice.py` with Pydantic v2, supporting required fields and optional ones (PO number, tax amount, currency) with `Decimal` precision.
- **Implemented Confidence Scoring**: Added `data_processing/confidence_scoring.py` to compute average confidence scores.
- **Set Up JSON Logging**: Configured `config/logging_config.py` for structured logging, resolved import issues with `sys.path`.
- **Improvements**:
  - Fixed `ModuleNotFoundError: config` and prompt issues for `create_structured_chat_agent`.
  - Switched from OpenAI (hit 429 quota error) to local Mistral 7B on Ryzen 5 8600G, ensuring quota-free execution with `langchain_community.llms.Ollama`.
  - Updated agent to process PDFs from subdirectories, eliminating `FileNotFoundError`.
  - Added `handle_parsing_errors=True` to `AgentExecutor` to handle Mistral 7B’s unstructured output.
- **Sample Output**: (Placeholder until Day 4’s real parsing):
  ```json
  {"vendor_name": "ABC Corp Ltd.", "invoice_number": "INV-2024-001", "invoice_date": "2024-02-18", "total_amount": "7595.00", "confidence": 0.955}