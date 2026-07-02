import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X, UserCheck, ChevronDown, ChevronUp, Shield, Edit2 } from 'lucide-react';
import api from '../utils/api';
import { fmt } from '../utils/format';
import toast from 'react-hot-toast';
import { useAuth, MODULES } from '../context/AuthContext';

// ── Default permission sets ──────────────────────────────────────────────────
const DEFAULT_STAFF_PERMS = {
  dashboard:  { view: true },
  receipts:   { view: true,  create: true,  edit: true,  delete: false, export: false },
  issues:     { view: true,  create: true,  edit: true,  delete: false, export: false },
  balance:    { view: true,  export: false },
  expenses:   { view: false, create: false, edit: false, delete: false, export: false },
  pnl:        { view: false },
};

const ADMIN_PERMS = {
  dashboard:  { view: true },
  receipts:   { view: true,  create: true,  edit: true,  delete: true, export: true },
  issues:     { view: true,  create: true,  edit: true,  delete: true, export: true },
  balance:    { view: true,  export: true },
  expenses:   { view: true,  create: true,  edit: true,  delete: true, export: true },
  pnl:        { view: true },
};

function buildDefaultPerms(role) {
  return role === 'admin' ? ADMIN_PERMS : JSON.parse(JSON.stringify(DEFAULT_STAFF_PERMS));
}

const ACTION_LABELS = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', export: 'Export' };
const ACTION_COLORS = { view: 'var(--primary)', create: 'var(--green)', edit: 'var(--blue)', delete: 'var(--red)', export: 'var(--purple)' };

const EMPTY_FORM = { name: '', email: '', password: '', role: 'staff' };

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? 'var(--primary)' : 'var(--border)',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 19 : 3,
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

// ── Permission Editor ─────────────────────────────────────────────────────────
function PermissionEditor({ permissions, onChange, role }) {
  const isAdmin = role === 'admin';

  function setPermission(moduleKey, action, val) {
    const next = JSON.parse(JSON.stringify(permissions));
    if (!next[moduleKey]) next[moduleKey] = {};
    next[moduleKey][action] = val;
    // If turning off 'view', turn off all other actions for this module
    if (action === 'view' && !val) {
      MODULES.find(m => m.key === moduleKey)?.actions.forEach(a => { next[moduleKey][a] = false; });
    }
    // If turning on any action, ensure 'view' is on
    if (action !== 'view' && val) next[moduleKey]['view'] = true;
    onChange(next);
  }

  function setModuleAll(moduleKey, val) {
    const next = JSON.parse(JSON.stringify(permissions));
    const mod = MODULES.find(m => m.key === moduleKey);
    if (!next[moduleKey]) next[moduleKey] = {};
    mod.actions.forEach(a => { next[moduleKey][a] = val; });
    onChange(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {isAdmin && (
        <div style={{ background: 'var(--primary-pale)', border: '1px solid var(--primary)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} /> Admin users always have full access to all modules.
        </div>
      )}

      {MODULES.map(mod => {
        const modPerms = permissions[mod.key] || {};
        const allOn = mod.actions.every(a => modPerms[a]);
        const viewOn = !!modPerms.view;

        return (
          <div key={mod.key} style={{
            border: `1.5px solid ${viewOn && !isAdmin ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 10, overflow: 'hidden',
            opacity: isAdmin ? 0.7 : 1,
            transition: 'border-color 0.2s',
          }}>
            {/* Module header row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              background: viewOn && !isAdmin ? 'var(--primary-pale)' : 'var(--surface-alt, var(--bg))',
              transition: 'background 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{mod.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{mod.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {mod.actions.length} permission{mod.actions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {mod.actions.length > 1 && !isAdmin && (
                  <button
                    type="button"
                    onClick={() => setModuleAll(mod.key, !allOn)}
                    style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {allOn ? 'Disable all' : 'Enable all'}
                  </button>
                )}
                <Toggle
                  checked={isAdmin ? true : viewOn}
                  disabled={isAdmin}
                  onChange={v => setPermission(mod.key, 'view', v)}
                />
              </div>
            </div>

            {/* Action toggles */}
            {mod.actions.length > 1 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 14px',
                borderTop: '1px solid var(--border)',
                background: 'var(--card)',
              }}>
                {mod.actions.filter(a => a !== 'view').map(action => (
                  <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
                    <Toggle
                      checked={isAdmin ? true : !!modPerms[action]}
                      disabled={isAdmin || !viewOn}
                      onChange={v => setPermission(mod.key, action, v)}
                    />
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: (isAdmin || !!modPerms[action]) ? (ACTION_COLORS[action] || 'var(--text)') : 'var(--text-muted)',
                    }}>
                      {ACTION_LABELS[action]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Users() {
  const { user: me }          = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);

  // Create modal state
  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [createPerms, setCreatePerms] = useState(buildDefaultPerms('staff'));
  const [saving, setSaving]           = useState(false);

  // Edit permissions modal state
  const [editTarget, setEditTarget]   = useState(null); // {user}
  const [editPerms, setEditPerms]     = useState(null);
  const [editSaving, setEditSaving]   = useState(false);

  // Expand user row in table
  const [expanded, setExpanded]       = useState(null);

  function load() {
    setLoading(true);
    api.get('/auth/users').then(r => { setUsers(r.data); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  // When role changes in create form, reset permissions to defaults
  function handleRoleChange(role) {
    setForm(f => ({ ...f, role }));
    setCreatePerms(buildDefaultPerms(role));
  }

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/auth/users', { ...form, permissions: createPerms });
      toast.success(`User "${form.name}" created! ✅`);
      setShowCreate(false); setForm(EMPTY_FORM); setCreatePerms(buildDefaultPerms('staff'));
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
    finally { setSaving(false); }
  }

  async function handleSavePerms(e) {
    e.preventDefault(); setEditSaving(true);
    try {
      await api.put(`/auth/users/${editTarget.id}`, { permissions: editPerms });
      toast.success(`Permissions updated for ${editTarget.name} ✅`);
      setEditTarget(null); setEditPerms(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
    finally { setEditSaving(false); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await api.delete(`/auth/users/${id}`); toast.success('User deleted.'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  }

  function openEditPerms(u) {
    setEditTarget(u);
    setEditPerms(JSON.parse(JSON.stringify(u.permissions || buildDefaultPerms(u.role))));
  }

  function getPermSummary(u) {
    if (u.role === 'admin') return 'Full access';
    const perms = u.permissions || {};
    const visible = MODULES.filter(m => perms[m.key]?.view);
    if (visible.length === 0) return 'No module access';
    if (visible.length === MODULES.length) return 'All modules';
    return visible.map(m => m.label).join(', ');
  }

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">👥 Manage Users</div>
          <div className="page-sub">Control who has access to Rindex and what they can do</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setCreatePerms(buildDefaultPerms('staff')); setShowCreate(true); }}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* ── Role Overview Cards ────────────────────────────────────── */}
      <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          ['🔐 Admin', 'Full access to all modules, settings, and user management. Permissions cannot be restricted.', 'var(--purple-light)', 'var(--purple)'],
          ['👤 Staff', 'Access is determined by the permissions set by the administrator for each individual user.', 'var(--primary-pale)', 'var(--primary)'],
        ].map(([title, desc, bg, color]) => (
          <div key={title} style={{ background: bg, padding: '14px 18px', borderRadius: 'var(--radius)', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontWeight: 700, color, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* ── Users Table ───────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Users ({users.length})</span>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ width: 32, height: 32, border: '3px solid var(--primary-pale)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>User</th><th>Email</th><th>Role</th><th>Module Access</th><th>Date Added</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <React.Fragment key={u.id}>
                    <tr
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.role === 'admin' ? 'var(--purple)' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                            {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            {u.id === me?.id && <div style={{ fontSize: 11, color: 'var(--primary)' }}>← You</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</td>
                      <td><span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-teal'}`}>{u.role}</span></td>
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getPermSummary(u)}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmt.date(u.created_at?.slice(0, 10))}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {u.id !== me?.id ? (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={e => { e.stopPropagation(); openEditPerms(u); }}
                                title="Edit permissions"
                                style={{ color: 'var(--primary)' }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={e => { e.stopPropagation(); handleDelete(u.id, u.name); }}
                                style={{ color: 'var(--red)' }}
                                title="Remove user"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <UserCheck size={13} /> You
                            </span>
                          )}
                          {expanded === u.id ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded permissions row */}
                    {expanded === u.id && (
                      <tr style={{ background: 'var(--bg)' }}>
                        <td colSpan={6} style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Shield size={14} style={{ color: 'var(--primary)' }} /> Permissions for {u.name}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                            {MODULES.map(mod => {
                              const mp = u.role === 'admin' ? { view: true, create: true, edit: true, delete: true, export: true } : (u.permissions?.[mod.key] || {});
                              const canView = u.role === 'admin' || !!mp.view;
                              return (
                                <div key={mod.key} style={{ border: `1px solid ${canView ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 12px', background: 'var(--card)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <span>{mod.icon}</span>
                                    <span style={{ fontWeight: 600, fontSize: 12.5 }}>{mod.label}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: canView ? 'var(--primary)' : 'var(--text-muted)', background: canView ? 'var(--primary-pale)' : 'var(--bg)', padding: '2px 7px', borderRadius: 99 }}>
                                      {canView ? 'Enabled' : 'Hidden'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {mod.actions.filter(a => a !== 'view').map(a => (
                                      <span key={a} style={{
                                        fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                                        background: (u.role === 'admin' || mp[a]) ? (ACTION_COLORS[a] + '20') : 'var(--bg)',
                                        color: (u.role === 'admin' || mp[a]) ? ACTION_COLORS[a] : 'var(--text-muted)',
                                        border: `1px solid ${(u.role === 'admin' || mp[a]) ? ACTION_COLORS[a] + '40' : 'var(--border)'}`,
                                      }}>
                                        {ACTION_LABELS[a]}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {u.id !== me?.id && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ marginTop: 14 }}
                              onClick={() => openEditPerms(u)}
                            >
                              <Edit2 size={13} /> Edit Permissions
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create User Modal ─────────────────────────────────────── */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <span className="modal-title">Add New User</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Basic info */}
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="form-control" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select className="form-control" value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                      <option value="staff">Staff — Custom permissions below</option>
                      <option value="admin">Admin — Full access to everything</option>
                    </select>
                  </div>

                  {/* Permissions */}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield size={14} style={{ color: 'var(--primary)' }} /> Module Permissions
                    </div>
                    <PermissionEditor
                      permissions={createPerms}
                      onChange={setCreatePerms}
                      role={form.role}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Permissions Modal ────────────────────────────────── */}
      {editTarget && editPerms && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Edit Permissions</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{editTarget.name} · {editTarget.email}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditTarget(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSavePerms} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                <PermissionEditor
                  permissions={editPerms}
                  onChange={setEditPerms}
                  role={editTarget.role}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editSaving}>
                  {editSaving ? 'Saving…' : '✅ Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
