'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = login(formData.username, formData.password);
    if (error) {
      setError(error);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">BrandFlow</h2>
          <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            autoComplete="username"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Username"
            value={formData.username}
            onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Password"
            value={formData.password}
            onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all mt-2"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
