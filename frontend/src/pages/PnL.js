import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { fmt, MONTH_NAMES } from '../utils/format';
import toast from 'react-hot-toast';

const EXPENSE_CATEGORIES = ['Warehouse Rent', 'Transport / Logistics', 'Labour / Staff', 'Utilities', 'Marketing', 'Other'];

function PnLRow({ label, value, bold, color, bg, borderTop, indent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: indent ? '10px 20px 10px 36px' : '12px 20px',
      borderTop: borderTop ? '2px solid var(--border)' : '1px solid var(--border)',
      background: bg || 'transparent',
    }}>
      <span style={{ fontWeight: bold ? 700 : 400, fontSize: bold ? 14 : 13.5, color: 'var(--text)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, fontSize: bold ? 15 : 14, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}

function SectionHeader({ children, color }) {
  return (
    <div style={{ padding: '10px 20px', background: color || 'var(--primary)', }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{children}</span>
    </div>
  );
}

export default function PnL() {
  const [dash, setDash]         = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [totalOpEx, setTotalOpEx] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [addingExp, setAddingExp] = useState(false);
  const [expForm, setExpForm]   = useState({ category: 'Warehouse Rent', amount: '', description: '' });

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/dashboard'),
      api.get('/dashboard/expenses', { params: { month, year } }),
    ]).then(([d, e]) => {
      setDash(d.data);
      setExpenses(e.data.expenses);
      setTotalOpEx(e.data.total);
      setLoading(false);
    });
  }

  useEffect(() => { load(); }, [month, year]); // eslint-disable-line

  async function addExpense(e) {
    e.preventDefault();
    try {
      await api.post('/dashboard/expenses', { ...expForm, month, year, amount: parseFloat(expForm.amount) });
      toast.success('Expense added.');
      setExpForm({ category: 'Warehouse Rent', amount: '', description: '' });
      setAddingExp(false);
      load();
    } catch { toast.error('Error adding expense.'); }
  }

  async function deleteExpense(id) {
    if (!window.confirm('Delete this expense?')) return;
    await api.delete(`/dashboard/expenses/${id}`);
    toast.success('Expense deleted.');
    load();
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <span className="spin" style={{ fontSize: 32 }}>⟳</span>
    </div>
  );

  const { kpis } = dash;
  const grossProfit = kpis.total_revenue - kpis.total_cogs;
  const netProfit   = grossProfit - totalOpEx;
  const grossMargin = kpis.total_revenue > 0 ? (grossProfit / kpis.total_revenue) * 100 : 0;
  const netMargin   = kpis.total_revenue > 0 ? (netProfit   / kpis.total_revenue) * 100 : 0;
  const roi         = kpis.total_cogs   > 0 ? (netProfit   / kpis.total_cogs)    * 100 : 0;

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">💰 P&L Summary</div>
          <div className="page-sub">Profit & Loss — Revenue, Costs, and Net Profit</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="form-control" style={{ width: 140 }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="form-control" style={{ width: 100 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* P&L Statement */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><span className="card-title">Profit & Loss Statement — All Time</span></div>

            <SectionHeader color="var(--green)">Revenue</SectionHeader>
            <PnLRow label="Total Bags Sold" value={fmt.number(kpis.total_out) + ' bags'} />
            <PnLRow label="Average Selling Price" value={kpis.total_out > 0 ? fmt.currency(kpis.total_revenue / kpis.total_out) + '/bag' : '—'} indent />
            <PnLRow label="Gross Revenue" value={fmt.currency(kpis.total_revenue)} bold color="var(--green)" bg="var(--green-light)" />

            <SectionHeader color="var(--red)">Cost of Goods Sold (COGS)</SectionHeader>
            <PnLRow label="Total Bags Purchased" value={fmt.number(kpis.total_in) + ' bags'} />
            <PnLRow label="Average Purchase Cost" value={kpis.total_in > 0 ? fmt.currency(kpis.total_cogs / kpis.total_in) + '/bag' : '—'} indent />
            <PnLRow label="Total COGS" value={fmt.currency(kpis.total_cogs)} bold color="var(--red)" bg="var(--red-light)" />

            <SectionHeader color="var(--primary-light)">Gross Profit</SectionHeader>
            <PnLRow label="Gross Profit" value={fmt.currency(grossProfit)} bold color={grossProfit >= 0 ? 'var(--green)' : 'var(--red)'} bg="var(--primary-pale)" borderTop />
            <PnLRow label="Gross Margin %" value={fmt.percent(grossMargin)} color={grossMargin >= 0 ? 'var(--green)' : 'var(--red)'} indent />

            <SectionHeader color="#6C3483">Operating Expenses ({MONTH_NAMES[month-1]} {year})</SectionHeader>
            {expenses.length === 0 && <div style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 13 }}>No expenses recorded for this month.</div>}
            {expenses.map(ex => (
              <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: 13.5 }}>{ex.category}</span>
                  {ex.description && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>— {ex.description}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--red)' }}>{fmt.currency(ex.amount)}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteExpense(ex.id)} style={{ color: 'var(--red)', padding: '3px 6px' }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
            <PnLRow label={`Total Operating Expenses (${MONTH_NAMES[month-1]})`} value={fmt.currency(totalOpEx)} bold color="var(--red)" bg="var(--red-light)" borderTop />

            <SectionHeader color="var(--sidebar-bg)">Net Profit</SectionHeader>
            <PnLRow label="Net Profit / (Loss)" value={fmt.currency(netProfit)} bold color={netProfit >= 0 ? 'var(--green)' : 'var(--red)'} bg={netProfit >= 0 ? 'var(--green-light)' : 'var(--red-light)'} borderTop />
            <PnLRow label="Net Margin %" value={fmt.percent(netMargin)} color={netMargin >= 0 ? 'var(--green)' : 'var(--red)'} indent />
            <PnLRow label="Return on Investment (ROI)" value={fmt.percent(roi)} color={roi >= 0 ? 'var(--green)' : 'var(--red)'} indent />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* KPI chips */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Revenue', fmt.currency(kpis.total_revenue), 'var(--green)', 'var(--green-light)'],
              ['COGS', fmt.currency(kpis.total_cogs), 'var(--red)', 'var(--red-light)'],
              ['Gross Profit', fmt.currency(grossProfit), grossProfit >= 0 ? 'var(--green)' : 'var(--red)', 'var(--primary-pale)'],
              ['Net Profit', fmt.currency(netProfit), netProfit >= 0 ? 'var(--green)' : 'var(--red)', netProfit >= 0 ? 'var(--green-light)' : 'var(--red-light)'],
              ['Gross Margin', fmt.percent(grossMargin), 'var(--purple)', 'var(--purple-light)'],
              ['ROI', fmt.percent(roi), 'var(--orange)', '#FEF0DC'],
            ].map(([label, value, color, bg]) => (
              <div key={label} style={{ background: bg, padding: '14px 16px', borderRadius: 'var(--radius)', border: `1px solid ${color}22` }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Add expense */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Add Expense — {MONTH_NAMES[month-1]} {year}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setAddingExp(!addingExp)}>
                <Plus size={14} /> Add Expense
              </button>
            </div>
            {addingExp && (
              <div className="card-body">
                <form onSubmit={addExpense} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="form-control" value={expForm.category} onChange={e => setExpForm({...expForm, category: e.target.value})}>
                        {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount (GHS)</label>
                      <input className="form-control" type="number" step="0.01" placeholder="e.g. 2000" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} required />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label className="form-label">Description (optional)</label>
                      <input className="form-control" placeholder="e.g. March warehouse rent" value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary btn-sm">Save Expense</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddingExp(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
            <div className="card-body" style={{ paddingTop: addingExp ? 0 : undefined }}>
              <div style={{ padding: '12px 16px', background: 'var(--gold-light)', borderRadius: 8, fontSize: 13, color: '#856000' }}>
                <strong>💡 Note:</strong> Expenses are tracked per month. Use the month/year selector at the top right to view or add expenses for any period. Revenue and COGS always show all-time totals.
              </div>
            </div>
          </div>

          {/* Stock position */}
          <div className="card">
            <div className="card-header"><span className="card-title">Current Stock Position</span></div>
            <div className="card-body">
              {[
                ['Bags in Warehouse', fmt.number(kpis.balance) + ' bags', 'var(--green)'],
                ['Value at Selling Price', fmt.currency(kpis.stock_value), 'var(--primary)'],
                ['Value at Cost Price', fmt.currency(kpis.balance * (kpis.total_in > 0 ? kpis.total_cogs / kpis.total_in : 0)), 'var(--text-muted)'],
                ['Unrealised Profit (if sold)', fmt.currency(kpis.balance * (kpis.total_in > 0 ? (kpis.total_revenue / Math.max(kpis.total_out,1)) - (kpis.total_cogs / kpis.total_in) : 0)), 'var(--green)'],
                ['Pending Payments', fmt.currency(kpis.pending_payments), 'var(--red)'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
