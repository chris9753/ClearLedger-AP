import { useState, useEffect } from 'react';
import { getAnomalies } from "../../lib/api";
import { toast } from 'react-hot-toast';

interface Anomaly {
  file_name: string;
  reason: string;
  timestamp: string;
  review_status: string;
  invoice_number?: string;
  vendor_name?: string;
  confidence?: number;
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnomalies();
      setAnomalies(data);
    } catch (err) {
      setError('Failed to load anomalies');
      toast.error('Failed to load anomalies: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Anomalies</h1>
        <button 
          onClick={fetchAnomalies} 
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {anomalies.length > 0 ? (
        <div className="space-y-4">
          {anomalies.map((anomaly, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="font-medium text-red-600">File: {anomaly.file_name}</p>
                  <p className="text-sm text-gray-600">Reason: {anomaly.reason}</p>
                  {anomaly.invoice_number && (
                    <p className="text-sm text-gray-600">Invoice Number: {anomaly.invoice_number}</p>
                  )}
                  {anomaly.vendor_name && (
                    <p className="text-sm text-gray-600">Vendor: {anomaly.vendor_name}</p>
                  )}
                  {anomaly.confidence !== undefined && (
                    <p className="text-sm text-gray-600">Confidence: {(anomaly.confidence * 100).toFixed(1)}%</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Detected: {new Date(anomaly.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  anomaly.review_status === 'needs_review' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {anomaly.review_status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No anomalies found.</p>
      )}
    </div>
  );
}