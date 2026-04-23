'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { StatCard } from '@/components/stat-card';
import { useTransactions } from '@/context/transactions-context';
import { formatPKR } from '@/lib/utils';

export function DashboardView() {
  const { transactions } = useTransactions();
  const [range, setRange] = useState('30');

  const filtered = useMemo(() => {
    if (range === 'all') return transactions;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(range));
    return transactions.filter(t => t.date && new Date(t.date) >= cutoff);
  }, [transactions, range]);

  const stats = useMemo(() => {
    const revenue = filtered.filter(t => t.type === 'sale').reduce((s, t) => s + (t.amount ?? 0), 0);
    const costs = filtered.filter(t => t.type === 'cost' || t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0);
    return { revenue, costs, profit: revenue - costs };
  }, [filtered]);

  const chartData = useMemo(() => {
    const map: Record<string, { date: string; rev: number }> = {};
    filtered.forEach(t => {
      if (!t.date) return;
      if (!map[t.date]) map[t.date] = { date: t.date, rev: 0 };
      if (t.type === 'sale') map[t.date].rev += t.amount ?? 0;
    });
    return Object.values(map).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filtered]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shadow-inner w-fit">
        {(['7', '30', '90', 'all'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
              range === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {r === 'all' ? 'ALL' : `${r}D`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Revenue" value={formatPKR(stats.revenue)} icon={<TrendingUp className="text-emerald-500" />} />
        <StatCard label="Total Outflow" value={formatPKR(stats.costs)} icon={<TrendingDown className="text-rose-500" />} />
        <StatCard label="Net Profit" value={formatPKR(stats.profit)} icon={<DollarSign className="text-indigo-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Calendar size={18} className="text-indigo-600" /> Revenue Trend (PKR)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => formatPKR(Number(value))}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="rev" stroke="#4f46e5" fill="#4f46e520" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="font-bold text-lg mb-6">Recent Records</h3>
          <div className="space-y-3">
            {filtered.slice(0, 6).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{tx.description ?? '—'}</p>
                  <p className="text-[10px] text-slate-500">{tx.date ?? '—'}</p>
                </div>
                <p className={`text-xs font-bold ${tx.type === 'sale' ? 'text-emerald-600' : tx.type === 'investment' ? 'text-blue-600' : 'text-slate-900'}`}>
                  {tx.amount != null ? `Rs ${tx.amount.toLocaleString()}` : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
