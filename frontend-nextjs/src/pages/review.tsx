import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { getInvoicePdf } from '../../lib/api';

// Updated Yup schema to expect invoice_date as string
const schema = yup.object().shape({
  vendor_name: yup.string().required('Vendor name is required'),
  total_amount: yup.number().positive('Total must be positive').required('Total is required'),
  invoice_number: yup.string().required('Invoice number is required'),
  invoice_date: yup.string().required('Invoice date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

interface Invoice {
  invoice_number: string;
  vendor_name: string;
  total_amount: number;
  validation_status: string;
  invoice_date: string;
  review_status?: string;
  confidence?: number;
}

// Update FormInputs type to use string for invoice_date
type FormInputs = {
  vendor_name: string;
  total_amount: number;
  invoice_number: string;
  invoice_date: string;
};

export default function ReviewPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // New function to handle viewing PDF
  const handleViewPdf = async (invoiceId: string) => {
    let objectUrl: string | undefined;
    
    if (!invoiceId || invoiceId === 'undefined') {
      toast.error("No invoice ID available to view PDF.");
      return;
    }
    
    try {
      const blob = await getInvoicePdf(invoiceId);
      objectUrl = window.URL.createObjectURL(blob);
      const newWindow = window.open(objectUrl, '_blank');
      
      // If window failed to open, clean up immediately
      if (!newWindow) {
        toast.error('Failed to open PDF. Please check your popup blocker settings.');
        if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        return;
      }
      
      // Clean up the URL after the window loads or after a timeout
      const cleanup = () => {
        if (objectUrl) {
          window.URL.revokeObjectURL(objectUrl);
          objectUrl = undefined;
        }
      };
      
      setTimeout(cleanup, 1000);
      
    } catch (error) {
      console.error('Error viewing PDF:', error);
      if (error instanceof Error && error.message === 'PDF not found for this invoice') {
        toast.error('PDF is not available for this invoice. It may have been moved or deleted.');
      } else {
        toast.error(`Failed to view PDF: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      // Ensure cleanup happens even if there's an error
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/invoices');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      // Filter to only show invoices that need review
      const reviewInvoices = data.filter((invoice: Invoice) => 
        invoice.review_status === "needs_review" || 
        invoice.validation_status === "failed"
      );
      setInvoices(reviewInvoices);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Updated onSubmit function with proper type instead of any
  const onSubmit: (data: FormInputs) => Promise<void> = async (data: FormInputs) => {
    setLoading(true);
    try {
      const invoiceId = selectedInvoice?.invoice_number;
      if (!invoiceId) throw new Error('No invoice selected');

      const formattedData = {
        ...data,
        // Assume data.invoice_date is a string in YYYY-MM-DD format
        invoice_date: data.invoice_date,
        invoice_number: invoiceId
      };

      const response = await fetch(`http://localhost:8000/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) throw new Error(await response.text());
      console.log('Invoice updated successfully');
      toast.success('Invoice updated successfully');
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Review Invoices</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      {loading && (
        <p className="text-gray-500 text-center py-4">Loading invoices for review...</p>
      )}
      
      {!loading && invoices.length === 0 && (
        <p className="text-gray-500 text-center py-8">No invoices require review at this time.</p>
      )}
      
      {selectedInvoice ? (
        // Begin form with react-hook-form
        <FormSection selectedInvoice={selectedInvoice} onSubmit={onSubmit} setSelectedInvoice={setSelectedInvoice} loading={loading} />
      ) : (
        <ul className="space-y-4">
          {invoices.map((invoice, idx) => (
            <li key={`${invoice.invoice_number}-${idx}`} className="p-4 bg-white rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Invoice: {invoice.invoice_number}</p>
                  <p className="text-sm text-gray-600">Vendor: {invoice.vendor_name}</p>
                  <p className="text-sm text-gray-600">Amount: {invoice.total_amount}</p>
                  <p className="text-sm text-gray-600">
                    Confidence: {typeof invoice.confidence === 'number' ? (invoice.confidence * 100).toFixed(1) : 'N/A'}%
                  </p>
                  <p className="text-sm text-gray-600">Status: {invoice.validation_status || 'Unknown'}</p>
                  <button
                    onClick={() => handleViewPdf(invoice.invoice_number)}
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

// New component for the form section using react-hook-form
function FormSection({ 
  selectedInvoice, 
  onSubmit, 
  setSelectedInvoice, 
  loading 
}: { 
  selectedInvoice: Invoice;
  onSubmit: (data: FormInputs) => Promise<void>;
  setSelectedInvoice: (inv: Invoice | null) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormInputs>({
    resolver: yupResolver(schema)
  });

  useEffect(() => {
    if (selectedInvoice) {
      reset({
        ...selectedInvoice,
        invoice_date: selectedInvoice.invoice_date // Keep as string, no Date conversion
      });
    }
  }, [selectedInvoice, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Edit Invoice {selectedInvoice.invoice_number}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
          <input
            type="text"
            {...register('vendor_name')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {errors.vendor_name && <p className="text-red-500 text-sm mt-1">{errors.vendor_name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
          <input
            type="text"
            {...register('invoice_number')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
          <input
            type="date"
            {...register('invoice_date')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
          <input
            type="number"
            step="0.01"
            {...register('total_amount')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {errors.total_amount && <p className="text-red-500 text-sm mt-1">{errors.total_amount.message}</p>}
        </div>
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedInvoice(null)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}