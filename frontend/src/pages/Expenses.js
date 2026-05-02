import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Calendar, User, CreditCard, Hash, ArrowRightLeft } from 'lucide-react';
import api from '../utils/api';
import { fmt, MONTH_NAMES } from '../utils/format';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Warehouse Rent',
  'Transport / Logistics',
  'Labour / Staff',
  'Driver Allowance',
  'Fuel',
  'Utilities',
  'Office Supplies',
  'Marketing',
  'Meals / Lunch',
  'Maintenance',
  'Other',
];

const PAYMENT_METHODS = ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque'];

const CATEGORY_COLORS = {
  'Warehouse Rent':       '#02A793',
  'Transport / Logistics':'#F97316',
  'Labour / Staff':       '#10B981',
  'Driver Allowance':     '#3B82F6',
  'Fuel':                 '#EF4444',
  'Utilities':            '#8B5CF6',
  'Office Supplies':      '#F59E0B',
  'Marketing':            '#EC4899',
  'Meals / Lunch':        '#14B8A6',
  'Maintenance':          '#6B7280',
  'Other':                '#9CA3AF',
};

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  category: 'Warehouse Rent',
  amount: '',
  paid_by: '',
  paid_to: '',
  receipt_no: '',
  payment_method: 'Cash',
  description: '',
};

function InputWithIcon({ icon: Icon, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      <input {...props} style={{ ...props.style, paddingLeft: 34 }} />
    </div>
  );
}

export default function Expenses() {
  const now = new Date();
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [year, setYear]         = useState(now.getFullYear());
  const [expenses, setExpenses] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState(null);

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/dashboard/expenses', { params: { month, year } }).then(r => {
      setExpenses(r.data.expenses);
      setTotal(r.data.total);
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
      setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      load();
    } catch { toast.error('Error saving expense.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense entry?')) return;
    await api.delete(`/dashboard/expenses/${id}`);
    toast.success('Expense deleted.');
    load();
  }

  const methodBadge = { Cash: 'badge-green', 'Mobile Money': 'badge-blue', 'Bank Transfer': 'badge-purple', Cheque: 'badge-gold' };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">💸 Expenses</div>
          <div className="page-sub">Track and manage all operating costs</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="form-control" style={{ width: 140 }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="form-control" style={{ width: 100 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Total banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
        borderRadius: 'var(--radius)',
        padding: '22px 28px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Total Expenses — {MONTH_NAMES[month - 1]} {year}
          </div>
          <div style={{ color: '#fff', fontSize: 38, fontWeight: 800, marginTop: 6, letterSpacing: '-1px' }}>
            {fmt.currency(total)}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
            {expenses.length} entr{expenses.length !== 1 ? 'ies' : 'y'} recorded
          </div>
        </div>
        <div style={{ fontSize: 56, opacity: 0.2 }}>💸</div>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">New Expense Entry</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <div className="card-body">
            <form onSubmit={handleAdd}>

              {/* Row 1 — Date, Category, Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <InputWithIcon icon={Calendar} className="form-control" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (GHS) *</label>
                  <input className="form-control" type="number" step="0.01" min="0" placeholder="e.g. 500" value={form.amount} onChange={e => set('amount', e.target.value)} required />
                </div>
              </div>

              {/* Row 2 — Paid By, Paid To */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Paid By (Personnel) *</label>
                  <InputWithIcon icon={User} className="form-control" placeholder="" value={form.paid_by} onChange={e => set('paid_by', e.target.value)} />
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>The person who paid or disbursed this amount</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Paid To (Recipient)</label>
                  <InputWithIcon icon={User} className="form-control" placeholder="" value={form.paid_to} onChange={e => set('paid_to', e.target.value)} />
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>The person or company who received the money</span>
                </div>
              </div>

              {/* Row 3 — Payment Method, Receipt No */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <div style={{ position: 'relative' }}>
                    <CreditCard size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <select className="form-control" style={{ paddingLeft: 34 }} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                      {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Receipt / Voucher No.</label>
                  <InputWithIcon icon={Hash} className="form-control" placeholder="" value={form.receipt_no} onChange={e => set('receipt_no', e.target.value)} />
                </div>
              </div>

              {/* Row 4 — Description */}
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label">Description / Notes</label>
                <textarea className="form-control" rows={2} placeholder="" value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} />
              </div>

              {/* Live preview */}
              {form.amount && parseFloat(form.amount) > 0 && (
                <div style={{ background: 'var(--primary-pale)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                  <span style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>Preview: </span>
                  <span style={{ color: 'var(--text)' }}>
                    {fmt.currency(parseFloat(form.amount) || 0)} for <strong>{form.category}</strong>
                    {form.paid_by ? ` — paid by ${form.paid_by}` : ''}
                    {form.paid_to ? ` to ${form.paid_to}` : ''}
                    {form.receipt_no ? ` (${form.receipt_no})` : ''}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : '✅ Save Expense'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>

        {/* Category Summary */}
        <div className="card">
          <div className="card-header"><span className="card-title">By Category</span></div>
          <div className="card-body">
            {byCategory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                No expenses for {MONTH_NAMES[month - 1]} {year}
              </div>
            ) : (
              byCategory.map(({ category, total: catTotal }) => {
                const pct   = total > 0 ? (catTotal / total) * 100 : 0;
                const color = CATEGORY_COLORS[category] || 'var(--text-muted)';
                return (
                  <div key={category} style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{category}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{fmt.currency(catTotal)}</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{fmt.percent(pct)} of total</div>
                  </div>
                );
              })
            )}
            {total > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--primary)' }}>
                <span>TOTAL</span><span>{fmt.currency(total)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expenses Table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">All Entries — {MONTH_NAMES[month - 1]} {year}</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{expenses.length} item{expenses.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="table-wrap">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ width: 32, height: 32, border: '3px solid var(--primary-pale)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
              </div>
            ) : expenses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💸</div>
                <h3>No expenses yet</h3>
                <p>Click "Add Expense" to record your first entry for {MONTH_NAMES[month - 1]}.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Paid By</th>
                    <th>Paid To</th>
                    <th>Method</th>
                    <th>Receipt No.</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(ex => (
                    <React.Fragment key={ex.id}>
                      <tr
                        onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmt.date(ex.date)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[ex.category] || 'var(--text-muted)', display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{ex.category}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {ex.paid_by ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                                {ex.paid_by[0]?.toUpperCase()}
                              </div>
                              <span>{ex.paid_by}</span>
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ fontSize: 13, color: ex.paid_to ? 'var(--text)' : 'var(--text-muted)' }}>
                          {ex.paid_to || '—'}
                        </td>
                        <td>
                          <span className={`badge ${methodBadge[ex.payment_method] || 'badge-teal'}`} style={{ fontSize: 11 }}>
                            {ex.payment_method || 'Cash'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: ex.receipt_no ? 'var(--text)' : 'var(--text-muted)' }}>
                          {ex.receipt_no || '—'}
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--red)', fontSize: 14 }}>
                          {fmt.currency(ex.amount)}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={e => { e.stopPropagation(); handleDelete(ex.id); }}
                            style={{ color: 'var(--red)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded row — shows description */}
                      {expanded === ex.id && (
                        <tr style={{ background: 'var(--primary-pale)' }}>
                          <td colSpan={8} style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
                              {ex.description && (
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Notes: </span>
                                  <span>{ex.description}</span>
                                </div>
                              )}
                              {ex.paid_by && (
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Paid By: </span>
                                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{ex.paid_by}</span>
                                </div>
                              )}
                              {ex.paid_to && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <ArrowRightLeft size={12} color="var(--text-muted)" />
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>To: </span>
                                  <span style={{ fontWeight: 600 }}>{ex.paid_to}</span>
                                </div>
                              )}
                              {!ex.description && !ex.paid_by && !ex.paid_to && (
                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No additional details recorded.</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="tfoot-row">
                    <td colSpan={6} style={{ fontWeight: 700 }}>TOTAL — {MONTH_NAMES[month - 1]} {year}</td>
                    <td style={{ fontWeight: 800 }}>{fmt.currency(total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
