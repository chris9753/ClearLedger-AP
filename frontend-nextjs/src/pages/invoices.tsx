import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { getInvoices, getInvoicePdf } from '../../lib/api';
import type { Invoice } from '../types';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export default function InvoicesPage() {
    const [error, setError] = useState<string | null>(null);
    const retryCount = useRef(0);
    const isMounted = useRef(true);

    const { 
        data: invoices = [] as Invoice[], // Add explicit type here
        isLoading, 
        isError,
        error: queryError,
        isSuccess,
        refetch
    } = useQuery({
        queryKey: ['invoices'],
        queryFn: getInvoices,
        retry: MAX_RETRIES - 1,
        retryDelay: (attempt) => RETRY_DELAY * (attempt + 1),
        staleTime: 30000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    // Reset error state on success
    useEffect(() => {
        if (isSuccess && isMounted.current) {
            retryCount.current = 0;
            setError(null);
        }
    }, [isSuccess]);

    // Enhanced error handling
    useEffect(() => {
        if (isError && isMounted.current) {
            retryCount.current++;
            const errorMessage = queryError instanceof Error ? queryError.message : 'Unknown error';
            
            if (retryCount.current < MAX_RETRIES) {
                toast.error(`Failed to load invoices (attempt ${retryCount.current}/${MAX_RETRIES}). Retrying...`);
            } else {
                setError('Failed to load invoices after multiple attempts.');
                toast.error(`Failed after ${MAX_RETRIES} attempts: ${errorMessage}`);
            }
        }
    }, [isError, queryError]);

    // Cleanup mounted state
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleViewPdf = async (invoiceNumber: string) => {
        const toastId = toast.loading('Fetching PDF...');
        try {
            const blob = await getInvoicePdf(invoiceNumber);
            const url = window.URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank');
            
            if (!newWindow) {
                toast.error('Please allow popups to view PDFs', { id: toastId });
            } else {
                toast.success('PDF opened successfully', { id: toastId });
            }
            
            // Clean up the blob URL after a delay
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);
        } catch (error) {
            console.error('Error viewing PDF:', error);
            let errorMessage = 'Failed to load PDF';
            
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    errorMessage = 'PDF not found. The file may have been deleted or moved.';
                } else if (error.message.includes('Failed to retrieve PDF from S3')) {
                    errorMessage = 'Unable to retrieve PDF from storage. Please try again later.';
                } else {
                    errorMessage = error.message;
                }
            }
            
            toast.error(errorMessage, { id: toastId });
        }
    };

    // Sort invoices by created_at (newest first)
    const sortedInvoices = (invoices ?? []).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return (
        <div className="max-w-7xl mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Invoices</h1>
                <div className="flex gap-4">
                    <Link
                        href="/upload"
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                        Upload New
                    </Link>
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                    >
                        {isLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="ml-2 text-gray-600">Loading invoices...</p>
                </div>
            )}

            {!isLoading && sortedInvoices.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No invoices found.</p>
                    <Link
                        href="/upload"
                        className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Upload your first invoice
                    </Link>
                </div>
            )}

            {sortedInvoices.length > 0 && (
                <div className="overflow-x-auto shadow-md rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedInvoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.vendor_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.invoice_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.invoice_date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">£{invoice.total_amount.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {invoice.confidence !== undefined && invoice.confidence !== null
                                            ? `${(invoice.confidence * 100).toFixed(1)}%`
                                            : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${invoice.status === 'valid' ? 'bg-green-100 text-green-800' : 
                                              invoice.status === 'needs_review' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-red-100 text-red-800'}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <button
                                            onClick={() => handleViewPdf(invoice.invoice_number)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            View PDF
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}