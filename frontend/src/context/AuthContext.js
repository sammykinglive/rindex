import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { startKeepAlive, stopKeepAlive } from '../utils/keepAlive';

const AuthContext = createContext(null);

// ── Module definitions (single source of truth for the whole app) ─────────────
export const MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    actions: ['view'],
  },
  {
    key: 'receipts',
    label: 'Stock Receipts',
    icon: '📦',
    actions: ['view', 'create', 'edit', 'delete', 'export'],
  },
  {
    key: 'issues',
    label: 'Stock Issues',
    icon: '📤',
    actions: ['view', 'create', 'edit', 'delete', 'export'],
  },
  {
    key: 'balance',
    label: 'Stock Balance',
    icon: '⚖️',
    actions: ['view', 'export'],
  },
  {
    key: 'expenses',
    label: 'Expenses',
    icon: '💸',
    actions: ['view', 'create', 'edit', 'delete', 'export'],
  },
  {
    key: 'pnl',
    label: 'P&L Summary',
    icon: '💰',
    actions: ['view'],
  },
];

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('rindex_user');
    const token  = localStorage.getItem('rindex_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
      startKeepAlive();
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('rindex_token', res.data.token);
    localStorage.setItem('rindex_user',  JSON.stringify(res.data.user));
    setUser(res.data.user);
    startKeepAlive();
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('rindex_token');
    localStorage.removeItem('rindex_user');
    setUser(null);
    stopKeepAlive();
  }

  // ── Permission helper: can(module, action) ──────────────────────────────────
  // Admins always have full access. Staff checked against their permissions object.
  function can(module, action = 'view') {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perms = user.permissions;
    if (!perms) return false;
    const modPerms = perms[module];
    if (!modPerms) return false;
    return !!modPerms[action];
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === 'admin', can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
