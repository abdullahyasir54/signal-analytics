'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { PlusCircle, Menu } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Sidebar } from '@/components/sidebar';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/finance':   'Transactions',
  '/analytics': 'Analytics',
  '/add':       'Add Entry',
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  // Close drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (!user) return null;

  const title = PAGE_TITLES[pathname] ?? 'Dashboard';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="flex-1 min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg md:text-xl font-bold">{title}</h1>
          </div>

          <Link
            href="/add"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-sm active:scale-95"
          >
            <PlusCircle size={17} />
            <span className="hidden sm:inline">Add Entry</span>
          </Link>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
