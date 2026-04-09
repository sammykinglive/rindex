import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X, UserCheck } from 'lucide-react';
import api from '../utils/api';
import { fmt } from '../utils/format';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const EMPTY = { name: '', email: '', password: '', role: 'staff' };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);

  function load() {
    setLoading(true);
    api.get('/auth/users').then(r => { setUsers(r.data); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/auth/users', form);
      toast.success(`User "${form.name}" created! ✅`);
      setModal(false); setForm(EMPTY); load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating user.');
    } finally { setSaving(false); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete user "${name}"? They will lose all access.`)) return;
    try {
      await api.delete(`/auth/users/${id}`);
      toast.success('User deleted.');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error deleting user.'); }
  }

  const roleBadge = { admin: 'badge-purple', staff: 'badge-blue' };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">👥 Manage Users</div>
          <div className="page-sub">Control who has access to Rindex and what they can do</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true); }}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Role explanation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          ['🔐 Admin Role', 'Full access to everything — all data, settings, user management, and P&L. Only give this to trusted managers.', 'var(--purple-light)', 'var(--purple)'],
          ['👤 Staff Role', 'Can record stock receipts and issues, and view the dashboard and balance. Cannot access settings or manage users.', 'var(--primary-pale)', 'var(--primary)'],
        ].map(([title, desc, bg, color]) => (
          <div key={title} style={{ background: bg, padding: '14px 18px', borderRadius: 'var(--radius)', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontWeight: 700, color, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{desc}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Users ({users.length})</span>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><span className="spin" style={{ fontSize: 28 }}>⟳</span></div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Date Added</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.role === 'admin' ? 'var(--purple)' : 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          {u.id === me?.id && <div style={{ fontSize: 11, color: 'var(--green)' }}>← You</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td><span className={`badge ${roleBadge[u.role] || 'badge-blue'}`}>{u.role}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmt.date(u.created_at?.slice(0,10))}</td>
                    <td>
                      {u.id !== me?.id ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(u.id, u.name)} style={{ color: 'var(--red)' }}>
                          <Trash2 size={14} /> Remove
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserCheck size={13} /> Current user
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <span className="modal-title">Add New User</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-control" placeholder="e.g. Kofi Mensah" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input className="form-control" type="email" placeholder="e.g. kofi@rindex.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="form-control" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select className="form-control" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                      <option value="staff">Staff — Can record receipts & issues, view data</option>
                      <option value="admin">Admin — Full access including settings & users</option>
                    </select>
                  </div>
                  <div style={{ padding: '10px 14px', background: 'var(--gold-light)', borderRadius: 8, fontSize: 12.5, color: '#856000' }}>
                    ⚠️ Share the password with the user securely. They can change it in Settings after logging in.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
