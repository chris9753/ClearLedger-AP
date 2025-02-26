import { useState, useEffect, useCallback } from 'react';
import { getInvoices } from '../../lib/api';
import { Invoice } from '../types';
import { toast } from 'react-hot-toast';

interface Metrics {
  total: number;
  valid: number;
  avg_time: number;
  high_confidence_pct: number;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;
  const TIMEOUT_DURATION = 10000;

  const fetchMetricsWithTimeout = async (): Promise<Invoice[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

    try {
      const response = await getInvoices();
      clearTimeout(timeoutId);
      // Type assertion since we know the API returns Invoice[]
      return response as Invoice[];
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const invoices = await fetchMetricsWithTimeout();
      const total = invoices.length;
      const valid = invoices.filter(invoice => invoice.status === 'valid').length;
      
      const avgTime = total ? invoices.reduce((sum, invoice) => 
        sum + (invoice.total_time || 0), 0) / total : 0;
      
      const highConfidenceCount = invoices.filter(invoice => (invoice.confidence || 0) >= 0.7).length;
      const highConfidencePct = total ? (highConfidenceCount / total) * 100 : 0;

      setMetrics({ 
        total, 
        valid, 
        avg_time: Number(avgTime.toFixed(2)),
        high_confidence_pct: Number(highConfidencePct.toFixed(1))
      });
      setRetryCount(0);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load metrics: ${errorMessage}. Retrying...`);
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchMetrics();
        }, RETRY_DELAY);
        toast.error(`Attempt ${retryCount + 1}/${MAX_RETRIES}: ${errorMessage}`);
      } else {
        setError(`Failed to load metrics: ${errorMessage}`);
        toast.error('Failed to load metrics after multiple attempts. Please refresh the page.');
      }
    } finally {
      if (retryCount >= MAX_RETRIES) {
        setLoading(false);
      }
    }
  }, [retryCount, MAX_RETRIES, RETRY_DELAY]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

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