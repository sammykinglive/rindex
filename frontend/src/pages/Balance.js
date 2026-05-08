import React, { useEffect, useState } from 'react';
import { Scale, TrendingUp, TrendingDown, AlertTriangle, Download } from 'lucide-react';
import api from '../utils/api';
import { fmt } from '../utils/format';
import { exportBalanceToExcel } from '../utils/exportExcel';
import { exportBalancePDF } from '../utils/exportPDF';

export default function Balance() {
  const [data, setData]         = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [issues, setIssues]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/receipts'),
      api.get('/issues'),
    ]).then(([dash, rec, iss]) => {
      setData(dash.data);
      setReceipts(rec.data.receipts);
      setIssues(iss.data.issues);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--primary-pale)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  const { kpis, settings } = data;

  const ledger = [
    ...receipts.map(r => ({ ...r, type: 'Receipt', party: r.supplier_name, ref: r.grn_number, direction: +r.quantity })),
    ...issues.map(i => ({ ...i, type: 'Issue', party: i.customer_name, ref: i.invoice_number, direction: -i.quantity })),
  ].sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.id - b.id);

  let running = 0;
  const ledgerWithBalance = ledger.map(row => { running += row.direction; return { ...row, running_balance: running }; });
  const displayLedger = [...ledgerWithBalance].reverse();

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚖️ Stock Balance</div>
          <div className="page-sub">Live warehouse ledger — all movements with running balance</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => exportBalanceToExcel(displayLedger)}>
            <Download size={14} /> Excel
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportBalancePDF(displayLedger, kpis)}>
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { label: 'Total Received', value: fmt.number(kpis.total_in) + ' bags', icon: TrendingUp,    color: 'var(--primary)' },
          { label: 'Total Issued',   value: fmt.number(kpis.total_out) + ' bags', icon: TrendingDown,  color: 'var(--red)' },
          { label: 'Balance',        value: fmt.number(kpis.balance) + ' bags',   icon: Scale,         color: 'var(--green)' },
          { label: 'Stock Value',    value: fmt.currency(kpis.stock_value),        icon: TrendingUp,    color: 'var(--gold)' },
          { label: 'Capacity Used',  value: fmt.percent(kpis.capacity_used),       icon: AlertTriangle, color: 'var(--orange)' },
          { label: 'Reorder Status', value: kpis.reorder_alert ? '⚠ REORDER' : '✔ OK', icon: AlertTriangle, color: kpis.reorder_alert ? 'var(--red)' : 'var(--green)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div className="kpi-card" key={label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div className="kpi-icon-wrap" style={{ background: color + '20' }}>
                <Icon size={18} color={color} strokeWidth={2} />
              </div>
              <span className="kpi-label">{label}</span>
            </div>
            <div className="kpi-value" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Capacity bar */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Warehouse Capacity</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {fmt.number(kpis.balance)} / {fmt.number(settings.warehouse_capacity)} bags ({fmt.percent(kpis.capacity_used)})
            </span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{
              width: `${Math.min(kpis.capacity_used, 100)}%`,
              background: kpis.capacity_used > 90 ? 'var(--red)' : kpis.capacity_used > 70 ? 'var(--gold)' : 'var(--primary)'
            }} />
          </div>
        </div>
      </div>

      {kpis.reorder_alert && (
        <div className="alert alert-danger"><AlertTriangle size={16} /> Stock is below reorder level — order more bags immediately.</div>
      )}

      {/* Ledger table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Full Transaction Ledger</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{ledger.length} transaction{ledger.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="table-wrap">
          {displayLedger.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">⚖️</div><h3>No transactions yet</h3><p>Start by recording a delivery in Stock Receipts.</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>#</th><th>Date</th><th>Type</th><th>Reference</th><th>Party</th><th>Bags In</th><th>Bags Out</th><th>Balance</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                {displayLedger.map((row, idx) => (
                  <tr key={`${row.type}-${row.id}`}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ledger.length - idx}</td>
                    <td>{fmt.date(row.date)}</td>
                    <td><span className={`badge ${row.type === 'Receipt' ? 'badge-teal' : 'badge-red'}`}>{row.type}</span></td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.ref}</td>
                    <td style={{ fontWeight: 500 }}>{row.party}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>{row.type === 'Receipt' ? fmt.number(row.quantity) : '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--red)' }}>{row.type === 'Issue' ? fmt.number(row.quantity) : '—'}</td>
                    <td>
                      <span style={{ fontWeight: 800, color: row.running_balance <= parseInt(settings.reorder_level) ? 'var(--red)' : 'var(--primary)' }}>
                        {fmt.number(row.running_balance)} bags
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={5}>TOTALS</td>
                  <td>{fmt.number(kpis.total_in)} bags</td>
                  <td>{fmt.number(kpis.total_out)} bags</td>
                  <td>{fmt.number(kpis.balance)} bags</td>
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
