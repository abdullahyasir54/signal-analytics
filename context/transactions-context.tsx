'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction } from '@/lib/types';

interface TransactionsContextType {
  transactions: Transaction[];
  loading: boolean;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<{ error: string | null; id: string | null }>;
  updateTransaction: (id: string, tx: Partial<Omit<Transaction, 'id'>>) => Promise<{ error: string | null }>;
  deleteTransaction: (id: string) => Promise<{ error: string | null }>;
}

const TransactionsContext = createContext<TransactionsContextType | null>(null);

function withDefaults(row: Record<string, unknown>): Transaction {
  return { flagged: false, quantity: null, ...row } as Transaction;
}

function stripFlagged<T extends { flagged?: unknown }>({ flagged, ...rest }: T) {
  void flagged;
  return rest;
}

const FULL_SELECT   = 'id, date, type, category, amount, quantity, description, flagged';
const LEGACY_SELECT = 'id, date, type, category, amount, description';

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFlagged = useRef<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(FULL_SELECT)
        .order('date', { ascending: false, nullsFirst: false });

      if (error) {
        hasFlagged.current = false;
        const { data: fallback } = await supabase
          .from('transactions')
          .select(LEGACY_SELECT)
          .order('date', { ascending: false });
        if (fallback) setTransactions(fallback.map(r => withDefaults(r as Record<string, unknown>)));
      } else {
        hasFlagged.current = true;
        if (data) setTransactions(data.map(r => withDefaults(r as Record<string, unknown>)));
      }
      setLoading(false);
    };
    load();
  }, []);

  const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
    const payload = hasFlagged.current ? tx : stripFlagged(tx);
    const select  = hasFlagged.current ? FULL_SELECT : LEGACY_SELECT;
    const { data, error } = await supabase
      .from('transactions')
      .insert([payload])
      .select(select)
      .single();
    if (!error && data) {
      setTransactions(prev => [withDefaults(data as unknown as Record<string, unknown>), ...prev]);
    }
    return { error: error?.message ?? null, id: (data as { id?: string } | null)?.id ?? null };
  };

  const updateTransaction = async (id: string, tx: Partial<Omit<Transaction, 'id'>>) => {
    const payload = hasFlagged.current ? tx : stripFlagged(tx);
    const select  = hasFlagged.current ? FULL_SELECT : LEGACY_SELECT;
    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .select(select)
      .single();
    if (!error && data) {
      setTransactions(prev =>
        prev.map(t => t.id === id ? withDefaults(data as unknown as Record<string, unknown>) : t),
      );
    }
    return { error: error?.message ?? null };
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions(prev => prev.filter(t => t.id !== id));
    return { error: error?.message ?? null };
  };

  return (
    <TransactionsContext.Provider value={{ transactions, loading, addTransaction, updateTransaction, deleteTransaction }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
}
