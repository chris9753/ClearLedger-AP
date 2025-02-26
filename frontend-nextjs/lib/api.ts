import { Invoice, Anomaly } from '../src/types';

interface ApiError {
    detail?: string;
    message?: string;
}

interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        current_page: number;
        per_page: number;
        total_items: number;
        total_pages: number;
    };
}

interface Metrics {
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

export async function uploadInvoice(file: File): Promise<{ 
    status: string; 
    detail?: string;
    extracted_data?: Invoice;
}> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/upload_invoice`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.message || 'Upload failed');
        }
        throw new Error(`Upload failed: ${await response.text()}`);
    }
    
    return response.json();
}

export async function getInvoices(
    page: number = 1,
    perPage: number = 10,
    sortBy: string = 'created_at',
    order: string = 'desc'
): Promise<PaginatedResponse<Invoice>> {
    const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        order: order
    });
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/invoices?${params}`);
    
    if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch invoices');
        }
        throw new Error('Failed to fetch invoices');
    }

    return response.json();
}

export async function getInvoicePdf(invoiceId: string): Promise<Blob> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/invoice_pdf/${invoiceId}`);
    
    if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to retrieve PDF');
        }
        if (response.status === 404) {
            throw new Error('PDF not found for this invoice');
        }
        throw new Error('Failed to retrieve PDF');
    }
    
    // Verify we got a PDF
    const contentType = response.headers.get('Content-Type');
    if (!contentType?.includes('application/pdf')) {
        throw new Error('Invalid response: not a PDF');
    }
    
    return response.blob();
}

export async function updateInvoiceStatus(
    invoiceId: string,
    updateData: {
        vendor_name: string;
        invoice_number: string;
        invoice_date: string;
        total_amount: number;
        validation_status?: string;
        confidence?: number;
    }
): Promise<Invoice> {
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/invoices/${invoiceId}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        }
    );

    if (!response.ok) {
        const errorData = await response.json() as ApiError;
        throw new Error(errorData.detail || 'Failed to update invoice');
    }

    return response.json();
}

export async function getAnomalies(
    page: number = 1,
    perPage: number = 10,
    status?: string
): Promise<PaginatedResponse<Anomaly>> {
    const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
    });
    if (status) params.append('status', status);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/anomalies?${params}`);
    if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch anomalies');
        }
        throw new Error('Failed to fetch anomalies');
    }

    return response.json();
}

export async function getMetrics(): Promise<Metrics> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/metrics`);
    if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch metrics');
        }
        throw new Error('Failed to fetch metrics');
    }

    return response.json();
}