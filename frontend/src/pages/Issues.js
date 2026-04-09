import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import api from '../utils/api';
import { fmt } from '../utils/format';
import toast from 'react-hot-toast';

const EMPTY = { date: new Date().toISOString().slice(0,10), invoice_number: '', customer_name: '', quantity: '', selling_price: '', payment_method: 'Cash', payment_status: 'Paid', remarks: '' };

function Modal({ title, onClose, onSubmit, form, setForm, loading, settings }) {
  const price = parseFloat(form.selling_price) || parseFloat(settings?.unit_price) || 0;
  const total = (parseFloat(form.quantity)||0) * price;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-control" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Number *</label>
                <input className="form-control" placeholder="e.g. INV-001" value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} required />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Customer Name *</label>
                <input className="form-control" placeholder="e.g. Ama Trading Co." value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity (Bags) *</label>
                <input className="form-control" type="number" min="1" placeholder="e.g. 200" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (GHS/Bag) *</label>
                <input className="form-control" type="number" step="0.01" placeholder={settings?.unit_price || '320'} value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})} required />
              </div>
              {total > 0 && (
                <div style={{ gridColumn: '1/-1', background: 'var(--primary-pale)', padding: '10px 14px', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>
                  Total Sales Value: {fmt.currency(total)}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                  {['Cash','Mobile Money','Bank Transfer','Credit'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select className="form-control" value={form.payment_status} onChange={e => setForm({...form, payment_status: e.target.value})}>
                  {['Paid','Pending','Partial'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Remarks</label>
                <textarea className="form-control" rows={2} placeholder="Optional notes…" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? <><span className="spin">⟳</span> Saving…</> : 'Save Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Issues() {
  const [issues, setIssues]   = useState([]);
  const [totals, setTotals]   = useState({ total_bags: 0, total_sales: 0 });
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [editId, setEditId]   = useState(null);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.customer = search;
    if (statusFilter) params.status = statusFilter;
    if (dateFrom) params.from = dateFrom;
    if (dateTo)   params.to   = dateTo;
    Promise.all([
      api.get('/issues', { params }),
      api.get('/dashboard/settings'),
    ]).then(([issRes, setRes]) => {
      setIssues(issRes.data.issues);
      setTotals(issRes.data.totals);
      setSettings(setRes.data);
      setLoading(false);
    });
  }, [search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ ...EMPTY, selling_price: settings.unit_price || '' });
    setModal('add');
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, selling_price: parseFloat(form.selling_price) || parseFloat(settings.unit_price) };
    try {
      if (modal === 'edit') { await api.put(`/issues/${editId}`, payload); toast.success('Issue updated.'); }
      else { await api.post('/issues', payload); toast.success('Sale recorded successfully! ✅'); }
      setModal(null); load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving.');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this issue?')) return;
    await api.delete(`/issues/${id}`);
    toast.success('Issue deleted.'); load();
  }

  function openEdit(r) {
    setForm({ date: r.date, invoice_number: r.invoice_number, customer_name: r.customer_name, quantity: r.quantity, selling_price: r.selling_price, payment_method: r.payment_method, payment_status: r.payment_status, remarks: r.remarks || '' });
    setEditId(r.id); setModal('edit');
  }

  const statusBadge = { Paid: 'badge-green', Pending: 'badge-red', Partial: 'badge-gold' };
  const methodBadge = { Cash: 'badge-green', 'Mobile Money': 'badge-blue', 'Bank Transfer': 'badge-purple', Credit: 'badge-gold' };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📤 Stock Issues</div>
          <div className="page-sub">Record every sale or dispatch of maize bags from the warehouse</div>
        </div>
        <button className="btn btn-danger" onClick={openAdd}><Plus size={16} /> Record Sale</button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {[
          ['Total Bags Sold', fmt.number(totals.total_bags) + ' bags', 'var(--red-light)', 'var(--red)'],
          ['Total Sales Revenue', fmt.currency(totals.total_sales), 'var(--green-light)', 'var(--green)'],
        ].map(([label, value, bg, color]) => (
          <div key={label} style={{ background: bg, padding: '14px 20px', borderRadius: 'var(--radius)', flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search customer…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {['Paid','Pending','Partial'].map(s => <option key={s}>{s}</option>)}
            </select>
            <input className="form-control" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 145 }} />
            <input className="form-control" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 145 }} />
            {(search || statusFilter || dateFrom || dateTo) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); }}>
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><span className="spin" style={{ fontSize: 28 }}>⟳</span></div>
          ) : issues.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛒</div>
              <h3>No issues recorded yet</h3>
              <p>Click "Record Sale" to add your first sale.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Qty (Bags)</th><th>Price/Bag</th><th>Total Sales</th><th>Payment</th><th>Status</th><th>Recorded By</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {issues.map(r => (
                  <tr key={r.id}>
                    <td>{fmt.date(r.date)}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.invoice_number}</td>
                    <td style={{ fontWeight: 500 }}>{r.customer_name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--red)' }}>{fmt.number(r.quantity)}</td>
                    <td>{fmt.currency(r.selling_price)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt.currency(r.total_sales)}</td>
                    <td><span className={`badge ${methodBadge[r.payment_method] || 'badge-blue'}`}>{r.payment_method}</span></td>
                    <td><span className={`badge ${statusBadge[r.payment_status] || 'badge-blue'}`}>{r.payment_status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.created_by_name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}><Pencil size={13} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r.id)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={3} style={{ fontWeight: 700 }}>TOTAL</td>
                  <td style={{ fontWeight: 800 }}>{fmt.number(issues.reduce((s,r) => s+r.quantity, 0))} bags</td>
                  <td></td>
                  <td style={{ fontWeight: 800 }}>{fmt.currency(issues.reduce((s,r) => s+r.total_sales, 0))}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {modal && <Modal title={modal === 'edit' ? 'Edit Issue' : 'Record New Sale'} onClose={() => setModal(null)} onSubmit={handleSubmit} form={form} setForm={f => setForm(typeof f === 'function' ? f(form) : f)} loading={saving} settings={settings} />}
    </div>
  );
}
