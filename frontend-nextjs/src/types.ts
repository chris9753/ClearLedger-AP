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
    status: 'success' | 'error';
    detail?: string;
    data?: T;
    message?: string;
}

export interface ProcessingStatus {
    current: number;
    total: number;
    failed: number;
    currentFile?: string;
}

export interface WebSocketMessage {
    type: 'progress' | 'error' | 'complete' | 'status' | 'heartbeat';
    message?: string;
    current?: number;
    total?: number;
    failed?: number;
    currentFile?: string;
    file?: string;
    error?: string;
}

export interface Anomaly {
    file_name: string;
    reason: string;
    confidence: number;
    review_status: string;
    type: string;
    invoice_number?: string;
    vendor_name?: string;
}
