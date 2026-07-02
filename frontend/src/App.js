import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Menu, Sun, Moon, ShieldOff } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
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
  '/':          'Dashboard',
  '/receipts':  'Stock Receipts',
  '/issues':    'Stock Issues',
  '/balance':   'Stock Balance',
  '/expenses':  'Expenses',
  '/pnl':       'P&L Summary',
  '/settings':  'Settings',
  '/users':     'Manage Users',
};

// ── 403 Access Denied page ────────────────────────────────────────────────────
function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center', padding: 24 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShieldOff size={34} style={{ color: 'var(--red)' }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Access Denied</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 340, lineHeight: 1.6 }}>
          You don't have permission to view this page. Contact your administrator to request access.
        </div>
      </div>
      <button className="btn btn-primary" onClick={() => navigate('/')}>← Back to Dashboard</button>
    </div>
  );
}

// ── Route guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

// Guards a module route by permission — shows 403 page if no access
function PermissionRoute({ children, moduleKey, action = 'view' }) {
  const { can } = useAuth();
  if (!can(moduleKey, action)) return <AccessDenied />;
  return children;
}

// ── Theme Toggle ──────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: dark ? '#FCD34D' : 'var(--text-muted)', transition: 'all 0.2s', flexShrink: 0 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = dark ? '#FCD34D' : 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-pale)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = dark ? '#FCD34D' : 'var(--text-muted)'; e.currentTarget.style.background = 'var(--card)'; }}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
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
        <div className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <div className="topbar-title">{title}</div>
          </div>
          <div className="topbar-right"><ThemeToggle /></div>
        </div>

        <div className="page-body">
          <Routes>
            <Route path="/" element={
              <PermissionRoute moduleKey="dashboard">
                <Dashboard />
              </PermissionRoute>
            } />
            <Route path="/receipts" element={
              <PermissionRoute moduleKey="receipts">
                <Receipts />
              </PermissionRoute>
            } />
            <Route path="/issues" element={
              <PermissionRoute moduleKey="issues">
                <Issues />
              </PermissionRoute>
            } />
            <Route path="/balance" element={
              <PermissionRoute moduleKey="balance">
                <Balance />
              </PermissionRoute>
            } />
            <Route path="/expenses" element={
              <PermissionRoute moduleKey="expenses">
                <Expenses />
              </PermissionRoute>
            } />
            <Route path="/pnl" element={
              <PermissionRoute moduleKey="pnl">
                <PnL />
              </PermissionRoute>
            } />
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
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: 13.5, borderRadius: 10 }, success: { iconTheme: { primary: '#02A793', secondary: '#fff' } }, error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
