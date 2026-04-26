'use client';

import { useMemo } from 'react';
import { TrendingUp, DollarSign, Calculator, Briefcase, Receipt, PieChart as PieChartIcon, Landmark, PackageOpen, Layers, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { StatCard } from '@/components/stat-card';
import { useTransactions } from '@/context/transactions-context';
import { useInventory } from '@/context/inventory-context';
import { formatPKR } from '@/lib/utils';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function AnalyticsView() {
  const { transactions } = useTransactions();
  const { items, transactionArticles } = useInventory();

  const metrics = useMemo(() => {
    const grossRevenue  = transactions.filter(t => t.type === 'sale').reduce((s, t) => s + (t.amount ?? 0), 0);
    const totalInvested = transactions.filter(t => t.type === 'investment').reduce((s, t) => s + (t.amount ?? 0), 0);
    const cogs          = transactions.filter(t => t.type === 'cost').reduce((s, t) => s + (t.amount ?? 0), 0);
    const expenses      = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0);
    const grossProfit   = grossRevenue - cogs;
    const netProfit     = grossProfit - expenses;
    return {
      grossRevenue, totalInvested, cogs, grossProfit, expenses, netProfit,
      grossMargin: grossRevenue > 0 ? (grossProfit / grossRevenue * 100).toFixed(1) : '0',
      netMargin:   grossRevenue > 0 ? (netProfit   / grossRevenue * 100).toFixed(1) : '0',
    };
  }, [transactions]);

  const inventoryMetrics = useMemo(() => {
    const saleTxs = transactions.filter(tx => tx.type === 'sale');
    const soldMap: Record<string, number> = {};
    const assignedTxIds = new Set(transactionArticles.map(ta => ta.transaction_id));

    for (const ta of transactionArticles) {
      const tx = saleTxs.find(t => t.id === ta.transaction_id);
      if (tx) soldMap[ta.item_id] = (soldMap[ta.item_id] ?? 0) + (tx.quantity ?? 1);
    }
    for (const tx of saleTxs) {
      if (assignedTxIds.has(tx.id) || !tx.description) continue;
      const desc = tx.description.replace(/^#\d+\s*/, '').trim().toLowerCase();
      for (const item of items) {
        if (desc.includes(item.name.trim().toLowerCase())) {
          soldMap[item.id] = (soldMap[item.id] ?? 0) + (tx.quantity ?? 1);
        }
      }
    }

    let totalValue = 0;
    let remainingValue = 0;

    const pricedItems = items.filter(item => item.price != null);
    const rows = pricedItems.map(item => {
      const sold      = soldMap[item.id] ?? 0;
      const remaining = Math.max(0, item.original_quantity - sold);
      const itemTotal = item.original_quantity * item.price!;
      const itemRem   = remaining * item.price!;
      totalValue    += itemTotal;
      remainingValue += itemRem;
      return { id: item.id, name: item.name, volume: item.volume, price: item.price!, sold, remaining, totalValue: itemTotal, remainingValue: itemRem };
    });

    const grouped = rows.reduce<Record<string, typeof rows>>((acc, r) => {
      (acc[r.volume] ??= []).push(r);
      return acc;
    }, {});

    return { totalValue, remainingValue, soldValue: totalValue - remainingValue, rows, grouped, pricedCount: pricedItems.length };
  }, [items, transactionArticles, transactions]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions
      .filter(t => (t.type === 'cost' || t.type === 'expense') && t.category && t.amount)
      .forEach(t => { cats[t.category!] = (cats[t.category!] || 0) + (t.amount ?? 0); });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Lifetime Performance (PKR)</h2>
        <p className="text-slate-500 text-sm">Full historical breakdown of gross vs net profitability.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Gross Revenue"    value={formatPKR(metrics.grossRevenue)}  icon={<Briefcase size={20} className="text-indigo-600" />}  subtext="Total Sales" />
        <StatCard label="Gross Profit"     value={formatPKR(metrics.grossProfit)}   trend={`+${metrics.grossMargin}%`} icon={<TrendingUp size={20} className="text-emerald-500" />} subtext="Gross Margin" />
        <StatCard label="Operating Expenses" value={formatPKR(metrics.expenses)}    icon={<Receipt size={20} className="text-rose-500" />}       subtext="Operating Cost" />
        <StatCard label="Net Profit"       value={formatPKR(metrics.netProfit)}     trend={`+${metrics.netMargin}%`}  icon={<DollarSign size={20} className="text-indigo-600" />} subtext="Net Margin" />
      </div>

      {/* ── Inventory Value ─────────────────────────────────────────────── */}
      {inventoryMetrics.pricedCount > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <PackageOpen size={22} className="text-indigo-600" /> Inventory Value
            </h2>
            <p className="text-slate-500 text-sm">Based on {inventoryMetrics.pricedCount} priced article{inventoryMetrics.pricedCount !== 1 ? 's' : ''}. Remaining = unsold qty × price.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Total Stock Value"
              value={formatPKR(inventoryMetrics.totalValue)}
              icon={<Layers size={20} className="text-indigo-600" />}
              subtext="Original qty × price"
            />
            <StatCard
              label="Remaining Stock Value"
              value={formatPKR(inventoryMetrics.remainingValue)}
              icon={<PackageOpen size={20} className="text-emerald-600" />}
              subtext="Unsold qty × price"
            />
            <StatCard
              label="Sold Stock Value"
              value={formatPKR(inventoryMetrics.soldValue)}
              icon={<TrendingDown size={20} className="text-rose-500" />}
              subtext="Sold qty × price"
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {Object.keys(inventoryMetrics.grouped).sort().map(volume => (
              <div key={volume}>
                <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                  <span className="font-semibold text-indigo-700 text-sm">{volume}</span>
                  <span className="text-xs text-indigo-400 font-medium">
                    {formatPKR(inventoryMetrics.grouped[volume].reduce((s, r) => s + r.remainingValue, 0))} remaining
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Article</th>
                      <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Price</th>
                      <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Remaining Qty</th>
                      <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Remaining Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryMetrics.grouped[volume].map(row => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-slate-800">{row.name}</td>
                        <td className="px-6 py-3.5 text-right text-slate-500 tabular-nums">{formatPKR(row.price)}</td>
                        <td className="px-6 py-3.5 text-right tabular-nums">
                          <span className={row.remaining <= 0 ? 'text-rose-500 font-semibold' : 'text-slate-600'}>
                            {row.remaining.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold tabular-nums">
                          <span className={row.remainingValue <= 0 ? 'text-slate-300' : 'text-emerald-600'}>
                            {row.remainingValue > 0 ? formatPKR(row.remainingValue) : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Calculator className="text-indigo-600" size={20} /> Financial Summary
          </h3>
          <div className="space-y-4">
            {metrics.totalInvested > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-500 text-sm flex items-center gap-1.5">
                  <Landmark size={13} className="text-blue-500" /> Investment Received
                </span>
                <span className="font-bold text-blue-600">{formatPKR(metrics.totalInvested)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">Gross Revenue</span>
              <span className="font-bold text-slate-900">{formatPKR(metrics.grossRevenue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">Cost of Goods Sold</span>
              <span className="font-bold text-rose-500">-{formatPKR(metrics.cogs)}</span>
            </div>
            <div className="flex justify-between items-center py-3 px-3 bg-slate-50 rounded-xl">
              <span className="text-slate-900 font-bold text-sm">Gross Profit</span>
              <span className="font-bold text-slate-900">{formatPKR(metrics.grossProfit)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">Operating Expenses</span>
              <span className="font-bold text-rose-500">-{formatPKR(metrics.expenses)}</span>
            </div>
            <div className="flex justify-between items-center py-4 px-4 bg-indigo-600 text-white rounded-2xl shadow-lg mt-4">
              <span className="font-bold">Net Profit</span>
              <span className="text-xl font-black">{formatPKR(metrics.netProfit)}</span>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <PieChartIcon className="text-amber-600" size={20} /> Cost &amp; Expense Breakdown (PKR)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Legend verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
