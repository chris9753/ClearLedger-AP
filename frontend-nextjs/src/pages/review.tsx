import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { getInvoicePdf, getInvoices, updateInvoiceStatus } from '../../lib/api';
import { Invoice } from '../types';

const schema = yup.object().shape({
  vendor_name: yup.string().required('Vendor name is required'),
  total_amount: yup.number().positive('Total must be positive').required('Total is required'),
  invoice_number: yup.string().required('Invoice number is required'),
  invoice_date: yup.string().required('Invoice date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

type FormInputs = {
  vendor_name: string;
  total_amount: number;
  invoice_number: string;
  invoice_date: string;
};

export default function ReviewPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const { 
    data: invoiceData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['invoices', currentPage],
    queryFn: () => getInvoices(currentPage, perPage, 'created_at', 'desc'),
    retry: 2,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const reviewInvoices = (invoiceData?.data || []).filter(invoice => 
    invoice.status === "needs_review" || 
    invoice.status === "failed" ||
    (invoice.confidence !== undefined && invoice.confidence < 0.7)
  );

  const handleViewPdf = async (invoiceId: string) => {
    if (!invoiceId || invoiceId === 'undefined') {
      toast.error("No invoice ID available to view PDF.");
      return;
    }
    
    const toastId = toast.loading('Downloading PDF...');
    let objectUrl: string | undefined;
    
    try {
      const blob = await getInvoicePdf(invoiceId);
      objectUrl = window.URL.createObjectURL(blob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = objectUrl;
      downloadLink.download = `${invoiceId}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast.success('PDF downloaded successfully', { id: toastId });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(
        `Failed to fetch PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id: toastId }
      );
    } finally {
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    }
  };

  const onSubmit = async (data: FormInputs) => {
    if (!selectedInvoice?.id) {
      toast.error('No invoice selected');
      return;
    }

    try {
      await updateInvoiceStatus(selectedInvoice.id.toString(), {
        ...data,
        validation_status: 'valid',
        confidence: 1.0
      });
      
      toast.success('Invoice updated successfully');
      setSelectedInvoice(null);
      refetch(); // Refresh the list
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save invoice');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Review Invoices</h1>
      
      {isError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p className="text-red-700">{error instanceof Error ? error.message : 'Failed to load invoices'}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="ml-2 text-gray-600">Loading invoices for review...</p>
        </div>
      ) : reviewInvoices.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No invoices require review at this time.</p>
      ) : selectedInvoice ? (
        <FormSection 
          selectedInvoice={selectedInvoice} 
          onSubmit={onSubmit} 
          setSelectedInvoice={setSelectedInvoice} 
          isSubmitting={false} 
        />
      ) : (
        <>
          <ul className="space-y-4">
            {reviewInvoices.map((invoice) => (
              <li key={invoice.id} className="p-4 bg-white rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Invoice: {invoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">Vendor: {invoice.vendor_name}</p>
                    <p className="text-sm text-gray-600">Amount: £{invoice.total_amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      Confidence: {invoice.confidence !== undefined && invoice.confidence !== null
                        ? `${(invoice.confidence * 100).toFixed(1)}%`
                        : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">Status: {invoice.status}</p>
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

          {invoiceData?.pagination && invoiceData.pagination.total_pages > 1 && (
            <div className="mt-6 flex justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {currentPage} of {invoiceData.pagination.total_pages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(invoiceData.pagination.total_pages, p + 1))}
                disabled={currentPage === invoiceData.pagination.total_pages}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Form section component
function FormSection({ 
  selectedInvoice, 
  onSubmit, 
  setSelectedInvoice, 
  isSubmitting 
}: { 
  selectedInvoice: Invoice;
  onSubmit: (data: FormInputs) => Promise<void>;
  setSelectedInvoice: (inv: Invoice | null) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormInputs>({
    resolver: yupResolver(schema),
    defaultValues: {
      vendor_name: selectedInvoice.vendor_name,
      invoice_number: selectedInvoice.invoice_number,
      invoice_date: selectedInvoice.invoice_date,
      total_amount: selectedInvoice.total_amount
    }
  });

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
          {errors.invoice_number && <p className="text-red-500 text-sm mt-1">{errors.invoice_number.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
          <input
            type="date"
            {...register('invoice_date')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {errors.invoice_date && <p className="text-red-500 text-sm mt-1">{errors.invoice_date.message}</p>}
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
            disabled={isSubmitting}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
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