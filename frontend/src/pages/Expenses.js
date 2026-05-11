import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Calendar, User, CreditCard, Hash, Download } from 'lucide-react';
import api from '../utils/api';
import { fmt, MONTH_NAMES } from '../utils/format';
import toast from 'react-hot-toast';
import { exportExpensesToExcel } from '../utils/exportExcel';
import { exportExpensesPDF } from '../utils/exportPDF';

const CATEGORIES = [
  'Warehouse Rent','Transport / Logistics','Labour / Staff',
  'Driver Allowance','Fuel','Utilities','Office Supplies',
  'Marketing','Meals / Lunch','Maintenance','Other',
];

const PAYMENT_METHODS = ['Cash','Mobile Money','Bank Transfer','Cheque'];

const CAT_COLORS = {
  'Warehouse Rent':'#02A793','Transport / Logistics':'#F97316',
  'Labour / Staff':'#10B981','Driver Allowance':'#3B82F6',
  'Fuel':'#EF4444','Utilities':'#8B5CF6','Office Supplies':'#F59E0B',
  'Marketing':'#EC4899','Meals / Lunch':'#14B8A6',
  'Maintenance':'#6B7280','Other':'#9CA3AF',
};

const EMPTY = {
  date: new Date().toISOString().slice(0,10),
  category: 'Warehouse Rent', amount: '',
  paid_by: '', paid_to: '',
  receipt_no: '', payment_method: 'Cash', description: '',
};

function IconInput({ icon: Icon, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
      <input {...props} style={{ ...props.style, paddingLeft: 32 }} />
    </div>
  );
}

export default function Expenses() {
  const now = new Date();
  const [month, setMonth]           = useState(now.getMonth() + 1);
  const [year, setYear]             = useState(now.getFullYear());
  const [expenses, setExpenses]     = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [expanded, setExpanded]     = useState(null);

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/dashboard/expenses', { params: { month, year } }).then(r => {
      setExpenses(r.data.expenses || []);
      setTotal(r.data.total || 0);
      setByCategory(r.data.byCategory || []);
      setLoading(false);
    });
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Please enter a valid amount.');
    setSaving(true);
    try {
      await api.post('/dashboard/expenses', { ...form, amount: parseFloat(form.amount), month, year });
      toast.success('Expense recorded! ✅');
      setForm({ ...EMPTY, date: new Date().toISOString().slice(0,10) });
      setShowForm(false);
      load();
    } catch { toast.error('Error saving expense.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense entry?')) return;
    await api.delete(`/dashboard/expenses/${id}`);
    toast.success('Deleted.'); load();
  }

  const methodBadge = { Cash:'badge-green','Mobile Money':'badge-blue','Bank Transfer':'badge-purple', Cheque:'badge-gold' };
  const monthLabel  = `${MONTH_NAMES[month-1]} ${year}`;

  return (
    <div>

      {/* ── Title ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div className="page-title">💸 Expenses</div>
        <div className="page-sub">Track and manage all operating costs</div>
      </div>

      {/* ── Controls — fully stacked on mobile ───────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>

        {/* Month + Year row */}
        <div style={{ display:'flex', gap:8 }}>
          <select className="form-control" style={{ flex:1 }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTH_NAMES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="form-control" style={{ width:100 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {/* Action buttons row */}
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => exportExpensesToExcel(expenses, total, monthLabel)}>
            <Download size={14} /> Excel
          </button>
          <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => exportExpensesPDF(expenses, total, monthLabel)}>
            <Download size={14} /> PDF
          </button>
          <button className="btn btn-primary" style={{ flex:2 }} onClick={() => setShowForm(!showForm)}>
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </div>

      {/* ── Total Banner ──────────────────────────────────────────── */}
      <div style={{
        background:'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
        borderRadius:'var(--radius)', padding:'18px 20px', marginBottom:18,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div>
          <div style={{ color:'rgba(255,255,255,0.75)', fontSize:11.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px' }}>
            Total Expenses — {monthLabel}
          </div>
          <div style={{ color:'#fff', fontSize:28, fontWeight:800, marginTop:4, letterSpacing:'-0.5px' }}>
            {fmt.currency(total)}
          </div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, marginTop:3 }}>
            {expenses.length} entr{expenses.length !== 1 ? 'ies' : 'y'}
          </div>
        </div>
        <div style={{ fontSize:44, opacity:0.2 }}>💸</div>
      </div>

      {/* ── Add Expense Form ──────────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom:18 }}>
          <div className="card-header">
            <span className="card-title">New Expense Entry</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={16}/></button>
          </div>
          <div className="card-body">
            <form onSubmit={handleAdd}>

              {/* Date */}
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Date *</label>
                <IconInput icon={Calendar} className="form-control" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
              </div>

              {/* Category */}
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Category *</label>
                <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Amount */}
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Amount (GHS) *</label>
                <input className="form-control" type="number" step="0.01" min="0" placeholder="e.g. 500" value={form.amount} onChange={e => set('amount', e.target.value)} required />
              </div>

              {/* Paid By */}
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Paid By (Personnel) *</label>
                <IconInput icon={User} className="form-control" placeholder="e.g. Samuel — who gave the money" value={form.paid_by} onChange={e => set('paid_by', e.target.value)} />
                <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>The person who paid or disbursed this amount</span>
              </div>

              {/* Paid To */}
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Paid To (Recipient)</label>
                <IconInput icon={User} className="form-control" placeholder="e.g. Driver Kofi" value={form.paid_to} onChange={e => set('paid_to', e.target.value)} />
              </div>

              {/* Payment Method */}
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Payment Method</label>
                <div style={{ position:'relative' }}>
                  <CreditCard size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
                  <select className="form-control" style={{ paddingLeft:32 }} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Receipt No */}
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Receipt / Voucher No.</label>
                <IconInput icon={Hash} className="form-control" placeholder="e.g. RCP-001 (optional)" value={form.receipt_no} onChange={e => set('receipt_no', e.target.value)} />
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Description / Notes</label>
                <textarea className="form-control" rows={2} placeholder="e.g. Lunch money for 3 drivers — market delivery trip" value={form.description} onChange={e => set('description', e.target.value)} style={{ resize:'vertical' }} />
              </div>

              {/* Preview */}
              {form.amount && parseFloat(form.amount) > 0 && (
                <div style={{ background:'var(--primary-pale)', border:'1px solid var(--primary)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13 }}>
                  <span style={{ color:'var(--primary-dark)', fontWeight:600 }}>Preview: </span>
                  <span>{fmt.currency(parseFloat(form.amount))} for <strong>{form.category}</strong>
                    {form.paid_by ? ` — paid by ${form.paid_by}` : ''}
                    {form.paid_to ? ` to ${form.paid_to}` : ''}
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex:1, justifyContent:'center' }}>
                  {saving ? 'Saving…' : '✅ Save Expense'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ flex:1, justifyContent:'center' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Category Summary ──────────────────────────────────────── */}
      {byCategory.length > 0 && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-header"><span className="card-title">By Category</span></div>
          <div className="card-body">
            {byCategory.map(({ category, total: catTotal }) => {
              const pct   = total > 0 ? (catTotal / total) * 100 : 0;
              const color = CAT_COLORS[category] || 'var(--text-muted)';
              return (
                <div key={category} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:10, height:10, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }} />
                      <span style={{ fontSize:13, fontWeight:600 }}>{category}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color }}>{fmt.currency(catTotal)}</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" style={{ width:`${pct}%`, background:color }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{fmt.percent(pct)} of total</div>
                </div>
              );
            })}
            <div style={{ paddingTop:12, borderTop:'2px solid var(--border)', display:'flex', justifyContent:'space-between', fontWeight:800, color:'var(--primary)' }}>
              <span>TOTAL</span><span>{fmt.currency(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Expenses Table ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Entries — {monthLabel}</span>
          <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{expenses.length} item{expenses.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign:'center', padding:48 }}>
              <div style={{ width:32, height:32, border:'3px solid var(--primary-pale)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }} />
            </div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💸</div>
              <h3>No expenses yet</h3>
              <p>Click "Add Expense" to record your first entry for {monthLabel}.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Category</th><th>Paid By</th>
                  <th>Paid To</th><th>Method</th><th>Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(ex => (
                  <React.Fragment key={ex.id}>
                    <tr onClick={() => setExpanded(expanded === ex.id ? null : ex.id)} style={{ cursor:'pointer' }}>
                      <td style={{ fontSize:12.5, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmt.date(ex.date)}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:CAT_COLORS[ex.category]||'var(--text-muted)', display:'inline-block', flexShrink:0 }} />
                          <span style={{ fontWeight:600, fontSize:12.5 }}>{ex.category}</span>
                        </div>
                      </td>
                      <td>
                        {ex.paid_by ? (
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--primary-pale)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--primary)', flexShrink:0 }}>
                              {ex.paid_by[0]?.toUpperCase()}
                            </div>
                            <span style={{ fontSize:12.5 }}>{ex.paid_by}</span>
                          </div>
                        ) : <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>}
                      </td>
                      <td style={{ fontSize:12.5, color:ex.paid_to?'var(--text)':'var(--text-muted)' }}>{ex.paid_to||'—'}</td>
                      <td>
                        <span className={`badge ${methodBadge[ex.payment_method]||'badge-teal'}`} style={{ fontSize:10.5 }}>
                          {ex.payment_method||'Cash'}
                        </span>
                      </td>
                      <td style={{ fontWeight:800, color:'var(--red)', whiteSpace:'nowrap' }}>{fmt.currency(ex.amount)}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); handleDelete(ex.id); }} style={{ color:'var(--red)', padding:'4px 8px' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {expanded === ex.id && (
                      <tr style={{ background:'var(--primary-pale)' }}>
                        <td colSpan={7} style={{ padding:'10px 16px', fontSize:13 }}>
                          {ex.description && <span><strong>Notes:</strong> {ex.description}</span>}
                          {ex.receipt_no  && <span style={{ marginLeft:16 }}><strong>Receipt:</strong> {ex.receipt_no}</span>}
                          {!ex.description && !ex.receipt_no && <span style={{ color:'var(--text-muted)', fontStyle:'italic' }}>No additional details.</span>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={5} style={{ fontWeight:700 }}>TOTAL — {monthLabel}</td>
                  <td style={{ fontWeight:800 }}>{fmt.currency(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
