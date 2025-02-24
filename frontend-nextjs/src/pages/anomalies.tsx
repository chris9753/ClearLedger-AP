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
  type: 'invalid_pdf' | 'extraction_error' | 'missing_data' | 'low_confidence' | 'processing_error' | 'system_error';
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
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from server');
      }
      // Sort anomalies by timestamp in descending order
      const sortedAnomalies = [...data].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setAnomalies(sortedAnomalies);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load anomalies';
      setError(message);
      toast.error('Failed to load anomalies: ' + message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const getAnomalyTypeColor = (type: Anomaly['type']) => {
    const colors = {
      'invalid_pdf': 'bg-red-100 text-red-800',
      'extraction_error': 'bg-orange-100 text-orange-800',
      'missing_data': 'bg-yellow-100 text-yellow-800',
      'low_confidence': 'bg-blue-100 text-blue-800',
      'processing_error': 'bg-purple-100 text-purple-800',
      'system_error': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

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

      {loading && (
        <div className="flex justify-center py-8">
          <p className="text-gray-500">Loading anomalies...</p>
        </div>
      )}

      {!loading && anomalies.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-500">No anomalies found.</p>
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="space-y-4">
          {anomalies.map((anomaly, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-red-600">File: {anomaly.file_name}</p>
                    <span className={`px-3 py-1 rounded-full text-xs ${getAnomalyTypeColor(anomaly.type)}`}>
                      {anomaly.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Reason: {anomaly.reason}</p>
                  {anomaly.invoice_number && (
                    <p className="text-sm text-gray-600">Invoice Number: {anomaly.invoice_number}</p>
                  )}
                  {anomaly.vendor_name && (
                    <p className="text-sm text-gray-600">Vendor: {anomaly.vendor_name}</p>
                  )}
                  {anomaly.confidence !== undefined && (
                    <p className="text-sm text-gray-600">
                      Confidence: {(anomaly.confidence * 100).toFixed(1)}%
                    </p>
                  )}
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>
                      Detected: {new Date(anomaly.timestamp).toLocaleString()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      anomaly.review_status === 'needs_review' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {anomaly.review_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}