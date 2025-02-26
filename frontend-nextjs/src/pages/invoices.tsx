import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { getInvoices } from '../../lib/api';
import type { Invoice } from '../types';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export default function InvoicesPage() {
    const [error, setError] = useState<string | null>(null);
    const retryCount = useRef(0);
    const isMounted = useRef(true);

    const { data: invoices, isLoading, isError, error: queryError, isSuccess, refetch } = useQuery({
        queryKey: ['invoices'],
        queryFn: getInvoices,
        retry: MAX_RETRIES - 1, // 0-based, so 2 retries + initial attempt = 3
        retryDelay: (attempt) => RETRY_DELAY * (attempt + 1),
    });

    // Handle success state
    useEffect(() => {
        if (isSuccess && isMounted.current) {
            retryCount.current = 0;
            setError(null);
        }
    }, [isSuccess]);

    // Handle error state
    useEffect(() => {
        if (isError && isMounted.current) {
            retryCount.current++;
            const errorMessage = queryError instanceof Error ? queryError.message : 'Unknown error';
            if (retryCount.current < MAX_RETRIES) {
                toast.error(`Failed to load invoices (attempt ${retryCount.current}/${MAX_RETRIES}). Retrying...`);
            } else {
                setError('Failed to load invoices. Please try again later.');
                toast.error(`Failed after ${MAX_RETRIES} attempts: ${errorMessage}`);
            }
        }
    }, [isError, queryError]);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Sort invoices by created_at (newest first) with type guard to ensure invoices is iterable
    const sortedInvoices: Invoice[] = invoices && Array.isArray(invoices)
        ? [...invoices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : [];

    return (
        <div className="max-w-7xl mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Invoices</h1>
                <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                    {isLoading
                        ? `Refreshing${retryCount.current > 0 ? ` (Attempt ${retryCount.current}/${MAX_RETRIES})` : '...'}`
                        : 'Refresh'}
                </button>
            </div>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            {isLoading && (
                <p className="text-gray-500 text-center py-4">
                    Loading invoices{retryCount.current > 0 ? ` (Attempt ${retryCount.current}/${MAX_RETRIES})` : '...'}
                </p>
            )}

            {!isLoading && sortedInvoices.length === 0 && (
                <p className="text-gray-500 text-center py-8">No invoices found.</p>
            )}

            {sortedInvoices.length > 0 && (
                <div className="overflow-x-auto">
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedInvoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">{invoice.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{invoice.vendor_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{invoice.invoice_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{invoice.invoice_date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">£{invoice.total_amount.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {(invoice.confidence !== undefined ? invoice.confidence * 100 : 0).toFixed(2)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{invoice.status || invoice.validation_status?.trim() || "Unknown"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Link href={invoice.pdf_url} target="_blank" className="text-blue-500 hover:underline">
                                            View PDF
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{invoice.created_at}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}