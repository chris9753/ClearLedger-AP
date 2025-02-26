import { Invoice, UploadResponse, Anomaly } from '../types';

export async function uploadInvoice(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/upload_invoice`, {
        method: 'POST',
        body: formData,
    });

    const contentType = response.headers.get('Content-Type');
    const data = contentType?.includes('application/json') 
        ? await response.json()
        : { status: 'error', detail: await response.text() };

    if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
    }

    return data as UploadResponse;
}

export async function getInvoices(): Promise<Invoice[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/invoices`, {
        method: 'GET'
    });
    
    if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch invoices');
        }
        throw new Error('Failed to fetch invoices');
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        return []; // Return empty array if response is not an array
    }
    return data as Invoice[];
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

export async function getAnomalies(): Promise<Anomaly[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/anomalies`);
    if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch anomalies');
        }
        throw new Error('Failed to fetch anomalies');
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}
