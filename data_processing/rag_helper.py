# ...existing code...
import faiss
import numpy as np
import logging

logger = logging.getLogger("InvoiceProcessing")

def compute_embedding(text: str, dim: int = 128) -> np.ndarray:
    """Compute a dummy embedding for a given text by normalizing its byte values into a fixed-size vector."""
    vec = np.zeros(dim, dtype=np.float32)
    text_bytes = text.encode('utf-8')
    length = min(len(text_bytes), dim)
    for i in range(length):
        vec[i] = text_bytes[i] / 255.0
    return vec

class InvoiceRAGIndex:
    def __init__(self, dim: int = 128):
        self.dim = dim
        self.index = faiss.IndexFlatL2(dim)
        self.documents = []  # List of dicts with invoice details
        logger.debug(f"Initialized FAISS index with dimension {dim}")

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
        """Classify a new invoice by comparing its embedding to the existing error invoices.
        Returns the most similar error invoice if similarity (L2 distance) is below the threshold.
        """
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

# Example usage (to be removed or guarded by __name__ == '__main__' in production)
if __name__ == "__main__":
    rag = InvoiceRAGIndex()
    # Simulate adding some error invoices
    error_invoices = {
        "invoice_0_missing_product_code.pdf": "Error invoice content missing product code",
        "invoice_0_poor_quality.pdf": "Error invoice content of poor quality",
        "invoice_0_non_product.pdf": "Error invoice content not related to product",
        "invoice_0_price_variance.pdf": "Error invoice content with price variance issues"
    }
    for inv_id, text in error_invoices.items():
        rag.add_invoice(inv_id, text)
    # Classify a new invoice
    new_invoice_text = "This invoice content seems to lack a product code and has unusual price variance."
    classification = rag.classify_invoice(new_invoice_text, threshold=0.5)
    print(classification)
