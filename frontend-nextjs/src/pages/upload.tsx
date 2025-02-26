import { useState, useEffect, useRef } from 'react';
import { uploadInvoice } from "../../lib/api";  // Updated import path
import { toast } from 'react-hot-toast'; // Added import for toast notifications

// Interface for type safety
interface UploadResponse {
  status: string;
  detail?: string;
  type?: string;
  extracted_data?: {
    invoice_number: string;
    vendor_name: string;
    total_amount: number;
    confidence: number;
    validation_status: string;
    invoice_date: string;
  };
  existing_invoice?: {
    invoice_number: string;
    vendor_name: string;
    invoice_date: string;
    total_amount: number;
    status: string;
    pdf_url: string;
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
    skipped: number;  // Make skipped required with default 0
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wsState, setWsState] = useState<{
    connected: boolean;
    reconnectAttempt: number;
    lastError: string | null;
    lastMessage: number;
  }>({
    connected: false,
    reconnectAttempt: 0,
    lastError: null,
    lastMessage: 0
  });
  const progressBarRef = useRef<HTMLDivElement>(null);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;
  const UPDATE_TIMEOUT = 30000; // 30 seconds
  const HEARTBEAT_INTERVAL = 15000; // 15 seconds

  // Connection management with keep-alive
  useEffect(() => {
    if (!isProcessingAll) return;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let keepAliveInterval: NodeJS.Timeout;
    let reconnectDelay = RECONNECT_DELAY;

    const setupKeepAlive = () => {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      keepAliveInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'keep_alive' }));
        }
      }, HEARTBEAT_INTERVAL / 2);
    };

    const connect = () => {
      if (wsState.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        toast.error('Connection lost. Please refresh the page to try again.');
        setIsProcessingAll(false);
        return;
      }

      // Close existing connection if any
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }

      try {
        ws = new WebSocket('ws://localhost:8000/ws/process_progress');

        ws.onopen = () => {
          console.log('WebSocket connected');
          setWsState(prev => ({
            ...prev,
            connected: true,
            lastError: null,
            lastMessage: Date.now()
          }));
          setupKeepAlive();
          ws?.send(JSON.stringify({ type: 'start_processing' }));
          reconnectDelay = RECONNECT_DELAY; // Reset delay on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setWsState(prev => ({ ...prev, lastMessage: Date.now() }));

            switch (data.type) {
              case 'progress':
                setProcessingStatus(prev => ({
                  ...prev,
                  current: data.current,
                  total: data.total,
                  failed: data.failed || 0,
                  skipped: data.skipped || 0,
                  currentFile: data.currentFile
                }));
                break;

              case 'error':
                toast.error(`Error processing ${data.file}: ${data.error}`);
                break;

              case 'warning':
                // Use toast.error with custom styling for warnings
                toast.error(`${data.file}: ${data.message}`, {
                  style: {
                    background: '#fff7ed',
                    color: '#9a3412',
                    border: '1px solid #fdba74'
                  }
                });
                break;

              case 'complete':
                toast.success(data.message);
                setIsProcessingAll(false);
                // Wait a moment before redirecting to ensure user sees the completion message
                setTimeout(() => {
                  window.location.href = '/invoices';
                }, 2000);
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
          setWsState(prev => ({
            ...prev,
            connected: false,
            reconnectAttempt: prev.reconnectAttempt + 1
          }));

          if (keepAliveInterval) clearInterval(keepAliveInterval);

          // Attempt reconnection with exponential backoff
          reconnectDelay = Math.min(reconnectDelay * 2, 10000);
          reconnectTimeout = setTimeout(connect, reconnectDelay);
        };

      } catch (error) {
        console.error('WebSocket connection error:', error);
        reconnectTimeout = setTimeout(connect, reconnectDelay);
      }
    };

    // Monitor connection health
    const healthCheck = setInterval(() => {
      const now = Date.now();
      if (wsState.connected && now - wsState.lastMessage > UPDATE_TIMEOUT) {
        console.log('Connection appears stale, reconnecting...');
        ws?.close(); // This will trigger reconnection through onclose
      }
    }, UPDATE_TIMEOUT / 2);

    connect();

    return () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
      clearTimeout(reconnectTimeout);
      clearInterval(keepAliveInterval);
      clearInterval(healthCheck);
    };
  }, [isProcessingAll, wsState.reconnectAttempt, wsState.connected, wsState.lastMessage]);

  // Progress bar updates
  useEffect(() => {
    if (processingStatus && progressBarRef.current) {
      const percent = Math.min((processingStatus.current / processingStatus.total) * 100, 100);
      progressBarRef.current.style.setProperty('--progress-width', `${percent}%`);
      
      // Update document title with progress
      document.title = processingStatus.current === processingStatus.total 
        ? 'Upload - Complete'
        : `Upload - ${processingStatus.current}/${processingStatus.total}`;
    }
    
    return () => {
      document.title = 'Upload';
    };
  }, [processingStatus]);

  const handleProcessAll = async () => {
    setIsProcessingAll(true);
    setProcessingStatus({
      current: 0,
      total: 0,
      failed: 0,
      skipped: 0
    });
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/process_all_invoices`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.message);
      }
      
      toast.success(data.message || "Invoices processed successfully");
      
      // Redirect to invoices page after successful processing
      window.location.href = '/invoices';
    } catch (error: unknown) {
      console.error('Error processing invoices:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error('Failed to process invoices: ' + errorMessage);
      setProcessingStatus(null);
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files) return;
    setLoading(true);
    setError(null);
    setUploadResponse(null); // Reset prior responses
    console.log("Uploading file:", files[0].name);
    try {
      const data = await uploadInvoice(files[0]) as UploadResponse;
      console.log("API response:", JSON.stringify(data, null, 2));
      setUploadResponse(data);
      
      // Handle different response types
      if (data.status === 'success') {
        toast.success('Invoice uploaded successfully');
      } else if (data.status === 'warning' && data.type === 'duplicate_invoice') {
        // Use toast.error with custom styling for warnings
        toast.error('This invoice has already been processed', {
          style: {
            background: '#fff7ed',
            color: '#9a3412',
            border: '1px solid #fdba74'
          }
        });
      } else if (data.status === 'error') {
        toast.error(data.detail || 'Upload failed');
      }
      
      console.log("Updated response state:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Upload error:', err);
      let errorMessage = 'Upload failed. ';
      
      if (err instanceof Error) {
        // Try to parse the error detail from the response
        try {
          const detail = JSON.parse(err.message);
          errorMessage += detail.detail || err.message;
          
          // Special handling for duplicate invoice errors
          if (detail.type === 'duplicate_invoice') {
            errorMessage = 'This invoice has already been processed. Check the invoices list.';
          }
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
                <span>
                  {processingStatus.current} / {processingStatus.total}
                  {processingStatus.skipped > 0 && ` (${processingStatus.skipped} skipped)`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  ref={progressBarRef}
                  className="progress-bar"
                ></div>
              </div>
              {processingStatus.currentFile && (
                <p className="text-sm text-gray-600 truncate">
                  Current: {processingStatus.currentFile}
                </p>
              )}
              {processingStatus.failed > 0 && (
                <p className="text-sm text-red-500">
                  Failed: {processingStatus.failed} invoice(s)
                </p>
              )}
              {!wsState.connected && (
                <p className="text-sm text-yellow-500">
                  Connection lost. Attempting to reconnect...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}
      
      {/* Conditional rendering of upload response */}
      {uploadResponse && (
        <div className={`bg-gray-100 p-4 rounded mt-4 ${
          uploadResponse.status === 'warning' ? 'border-l-4 border-yellow-500' : 
          uploadResponse.status === 'error' ? 'border-l-4 border-red-500' : ''
        }`}>
          {uploadResponse.status === 'success' && uploadResponse.extracted_data ? (
            <div className="space-y-2">
              <h3 className="font-bold text-green-600">Upload Successful!</h3>
              <p><span className="font-semibold">Vendor:</span> {uploadResponse.extracted_data.vendor_name}</p>
              <p><span className="font-semibold">Invoice Number:</span> {uploadResponse.extracted_data.invoice_number}</p>
              <p><span className="font-semibold">Date:</span> {uploadResponse.extracted_data.invoice_date}</p>
              <p><span className="font-semibold">Total Amount:</span> £{uploadResponse.extracted_data.total_amount}</p>
              <p><span className="font-semibold">Confidence:</span> {(uploadResponse.extracted_data.confidence * 100).toFixed(2)}%</p>
              <p><span className="font-semibold">Status:</span> {uploadResponse.extracted_data.validation_status}</p>
            </div>
          ) : uploadResponse.status === 'warning' && uploadResponse.type === 'duplicate_invoice' ? (
            <div className="space-y-2">
              <h3 className="font-bold text-yellow-600">Duplicate Invoice Detected</h3>
              <p>This invoice has already been processed.</p>
              
              {uploadResponse.existing_invoice && (
                <div className="mt-2 pt-2 border-t">
                  <h4 className="font-semibold">Existing Invoice Details:</h4>
                  <p><span className="font-semibold">Vendor:</span> {uploadResponse.existing_invoice.vendor_name}</p>
                  <p><span className="font-semibold">Invoice Number:</span> {uploadResponse.existing_invoice.invoice_number}</p>
                  <p><span className="font-semibold">Date:</span> {uploadResponse.existing_invoice.invoice_date}</p>
                  <p><span className="font-semibold">Total Amount:</span> £{uploadResponse.existing_invoice.total_amount}</p>
                  <p><span className="font-semibold">Status:</span> {uploadResponse.existing_invoice.status}</p>
                  
                  {uploadResponse.existing_invoice.pdf_url && (
                    <a 
                      href={`/invoices?view=${uploadResponse.existing_invoice.invoice_number}`} 
                      className="inline-block mt-2 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View Invoice Details
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-500">
              <h3 className="font-bold">Upload Error</h3>
              <p>{uploadResponse.detail || 'An error occurred while processing the invoice. Please try again.'}</p>
            </div>
          )}
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