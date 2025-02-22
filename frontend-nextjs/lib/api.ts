export async function uploadInvoice(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/upload_invoice`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  return response.json();
}