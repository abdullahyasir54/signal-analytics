'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/context/auth-context';
import { TransactionsProvider } from '@/context/transactions-context';
import { InventoryProvider } from '@/context/inventory-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TransactionsProvider>
        <InventoryProvider>
          {children}
        </InventoryProvider>
      </TransactionsProvider>
    </AuthProvider>
  );
}
