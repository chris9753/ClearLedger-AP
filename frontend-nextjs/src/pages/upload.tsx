import { useState, useEffect, useRef } from "react";
import { uploadInvoice, getWebSocketUrl } from "../../lib/api";
import { toast } from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import PipelineFlow from "../components/PipelineFlow";
import ExtractionResult from "../components/ExtractionResult";
import AppFooter from "../components/AppFooter";

const BATCH_INVOICE_COUNT = 35;

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
    skipped: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wsState, setWsState] = useState({
    connected: false,
    reconnectAttempt: 0,
    lastError: null as string | null,
    lastMessage: 0,
  });
  const progressBarRef = useRef<HTMLDivElement>(null);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;
  const UPDATE_TIMEOUT = 30000;
  const HEARTBEAT_INTERVAL = 15000;

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
          ws.send(JSON.stringify({ type: "keep_alive" }));
        }
      }, HEARTBEAT_INTERVAL / 2);
    };

    const connect = () => {
      if (wsState.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        toast.error("Connection lost. Please refresh the page to try again.");
        setIsProcessingAll(false);
        return;
      }

      if (ws?.readyState === WebSocket.OPEN) ws.close();

      try {
        ws = new WebSocket(getWebSocketUrl("/ws/process_progress"));

        ws.onopen = () => {
          setWsState((prev) => ({
            ...prev,
            connected: true,
            lastError: null,
            lastMessage: Date.now(),
          }));
          setupKeepAlive();
          ws?.send(JSON.stringify({ type: "start_processing" }));
          reconnectDelay = RECONNECT_DELAY;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setWsState((prev) => ({ ...prev, lastMessage: Date.now() }));

            switch (data.type) {
              case "progress":
                setProcessingStatus((prev) => ({
                  ...prev,
                  current: data.current,
                  total: data.total,
                  failed: data.failed || 0,
                  skipped: data.skipped || 0,
                  currentFile: data.currentFile,
                }));
                break;
              case "error":
                toast.error(`Error processing ${data.file}: ${data.error}`);
                break;
              case "warning":
                toast.error(`${data.file}: ${data.message}`, {
                  style: { background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74" },
                });
                break;
              case "complete":
                toast.success(data.message);
                setIsProcessingAll(false);
                setTimeout(() => {
                  window.location.href = "/invoices";
                }, 2000);
                break;
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };

        ws.onerror = () => {
          setWsState((prev) => ({ ...prev, connected: false, lastError: "Connection error occurred" }));
        };

        ws.onclose = () => {
          setWsState((prev) => ({
            ...prev,
            connected: false,
            reconnectAttempt: prev.reconnectAttempt + 1,
          }));
          if (keepAliveInterval) clearInterval(keepAliveInterval);
          reconnectDelay = Math.min(reconnectDelay * 2, 10000);
          reconnectTimeout = setTimeout(connect, reconnectDelay);
        };
      } catch {
        reconnectTimeout = setTimeout(connect, reconnectDelay);
      }
    };

    const healthCheck = setInterval(() => {
      const now = Date.now();
      if (wsState.connected && now - wsState.lastMessage > UPDATE_TIMEOUT) {
        ws?.close();
      }
    }, UPDATE_TIMEOUT / 2);

    connect();

    return () => {
      if (ws?.readyState === WebSocket.OPEN) ws.close();
      clearTimeout(reconnectTimeout);
      clearInterval(keepAliveInterval);
      clearInterval(healthCheck);
    };
  }, [isProcessingAll, wsState.reconnectAttempt, wsState.connected, wsState.lastMessage]);

  useEffect(() => {
    if (processingStatus && progressBarRef.current) {
      const percent = Math.min((processingStatus.current / processingStatus.total) * 100, 100);
      progressBarRef.current.style.setProperty("--progress-width", `${percent}%`);
      document.title =
        processingStatus.current === processingStatus.total
          ? "Upload - Complete"
          : `Upload - ${processingStatus.current}/${processingStatus.total}`;
    }
    return () => {
      document.title = "Upload";
    };
  }, [processingStatus]);

  const handleProcessAll = async () => {
    setIsProcessingAll(true);
    setProcessingStatus({ current: 0, total: 0, failed: 0, skipped: 0 });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/process_all_invoices`,
        { method: "POST" }
      );
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      if (data.status === "error") throw new Error(data.message);
      toast.success(data.message || "Invoices processed successfully");
      window.location.href = "/invoices";
    } catch (err) {
      toast.error(
        "Failed to process invoices: " + (err instanceof Error ? err.message : "Unknown error")
      );
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
    setUploadResponse(null);

    try {
      const data = (await uploadInvoice(files[0])) as UploadResponse;
      setUploadResponse(data);

      if (data.status === "success") {
        toast.success("Invoice uploaded successfully");
      } else if (data.status === "warning" && data.type === "duplicate_invoice") {
        toast.error("This invoice has already been processed", {
          style: { background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74" },
        });
      } else if (data.status === "error") {
        toast.error(data.detail || "Upload failed");
      }
    } catch (err) {
      let errorMessage = "Upload failed. ";
      if (err instanceof Error) {
        try {
          const detail = JSON.parse(err.message);
          errorMessage += detail.detail || err.message;
          if (detail.type === "duplicate_invoice") {
            errorMessage = "This invoice has already been processed. Check the invoices list.";
          }
        } catch {
          errorMessage += err.message;
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setFiles(null);
    }
  };

  const renderExtractionPanel = () => {
    if (!uploadResponse) {
      return <ExtractionResult />;
    }
    if (uploadResponse.status === "success" && uploadResponse.extracted_data) {
      return (
        <ExtractionResult
          data={uploadResponse.extracted_data}
          title="Extraction result"
          variant="result"
        />
      );
    }
    if (uploadResponse.status === "warning" && uploadResponse.type === "duplicate_invoice") {
      return (
        <ExtractionResult
          title="Duplicate invoice detected"
          variant="warning"
          message="This invoice has already been processed. Check the invoices list for details."
        />
      );
    }
    return (
      <ExtractionResult
        title="Upload error"
        variant="error"
        message={uploadResponse.detail || "An error occurred while processing the invoice."}
      />
    );
  };

  return (
    <>
      <PageHeader
        title="Upload and process invoices"
        subtitle="Single PDF upload runs the multi-agent pipeline. Batch mode processes all files in data/raw/invoices."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-slate-900">Single invoice upload</h2>
            <p className="mt-1 text-sm text-slate-500 mb-5">
              Accepts PDF invoices for automated extraction and validation.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label
                htmlFor="invoice-file"
                className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
              >
                <span className="text-sm text-slate-500">
                  {files?.[0]?.name ?? "Choose File — No file chosen"}
                </span>
                <input
                  id="invoice-file"
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  onChange={(e) => setFiles(e.target.files)}
                />
              </label>
              <p className="text-xs text-slate-400">
                Tip: filename with duplicate triggers duplicate warning
              </p>
              <button type="submit" disabled={loading || !files} className="btn-primary w-full py-2.5">
                {loading ? "Uploading…" : "Upload and extract"}
              </button>
            </form>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold text-slate-900">Batch processing</h2>
            <p className="mt-1 text-sm text-slate-500 mb-5">
              Process entire invoice folder with live WebSocket progress.
            </p>
            <button
              onClick={handleProcessAll}
              disabled={isProcessingAll}
              className="btn-success py-2.5"
            >
              {isProcessingAll
                ? "Processing…"
                : `Process all invoices (${BATCH_INVOICE_COUNT})`}
            </button>

            {processingStatus && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Progress</span>
                  <span>
                    {processingStatus.current} / {processingStatus.total}
                    {processingStatus.skipped > 0 && ` (${processingStatus.skipped} skipped)`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div ref={progressBarRef} className="progress-bar" />
                </div>
                {processingStatus.currentFile && (
                  <p className="text-xs text-slate-500 truncate">
                    Current: {processingStatus.currentFile}
                  </p>
                )}
                {processingStatus.failed > 0 && (
                  <p className="text-xs text-red-500">Failed: {processingStatus.failed}</p>
                )}
                {!wsState.connected && isProcessingAll && (
                  <p className="text-xs text-amber-600">Reconnecting to server…</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <PipelineFlow compact showTitle showLegend />
          {renderExtractionPanel()}
        </div>
      </div>

      <AppFooter />

      <div
        className={`fixed bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${
          wsState.connected
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}
      >
        {wsState.connected
          ? "Connected to server"
          : wsState.reconnectAttempt > 0
            ? `Reconnecting (${wsState.reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})…`
            : "Disconnected"}
      </div>
    </>
  );
}
