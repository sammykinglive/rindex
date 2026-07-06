import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X, Download, Package } from 'lucide-react';
import api from '../utils/api';
import { fmt } from '../utils/format';
import toast from 'react-hot-toast';
import { exportReceiptsToExcel } from '../utils/exportExcel';
import { exportReceiptsPDF } from '../utils/exportPDF';

const EMPTY = {
  commodity_id: '',
  date: new Date().toISOString().slice(0,10),
  grn_number: '', supplier_name: '',
  quantity: '', unit_cost: '',
  delivery_note: '', condition: 'Good', remarks: '',
};

// ── Form Modal ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSubmit, form, setForm, loading, commodities }) {
  const commodity = commodities.find(c => c.id === parseInt(form.commodity_id));
  const unit      = commodity?.unit || 'units';
  const total     = (parseFloat(form.quantity)||0) * (parseFloat(form.unit_cost)||0);

  // When commodity changes, pre-fill unit cost from its default price
  function handleCommodityChange(id) {
    const c = commodities.find(c => c.id === parseInt(id));
    setForm({ ...form, commodity_id: id, unit_cost: c?.unit_price || '' });
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

              {/* Commodity — spans full width, first field */}
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
                <label className="form-label">GRN Number *</label>
                <input className="form-control" value={form.grn_number}
                  onChange={e => setForm({...form, grn_number: e.target.value})} required/>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Supplier Name *</label>
                <input className="form-control" value={form.supplier_name}
                  onChange={e => setForm({...form, supplier_name: e.target.value})} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity ({unit}) *</label>
                <input className="form-control" type="number" min="1" value={form.quantity}
                  onChange={e => setForm({...form, quantity: e.target.value})} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Unit Cost (GHS/{unit}) *</label>
                <input className="form-control" type="number" step="0.01" value={form.unit_cost}
                  onChange={e => setForm({...form, unit_cost: e.target.value})} required/>
              </div>

              {total > 0 && (
                <div style={{ gridColumn:'1/-1', background:'var(--green-light)', padding:'10px 14px', borderRadius:8, color:'var(--green)', fontWeight:700, fontSize:14 }}>
                  Total Cost: {fmt.currency(total)}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Delivery Note No.</label>
                <input className="form-control" value={form.delivery_note}
                  onChange={e => setForm({...form, delivery_note: e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Condition</label>
                <select className="form-control" value={form.condition}
                  onChange={e => setForm({...form, condition: e.target.value})}>
                  {['Good','Damaged','Partial Damage'].map(c => <option key={c}>{c}</option>)}
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
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Saving…' : 'Save Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Receipts() {
  const [receipts, setReceipts]     = useState([]);
  const [totals, setTotals]         = useState({ total_bags: 0, total_cost: 0 });
  const [commodities, setCommodities] = useState([]);
  const [filterCommodity, setFilterCommodity] = useState('');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [editId, setEditId]         = useState(null);
  const [search, setSearch]         = useState('');
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
    if (search)          params.supplier     = search;
    if (dateFrom)        params.from         = dateFrom;
    if (dateTo)          params.to           = dateTo;
    if (filterCommodity) params.commodity_id = filterCommodity;
    api.get('/receipts', { params }).then(r => {
      setReceipts(r.data.receipts);
      setTotals(r.data.totals);
      setLoading(false);
    });
  }, [search, dateFrom, dateTo, filterCommodity]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'edit') {
        await api.put(`/receipts/${editId}`, form);
        toast.success('Receipt updated.');
      } else {
        await api.post('/receipts', form);
        toast.success('Receipt recorded! ✅');
      }
      setModal(null); setForm(EMPTY); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this receipt?')) return;
    await api.delete(`/receipts/${id}`);
    toast.success('Deleted.'); load();
  }

  function openEdit(r) {
    setForm({
      commodity_id: r.commodity_id || '',
      date: r.date, grn_number: r.grn_number,
      supplier_name: r.supplier_name, quantity: r.quantity,
      unit_cost: r.unit_cost, delivery_note: r.delivery_note || '',
      condition: r.condition, remarks: r.remarks || '',
    });
    setEditId(r.id); setModal('edit');
  }

  function openAdd() {
    // Pre-select first commodity
    const first = commodities[0];
    setForm({ ...EMPTY, commodity_id: first?.id || '', unit_cost: first?.unit_price || '' });
    setModal('add');
  }

  const condBadge = { Good:'badge-green', Damaged:'badge-red', 'Partial Damage':'badge-gold' };

  // Unit label for totals — use filter commodity's unit or generic
  const filterComm  = commodities.find(c => c.id === parseInt(filterCommodity));
  const unitLabel   = filterComm?.unit || 'units';

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Stock Receipts</div>
          <div className="page-sub">Record every delivery into the warehouse</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => exportReceiptsToExcel(receipts, totals)}>
            <Download size={14}/> Excel
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportReceiptsPDF(receipts, totals)}>
            <Download size={14}/> PDF
          </button>
          <button className="btn btn-success" onClick={openAdd}>
            <Plus size={16}/> Record Delivery
          </button>
        </div>
      </div>

      {/* Totals */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
        {[
          ['Total Received', fmt.number(totals.total_bags) + ' ' + unitLabel, 'var(--green-light)', 'var(--green)'],
          ['Total Purchase Value', fmt.currency(totals.total_cost), 'var(--primary-pale)', 'var(--primary)'],
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
            {/* Commodity filter */}
            <select className="form-control" style={{ width:190 }}
              value={filterCommodity} onChange={e => { setFilterCommodity(e.target.value); }}>
              <option value="">All Commodities</option>
              {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ position:'relative', flex:1, minWidth:140 }}>
              <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
              <input className="form-control" style={{ paddingLeft:30 }} placeholder="Search supplier…"
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <input className="form-control" type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} style={{ width:140 }}/>
            <input className="form-control" type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)} style={{ width:140 }}/>
            {(search || dateFrom || dateTo || filterCommodity) && (
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setFilterCommodity(''); }}>
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
          ) : receipts.length === 0 ? (
            <div className="empty-state">
              <Package size={36} style={{ opacity:0.25, marginBottom:10 }}/>
              <h3>No receipts found</h3>
              <p>Click "Record Delivery" to add your first entry.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Commodity</th><th>GRN No.</th><th>Supplier</th>
                  <th>Qty</th><th>Unit Cost</th><th>Total Cost</th>
                  <th>Condition</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => {
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
                      <td style={{ fontFamily:'monospace', fontWeight:600, fontSize:12 }}>{r.grn_number}</td>
                      <td style={{ fontWeight:500 }}>{r.supplier_name}</td>
                      <td style={{ fontWeight:700, color:'var(--green)' }}>
                        {fmt.number(r.quantity)} <span style={{ fontSize:11, color:'var(--text-muted)' }}>{r.commodity_unit || comm?.unit || ''}</span>
                      </td>
                      <td>{fmt.currency(r.unit_cost)}</td>
                      <td style={{ fontWeight:700 }}>{fmt.currency(r.total_cost)}</td>
                      <td><span className={`badge ${condBadge[r.condition]||'badge-blue'}`}>{r.condition}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}><Pencil size={13}/></button>
                          <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }} onClick={() => handleDelete(r.id)}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={4}>TOTAL{filterComm ? ` — ${filterComm.name}` : ' — All Commodities'}</td>
                  <td>{fmt.number(receipts.reduce((s,r)=>s+r.quantity,0))} {unitLabel}</td>
                  <td></td>
                  <td>{fmt.currency(receipts.reduce((s,r)=>s+r.total_cost,0))}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal
          title={modal === 'edit' ? 'Edit Receipt' : 'Record New Delivery'}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          form={form} setForm={setForm}
          loading={saving}
          commodities={commodities}
        />
      )}
    </div>
  );
}
