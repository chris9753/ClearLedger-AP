# Clear Ledger AP

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.24-black.svg)](https://nextjs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991.svg)](https://openai.com/)

## Summary

Accounts-payable automation platform that ingests vendor PDF invoices, runs a LangChain multi-agent pipeline, and stores structured results in SQLite with PDFs on AWS S3.

### Screenshots

**Dashboard** — KPIs, multi-agent pipeline overview, quick actions, and recent activity.

![Clear Ledger AP dashboard](frontend-nextjs/public/assets/screenshot_1.png)

**Upload** — Single PDF upload, batch processing, pipeline steps, and sample extraction result.

![Upload and process invoices](frontend-nextjs/public/assets/screenshot_2.png)

**Invoice registry** — Sortable table with confidence bars, validation status, and PDF links.

![Invoice registry](frontend-nextjs/public/assets/screenshot_3.png)

**Metrics** — Status breakdown, confidence analysis, and 24-hour activity.

![Processing metrics](frontend-nextjs/public/assets/screenshot_4.png)

## What it does

Clear Ledger AP reduces manual invoice handling by automating:

- **Extraction** - Parse PDFs (text + OCR) and pull vendor, dates, line items, and totals via OpenAI
- **Validation** - Enforce Pydantic schemas, confidence scoring, and anomaly detection
- **PO matching** - Fuzzy match against `data/raw/vendor_data.csv`
- **Human review** - Queue low-confidence or failed documents for correction in the UI
- **RAG fallback** - FAISS index over sample fault patterns to classify and recover common errors

Target throughput: on the order of thousands of invoices per month with sub-minute processing per document.

## Architecture

```text
Next.js UI (3000)  -->  FastAPI API + WebSockets (8000)  -->  Agent orchestrator
                                                              |-> SQLite (invoices.db)
                                                              |-> AWS S3 (PDFs)
```

| Layer | Stack |
|-------|--------|
| Frontend | Next.js 14, React 18, Tailwind CSS, TanStack Query |
| Backend | FastAPI, Uvicorn, WebSockets |
| Agents | LangChain workflow: extraction, validation, PO match, human review, FAISS fallback |
| Storage | SQLite metadata, S3 object storage for originals |
| Deploy | Docker Compose, optional pre-built images on Docker Hub |

### Agent pipeline

1. **Extraction** - `gpt-4o-mini`, pdfplumber, Tesseract OCR  
2. **Validation** - Schema checks, confidence thresholds  
3. **PO matching** - Fuzzy string match to purchase orders  
4. **Human review** - Triggered when confidence &lt; 0.9 or validation fails  
5. **Fallback (RAG)** - FAISS + sentence-transformers on `data/test_samples/`

## Repository layout

```text
clear_ledger_ap/
  api/                 FastAPI routes and WebSocket progress
  agents/              LangChain agent implementations
  workflows/           Orchestrator
  data_processing/     OCR, RAG, PO matcher, scoring
  data/raw/invoices/   Sample PDF batch (~35 files)
  data/test_samples/   Faulty PDFs for RAG training
  frontend-nextjs/     Dashboard (upload, invoices, review, metrics, anomalies)
  invoices.db          SQLite (created at runtime)
  docker-compose.yml
```

## Quick start (Docker)

**Prerequisites:** Docker, OpenAI API key, AWS credentials and S3 bucket.

1. Clone and enter the repo:

```bash
git clone https://github.com/chris9753/clear_ledger_nextjs.git
cd clear_ledger_nextjs
```

2. Create `.env` in the project root:

```env
OPENAI_API_KEY=your_key
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BUCKET_NAME=your_bucket_name
S3_BUCKET_NAME=your_bucket_name
AWS_DEFAULT_REGION=us-east-1
```

3. Start services:

```bash
docker compose up --build -d
```

4. Open the app:

- Frontend: http://localhost:3000  
- API docs: http://localhost:8000/docs  

### Pre-built images (optional)

```bash
docker pull chris9753/clear_ledger_nextjs_backend:latest
docker pull chris9753/clear_ledger_nextjs_frontend:latest
```

## Local development (no Docker)

**Backend** (from repo root):

```bash
python -m venv .venv
# Windows: .\.venv\Scripts\Activate.ps1
pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn api.app:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend-nextjs
npm install
npm run dev
```

Set `NEXT_PUBLIC_USE_MOCK_DATA=true` in `frontend-nextjs/next.config.js` to run the UI without a backend (sample data only).

## Configuration notes

### S3 bucket policy (public read for PDF preview)

Apply a policy similar to `aws_policy.json` in the repo. Disable "Block all public access" only if you intend to serve PDFs via direct URLs.

### Migrate legacy JSON data

If upgrading from JSON-backed storage:

```bash
python migrate_json_to_db.py --json-path data/processed/structured_invoices.json
sqlite3 invoices.db "SELECT COUNT(*) FROM invoice_metadata;"
```

## Frontend routes

| Route | Purpose |
|-------|---------|
| `/` | Dashboard and pipeline overview |
| `/upload` | Single upload and batch processing |
| `/invoices` | Searchable invoice registry |
| `/review` | Human-in-the-loop corrections |
| `/metrics` | Throughput and confidence analytics |
| `/anomalies` | Error and low-confidence log |

## CI/CD

GitHub Actions deploys the frontend to **Vercel** on push to `main` (see `.github/workflows/frontend-deploy.yml`).

**Required GitHub secrets:**

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | [Vercel account token](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Team/user ID from Vercel project settings |
| `VERCEL_PROJECT_ID` | Project ID from Vercel project settings |

**Vercel project setup (required):**

1. Import the repo in Vercel.
2. **Settings → General → Root Directory** → set to `frontend-nextjs` → Save.  
   Without this, Vercel builds from the repo root, detects `api/app.py`, and fails with a FastAPI entrypoint error.
3. Add `NEXT_PUBLIC_MAIN_API_URL` under **Environment Variables** (Production) pointing at your deployed backend API.

You can also connect the repo directly in Vercel for automatic deploys; the GitHub Action is useful if you want deploys gated on CI or triggered manually.

## License

MIT - see [LICENSE](LICENSE).
