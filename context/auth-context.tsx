'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => { error: string | null };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (username: string, password: string) => {
    if (!username || !password) return { error: 'Username and password required' };
    setUser({ name: username, role: 'Admin' });
    return { error: null };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
