import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { startKeepAlive, stopKeepAlive } from '../utils/keepAlive';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('rindex_user');
    const token  = localStorage.getItem('rindex_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
      startKeepAlive(); // Resume keep-alive on page refresh
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('rindex_token', res.data.token);
    localStorage.setItem('rindex_user',  JSON.stringify(res.data.user));
    setUser(res.data.user);
    startKeepAlive(); // Start pinging after login
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('rindex_token');
    localStorage.removeItem('rindex_user');
    setUser(null);
    stopKeepAlive(); // Stop pinging after logout
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
