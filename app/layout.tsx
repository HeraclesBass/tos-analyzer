import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinePrint - Know what you\'re agreeing to',
  description: 'AI-powered analysis of Terms of Service in plain English. Get clear insights into privacy, rights, and risks.',
  keywords: ['FinePrint', 'TOS', 'Terms of Service', 'Privacy Policy', 'Legal Analysis', 'AI'],
  authors: [{ name: 'FinePrint' }],
  openGraph: {
    title: 'FinePrint - Know what you\'re agreeing to',
    description: 'Decode the fine print. AI-powered TOS analysis that reveals what you\'re actually agreeing to.',
    url: 'https://fine-print.org',
    siteName: 'FinePrint',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinePrint - Know what you\'re agreeing to',
    description: 'Decode the fine print. AI-powered TOS analysis that reveals what you\'re actually agreeing to.',
  },
  metadataBase: new URL('https://fine-print.org'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#111827',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
            },
            success: {
              style: {
                background: '#10B981',
              },
            },
            error: {
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
