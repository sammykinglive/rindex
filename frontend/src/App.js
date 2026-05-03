import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Menu } from 'lucide-react';
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
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = TITLES[pathname] || 'Rindex';

  if (!user) return null;

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            {/* Hamburger — only visible on mobile */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="topbar-title">{title}</div>
          </div>
          <div className="topbar-right">
            <span className="topbar-badge">
              🌽 Rindex · GHS · 50 kg Bags
            </span>
          </div>
        </div>

        {/* Page content */}
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

  if (!serverReady) return <WakeUpScreen onReady={handleReady} />;

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
