export interface Invoice {
    id: number;
    invoice_number: string;
    vendor_name: string;
    invoice_date: string;  // Format: YYYY-MM-DD
    total_amount: number;
    status: 'valid' | 'needs_review' | 'failed';
    pdf_url: string;
    created_at: string;  // ISO date string
    confidence: number;  // Range 0-1
    total_time?: number;  // Processing time in seconds
}

export interface ApiResponse<T> {
    status: 'success' | 'error' | 'warning';
    detail?: string;
    data?: T;
    message?: string;
    type?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        current_page: number;
        per_page: number;
        total_items: number;
        total_pages: number;
    };
}

export interface ProcessingStatus {
    current: number;
    total: number;
    failed: number;
    processed: number;
    skipped: number;
    currentFile?: string;
}

export interface WebSocketMessage {
    type: 'progress' | 'error' | 'complete' | 'status' | 'heartbeat' | 'warning';
    message?: string;
    current?: number;
    total?: number;
    failed?: number;
    processed?: number;
    skipped?: number;
    currentFile?: string;
    file?: string;
    error?: string;
}

export interface Anomaly {
    file_name: string;
    invoice_number?: string;
    vendor_name?: string;
    reason: string;
    confidence?: number;
    review_status: 'needs_review' | 'reviewed';
    type: 'invalid_pdf' | 'extraction_error' | 'missing_data' | 'low_confidence' | 'processing_error' | 'system_error';
    timestamp: string;  // ISO date string
}

export interface Metrics {
    total_invoices: number;
    status_breakdown: {
        [key: string]: number;
    };
    confidence_metrics: {
        average: number;
        minimum: number;
        maximum: number;
        low_confidence_rate: number;
    };
    processing_metrics: {
        average_seconds: number;
        minimum_seconds: number;
        maximum_seconds: number;
        total_processed: number;
    };
    recent_activity: {
        processed_24h: number;
        low_confidence_24h: number;
        valid_24h: number;
        needs_review_24h: number;
        avg_processing_time_24h: number;
    };
}

export interface UploadResponse {
    status: string;
    detail?: string;
    type?: string;
    extracted_data?: Invoice;
    existing_invoice?: Invoice;
    pdf_url?: string;
}
