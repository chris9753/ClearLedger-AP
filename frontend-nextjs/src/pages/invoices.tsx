import { useState, useEffect } from 'react';
import { getInvoices } from '../lib/api';

// Interface for type safety
interface Invoice {
  invoice_number: string;
  vendor_name: string;
  total_amount: number;
  confidence: number;
  validation_status: string;
  invoice_date: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err) {
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

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
      {invoices.length > 0 ? (
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
              {invoices.map((invoice) => (
                <tr key={invoice.invoice_number} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.vendor_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.invoice_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.total_amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{(invoice.confidence * 100).toFixed(2)}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.validation_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No invoices found.</p>
      )}
    </div>
  );
}