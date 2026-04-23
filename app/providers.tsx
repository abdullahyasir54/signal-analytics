'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/context/auth-context';
import { TransactionsProvider } from '@/context/transactions-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TransactionsProvider>
        {children}
      </TransactionsProvider>
    </AuthProvider>
  );
}
