import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar       from './components/Sidebar';
import WakeUpScreen  from './components/WakeUpScreen';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Receipts      from './pages/Receipts';
import Issues        from './pages/Issues';
import Balance       from './pages/Balance';
import Expenses      from './pages/Expenses';
import PnL           from './pages/PnL';
import Settings      from './pages/Settings';
import Users         from './pages/Users';

const TITLES = {
  '/':          '📊 Dashboard',
  '/receipts':  '📥 Stock Receipts',
  '/issues':    '📤 Stock Issues',
  '/balance':   '⚖️ Stock Balance',
  '/expenses':  '💸 Expenses',
  '/pnl':       '💰 P&L Summary',
  '/settings':  '⚙️ Settings',
  '/users':     '👥 Manage Users',
};

function ProtectedRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppShell() {
  const { user }  = useAuth();
  const path      = window.location.pathname;
  const title     = TITLES[path] || 'Rindex';
  if (!user) return null;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-right">
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)', background: 'var(--bg)', padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
              🌽 Rindex &nbsp;·&nbsp; GHS &nbsp;·&nbsp; 50 kg Bags
            </span>
          </div>
        </div>
        <div className="page-body">
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/issues"   element={<Issues />} />
            <Route path="/balance"  element={<Balance />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/pnl"      element={<PnL />} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            <Route path="/users"    element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
            <Route path="*"         element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function RootApp() {
  const [serverReady, setServerReady] = useState(false);
  const handleReady = useCallback(() => setServerReady(true), []);

  if (!serverReady) {
    return <WakeUpScreen onReady={handleReady} />;
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'Inter, sans-serif', fontSize: 13.5, borderRadius: 10 },
          success: { iconTheme: { primary: '#02A793', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}