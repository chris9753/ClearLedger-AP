export async function uploadInvoice(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/upload_invoice`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
        } else {
            const text = await response.text();
            throw new Error(`Upload failed: ${text}`);
        }
    }
    
    return response.json();
}

export async function getInvoices(): Promise<any> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/invoices`, {
        method: 'GET'
    });
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return response.json();
}