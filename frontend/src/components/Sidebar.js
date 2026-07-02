import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, PackagePlus, PackageMinus, Scale,
  TrendingUp, Settings, Users, LogOut, Wheat, Receipt, ChevronRight, X
} from 'lucide-react';

// Module key must match MODULES in AuthContext
const NAV = [
  { path: '/',          label: 'Dashboard',      icon: LayoutDashboard, moduleKey: 'dashboard' },
  { path: '/receipts',  label: 'Stock Receipts', icon: PackagePlus,     moduleKey: 'receipts'  },
  { path: '/issues',    label: 'Stock Issues',   icon: PackageMinus,    moduleKey: 'issues'    },
  { path: '/balance',   label: 'Stock Balance',  icon: Scale,           moduleKey: 'balance'   },
  { path: '/expenses',  label: 'Expenses',       icon: Receipt,         moduleKey: 'expenses'  },
  { path: '/pnl',       label: 'P&L Summary',   icon: TrendingUp,      moduleKey: 'pnl'       },
];

const ADMIN_NAV = [
  { path: '/users',    label: 'Manage Users', icon: Users    },
  { path: '/settings', label: 'Settings',     icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout, can } = useAuth();
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  function go(path) { navigate(path); onClose(); }
  function handleLogout() { logout(); onClose(); }

  // Filter nav items by view permission
  const visibleNav = NAV.filter(item => can(item.moduleKey, 'view'));

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose} />

      <div className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Wheat size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="logo-text">Rindex</div>
            <div className="logo-sub">Inventory System</div>
          </div>
          <button onClick={onClose} style={{ display: 'none', width: 28, height: 28, border: 'none', background: 'var(--bg)', borderRadius: 6, cursor: 'pointer', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }} className="sidebar-close-btn">
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>

          {visibleNav.map(({ path, label, icon: Icon }) => (
            <button key={path} className={`nav-item ${pathname === path ? 'active' : ''}`} onClick={() => go(path)}>
              <Icon size={17} className="nav-icon" strokeWidth={pathname === path ? 2.5 : 2} />
              <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
              {pathname === path && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
            </button>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="sidebar-divider" style={{ margin: '8px 0' }} />
              <div className="nav-section-label">Admin</div>
              {ADMIN_NAV.map(({ path, label, icon: Icon }) => (
                <button key={path} className={`nav-item ${pathname === path ? 'active' : ''}`} onClick={() => go(path)}>
                  <Icon size={17} className="nav-icon" strokeWidth={pathname === path ? 2.5 : 2} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                  {pathname === path && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
                </button>
              ))}
            </>
          )}

          <div className="sidebar-divider" style={{ margin: '8px 0' }} />
          <button className="nav-item" onClick={handleLogout}>
            <LogOut size={17} className="nav-icon" strokeWidth={2} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .sidebar-close-btn { display: flex !important; } }`}</style>
    </>
  );
}
