import { useState } from 'react';
import { uploadInvoice } from "../../lib/api";  // Updated import path
import { toast } from 'react-hot-toast'; // Added import for toast notifications

// Interface for type safety
interface UploadResponse {
  extracted_data: {
    invoice_number: string;
    vendor_name: string;
    total_amount: number;
    confidence: number;
    validation_status: string;
    invoice_date: string;
  };
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [response, setResponse] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processAllInvoices = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/process_all_invoices');
      if (!response.ok) throw new Error('Failed to process invoices');
      const data = await response.json();
      alert(data.message);
    } catch (err) {
      console.error('Error processing invoices:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files) return;

    setLoading(true);
    setError(null);
    console.log("Uploading file:", files[0].name);
    try {
      const data = await uploadInvoice(files[0]);
      console.log("API response:", JSON.stringify(data, null, 2));
      setResponse(data);
      toast.success('Invoice uploaded successfully');
      console.log("Updated response state:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Upload error:', err);
      let errorMessage = 'Upload failed. ';
      if (err instanceof Error) {
        // Try to parse the error detail from the response
        try {
          const detail = JSON.parse(err.message);
          errorMessage += detail.detail || err.message;
        } catch {
          errorMessage += err.message;
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setFiles(null); // Reset file input after upload attempt
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Upload Invoice</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".pdf"
            multiple={false}
            onChange={(e) => setFiles(e.target.files)}
            className="flex-1 p-2 border rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>
      <button
        onClick={processAllInvoices}
        className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Process All Invoices
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {response && (
        <div className="bg-gray-100 p-4 rounded mt-4 space-y-2">
          <p><span className="font-semibold">Vendor:</span> {response.extracted_data.vendor_name}</p>
          <p><span className="font-semibold">Invoice Number:</span> {response.extracted_data.invoice_number}</p>
          <p><span className="font-semibold">Date:</span> {response.extracted_data.invoice_date}</p>
          <p><span className="font-semibold">Total Amount:</span> £{response.extracted_data.total_amount}</p>
          <p><span className="font-semibold">Confidence:</span> {(response.extracted_data.confidence * 100).toFixed(2)}%</p>
          <p><span className="font-semibold">Status:</span> {response.extracted_data.validation_status}</p>
        </div>
      )}
    </div>
  );
}