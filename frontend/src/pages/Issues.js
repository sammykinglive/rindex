import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X, Download, FileText, ShoppingCart } from 'lucide-react';
import api from '../utils/api';
import { fmt } from '../utils/format';
import toast from 'react-hot-toast';
import { exportIssuesToExcel } from '../utils/exportExcel';
import { exportIssuesPDF, printInvoice } from '../utils/exportPDF';

const EMPTY = {
  commodity_id: '',
  date: new Date().toISOString().slice(0,10),
  invoice_number: '', customer_name: '',
  quantity: '', selling_price: '',
  payment_method: 'Cash', payment_status: 'Paid', remarks: '',
};

// ── Form Modal ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSubmit, form, setForm, loading, commodities, settings }) {
  const commodity = commodities.find(c => c.id === parseInt(form.commodity_id));
  const unit      = commodity?.unit || 'units';
  const price     = parseFloat(form.selling_price) || 0;
  const total     = (parseFloat(form.quantity)||0) * price;

  function handleCommodityChange(id) {
    const c = commodities.find(c => c.id === parseInt(id));
    setForm({ ...form, commodity_id: id, selling_price: c?.unit_price || settings?.unit_price || '' });
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-grid">

              {/* Commodity — full width, first */}
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Commodity *</label>
                <select
                  className="form-control"
                  value={form.commodity_id}
                  onChange={e => handleCommodityChange(e.target.value)}
                  required
                >
                  <option value="">Select commodity…</option>
                  {commodities.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-control" type="date" value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Number *</label>
                <input className="form-control" value={form.invoice_number}
                  onChange={e => setForm({...form, invoice_number: e.target.value})} required/>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Customer Name *</label>
                <input className="form-control" value={form.customer_name}
                  onChange={e => setForm({...form, customer_name: e.target.value})} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity ({unit}) *</label>
                <input className="form-control" type="number" min="1" value={form.quantity}
                  onChange={e => setForm({...form, quantity: e.target.value})} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (GHS/{unit}) *</label>
                <input className="form-control" type="number" step="0.01" value={form.selling_price}
                  onChange={e => setForm({...form, selling_price: e.target.value})} required/>
              </div>

              {total > 0 && (
                <div style={{ gridColumn:'1/-1', background:'var(--primary-pale)', padding:'10px 14px', borderRadius:8, color:'var(--primary)', fontWeight:700, fontSize:14 }}>
                  Total Sales Value: {fmt.currency(total)}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={form.payment_method}
                  onChange={e => setForm({...form, payment_method: e.target.value})}>
                  {['Cash','Mobile Money','Bank Transfer','Credit'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select className="form-control" value={form.payment_status}
                  onChange={e => setForm({...form, payment_status: e.target.value})}>
                  {['Paid','Pending','Partial'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Remarks</label>
                <textarea className="form-control" rows={2} value={form.remarks}
                  onChange={e => setForm({...form, remarks: e.target.value})}/>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Saving…' : 'Save Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Issues() {
  const [issues, setIssues]         = useState([]);
  const [totals, setTotals]         = useState({ total_bags: 0, total_sales: 0 });
  const [settings, setSettings]     = useState({});
  const [commodities, setCommodities] = useState([]);
  const [filterCommodity, setFilterCommodity] = useState('');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [editId, setEditId]         = useState(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');

  // Load active commodities once
  useEffect(() => {
    api.get('/commodities')
      .then(r => setCommodities((r.data || []).filter(c => c.is_active)))
      .catch(() => setCommodities([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search)          params.customer    = search;
    if (statusFilter)    params.status      = statusFilter;
    if (dateFrom)        params.from        = dateFrom;
    if (dateTo)          params.to          = dateTo;
    if (filterCommodity) params.commodity_id = filterCommodity;
    Promise.all([
      api.get('/issues', { params }),
      api.get('/dashboard/settings'),
    ]).then(([issRes, setRes]) => {
      setIssues(issRes.data.issues);
      setTotals(issRes.data.totals);
      setSettings(setRes.data);
      setLoading(false);
    });
  }, [search, statusFilter, dateFrom, dateTo, filterCommodity]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    const first = commodities[0];
    setForm({ ...EMPTY, commodity_id: first?.id || '', selling_price: first?.unit_price || settings.unit_price || '' });
    setModal('add');
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, selling_price: parseFloat(form.selling_price) };
    try {
      if (modal === 'edit') {
        await api.put(`/issues/${editId}`, payload);
        toast.success('Updated.');
      } else {
        await api.post('/issues', payload);
        toast.success('Sale recorded! ✅');
      }
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this issue?')) return;
    await api.delete(`/issues/${id}`);
    toast.success('Deleted.'); load();
  }

  function openEdit(r) {
    setForm({
      commodity_id:   r.commodity_id || '',
      date:           r.date,
      invoice_number: r.invoice_number,
      customer_name:  r.customer_name,
      quantity:       r.quantity,
      selling_price:  r.selling_price,
      payment_method: r.payment_method,
      payment_status: r.payment_status,
      remarks:        r.remarks || '',
    });
    setEditId(r.id); setModal('edit');
  }

  const statusBadge = { Paid:'badge-green', Pending:'badge-red', Partial:'badge-gold' };
  const methodBadge = { Cash:'badge-green', 'Mobile Money':'badge-blue', 'Bank Transfer':'badge-purple', Credit:'badge-gold' };

  const filterComm = commodities.find(c => c.id === parseInt(filterCommodity));
  const unitLabel  = filterComm?.unit || 'units';

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Stock Issues</div>
          <div className="page-sub">Record every sale or dispatch from the warehouse</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => exportIssuesToExcel(issues, totals)}>
            <Download size={14}/> Excel
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportIssuesPDF(issues, totals)}>
            <Download size={14}/> PDF
          </button>
          <button className="btn btn-danger" onClick={openAdd}>
            <Plus size={16}/> Record Sale
          </button>
        </div>
      </div>

      {/* Totals */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
        {[
          ['Total Sold', fmt.number(totals.total_bags) + ' ' + unitLabel, 'var(--red-light)', 'var(--red)'],
          ['Total Revenue', fmt.currency(totals.total_sales), 'var(--green-light)', 'var(--green)'],
        ].map(([label, value, bg, color]) => (
          <div key={label} style={{ background:bg, padding:'14px 18px', borderRadius:'var(--radius)' }}>
            <div style={{ fontSize:11.5, fontWeight:600, color, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
            <div style={{ fontSize:20, fontWeight:800, color, marginTop:4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body" style={{ paddingTop:12, paddingBottom:12 }}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <select className="form-control" style={{ width:190 }}
              value={filterCommodity} onChange={e => setFilterCommodity(e.target.value)}>
              <option value="">All Commodities</option>
              {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ position:'relative', flex:1, minWidth:140 }}>
              <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
              <input className="form-control" style={{ paddingLeft:30 }} placeholder="Search customer…"
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <select className="form-control" style={{ width:140 }}
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {['Paid','Pending','Partial'].map(s => <option key={s}>{s}</option>)}
            </select>
            <input className="form-control" type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} style={{ width:140 }}/>
            <input className="form-control" type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)} style={{ width:140 }}/>
            {(search || statusFilter || dateFrom || dateTo || filterCommodity) && (
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setFilterCommodity(''); }}>
                <X size={14}/> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ width:32, height:32, border:'3px solid var(--primary-pale)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
            </div>
          ) : issues.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart size={36} style={{ opacity:0.25, marginBottom:10 }}/>
              <h3>No issues found</h3>
              <p>Click "Record Sale" to add your first entry.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Commodity</th><th>Invoice</th><th>Customer</th>
                  <th>Qty</th><th>Price</th><th>Total Sales</th>
                  <th>Payment</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(r => {
                  const comm = commodities.find(c => c.id === r.commodity_id);
                  return (
                    <tr key={r.id}>
                      <td style={{ whiteSpace:'nowrap' }}>{fmt.date(r.date)}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--primary)', display:'inline-block', flexShrink:0 }}/>
                          <span style={{ fontWeight:600, fontSize:12.5 }}>{r.commodity_name || comm?.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily:'monospace', fontWeight:600, fontSize:12 }}>{r.invoice_number}</td>
                      <td style={{ fontWeight:500 }}>{r.customer_name}</td>
                      <td style={{ fontWeight:700, color:'var(--red)' }}>
                        {fmt.number(r.quantity)} <span style={{ fontSize:11, color:'var(--text-muted)' }}>{r.commodity_unit || comm?.unit || ''}</span>
                      </td>
                      <td>{fmt.currency(r.selling_price)}</td>
                      <td style={{ fontWeight:700 }}>{fmt.currency(r.total_sales)}</td>
                      <td><span className={`badge ${methodBadge[r.payment_method]||'badge-blue'}`}>{r.payment_method}</span></td>
                      <td><span className={`badge ${statusBadge[r.payment_status]||'badge-blue'}`}>{r.payment_status}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-ghost btn-sm" title="Print Invoice"
                            onClick={() => printInvoice(r, settings)} style={{ color:'var(--primary)' }}>
                            <FileText size={13}/>
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}><Pencil size={13}/></button>
                          <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }}
                            onClick={() => handleDelete(r.id)}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={4}>TOTAL{filterComm ? ` — ${filterComm.name}` : ' — All Commodities'}</td>
                  <td>{fmt.number(issues.reduce((s,r)=>s+r.quantity,0))} {unitLabel}</td>
                  <td></td>
                  <td>{fmt.currency(issues.reduce((s,r)=>s+r.total_sales,0))}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal
          title={modal === 'edit' ? 'Edit Issue' : 'Record New Sale'}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          form={form} setForm={setForm}
          loading={saving}
          commodities={commodities}
          settings={settings}
        />
      )}
    </div>
  );
}
