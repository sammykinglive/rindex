import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import api from '../utils/api';
import { fmt, MONTH_NAMES } from '../utils/format';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Warehouse Rent',
  'Transport / Logistics',
  'Labour / Staff',
  'Utilities',
  'Marketing',
  'Other'
];

const EMPTY = { category: 'Warehouse Rent', amount: '', description: '' };

export default function Expenses() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/dashboard/expenses', { params: { month, year } })
      .then(r => {
        setExpenses(r.data.expenses);
        setTotal(r.data.total);
        setLoading(false);
      });
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0)
      return toast.error('Please enter a valid amount.');
    setSaving(true);
    try {
      await api.post('/dashboard/expenses', {
        ...form,
        amount: parseFloat(form.amount),
        month,
        year,
      });
      toast.success('Expense added! ✅');
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch { toast.error('Error adding expense.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return;
    await api.delete(`/dashboard/expenses/${id}`);
    toast.success('Expense deleted.');
    load();
  }

  // Group expenses by category for summary
  const byCategory = expenses.reduce((acc, ex) => {
    acc[ex.category] = (acc[ex.category] || 0) + ex.amount;
    return acc;
  }, {});

  const categoryColors = {
    'Warehouse Rent':      'var(--primary)',
    'Transport / Logistics': 'var(--orange)',
    'Labour / Staff':      'var(--green)',
    'Utilities':           'var(--purple)',
    'Marketing':           'var(--gold)',
    'Other':               'var(--text-muted)',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">💸 Expenses</div>
          <div className="page-sub">Track your operating costs month by month</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: 140 }}
            value={month}
            onChange={e => setMonth(parseInt(e.target.value))}
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="form-control"
            style={{ width: 100 }}
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
          >
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Total banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
        borderRadius: 'var(--radius)',
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Expenses — {MONTH_NAMES[month - 1]} {year}
          </div>
          <div style={{ color: '#fff', fontSize: 36, fontWeight: 800, marginTop: 4 }}>
            {fmt.currency(total)}
          </div>
        </div>
        <div style={{ fontSize: 48, opacity: 0.3 }}>💸</div>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">New Expense — {MONTH_NAMES[month - 1]} {year}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="card-body">
            <form onSubmit={handleAdd}>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (GHS) *</label>
                  <input
                    className="form-control"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2000"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Description (optional)</label>
                  <input
                    className="form-control"
                    placeholder="e.g. April warehouse rent payment"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Expense'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20 }}>

        {/* Category Summary */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">By Category</span>
          </div>
          <div className="card-body">
            {Object.keys(byCategory).length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  No expenses for {MONTH_NAMES[month - 1]} {year}
                </p>
              </div>
            ) : (
              Object.entries(byCategory).map(([cat, amount]) => {
                const pct = total > 0 ? (amount / total) * 100 : 0;
                const color = categoryColors[cat] || 'var(--text-muted)';
                return (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{cat}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>
                        {fmt.currency(amount)}
                      </span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div
                        className="progress-bar"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {fmt.percent(pct)} of total
                    </div>
                  </div>
                );
              })
            )}
            {total > 0 && (
              <div style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '2px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: 14,
                color: 'var(--primary)',
              }}>
                <span>TOTAL</span>
                <span>{fmt.currency(total)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expenses Table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              All Entries — {MONTH_NAMES[month - 1]} {year}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {expenses.length} item{expenses.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="table-wrap">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <span className="spin" style={{ fontSize: 28 }}>⟳</span>
              </div>
            ) : expenses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💸</div>
                <h3>No expenses yet</h3>
                <p>Click "Add Expense" to record your first entry.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount (GHS)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(ex => (
                    <tr key={ex.id}>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          width: 10, height: 10,
                          borderRadius: '50%',
                          background: categoryColors[ex.category] || 'var(--text-muted)',
                          marginRight: 8,
                        }} />
                        <span style={{ fontWeight: 600 }}>{ex.category}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {ex.description || '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--red)' }}>
                        {fmt.currency(ex.amount)}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(ex.id)}
                          style={{ color: 'var(--red)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="tfoot-row">
                    <td colSpan={2} style={{ fontWeight: 700 }}>TOTAL</td>
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
