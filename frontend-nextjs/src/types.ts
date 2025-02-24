export interface Invoice {
  invoice_number: string;
  vendor_name: string;
  total_amount: number;
  confidence: number;
  validation_status: string;
  invoice_date: string;
  total_time?: number; // Optional, used in metrics.tsx
}

export interface UploadResponse {
  status: string;
  detail: string;
  extracted_data?: Invoice;
  type?: string; // Optional, for error responses
}
