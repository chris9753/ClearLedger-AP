import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getAnomalies } from "../../lib/api";
import { Anomaly } from '../types';

export default function AnomaliesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const { 
    data: anomaliesData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['anomalies', currentPage],
    queryFn: () => getAnomalies(currentPage, perPage),
    retry: 2,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

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

  // Sort anomalies by timestamp in descending order
  const sortedAnomalies = [...(anomaliesData?.data || [])].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Anomalies</h1>
        <button 
          onClick={() => refetch()}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p className="text-red-700">{error instanceof Error ? error.message : 'Failed to load anomalies'}</p>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="ml-2 text-gray-600">Loading anomalies...</p>
        </div>
      )}

      {!isLoading && sortedAnomalies.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-500">No anomalies found.</p>
        </div>
      )}

      {sortedAnomalies.length > 0 && (
        <div className="space-y-4">
          {sortedAnomalies.map((anomaly, idx) => (
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

      {anomaliesData?.pagination && anomaliesData.pagination.total_pages > 1 && (
        <div className="mt-6 flex justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {currentPage} of {anomaliesData.pagination.total_pages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(anomaliesData.pagination.total_pages, p + 1))}
            disabled={currentPage === anomaliesData.pagination.total_pages}
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}