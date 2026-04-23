'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, DollarSign, BarChart3, ShoppingCart, LogOut } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${
        active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col sticky top-0 h-screen">
      <div className="p-6">
        <div className="flex items-center gap-2 font-bold text-xl text-indigo-600">
          <ShoppingCart size={28} />
          <span>BrandFlow</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={pathname === '/dashboard'} />
        <NavItem href="/finance" icon={<DollarSign size={20} />} label="Transactions" active={pathname === '/finance'} />
        <NavItem href="/analytics" icon={<BarChart3 size={20} />} label="Analytics" active={pathname === '/analytics'} />
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden text-sm">
            <p className="font-semibold truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs">Admin Access</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
