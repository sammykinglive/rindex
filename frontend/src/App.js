import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, PackagePlus, PackageMinus, Scale, Wallet, TrendingUp, Settings, Users } from 'lucide-react';
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
  '/':          { label: 'Dashboard', icon: LayoutDashboard },
  '/receipts':  { label: 'Stock Receipts', icon: PackagePlus },
  '/issues':    { label: 'Stock Issues', icon: PackageMinus },
  '/balance':   { label: 'Stock Balance', icon: Scale },
  '/expenses':  { label: 'Expenses', icon: Wallet },
  '/pnl':       { label: 'P&L Summary', icon: TrendingUp },
  '/settings':  { label: 'Settings', icon: Settings },
  '/users':     { label: 'Manage Users', icon: Users },
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
  const titleMeta = TITLES[path] || { label: 'Rindex' };
  const TitleIcon = titleMeta.icon;
  if (!user) return null;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-title">
            {TitleIcon ? <TitleIcon size={18} style={{ marginRight: 8 }} /> : null}
            {titleMeta.label}
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
