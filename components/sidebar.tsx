'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, DollarSign, BarChart3, PackageOpen, LogOut, X } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

function NavItem({
  href, icon, label, active, onClick,
}: {
  href: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${
        active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
}

function NavContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Signal Analytics" width={32} height={32} priority />
          <span className="font-bold text-xl text-indigo-600">Signal Analytics</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <NavItem href="/dashboard"  icon={<LayoutDashboard size={20} />} label="Dashboard"    active={pathname === '/dashboard'}  onClick={onClose} />
        <NavItem href="/finance"    icon={<DollarSign size={20} />}     label="Transactions" active={pathname === '/finance'}    onClick={onClose} />
        <NavItem href="/analytics"  icon={<BarChart3 size={20} />}      label="Analytics"    active={pathname === '/analytics'}  onClick={onClose} />
        <NavItem href="/inventory"  icon={<PackageOpen size={20} />}    label="Inventory"    active={pathname === '/inventory'}  onClick={onClose} />
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
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
    </>
  );
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col sticky top-0 h-screen shrink-0">
        <NavContent onClose={onClose} />
      </aside>

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-white z-40 md:hidden flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent onClose={onClose} />
      </aside>
    </>
  );
}
