import { useState, useEffect, useRef } from 'react';
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
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<{
    current: number;
    total: number;
    failed: number;
    currentFile?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wsState, setWsState] = useState<{
    connected: boolean;
    reconnectAttempt: number;
    lastError: string | null;
  }>({
    connected: false,
    reconnectAttempt: 0,
    lastError: null
  });
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProcessingAll) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    const MAX_RECONNECT_ATTEMPTS = 3;
    const INITIAL_RETRY_DELAY = 1000;

    const connect = () => {
      if (wsState.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        toast.error('Failed to connect to server after multiple attempts');
        return;
      }

      ws = new WebSocket('ws://localhost:8000/ws/process_progress');

      ws.onopen = () => {
        setWsState(prev => ({
          ...prev,
          connected: true,
          lastError: null,
          reconnectAttempt: 0
        }));
        toast.success('Connected to processing server');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'progress':
              setProcessingStatus(prev => ({
                ...prev,
                current: data.current,
                total: data.total,
                failed: data.failed,
                currentFile: data.currentFile
              }));
              break;
            case 'error':
              toast.error(`Error processing ${data.file}: ${data.error}`);
              break;
            case 'complete':
              toast.success(data.message);
              setIsProcessingAll(false);
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsState(prev => ({
          ...prev,
          connected: false,
          lastError: 'Connection error occurred'
        }));
      };

      ws.onclose = () => {
        setWsState(prev => {
          const newState = {
            ...prev,
            connected: false,
            reconnectAttempt: prev.reconnectAttempt + 1
          };

          if (newState.reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, newState.reconnectAttempt);
            reconnectTimeout = setTimeout(connect, delay);
            toast.error(`Connection lost. Retrying in ${delay / 1000} seconds...`);
          }

          return newState;
        });
      };
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [isProcessingAll, wsState.reconnectAttempt]);

  useEffect(() => {
    if (processingStatus && progressBarRef.current) {
      const percent = (processingStatus.current / processingStatus.total) * 100;
      progressBarRef.current.style.setProperty('--progress-width', `${percent}%`);
    }
  }, [processingStatus]);

  const handleProcessAll = async () => {
    setIsProcessingAll(true);
    try {
      const response = await fetch('http://localhost:8000/api/process_all_invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      alert(data.message || "Invoices processed successfully");
    } catch (error: unknown) {
      console.error('Error processing invoices:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      alert('Failed to process invoices: ' + errorMessage);
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files) return;

    setLoading(true);
    setError(null);
    console.log("Uploading file:", files[0].name);
    try {
      const data = await uploadInvoice(files[0]) as UploadResponse;
      console.log("API response:", JSON.stringify(data, null, 2));
      setUploadResponse(data);
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
      
      {/* File upload form with accessible label */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-4">
          <label htmlFor="invoice-file" className="sr-only">Select Invoice PDF</label>
          <input
            id="invoice-file"
            type="file"
            aria-label="Select Invoice PDF"
            placeholder="Select Invoice PDF"
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

      {/* Enhanced batch processing section */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Batch Processing</h2>
        <button
          onClick={handleProcessAll}
          disabled={isProcessingAll}
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300"
        >
          {isProcessingAll ? 'Processing...' : 'Process All Invoices'}
        </button>
        
        {/* Enhanced processing status indicator */}
        {processingStatus && (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress:</span>
                <span>{processingStatus.current} / {processingStatus.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  ref={progressBarRef}
                  className="progress-bar bg-green-600 h-2.5 rounded-full transition-all duration-500"
                ></div>
              </div>
              {processingStatus.currentFile && (
                <p className="text-sm text-gray-600">
                  Processing: {processingStatus.currentFile}
                </p>
              )}
              {processingStatus.failed > 0 && (
                <p className="text-sm text-red-500">
                  Failed to process {processingStatus.failed} invoice(s)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}
      
      {/* Single upload response display */}
      {uploadResponse && (
        <div className="bg-gray-100 p-4 rounded mt-4 space-y-2">
          <p><span className="font-semibold">Vendor:</span> {uploadResponse.extracted_data.vendor_name}</p>
          <p><span className="font-semibold">Invoice Number:</span> {uploadResponse.extracted_data.invoice_number}</p>
          <p><span className="font-semibold">Date:</span> {uploadResponse.extracted_data.invoice_date}</p>
          <p><span className="font-semibold">Total Amount:</span> £{uploadResponse.extracted_data.total_amount}</p>
          <p><span className="font-semibold">Confidence:</span> {(uploadResponse.extracted_data.confidence * 100).toFixed(2)}%</p>
          <p><span className="font-semibold">Status:</span> {uploadResponse.extracted_data.validation_status}</p>
        </div>
      )}

      {/* Connection status indicator */}
      <div className={`fixed bottom-4 right-4 px-3 py-1 rounded-full text-sm ${
        wsState.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {wsState.connected ? 'Connected to server' : 
         wsState.reconnectAttempt > 0 ? `Reconnecting (${wsState.reconnectAttempt}/3)...` : 
         'Disconnected'}
      </div>
    </div>
  );
}