import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import api from '../utils/api';
import { fmt } from '../utils/format';
import toast from 'react-hot-toast';

const EMPTY = { date: new Date().toISOString().slice(0,10), grn_number: '', supplier_name: '', quantity: '', unit_cost: '', delivery_note: '', condition: 'Good', remarks: '' };

function Modal({ title, onClose, onSubmit, form, setForm, loading }) {
  const total = (parseFloat(form.quantity)||0) * (parseFloat(form.unit_cost)||0);
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
              <div className="form-group"><label className="form-label">Date *</label><input className="form-control" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">GRN Number *</label><input className="form-control" placeholder="e.g. GRN-001" value={form.grn_number} onChange={e => setForm({...form, grn_number: e.target.value})} required /></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Supplier Name *</label><input className="form-control" placeholder="e.g. Agro Suppliers Ltd" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Quantity (Bags) *</label><input className="form-control" type="number" min="1" placeholder="e.g. 1000" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Unit Cost (GHS/Bag) *</label><input className="form-control" type="number" step="0.01" placeholder="e.g. 280" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: e.target.value})} required /></div>
              {total > 0 && <div style={{gridColumn:'1/-1', background:'var(--green-light)', padding:'10px 14px', borderRadius:8, color:'var(--green)', fontWeight:700, fontSize:14}}>Total Cost: {fmt.currency(total)}</div>}
              <div className="form-group"><label className="form-label">Delivery Note No.</label><input className="form-control" placeholder="e.g. DN-2026-001" value={form.delivery_note} onChange={e => setForm({...form, delivery_note: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Condition</label><select className="form-control" value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>{['Good','Damaged','Partial Damage'].map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Remarks</label><textarea className="form-control" rows={2} placeholder="Optional notes…" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <><span className="spin">⟳</span> Saving…</> : 'Save Receipt'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [totals, setTotals]     = useState({ total_bags: 0, total_cost: 0 });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [search, setSearch]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.supplier = search;
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    api.get('/receipts', { params }).then(r => { setReceipts(r.data.receipts); setTotals(r.data.totals); setLoading(false); });
  }, [search, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'edit') { await api.put(`/receipts/${editId}`, form); toast.success('Receipt updated.'); }
      else { await api.post('/receipts', form); toast.success('Receipt recorded! ✅'); }
      setModal(null); setForm(EMPTY); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this receipt?')) return;
    await api.delete(`/receipts/${id}`); toast.success('Deleted.'); load();
  }

  function openEdit(r) {
    setForm({ date: r.date, grn_number: r.grn_number, supplier_name: r.supplier_name, quantity: r.quantity, unit_cost: r.unit_cost, delivery_note: r.delivery_note || '', condition: r.condition, remarks: r.remarks || '' });
    setEditId(r.id); setModal('edit');
  }

  const condBadge = { Good: 'badge-green', Damaged: 'badge-red', 'Partial Damage': 'badge-gold' };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">📥 Stock Receipts</div><div className="page-sub">Record every delivery of maize bags into the warehouse</div></div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal('add'); }}><Plus size={16} /> Record Delivery</button>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {[['Total Bags Received', fmt.number(totals.total_bags)+' bags','var(--primary-pale)','var(--primary)'],['Total Purchase Value',fmt.currency(totals.total_cost),'var(--green-light)','var(--green)']].map(([label,value,bg,color]) => (
          <div key={label} style={{ background: bg, padding: '14px 20px', borderRadius: 'var(--radius)', flex: 1, border: `1px solid ${color}30` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search supplier…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <input className="form-control" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 145 }} />
            <input className="form-control" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 145 }} />
            {(search||dateFrom||dateTo) && <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}><X size={14} /> Clear</button>}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          {loading ? <div style={{ textAlign: 'center', padding: 40 }}><span className="spin" style={{ fontSize: 28 }}>⟳</span></div>
          : receipts.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📦</div><h3>No receipts yet</h3><p>Click "Record Delivery" to add your first stock entry.</p></div>
          : <table>
              <thead><tr><th>Date</th><th>GRN No.</th><th>Supplier</th><th>Qty (Bags)</th><th>Unit Cost</th><th>Total Cost</th><th>Condition</th><th>Recorded By</th><th>Actions</th></tr></thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{fmt.date(r.date)}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.grn_number}</td>
                    <td style={{ fontWeight: 500 }}>{r.supplier_name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt.number(r.quantity)}</td>
                    <td>{fmt.currency(r.unit_cost)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt.currency(r.total_cost)}</td>
                    <td><span className={`badge ${condBadge[r.condition]||'badge-blue'}`}>{r.condition}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.created_by_name||'—'}</td>
                    <td><div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r.id)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="tfoot-row"><td colSpan={3} style={{ fontWeight: 700 }}>TOTAL</td><td style={{ fontWeight: 800 }}>{fmt.number(receipts.reduce((s,r)=>s+r.quantity,0))} bags</td><td></td><td style={{ fontWeight: 800 }}>{fmt.currency(receipts.reduce((s,r)=>s+r.total_cost,0))}</td><td colSpan={3}></td></tr></tfoot>
            </table>}
        </div>
      </div>
      {modal && <Modal title={modal==='edit'?'Edit Receipt':'Record New Delivery'} onClose={()=>setModal(null)} onSubmit={handleSubmit} form={form} setForm={setForm} loading={saving} />}
    </div>
  );
}
