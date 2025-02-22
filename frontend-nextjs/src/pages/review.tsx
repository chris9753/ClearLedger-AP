import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Invoice {
  invoice_number: string;
  vendor_name: string;
  total_amount: number;
  validation_status: string;
  invoice_date: string;
}

export default function ReviewPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/invoices');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
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

  const handleSave = async () => {
    if (!selectedInvoice) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.invoice_number}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: selectedInvoice.vendor_name,
          invoice_number: selectedInvoice.invoice_number,
          invoice_date: selectedInvoice.invoice_date,
          total_amount: selectedInvoice.total_amount,
        }),
      });
      if (!response.ok) throw new Error('Failed to save');
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Review Invoices</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      {selectedInvoice ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Edit Invoice {selectedInvoice.invoice_number}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
              <input
                type="text"
                value={selectedInvoice.vendor_name}
                onChange={(e) => setSelectedInvoice({ ...selectedInvoice, vendor_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
              <input
                type="text"
                value={selectedInvoice.invoice_number}
                onChange={(e) => setSelectedInvoice({ ...selectedInvoice, invoice_number: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
              <input
                type="date"
                value={selectedInvoice.invoice_date}
                onChange={(e) => setSelectedInvoice({ ...selectedInvoice, invoice_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <input
                type="number"
                step="0.01"
                value={selectedInvoice.total_amount}
                onChange={(e) => setSelectedInvoice({ ...selectedInvoice, total_amount: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {invoices.map((invoice, idx) => (
            <li key={`${invoice.invoice_number}-${idx}`} className="p-4 bg-white rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Invoice: {invoice.invoice_number}</p>
                  <p className="text-sm text-gray-600">Amount: {invoice.total_amount}</p>
                  <p className="text-sm text-gray-600">Status: {invoice.validation_status || 'Unknown'}</p>
                  <button
                    onClick={() => window.open(`http://localhost:8000/api/invoice_pdf/${invoice.invoice_number}`, '_blank')}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    View PDF
                  </button>
                </div>
                <button 
                  onClick={() => setSelectedInvoice(invoice)}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                >
                  Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}