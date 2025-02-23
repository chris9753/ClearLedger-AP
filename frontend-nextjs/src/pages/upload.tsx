import { useState, useEffect } from 'react';
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
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<{
    current: number;
    total: number;
    failed: number;
    currentFile?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    let reconnectAttempt = 0;
    const maxReconnectAttempts = 3;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:8000/ws/process_progress');
      
      ws.onopen = () => {
        setWsConnected(true);
        reconnectAttempt = 0; // Reset attempt counter on successful connection
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'progress':
            setProcessingStatus({
              current: data.current,
              total: data.total,
              failed: data.failed,
              currentFile: data.currentFile
            });
            break;
          case 'error':
            toast.error(`Failed to process ${data.file}: ${data.error}`);
            break;
          case 'complete':
            toast.success(data.message);
            break;
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (reconnectAttempt < maxReconnectAttempts) {
          reconnectAttempt++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 10000);
          reconnectTimeout = setTimeout(connectWebSocket, delay);
        } else {
          toast.error('Lost connection to server. Please refresh the page.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close(); // Will trigger onclose and attempt reconnection
      };

      setSocket(ws);
    };

    connectWebSocket();

    return () => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const processAllInvoices = async () => {
    if (!wsConnected) {
      toast.error('Not connected to server. Please wait or refresh the page.');
      return;
    }
    
    setIsProcessingAll(true);
    setProcessingStatus({ current: 0, total: 0, failed: 0 });
    try {
      const response = await fetch('http://localhost:8000/api/process_all_invoices');
      if (!response.ok) throw new Error('Failed to process invoices');
      const data = await response.json();
      
      // Final status will be updated via WebSocket
      if (!data.total) {
        toast.info(data.message); // Show "No invoices found" message
        setProcessingStatus(null);
      }
    } catch (err) {
      console.error('Error processing invoices:', err);
      toast.error('Failed to process all invoices');
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
      
      {/* File upload form */}
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

      {/* Enhanced batch processing section */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Batch Processing</h2>
        <button
          onClick={processAllInvoices}
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
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(processingStatus.current / processingStatus.total) * 100}%`
                  }}
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

      {/* Connection status indicator */}
      <div className={`fixed bottom-4 right-4 px-3 py-1 rounded-full text-sm ${
        wsConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {wsConnected ? 'Connected' : 'Connecting...'}
      </div>
    </div>
  );
}