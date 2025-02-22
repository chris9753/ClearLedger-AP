import { useState, useEffect } from 'react';
import { getInvoices, submitReview } from '../lib/api';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up worker for PDF.js with version matching react-pdf@^9.2.1
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.7.0/build/pdf.worker.min.js';

// Interface for type safety
interface Invoice {
  invoice_number: string;
  vendor_name: string;
  total_amount: number;
  confidence: number;
  validation_status: string;
  invoice_date: string;
}

export default function ReviewPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: Invoice[] = await getInvoices();
      // Filter invoices needing review
      const flagged = data.filter(
        (inv) => inv.confidence < 0.9 || inv.validation_status !== 'valid'
      );
      setInvoices(flagged);
    } catch (err) {
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editInvoice) return;
    setLoading(true);
    try {
      const corrections = {
        vendor_name: editInvoice.vendor_name,
        invoice_number: editInvoice.invoice_number,
        invoice_date: editInvoice.invoice_date,
        total_amount: editInvoice.total_amount,
      };
      
      await fetch(`/api/invoices/${editInvoice.invoice_number}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(corrections),
      });
      
      fetchInvoices(); // Refresh the list
      setEditInvoice(null);
    } catch (err) {
      setError('Failed to save review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log("PDF loaded successfully with", numPages, "pages");
    setNumPages(numPages);
    setPdfError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error("PDF load failed:", error);
    setPdfError('Failed to load PDF');
  }

  const previewInvoice = async (invoice: Invoice) => {
    try {
      const pdfUrl = `http://localhost:8000/api/invoice_pdf/${invoice.invoice_number}`;
      console.log("Loading PDF from:", pdfUrl);
      
      // Check if the endpoint returns a valid PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      
      setSelectedInvoice(invoice);
      setShowPreview(true);
      setPdfError(null);
      setNumPages(null);
    } catch (error) {
      console.error("Preview error:", error);
      setPdfError(error instanceof Error ? error.message : 'Failed to load PDF');
      setShowPreview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Review Invoices</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {editInvoice ? (
            <div className="border p-4 rounded-lg bg-white shadow-sm mb-4">
              <h2 className="text-xl font-semibold mb-4">Edit Invoice {editInvoice.invoice_number}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    value={editInvoice.vendor_name}
                    onChange={(e) =>
                      setEditInvoice({ ...editInvoice, vendor_name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={editInvoice.invoice_number}
                    onChange={(e) =>
                      setEditInvoice({ ...editInvoice, invoice_number: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={editInvoice.invoice_date}
                    onChange={(e) =>
                      setEditInvoice({ ...editInvoice, invoice_date: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editInvoice.total_amount}
                    onChange={(e) =>
                      setEditInvoice({ ...editInvoice, total_amount: Number(e.target.value) })
                    }
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
                    onClick={() => setEditInvoice(null)}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {invoices.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {invoices.map((invoice, index) => (
                    <li key={`${invoice.invoice_number}-${index}`} className="py-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Invoice: {invoice.invoice_number}</p>
                          <p className="text-sm text-gray-600">Amount: {invoice.total_amount}</p>
                          <p className="text-sm text-gray-600">Status: {invoice.validation_status}</p>
                          <div className="flex space-x-3 mt-2">
                            <button
                              onClick={async () => {
                                try {
                                  const pdfUrl = `http://localhost:8000/api/invoice_pdf/${invoice.invoice_number}`;
                                  const response = await fetch(pdfUrl);
                                  if (!response.ok) {
                                    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
                                  }
                                  window.open(pdfUrl, "_blank");
                                } catch (error) {
                                  console.error("Error opening PDF:", error);
                                  alert("Failed to open PDF. Please try again.");
                                }
                              }}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View PDF
                            </button>
                            <button
                              onClick={() => previewInvoice(invoice)}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Preview
                            </button>
                          </div>
                        </div>
                        <button 
                          onClick={() => setEditInvoice(invoice)}
                          className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                        >
                          Edit
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-8">No invoices need review.</p>
              )}
            </>
          )}
        </div>
        
        <div className="h-screen sticky top-0">
          {showPreview && selectedInvoice && (
            <div className="border rounded-lg overflow-hidden h-full bg-white p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  Invoice: {selectedInvoice.invoice_number}
                </h2>
                <button 
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              {pdfError ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-red-500">
                    {pdfError}
                    <button 
                      onClick={() => setShowPreview(false)} 
                      className="ml-4 text-gray-500 hover:text-gray-700"
                    >
                      Close
                    </button>
                  </p>
                </div>
              ) : (
                <Document
                  file={selectedInvoice ? `http://localhost:8000/api/invoice_pdf/${selectedInvoice.invoice_number}` : null}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={<div className="text-center py-4">Loading PDF...</div>}
                  error={<div className="text-center py-4 text-red-500">Error loading PDF. Please try again.</div>}
                  className="w-full h-full overflow-auto"
                >
                  {Array.from(new Array(numPages || 0), (_, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      className="mb-4"
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  ))}
                </Document>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}