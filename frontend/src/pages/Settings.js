import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ business_name: '', reorder_level: '', unit_price: '', warehouse_capacity: '', supplier_name: '', warehouse_location: '' });
  const [pwForm, setPwForm]     = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving]     = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => { api.get('/dashboard/settings').then(r => setSettings(s => ({ ...s, ...r.data }))); }, []);

  async function saveSettings(e) {
    e.preventDefault(); setSaving(true);
    try { await api.put('/dashboard/settings', settings); toast.success('Settings saved! ✅'); }
    catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match.');
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters.');
    setSavingPw(true);
    try { await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }); toast.success('Password changed!'); setPwForm({ currentPassword: '', newPassword: '', confirm: '' }); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setSavingPw(false); }
  }

  const field = (key, label, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-control" type={type} placeholder={placeholder} value={settings[key] || ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} />
    </div>
  );

  return (
    <div>
      <div className="page-header"><div><div className="page-title">⚙️ Settings</div><div className="page-sub">Configure your business settings</div></div></div>
      <div className="two-col settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Business & Warehouse</span></div>
          <div className="card-body">
            <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {field('business_name', 'Business Name', 'text', 'e.g. Rindex')}
              {field('warehouse_location', 'Warehouse Location', 'text', 'e.g. Accra')}
              {field('supplier_name', 'Default Supplier', 'text', 'e.g. Agro Suppliers Ltd')}
              <div className="divider" />
              {field('unit_price', 'Selling Price / Bag (GHS)', 'number', '320')}
              {field('reorder_level', 'Reorder Level (Bags)', 'number', '50')}
              {field('warehouse_capacity', 'Warehouse Capacity (Bags)', 'number', '1000')}
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={15} />{saving ? 'Saving…' : 'Save Settings'}</button>
            </form>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Change Password</span></div>
            <div className="card-body">
              <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group"><label className="form-label">Current Password</label><input className="form-control" type="password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">New Password</label><input className="form-control" type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} /></div>
                <div className="form-group"><label className="form-label">Confirm New Password</label><input className="form-control" type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required /></div>
                <button type="submit" className="btn btn-outline" disabled={savingPw}>{savingPw ? 'Updating…' : 'Update Password'}</button>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Account Info</span></div>
            <div className="card-body">
              {[['Name', user?.name], ['Email', user?.email], ['Role', user?.role], ['System', 'Rindex v1.0'], ['Currency', 'GHS (Ghana Cedis)'], ['Unit', '50 kg Bags']].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
