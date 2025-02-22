import { useState, useEffect } from 'react';
import { getInvoices, submitReview } from '../lib/api';

// Interface for type safety
interface Invoice {
  invoice_number: string;
  vendor_name: string;
  total_amount: number;
  confidence: number;
  validation_status: string;
}

export default function ReviewPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: Invoice[] = await getInvoices();
      // Filter invoices needing review
      const flagged = data.filter(
        (inv) => inv.confidence < 0.9 || inv.validation_status !== 'valid'
      );
      setInvoices(flagged);
    } catch (err) {
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editInvoice) return;
    setLoading(true);
    try {
      const corrections = {
        total_amount: editInvoice.total_amount,
        // Add other fields if needed, e.g., vendor_name: editInvoice.vendor_name
      };
      await submitReview(editInvoice.invoice_number, corrections);
      fetchInvoices(); // Refresh the list
      setEditInvoice(null);
    } catch (err) {
      setError('Failed to save review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div>
      <h1>Review Invoices</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {editInvoice ? (
        <div>
          <h2>Edit Invoice {editInvoice.invoice_number}</h2>
          <input
            type="text"
            value={editInvoice.total_amount}
            onChange={(e) =>
              setEditInvoice({ ...editInvoice, total_amount: Number(e.target.value) })
            }
          />
          <button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setEditInvoice(null)}>Cancel</button>
        </div>
      ) : (
        <>
          {invoices.length > 0 ? (
            <ul>
              {invoices.map((invoice) => (
                <li key={invoice.invoice_number}>
                  Invoice: {invoice.invoice_number}, Amount: {invoice.total_amount}, Status: {invoice.validation_status}
                  <button onClick={() => setEditInvoice(invoice)}>
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No invoices need review.</p>
          )}
        </>
      )}
    </div>
  );
}