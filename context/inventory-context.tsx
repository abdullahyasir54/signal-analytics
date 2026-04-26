'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@/lib/types';

export interface TransactionArticle {
  transaction_id: string;
  item_id: string;
}

interface InventoryContextType {
  items: InventoryItem[];
  loading: boolean;
  transactionArticles: TransactionArticle[];
  addItem: (item: Omit<InventoryItem, 'id'>) => Promise<{ error: string | null }>;
  updateItem: (id: string, item: Partial<Omit<InventoryItem, 'id'>>) => Promise<{ error: string | null }>;
  deleteItem: (id: string) => Promise<{ error: string | null }>;
  setArticlesForTransaction: (transactionId: string, itemIds: string[]) => Promise<{ error: string | null }>;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

const SELECT = 'id, name, volume, original_quantity, price';

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionArticles, setTransactionArticles] = useState<TransactionArticle[]>([]);

  useEffect(() => {
    const loadItems = supabase
      .from('inventory_items')
      .select(SELECT)
      .order('name', { ascending: true })
      .then(({ data }) => { if (data) setItems(data as InventoryItem[]); });

    const loadTA = supabase
      .from('transaction_articles')
      .select('transaction_id, item_id')
      .then(({ data }) => { if (data) setTransactionArticles(data as TransactionArticle[]); });

    Promise.all([loadItems, loadTA]).then(() => setLoading(false));
  }, []);

  const addItem = async (item: Omit<InventoryItem, 'id'>) => {
    const { data, error } = await supabase.from('inventory_items').insert([item]).select(SELECT).single();
    if (!error && data) setItems(prev => [...prev, data as InventoryItem].sort((a, b) => a.name.localeCompare(b.name)));
    return { error: error?.message ?? null };
  };

  const updateItem = async (id: string, item: Partial<Omit<InventoryItem, 'id'>>) => {
    const { data, error } = await supabase.from('inventory_items').update(item).eq('id', id).select(SELECT).single();
    if (!error && data) setItems(prev => prev.map(i => i.id === id ? data as InventoryItem : i));
    return { error: error?.message ?? null };
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (!error) setItems(prev => prev.filter(i => i.id !== id));
    return { error: error?.message ?? null };
  };

  const setArticlesForTransaction = async (transactionId: string, itemIds: string[]) => {
    // Delete existing rows for this transaction
    const { error: delError } = await supabase
      .from('transaction_articles')
      .delete()
      .eq('transaction_id', transactionId);
    if (delError) return { error: delError.message };

    // Insert new rows (one per selected item, duplicates allowed)
    if (itemIds.length > 0) {
      const rows = itemIds.map(item_id => ({ transaction_id: transactionId, item_id }));
      const { error: insError } = await supabase.from('transaction_articles').insert(rows);
      if (insError) return { error: insError.message };
    }

    // Update local state
    setTransactionArticles(prev => [
      ...prev.filter(ta => ta.transaction_id !== transactionId),
      ...itemIds.map(item_id => ({ transaction_id: transactionId, item_id })),
    ]);

    return { error: null };
  };

  return (
    <InventoryContext.Provider value={{ items, loading, transactionArticles, addItem, updateItem, deleteItem, setArticlesForTransaction }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
