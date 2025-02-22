import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gray-800 text-white p-4">
        <ul className="flex space-x-4">
          <li><Link href="/upload">Upload</Link></li>
          <li><Link href="/invoices">Invoices</Link></li>
          <li><Link href="/review">Review</Link></li>
          <li><Link href="/metrics">Metrics</Link></li>
        </ul>
      </nav>
      <main className="flex-grow p-4">{children}</main>
    </div>
  );
}