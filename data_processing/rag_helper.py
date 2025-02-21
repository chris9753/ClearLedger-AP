from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import os
from config.logging_config import logger
from data_processing.document_parser import extract_text_from_pdf

model = SentenceTransformer('all-MiniLM-L6-v2')

def compute_embedding(text: str, dim: int = 384) -> np.ndarray:
    """Compute embedding for a given text using SentenceTransformer."""
    embedding = model.encode(text)
    return np.array(embedding, dtype=np.float32)

class InvoiceRAGIndex:
    def __init__(self, dim: int = 384):
        self.dim = dim
        self.index = faiss.IndexFlatL2(dim)
        self.documents = []  # List of dicts with invoice details
        logger.debug(f"Initialized FAISS index with dimension {dim}")
        self.load_test_samples()

    def load_test_samples(self):
        """Load test sample invoices into the FAISS index."""
        test_dir = "data/test_samples/"
        sample_files = [
            "invoice_missing_product_example.pdf",
            "invoice_non_product_example.pdf",
            "invoice_poor_quality_example.pdf",
            "invoice_price_variance_example.pdf",
            "invoice_standard_example.pdf"
        ]
        for sample in sample_files:
            path = os.path.join(test_dir, sample)
            if os.path.exists(path):
                text = extract_text_from_pdf(path)
                if text:
                    self.add_invoice(sample, text)
                else:
                    logger.warning(f"No text extracted from {sample}")
            else:
                logger.warning(f"Sample file not found: {path}")

    def add_invoice(self, invoice_id: str, invoice_text: str):
        embedding = compute_embedding(invoice_text, self.dim)
        self.index.add(np.expand_dims(embedding, axis=0))
        self.documents.append({'invoice_id': invoice_id, 'invoice_text': invoice_text})
        logger.info(f"Added invoice {invoice_id} to FAISS index")

    def query_invoice(self, invoice_text: str, k: int = 1):
        embedding = compute_embedding(invoice_text, self.dim)
        D, I = self.index.search(np.expand_dims(embedding, axis=0), k)
        results = []
        for idx, distance in zip(I[0], D[0]):
            if idx < len(self.documents):
                doc = self.documents[idx]
                results.append({
                    'invoice_id': doc['invoice_id'],
                    'distance': float(distance)
                })
        logger.debug(f"Query results: {results}")
        return results

    def classify_invoice(self, invoice_text: str, threshold: float = 0.1) -> dict:
        results = self.query_invoice(invoice_text, k=1)
        if results and results[0]['distance'] < threshold:
            classification = {
                'status': 'similar_error',
                'matched_invoice_id': results[0]['invoice_id'],
                'distance': results[0]['distance']
            }
            logger.info(f"Invoice classified as similar to error invoice {results[0]['invoice_id']}")
        else:
            classification = {'status': 'novel', 'message': 'No similar error invoice found'}
            logger.info("Invoice classified as novel")
        return classification

if __name__ == "__main__":
    rag = InvoiceRAGIndex()
    new_invoice_text = "This invoice content seems to lack a product code."
    classification = rag.classify_invoice(new_invoice_text, threshold=0.5)
    print(classification)