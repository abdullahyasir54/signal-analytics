'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Sidebar } from '@/components/sidebar';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/finance': 'Transactions',
  '/analytics': 'Analytics',
  '/add': 'Add Entry',
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  if (!user) return null;

  const title = PAGE_TITLES[pathname] ?? 'Dashboard';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="flex-1">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <h1 className="text-xl font-bold">{title}</h1>
          <Link
            href="/add"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-sm active:scale-95"
          >
            <PlusCircle size={18} /> Add Entry
          </Link>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
