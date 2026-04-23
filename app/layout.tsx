import type { Metadata } from 'next';
import { Providers } from '@/app/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Signal Analytics',
  description: 'E-commerce financial dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
