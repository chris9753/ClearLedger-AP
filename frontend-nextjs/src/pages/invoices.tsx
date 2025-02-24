import { useState, useEffect } from 'react';
import { getInvoices } from "../../lib/api";
import { toast } from 'react-hot-toast';
import { Invoice } from "../types";  // Updated import from types.ts

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoices();
      if (Array.isArray(data)) {
        // Sort invoices by date in descending order
        const sortedInvoices = [...data].sort((a: Invoice, b: Invoice) => {
          return new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
        });
        setInvoices(sortedInvoices);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError('Failed to load invoices. Please try again.');
      toast.error('Failed to load invoices: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  // Fetch invoices on mount and every 5 seconds when loading is true
  useEffect(() => {
    fetchInvoices();
    
    // Set up polling when loading is true
    let pollInterval: NodeJS.Timeout;
    if (loading) {
      pollInterval = setInterval(fetchInvoices, 5000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [loading]);

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <button 
          onClick={fetchInvoices} 
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      {loading && <p className="text-gray-500 text-center py-4">Loading invoices...</p>}

      {!loading && invoices.length === 0 && (
        <p className="text-gray-500 text-center py-8">No invoices found.</p>
      )}

      {invoices.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice, index) => (
                <tr key={`${invoice.invoice_number}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.vendor_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.invoice_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">£{invoice.total_amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{(invoice.confidence * 100).toFixed(2)}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.validation_status?.trim() || "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}