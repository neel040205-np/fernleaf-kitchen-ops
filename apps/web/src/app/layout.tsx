import React from 'react';
import type { Metadata } from 'next';
import { Providers } from '../components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fernleaf Kitchen Operations Admin Panel',
  description: 'Commercial kitchen operations and corporate meal management admin panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-50 antialiased text-slate-900 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
