'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Pencil, Trash2, AlertTriangle, X, Check,
  ChevronUp, ChevronDown, ChevronsUpDown, XCircle, SlidersHorizontal,
} from 'lucide-react';
import { useTransactions } from '@/context/transactions-context';
import { Transaction, TransactionType } from '@/lib/types';
import { CATEGORIES, TYPE_LABELS } from '@/components/add-entry-view';

type SortKey = 'description' | 'type' | 'category' | 'amount' | 'date';
type SortDir = 'asc' | 'desc';

type ColFilters = {
  description: string; type: string; category: string;
  amountMin: string; amountMax: string; dateFrom: string; dateTo: string;
};

const EMPTY: ColFilters = {
  description: '', type: '', category: '',
  amountMin: '', amountMax: '', dateFrom: '', dateTo: '',
};

type EditForm = {
  description: string; amount: string; date: string;
  type: TransactionType; category: string;
};

function buildEditForm(tx: Transaction): EditForm {
  const type = (tx.type ?? 'expense') as TransactionType;
  return {
    description: tx.description ?? '',
    amount: tx.amount?.toString() ?? '',
    date: tx.date ?? new Date().toISOString().split('T')[0],
    type,
    category: tx.category ?? CATEGORIES[type][0],
  };
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={12} className="text-slate-300 shrink-0" />;
  return dir === 'asc'
    ? <ChevronUp size={12} className="text-indigo-500 shrink-0" />
    : <ChevronDown size={12} className="text-indigo-500 shrink-0" />;
}

function TypeBadge({ type }: { type: TransactionType }) {
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md whitespace-nowrap ${
      type === 'sale'       ? 'bg-emerald-100 text-emerald-700' :
      type === 'cost'       ? 'bg-amber-100  text-amber-700'   :
      type === 'investment' ? 'bg-blue-100   text-blue-700'    :
                              'bg-rose-100   text-rose-700'
    }`}>{TYPE_LABELS[type]}</span>
  );
}

const inputCls  = 'w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-300';
const selectCls = 'w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400';

export function TransactionsView() {
  const { transactions, updateTransaction, deleteTransaction } = useTransactions();

  const [query, setQuery]           = useState('');
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [sortKey, setSortKey]       = useState<SortKey | null>('date');
  const [sortDir, setSortDir]       = useState<SortDir>('desc');
  const [f, setF]                   = useState<ColFilters>(EMPTY);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editForm, setEditForm]     = useState<EditForm | null>(null);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof ColFilters) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF(prev => ({ ...prev, [k]: e.target.value }));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      sortDir === 'asc' ? setSortDir('desc') : (setSortKey(null), setSortDir('asc'));
    } else { setSortKey(key); setSortDir('asc'); }
  };

  const thCls = (key: SortKey) =>
    `px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors ${sortKey === key ? 'text-indigo-600' : 'text-slate-400'}`;

  const allCategories = useMemo(
    () => [...new Set(transactions.map(t => t.category).filter(Boolean))].sort() as string[],
    [transactions],
  );

  const activeFilters   = useMemo(() => Object.entries(f).filter(([, v]) => v !== '').length, [f]);
  const incompleteCount = useMemo(() => transactions.filter(t => t.flagged).length, [transactions]);

  const display = useMemo(() => {
    let list = incompleteOnly ? transactions.filter(t => t.flagged) : transactions;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(tx =>
        (tx.description ?? '').toLowerCase().includes(q) ||
        (tx.category ?? '').toLowerCase().includes(q) ||
        (tx.type ?? '').toLowerCase().includes(q),
      );
    }
    if (f.description) list = list.filter(tx => (tx.description ?? '').toLowerCase().includes(f.description.toLowerCase()));
    if (f.type)        list = list.filter(tx => tx.type === f.type);
    if (f.category)    list = list.filter(tx => tx.category === f.category);
    if (f.amountMin !== '') list = list.filter(tx => (tx.amount ?? 0) >= parseFloat(f.amountMin));
    if (f.amountMax !== '') list = list.filter(tx => (tx.amount ?? 0) <= parseFloat(f.amountMax));
    if (f.dateFrom)    list = list.filter(tx => !!tx.date && tx.date >= f.dateFrom);
    if (f.dateTo)      list = list.filter(tx => !!tx.date && tx.date <= f.dateTo);

    if (sortKey) {
      list = [...list].sort((a, b) => {
        if (sortKey === 'amount') {
          const d = (a.amount ?? -1) - (b.amount ?? -1);
          return sortDir === 'asc' ? d : -d;
        }
        const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [transactions, query, incompleteOnly, f, sortKey, sortDir]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    const ids = display.map(t => t.id);
    const n   = ids.filter(id => selected.has(id)).length;
    selectAllRef.current.checked       = n > 0 && n === ids.length;
    selectAllRef.current.indeterminate = n > 0 && n < ids.length;
  }, [selected, display]);

  const toggleRow = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleAll = () => {
    const ids = display.map(t => t.id);
    const all = ids.every(id => selected.has(id));
    setSelected(prev => { const s = new Set(prev); ids.forEach(id => all ? s.delete(id) : s.add(id)); return s; });
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} transaction${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    for (const id of selected) await deleteTransaction(id);
    setSelected(new Set()); setBulkDeleting(false);
  };

  const openEdit  = (tx: Transaction) => { setEditForm(buildEditForm(tx)); setEditingId(tx.id); };
  const closeEdit = () => { setEditingId(null); setEditForm(null); };
  const handleTypeChange = (type: TransactionType) =>
    setEditForm(prev => prev ? { ...prev, type, category: CATEGORIES[type][0] } : prev);

  const handleSave = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);
    const stillFlagged = !editForm.description.trim() || !editForm.amount || !editForm.date;
    const { error } = await updateTransaction(editingId, {
      description: editForm.description.trim() || null,
      amount:   editForm.amount ? parseFloat(editForm.amount) : null,
      date:     editForm.date || null,
      type:     editForm.type || null,
      category: editForm.category || null,
      flagged:  stillFlagged,
    });
    setSaving(false);
    if (!error) closeEdit();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    setDeletingId(id); await deleteTransaction(id); setDeletingId(null);
  };

  const missingFields = (form: EditForm) =>
    (['description', 'amount', 'date'] as const)
      .filter(k => !form[k]?.toString().trim())
      .map(k => k[0].toUpperCase() + k.slice(1));

  const selectedCount = selected.size;

  // ── Shared toolbar content ──────────────────────────────────────────────────
  const selectionBar = (
    <>
      <span className="text-sm font-semibold text-slate-700">{selectedCount} selected</span>
      <button onClick={handleBulkDelete} disabled={bulkDeleting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-all disabled:opacity-50">
        <Trash2 size={13} />{bulkDeleting ? 'Deleting…' : `Delete ${selectedCount}`}
      </button>
      <button onClick={() => setSelected(new Set())}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 transition-all">
        <X size={13} />Deselect all
      </button>
    </>
  );

  return (
    <>
      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      {editingId && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Edit Transaction</h2>
              <button onClick={closeEdit} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            {missingFields(editForm).length > 0 && (
              <div className="mb-5 flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>Missing: <strong>{missingFields(editForm).join(', ')}</strong></span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <input type="text"
                  className={`w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 ${!editForm.description.trim() ? 'border-amber-300' : 'border-slate-200'}`}
                  value={editForm.description}
                  onChange={e => setEditForm(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  placeholder="Enter description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (PKR)</label>
                  <input type="number" step="1" min="1"
                    className={`w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 ${!editForm.amount ? 'border-amber-300' : 'border-slate-200'}`}
                    value={editForm.amount}
                    onChange={e => setEditForm(prev => prev ? { ...prev, amount: e.target.value } : prev)}
                    placeholder="Enter amount" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date"
                    className={`w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 ${!editForm.date ? 'border-amber-300' : 'border-slate-200'}`}
                    value={editForm.date}
                    onChange={e => setEditForm(prev => prev ? { ...prev, date: e.target.value } : prev)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={editForm.type} onChange={e => handleTypeChange(e.target.value as TransactionType)}>
                    {(Object.entries(TYPE_LABELS) as [TransactionType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={editForm.category} onChange={e => setEditForm(prev => prev ? { ...prev, category: e.target.value } : prev)}>
                    {CATEGORIES[editForm.type].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                <Check size={15} />{saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={closeEdit}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl transition-all text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE  (< lg)  — card layout
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden space-y-3">

        {/* Mobile toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex flex-wrap items-center gap-2">
            {selectedCount > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">{selectionBar}</div>
            ) : (
              <>
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                  <input type="text" placeholder="Search…" value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button onClick={() => setShowMobileFilters(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                    showMobileFilters || activeFilters > 0
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}>
                  <SlidersHorizontal size={13} />
                  Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
                </button>
              </>
            )}
          </div>

          {/* Mobile sort row */}
          {selectedCount === 0 && (
            <div className="px-4 pb-3 flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Sort</span>
              <select value={sortKey ?? ''} onChange={e => setSortKey((e.target.value as SortKey) || null)}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400">
                <option value="">None</option>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="description">Description</option>
                <option value="type">Type</option>
                <option value="category">Category</option>
              </select>
              {sortKey && (
                <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shrink-0">
                  {sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {sortDir === 'asc' ? 'Asc' : 'Desc'}
                </button>
              )}
              {incompleteCount > 0 && (
                <button onClick={() => setIncompleteOnly(v => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border shrink-0 transition-all ${
                    incompleteOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                  <AlertTriangle size={11} />{incompleteCount}
                </button>
              )}
              <span className="ml-auto text-[10px] text-slate-400 tabular-nums shrink-0">{display.length}/{transactions.length}</span>
            </div>
          )}

          {/* Mobile filter panel */}
          {showMobileFilters && selectedCount === 0 && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
              <input type="text" placeholder="Filter by description…" value={f.description}
                onChange={set('description')} className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <select value={f.type} onChange={set('type')} className={selectCls}>
                  <option value="">All types</option>
                  {(Object.entries(TYPE_LABELS) as [TransactionType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select value={f.category} onChange={set('category')} className={selectCls}>
                  <option value="">All categories</option>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Amount range</p>
                  <div className="flex gap-1">
                    <input type="number" placeholder="Min" value={f.amountMin} onChange={set('amountMin')} className={inputCls} />
                    <input type="number" placeholder="Max" value={f.amountMax} onChange={set('amountMax')} className={inputCls} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Date range</p>
                  <div className="flex flex-col gap-1">
                    <input type="date" value={f.dateFrom} onChange={set('dateFrom')} className={inputCls} />
                    <input type="date" value={f.dateTo} onChange={set('dateTo')} className={inputCls} />
                  </div>
                </div>
              </div>
              {activeFilters > 0 && (
                <button onClick={() => setF(EMPTY)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                  <XCircle size={13} />Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Select all row */}
        {display.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <input type="checkbox" onChange={toggleAll}
              checked={display.length > 0 && display.every(t => selected.has(t.id))}
              className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
            />
            <span className="text-xs text-slate-500">Select all visible</span>
          </div>
        )}

        {/* Cards */}
        {display.map(tx => {
          const isSelected = selected.has(tx.id);
          return (
            <div key={tx.id}
              className={`rounded-2xl border p-4 transition-colors ${
                isSelected          ? 'border-indigo-200 bg-indigo-50/60' :
                tx.flagged          ? 'border-amber-100 bg-amber-50/40'   :
                                      'border-slate-200 bg-white'
              }`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={isSelected} onChange={() => toggleRow(tx.id)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer shrink-0" />
                <div className="flex-1 min-w-0">
                  {/* Description + amount */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm leading-snug break-words">
                        {tx.description ?? <span className="text-slate-400 italic font-normal">No description</span>}
                      </p>
                      {tx.flagged && (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200 mt-1">
                          <AlertTriangle size={9} />Incomplete
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-sm tabular-nums shrink-0">
                      {tx.amount != null ? `Rs ${tx.amount.toLocaleString()}` : <span className="text-slate-300">—</span>}
                    </p>
                  </div>

                  {/* Type + category + date + actions */}
                  <div className="flex items-center justify-between mt-2.5 gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {tx.type && <TypeBadge type={tx.type} />}
                      {tx.category && <span className="text-xs text-slate-500 truncate">{tx.category}</span>}
                      {tx.date && <span className="text-xs text-slate-400 tabular-nums">{tx.date}</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(tx)} title="Edit"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(tx.id)} disabled={deletingId === tx.id} title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {display.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            {incompleteOnly ? 'No incomplete entries.' : 'No transactions match the current filters.'}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP  (≥ lg)  — table layout
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/50">
          {selectedCount > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">{selectionBar}</div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input type="text" placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-52" />
              </div>
              {incompleteCount > 0 && (
                <button onClick={() => setIncompleteOnly(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    incompleteOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}>
                  <AlertTriangle size={13} />{incompleteCount} Incomplete
                </button>
              )}
              {activeFilters > 0 && (
                <button onClick={() => setF(EMPTY)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-all">
                  <XCircle size={13} />Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
                </button>
              )}
            </>
          )}
          <span className="ml-auto text-xs text-slate-400 tabular-nums">{display.length} of {transactions.length}</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider font-bold border-b border-slate-100 bg-slate-50/30">
                <th className="px-4 py-3 w-10">
                  <input ref={selectAllRef} type="checkbox" onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600" />
                </th>
                <th className={thCls('description')} onClick={() => handleSort('description')}>
                  <div className="flex items-center gap-1">Transaction <SortIcon active={sortKey === 'description'} dir={sortDir} /></div>
                </th>
                <th className={thCls('type')} onClick={() => handleSort('type')}>
                  <div className="flex items-center gap-1">Type <SortIcon active={sortKey === 'type'} dir={sortDir} /></div>
                </th>
                <th className={thCls('category')} onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">Category <SortIcon active={sortKey === 'category'} dir={sortDir} /></div>
                </th>
                <th className={`${thCls('amount')} text-right`} onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">Amount (PKR) <SortIcon active={sortKey === 'amount'} dir={sortDir} /></div>
                </th>
                <th className={`${thCls('date')} text-right`} onClick={() => handleSort('date')}>
                  <div className="flex items-center justify-end gap-1">Date <SortIcon active={sortKey === 'date'} dir={sortDir} /></div>
                </th>
                <th className="px-4 py-3 text-right text-slate-400 text-[10px] uppercase tracking-wider font-bold">Actions</th>
              </tr>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <td className="px-4 py-2" />
                <td className="px-3 py-2">
                  <input type="text" placeholder="Filter description…" value={f.description} onChange={set('description')} className={inputCls} />
                </td>
                <td className="px-3 py-2">
                  <select value={f.type} onChange={set('type')} className={selectCls}>
                    <option value="">All types</option>
                    {(Object.entries(TYPE_LABELS) as [TransactionType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={f.category} onChange={set('category')} className={selectCls}>
                    <option value="">All categories</option>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input type="number" placeholder="Min" value={f.amountMin} onChange={set('amountMin')} className={inputCls} />
                    <span className="text-slate-300 text-xs shrink-0">—</span>
                    <input type="number" placeholder="Max" value={f.amountMax} onChange={set('amountMax')} className={inputCls} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input type="date" value={f.dateFrom} onChange={set('dateFrom')} className={inputCls} />
                    <span className="text-slate-300 text-xs shrink-0">—</span>
                    <input type="date" value={f.dateTo} onChange={set('dateTo')} className={inputCls} />
                  </div>
                </td>
                <td className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {display.map(tx => {
                const isSelected = selected.has(tx.id);
                return (
                  <tr key={tx.id} className={`transition-colors ${
                    isSelected ? 'bg-indigo-50/60' : tx.flagged ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/80'
                  }`}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(tx.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">
                          {tx.description ?? <span className="text-slate-400 italic font-normal">No description</span>}
                        </span>
                        {tx.flagged && (
                          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">
                            <AlertTriangle size={9} />Incomplete
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {tx.type ? <TypeBadge type={tx.type} /> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{tx.category ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900 tabular-nums">
                      {tx.amount != null ? `Rs ${tx.amount.toLocaleString()}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm text-slate-400 tabular-nums">{tx.date ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(tx)} title="Edit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(tx.id)} disabled={deletingId === tx.id} title="Delete"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {display.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">
                    {incompleteOnly ? 'No incomplete entries.' : 'No transactions match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
