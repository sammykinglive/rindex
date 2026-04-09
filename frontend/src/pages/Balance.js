import React, { useEffect, useState } from 'react';
import { Scale, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { fmt } from '../utils/format';

export default function Balance() {
  const [data, setData]       = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [issues, setIssues]   = useState([]);
  const [loading, setLoading] = useState(true);

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
      <span className="spin" style={{ fontSize: 32 }}>⟳</span>
    </div>
  );

  const { kpis, settings } = data;

  // Build unified ledger sorted by date then id
  const ledger = [
    ...receipts.map(r => ({ ...r, type: 'Receipt', party: r.supplier_name, ref: r.grn_number, direction: +r.quantity })),
    ...issues.map(i => ({ ...i, type: 'Issue', party: i.customer_name, ref: i.invoice_number, direction: -i.quantity })),
  ].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.id - b.id;
  });

  // Compute running balance
  let running = 0;
  const ledgerWithBalance = ledger.map(row => {
    running += row.direction;
    return { ...row, running_balance: running };
  });
  // Show most recent first for display
  const displayLedger = [...ledgerWithBalance].reverse();

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚖️ Stock Balance</div>
          <div className="page-sub">Live warehouse ledger — all movements with running balance</div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Received</div>
          <div className="kpi-value blue">{fmt.number(kpis.total_in)}</div>
          <div className="kpi-sub">bags all time</div>
          <div className="kpi-icon"><TrendingUp size={48} strokeWidth={1} /></div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Total Issued</div>
          <div className="kpi-value red">{fmt.number(kpis.total_out)}</div>
          <div className="kpi-sub">bags all time</div>
          <div className="kpi-icon"><TrendingDown size={48} strokeWidth={1} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Current Balance</div>
          <div className="kpi-value green">{fmt.number(kpis.balance)}</div>
          <div className="kpi-sub">bags in warehouse</div>
          <div className="kpi-icon"><Scale size={48} strokeWidth={1} /></div>
        </div>
        <div className="kpi-card gold">
          <div className="kpi-label">Stock Value</div>
          <div className="kpi-value gold" style={{ fontSize: 20 }}>{fmt.currency(kpis.stock_value)}</div>
          <div className="kpi-sub">@ {fmt.currency(settings.unit_price)}/bag</div>
        </div>
        <div className={`kpi-card ${kpis.reorder_alert ? 'red' : 'green'}`}>
          <div className="kpi-label">Reorder Status</div>
          <div className={`kpi-value ${kpis.reorder_alert ? 'red' : 'green'}`} style={{ fontSize: 16, marginTop: 6 }}>
            {kpis.reorder_alert ? '⚠ REORDER NOW' : '✔ OK'}
          </div>
          <div className="kpi-sub">Min level: {fmt.number(settings.reorder_level)} bags</div>
          <div className="kpi-icon">{kpis.reorder_alert ? <AlertTriangle size={48} strokeWidth={1} /> : <CheckCircle size={48} strokeWidth={1} />}</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-label">Capacity Used</div>
          <div className="kpi-value orange">{fmt.percent(kpis.capacity_used)}</div>
          <div className="kpi-sub">of {fmt.number(settings.warehouse_capacity)} bags</div>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Warehouse Capacity</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {fmt.number(kpis.balance)} of {fmt.number(settings.warehouse_capacity)} bags ({fmt.percent(kpis.capacity_used)})
            </span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{
              width: `${Math.min(kpis.capacity_used, 100)}%`,
              background: kpis.capacity_used > 90 ? 'var(--red)' : kpis.capacity_used > 70 ? 'var(--gold)' : 'var(--green)'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
            <span>Empty</span>
            <span>Full ({fmt.number(settings.warehouse_capacity)} bags)</span>
          </div>
        </div>
      </div>

      {/* Full Transaction Ledger */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Full Transaction Ledger</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {ledger.length} transaction{ledger.length !== 1 ? 's' : ''} · Most recent first
          </span>
        </div>
        <div className="table-wrap">
          {displayLedger.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚖️</div>
              <h3>No transactions yet</h3>
              <p>Start by recording a delivery in Stock Receipts.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Party</th>
                  <th style={{ color: '#90EE90' }}>Bags In</th>
                  <th style={{ color: '#FFB3B3' }}>Bags Out</th>
                  <th>Running Balance</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {displayLedger.map((row, idx) => (
                  <tr key={`${row.type}-${row.id}`}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ledger.length - idx}</td>
                    <td>{fmt.date(row.date)}</td>
                    <td>
                      <span className={`badge ${row.type === 'Receipt' ? 'badge-green' : 'badge-red'}`}>
                        {row.type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{row.ref}</td>
                    <td style={{ fontWeight: 500 }}>{row.party}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>
                      {row.type === 'Receipt' ? fmt.number(row.quantity) : '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--red)' }}>
                      {row.type === 'Issue' ? fmt.number(row.quantity) : '—'}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: row.running_balance <= parseInt(settings.reorder_level)
                          ? 'var(--red)' : 'var(--green)'
                      }}>
                        {fmt.number(row.running_balance)} bags
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {row.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={5} style={{ fontWeight: 700 }}>TOTALS</td>
                  <td style={{ fontWeight: 800, color: 'var(--green)' }}>
                    {fmt.number(kpis.total_in)} bags
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--red)' }}>
                    {fmt.number(kpis.total_out)} bags
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                    {fmt.number(kpis.balance)} bags
                  </td>
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
