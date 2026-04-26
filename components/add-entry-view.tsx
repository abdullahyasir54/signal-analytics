'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { useTransactions } from '@/context/transactions-context';
import { useInventory } from '@/context/inventory-context';
import { TransactionType } from '@/lib/types';
import { ArticlePicker } from '@/components/article-picker';

export const CATEGORIES: Record<TransactionType, string[]> = {
  sale:       ['Product', 'Service'],
  cost:       ['Raw Materials', 'Production', 'Packaging'],
  expense:    ['Marketing', 'Wages', 'Rent', 'Utilities', 'Software/SaaS', 'Other'],
  investment: ['Equity', 'Loan', 'Grant', 'Other'],
};

export const TYPE_LABELS: Record<TransactionType, string> = {
  sale:       'Sale',
  cost:       'Cost of Goods Sold',
  expense:    'Operating Expense',
  investment: 'Investment',
};

export function AddEntryView() {
  const router = useRouter();
  const { addTransaction } = useTransactions();
  const { setArticlesForTransaction } = useInventory();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    quantity: '',
    type: 'sale' as TransactionType,
    category: 'Product',
    date: new Date().toISOString().split('T')[0],
  });
  const [articleIds, setArticleIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTypeChange = (type: TransactionType) => {
    setFormData(prev => ({ ...prev, type, category: CATEGORIES[type][0] }));
    if (type !== 'sale') setArticleIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error, id } = await addTransaction({
      ...formData,
      amount: parseFloat(formData.amount),
      quantity: formData.type === 'sale' && formData.quantity ? parseInt(formData.quantity, 10) : null,
      flagged: false,
    });
    if (error) {
      setError(error);
      setSubmitting(false);
    } else {
      if (id && formData.type === 'sale' && articleIds.length > 0) {
        await setArticlesForTransaction(id, articleIds);
      }
      router.push('/dashboard');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-indigo-600">
        <PlusCircle /> New Entry
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (PKR)</label>
            <input
              type="number" step="1" min="1" required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.amount}
              onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
            <input
              type="date" required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.date}
              onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.type}
              onChange={e => handleTypeChange(e.target.value as TransactionType)}
            >
              {(Object.entries(TYPE_LABELS) as [TransactionType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
            >
              {CATEGORIES[formData.type].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {formData.type === 'sale' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity Sold</label>
              <input
                type="number" min="1" step="1" placeholder="e.g. 1"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.quantity}
                onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
          )}
        </div>

        {formData.type === 'sale' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Assign Articles
              {articleIds.length > 0 && <span className="ml-2 text-xs font-normal text-indigo-500">{articleIds.length} selected</span>}
            </label>
            <ArticlePicker selected={articleIds} onChange={setArticleIds} />
          </div>
        )}

        <div className="flex gap-4 pt-2">
          <button
            type="submit" disabled={submitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all"
          >
            {submitting ? 'Saving...' : 'Save Entry'}
          </button>
          <button
            type="button" onClick={() => router.push('/dashboard')}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
