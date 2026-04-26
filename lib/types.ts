export type TransactionType = 'sale' | 'cost' | 'expense' | 'investment';

export interface Transaction {
  id: string;
  date: string | null;
  type: TransactionType | null;
  category: string | null;
  amount: number | null;
  quantity: number | null;
  description: string | null;
  flagged: boolean;
}

export interface User {
  name: string;
  role: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  volume: string;
  original_quantity: number;
  price: number | null;
}
