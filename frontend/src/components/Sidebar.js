import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, PackagePlus, PackageMinus, Scale, TrendingUp,
  Settings, Users, LogOut, Wheat
} from 'lucide-react';

const NAV = [
  { path: '/',          label: 'Dashboard',      icon: LayoutDashboard },
  { path: '/receipts',  label: 'Stock Receipts', icon: PackagePlus },
  { path: '/issues',    label: 'Stock Issues',   icon: PackageMinus },
  { path: '/balance',   label: 'Stock Balance',  icon: Scale },
  { path: '/pnl',       label: 'P&L Summary',   icon: TrendingUp },
];

const ADMIN_NAV = [
  { path: '/users',    label: 'Manage Users', icon: Users },
  { path: '/settings', label: 'Settings',     icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  function go(path) { navigate(path); }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"><Wheat size={20} color="#0D2137" /></div>
        <div>
          <div className="logo-text">Rindex</div>
          <div className="logo-sub">Inventory System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            className={`nav-item ${pathname === path ? 'active' : ''}`}
            onClick={() => go(path)}
          >
            <Icon size={18} className="nav-icon" />
            <span className="nav-label">{label}</span>
          </button>
        ))}

        {user?.role === 'admin' && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 16px' }} />
            {ADMIN_NAV.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                className={`nav-item ${pathname === path ? 'active' : ''}`}
                onClick={() => go(path)}
              >
                <Icon size={18} className="nav-icon" />
                <span className="nav-label">{label}</span>
              </button>
            ))}
          </>
        )}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 16px' }} />
        <button className="nav-item" onClick={logout}>
          <LogOut size={18} className="nav-icon" />
          <span className="nav-label">Logout</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
