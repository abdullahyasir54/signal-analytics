'use client';

import { useState, useMemo } from 'react';
import { PackageOpen, Plus, Trash2, X, Pencil, Check } from 'lucide-react';
import { useInventory } from '@/context/inventory-context';
import { useTransactions } from '@/context/transactions-context';
import { InventoryItem } from '@/lib/types';

type EditForm = { name: string; volume: string; original_quantity: string; price: string };

export function InventoryView() {
  const { items, loading, addItem, updateItem, deleteItem, transactionArticles } = useInventory();
  const { transactions } = useTransactions();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', volume: '', original_quantity: '', price: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const saleTxs = useMemo(
    () => transactions.filter(tx => tx.type === 'sale'),
    [transactions],
  );

  const soldFor = useMemo(() => {
    const map: Record<string, number> = {};
    const assignedTxIds = new Set(transactionArticles.map(ta => ta.transaction_id));
    for (const ta of transactionArticles) {
      const tx = saleTxs.find(t => t.id === ta.transaction_id);
      if (tx) map[ta.item_id] = (map[ta.item_id] ?? 0) + (tx.quantity ?? 1);
    }
    for (const tx of saleTxs) {
      if (assignedTxIds.has(tx.id) || !tx.description) continue;
      const desc = tx.description.replace(/^#\d+\s*/, '').trim().toLowerCase();
      for (const item of items) {
        if (desc.includes(item.name.trim().toLowerCase())) {
          map[item.id] = (map[item.id] ?? 0) + (tx.quantity ?? 1);
        }
      }
    }
    return map;
  }, [transactionArticles, saleTxs, items]);

  const remaining = (item: InventoryItem) => item.original_quantity - (soldFor[item.id] ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await addItem({
      name: formData.name.trim(),
      volume: formData.volume.trim(),
      original_quantity: parseInt(formData.original_quantity, 10),
      price: formData.price ? parseFloat(formData.price) : null,
    });
    if (error) { setError(error); setSubmitting(false); }
    else { setFormData({ name: '', volume: '', original_quantity: '', price: '' }); setShowForm(false); setSubmitting(false); }
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      volume: item.volume,
      original_quantity: item.original_quantity.toString(),
      price: item.price?.toString() ?? '',
    });
    setEditError('');
  };

  const handleEditSave = async () => {
    if (!editingId || !editForm) return;
    setEditSaving(true);
    setEditError('');
    const { error } = await updateItem(editingId, {
      name: editForm.name.trim(),
      volume: editForm.volume.trim(),
      original_quantity: parseInt(editForm.original_quantity, 10),
      price: editForm.price ? parseFloat(editForm.price) : null,
    });
    if (error) { setEditError(error); setEditSaving(false); }
    else { setEditingId(null); setEditForm(null); setEditSaving(false); }
  };

  const grouped = items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    (acc[item.volume] ??= []).push(item);
    return acc;
  }, {});
  const volumes = Object.keys(grouped).sort();

  const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PackageOpen className="text-indigo-600" size={26} />
            Inventory
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {items.length} article{items.length !== 1 ? 's' : ''} across {volumes.length} volume{volumes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(''); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm"
        >
          <Plus size={18} />
          Add Article
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">New Article</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={18} />
            </button>
          </div>
          {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Article Name</label>
              <input type="text" required placeholder="e.g. Cotton Fabric" className={inputCls}
                value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="sm:w-36">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Volume</label>
              <input type="text" required placeholder="e.g. Warehouse A" className={inputCls}
                value={formData.volume} onChange={e => setFormData(prev => ({ ...prev, volume: e.target.value }))} />
            </div>
            <div className="sm:w-32">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Original Qty</label>
              <input type="number" required min="0" placeholder="500" className={inputCls}
                value={formData.original_quantity} onChange={e => setFormData(prev => ({ ...prev, original_quantity: e.target.value }))} />
            </div>
            <div className="sm:w-32">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Price (PKR)</label>
              <input type="number" min="0" step="1" placeholder="e.g. 2500" className={inputCls}
                value={formData.price} onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))} />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all active:scale-95 text-sm">
                {submitting ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-all text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit modal */}
      {editingId && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Edit Article</h2>
              <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            {editError && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">{editError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Article Name</label>
                <input type="text" required className={inputCls}
                  value={editForm.name} onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : prev)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Volume</label>
                <input type="text" required className={inputCls}
                  value={editForm.volume} onChange={e => setEditForm(prev => prev ? { ...prev, volume: e.target.value } : prev)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Original Qty</label>
                  <input type="number" min="0" required className={inputCls}
                    value={editForm.original_quantity} onChange={e => setEditForm(prev => prev ? { ...prev, original_quantity: e.target.value } : prev)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price (PKR)</label>
                  <input type="number" min="0" step="1" placeholder="Optional" className={inputCls}
                    value={editForm.price} onChange={e => setEditForm(prev => prev ? { ...prev, price: e.target.value } : prev)} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                <Check size={15} />{editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditingId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl transition-all text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <PackageOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No articles yet</p>
          <p className="text-slate-400 text-sm mt-1">Click &quot;Add Article&quot; to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {volumes.map(volume => (
            <div key={volume} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-3.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                <span className="font-semibold text-indigo-700 text-sm">{volume}</span>
                <span className="text-xs text-indigo-400">{grouped[volume].length} article{grouped[volume].length !== 1 ? 's' : ''}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Article</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Original Qty</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sold</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Remaining</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grouped[volume].map(item => {
                    const sold = soldFor[item.id] ?? 0;
                    const rem  = remaining(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                        <td className="px-6 py-4 text-right text-slate-600">
                          {item.price != null ? `Rs ${item.price.toLocaleString()}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-500">{item.original_quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-mono text-rose-500">{sold > 0 ? `−${sold.toLocaleString()}` : '—'}</td>
                        <td className="px-6 py-4 text-right font-mono font-semibold">
                          <span className={rem <= 0 ? 'text-rose-600' : rem <= item.original_quantity * 0.2 ? 'text-amber-600' : 'text-emerald-600'}>
                            {rem.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => deleteItem(item.id)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
