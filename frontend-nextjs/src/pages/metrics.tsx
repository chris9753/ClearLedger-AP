import { useState, useEffect } from 'react';
import { getInvoices } from '../../lib/api';
import { Invoice } from '../types';  // Import Invoice from types.ts
import { toast } from 'react-hot-toast';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<{
    total: number;
    valid: number;
    avg_time: number;
    high_confidence_pct: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const invoices = await getInvoices() as Invoice[];
      const total = invoices.length;
      const valid = invoices.filter((invoice: Invoice) => invoice.validation_status === 'valid').length;
      
      // Calculate average processing time using total_time
      const avgTime = invoices.reduce((sum: number, invoice: Invoice) => 
        sum + (invoice.total_time || 0), 0) / total;
      
      // Calculate high confidence percentage (confidence > 0.8 is considered high)
      const highConfidenceCount = invoices.filter((invoice: Invoice) => 
        invoice.confidence > 0.8).length;
      const highConfidencePct = (highConfidenceCount / total) * 100;

      setMetrics({ 
        total, 
        valid, 
        avg_time: Number(avgTime.toFixed(2)),
        high_confidence_pct: Number(highConfidencePct.toFixed(1))
      });
    } catch (err) {
      setError('Failed to load metrics. Please try again.');
      toast.error('Failed to load metrics: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Metrics</h1>
        <button 
          onClick={fetchMetrics} 
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Invoices</h3>
            <p className="mt-2 text-3xl font-semibold text-blue-600">{metrics.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Valid Invoices</h3>
            <p className="mt-2 text-3xl font-semibold text-green-600">{metrics.valid}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Average Processing Time</h3>
            <p className="mt-2 text-3xl font-semibold text-purple-600">{metrics.avg_time}s</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">High Confidence Invoices</h3>
            <p className="mt-2 text-3xl font-semibold text-orange-600">{metrics.high_confidence_pct}%</p>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No metrics available.</p>
      )}
    </div>
  );
}