import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import '../styles/globals.css';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#059669',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#dc2626',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}