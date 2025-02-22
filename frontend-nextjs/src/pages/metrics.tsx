import { useState, useEffect } from 'react';
import { getInvoices } from '../lib/api';

// Interface for type safety
interface Invoice {
  invoice_number: string;
  vendor_name: string;
  total_amount: number;
  confidence: number;
  validation_status: string;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<{
    total: number;
    valid: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const invoices: Invoice[] = await getInvoices();
      const total = invoices.length;
      const valid = invoices.filter((i) => i.validation_status === 'valid').length;
      setMetrics({ total, valid });
    } catch (err) {
      setError('Failed to load metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div>
      <h1>Metrics</h1>
      <button onClick={fetchMetrics} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {metrics ? (
        <div>
          <p>Total Invoices: {metrics.total}</p>
          <p>Valid Invoices: {metrics.valid}</p>
        </div>
      ) : (
        <p>No metrics available.</p>
      )}
    </div>
  );
}