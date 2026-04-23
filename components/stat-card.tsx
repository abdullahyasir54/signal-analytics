import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  icon: ReactNode;
  subtext?: string;
}

export function StatCard({ label, value, trend, icon, subtext }: StatCardProps) {
  const isPositive = trend?.startsWith('+') || (trend && !trend.startsWith('-'));
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">{icon}</div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <h4 className="text-2xl font-bold mt-1 text-slate-900">{value}</h4>
      {subtext && <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{subtext}</p>}
    </div>
  );
}
