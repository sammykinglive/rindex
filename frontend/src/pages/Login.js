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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          
          
          <div className="login-brand">Rin<span>dex</span></div>
        </div>
        <div className="login-tagline">Inventory Management System</div>
        <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          Track every bag. Know every number.
        </div>

        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 320 }}>
          {[
            ['', 'Real-time stock tracking'],
            ['', 'Live P&L calculations'],
            ['', 'Automatic reorder alerts'],
            ['', 'Multi-user access control'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center',  gap: 12, color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
              <span style={{ fontSize: 20 }}>{icon}</span> {text}
            </div>
          ))}
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-form-title">Sign In</div>
          <div className="login-form-sub">Enter your credentials to access Rindex</div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              <Lock size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-control"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  style={{ paddingLeft: 36 }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-control"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 4 }}>
              {loading ? <><span className="spin">⟳</span> Signing in…</> : 'Sign In to Rindex'}
            </button>
          </form>

         
        </div>
      </div>
    </div>
  );
}

