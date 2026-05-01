import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wheat, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, position: 'relative', zIndex: 1 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <Wheat size={32} color="#fff" />
          </div>
          <div className="login-brand">Rindex</div>
        </div>
        <div className="login-tagline" style={{ position: 'relative', zIndex: 1 }}>Maize Inventory Management System</div>
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 300, position: 'relative', zIndex: 1 }}>
          {[['📦','Real-time stock tracking'],['📊','Live P&L calculations'],['⚠️','Automatic reorder alerts'],['👥','Multi-user access control']].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
              <span style={{ fontSize: 20 }}>{icon}</span> {text}
            </div>
          ))}
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-form-title">Welcome back</div>
          <div className="login-form-sub">Sign in to your Rindex account</div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              <Lock size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ paddingLeft: 36 }} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-control" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ paddingLeft: 36, paddingRight: 40 }} required />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, marginTop: 4 }}>
              {loading ? <><span className="spin">⟳</span> Signing in…</> : 'Sign In to Rindex'}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: 14, background: 'var(--primary-pale)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-muted)', borderLeft: '3px solid var(--primary)' }}>
            <strong style={{ color: 'var(--primary)' }}>Default Admin Login</strong><br />
            Email: admin@rindex.com<br />
            Password: admin123<br />
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>Change this after your first login!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
