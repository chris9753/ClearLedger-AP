# Clear Ledger AP

## Overview
An intelligent invoice processing system leveraging LangChain's multi-agent workflow to automate extraction, validation, and PO matching. Built for the "Technical Challenge: Intelligent Invoice Processing with LangChain Multi-Agent Workflow" to reduce manual processing time and errors.

## Day 1: Project Planning and Setup
- **Goal**: Establish a solid foundation for the 10-day development process.
- **Activities**:
    - Organized the workflow for the subsequent 9 days, breaking down the challenge into actionable steps.
    - Thoroughly understood the project requirements from the "Technical Challenge" document, focusing on extraction, validation, and human-in-the-loop verification.
    - Created a specific 10-day plan of action to ensure systematic progress and meet evaluation criteria.
    - Reserved AI tools: GPT-4 Turbo, Claude 3.5, GitHub Copilot X, LangSmith, and others for research, coding, and debugging.
- **Outcome**: Set up the project structure in `/clear_ledger_project/`, initialized GitHub repo, and prepared for Day 2's extraction agent development.

## Day 2 Progress
- **Implemented `InvoiceExtractionAgent`** (`agents/extractor_agent.py`) using LangChain 0.2.16 and local Mistral 7B (via Ollama) to extract structured data (vendor name, invoice number, date, total amount) from PDFs in `data/raw/invoices/` (35 invoices) and `data/raw/test_samples/` (3 PDFs).
- **Added PDF Parsing and OCR**: Integrated `data_processing/document_parser.py` (pdfplumber) and `data_processing/ocr_helper.py` (pytesseract).
- **Defined `InvoiceData` Model**: Created `models/invoice.py` with Pydantic v2, supporting required and optional fields with `Decimal` precision.
- **Implemented Confidence Scoring**: Added `data_processing/confidence_scoring.py`.
- **Set Up JSON Logging**: Configured `config/logging_config.py` for structured logging.
- **Improvements**:
    - Fixed various module and prompt issues.
    - Switched to local Mistral 7B for quota-free execution.
    - Enhanced PDF processing and error handling.
- **Sample Output**:
    ```json
    {
        "vendor_name": "ABC Corp Ltd.",
        "invoice_number": "INV-2024-001",
        "invoice_date": "2024-02-18",
        "total_amount": "7595.00",
        "confidence": 0.955
    }
    ```

- **Implemented `InvoiceValidationAgent`** (`agents/validator_agent.py`) to validate extracted invoice data.
- **Defined ValidationResult Model**: Updated `models/validation_schema.py` with Pydantic v2.
- **Added Multi-Agent Coordination**: Created `workflows/orchestrator.py` with `InvoiceProcessingWorkflow`.
- **Improvements**:
    - Enhanced error handling throughout the pipeline.
    - Validated integration between extraction and validation components.
- **Sample Output**:
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
        }
    }
    ```

- Anomaly Detection: Added and integrated.

## Setup
1. Install Dependencies:
     ```bash
     pip install -r requirements.txt
     ```
2. Install Ollama and Mistral 7B:
     ```bash
     curl -fsSL https://ollama.com/install.sh | sh
     ollama pull mistral:7b
     ```
3. Verify installation:
     ```bash
     ollama run mistral:7b "test"
     ```
4. Verify data location: Ensure PDFs are in `data/raw/invoices/` or `data/raw/test_samples/`.
5. Run the workflow:
     ```bash
     python workflows/orchestrator.py
     ```

## Next Steps
- Day 3: Implement PurchaseOrderMatchingAgent and enhance multi-agent coordination.
- Day 4: Add advanced error handling and anomaly detection.