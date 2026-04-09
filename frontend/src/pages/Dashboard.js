import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Package, TrendingUp, TrendingDown, Scale, AlertTriangle, CheckCircle, Warehouse, DollarSign } from 'lucide-react';
import api from '../utils/api';
import { fmt, MONTHS } from '../utils/format';

function KpiCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      <div className="kpi-icon">{Icon && <Icon size={48} strokeWidth={1} />}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <span className="spin" style={{ fontSize: 32 }}>⟳</span>
    </div>
  );

  const { kpis, monthly, recent_activity, settings } = data;
  const chartData = monthly.map((m, i) => ({ name: MONTHS[i], 'Bags In': m.bags_in, 'Bags Out': m.bags_out }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Welcome to Rindex — {settings.business_name} | {settings.warehouse_location}</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {kpis.reorder_alert && (
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <strong>⚠ REORDER ALERT:</strong> Current stock ({fmt.number(kpis.balance)} bags) is at or below the reorder level ({fmt.number(settings.reorder_level)} bags). Please order more stock immediately.
        </div>
      )}

      <div className="kpi-grid">
        <KpiCard label="Total Bags Received" value={fmt.number(kpis.total_in)} sub="All time" color="blue" icon={Package} />
        <KpiCard label="Total Bags Issued" value={fmt.number(kpis.total_out)} sub="All time" color="red" icon={TrendingDown} />
        <KpiCard label="Current Balance" value={fmt.number(kpis.balance) + ' bags'} sub="In warehouse now" color="green" icon={Scale} />
        <KpiCard label="Stock Value" value={fmt.currency(kpis.stock_value)} sub={`@ ${fmt.currency(settings.unit_price)}/bag`} color="gold" icon={DollarSign} />
        <KpiCard label="Total Revenue" value={fmt.currency(kpis.total_revenue)} sub="All sales" color="purple" icon={TrendingUp} />
        <KpiCard label="Warehouse Used" value={fmt.percent(kpis.capacity_used)} sub={`of ${fmt.number(settings.warehouse_capacity)} bag capacity`} color="orange" icon={Warehouse} />
      </div>

      {/* Reorder status strip */}
      <div className={`alert ${kpis.reorder_alert ? 'alert-danger' : 'alert-success'}`} style={{ marginBottom: 24 }}>
        {kpis.reorder_alert
          ? <><AlertTriangle size={16} /> Stock is critically low</>
          : <><CheckCircle size={16} /> Stock level is healthy — {fmt.number(kpis.balance)} bags in warehouse</>}
      </div>

      {/* Capacity bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Warehouse Capacity</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmt.number(kpis.balance)} / {fmt.number(settings.warehouse_capacity)} bags</span>
        </div>
        <div className="card-body">
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{
              width: `${Math.min(kpis.capacity_used, 100)}%`,
              background: kpis.capacity_used > 90 ? 'var(--red)' : kpis.capacity_used > 70 ? 'var(--gold)' : 'var(--green)'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>0</span>
            <span style={{ fontWeight: 700 }}>{fmt.percent(kpis.capacity_used)} used</span>
            <span>{fmt.number(settings.warehouse_capacity)} bags</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Monthly chart */}
        <div className="card">
          <div className="card-header"><span className="card-title">Monthly Stock Movement ({new Date().getFullYear()})</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [fmt.number(v) + ' bags']} />
                <Bar dataKey="Bags In"  fill="var(--green)"        radius={[4,4,0,0]} />
                <Bar dataKey="Bags Out" fill="var(--red)"          radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: 'var(--green)', borderRadius: 3, display: 'inline-block' }} /> Bags In
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: 'var(--red)', borderRadius: 3, display: 'inline-block' }} /> Bags Out
              </span>
            </div>
          </div>
        </div>

        {/* P&L snapshot */}
        <div className="card">
          <div className="card-header"><span className="card-title">P&L Snapshot</span></div>
          <div className="card-body">
            {[
              ['Total Revenue', fmt.currency(kpis.total_revenue), 'green'],
              ['Total COGS', fmt.currency(kpis.total_cogs), 'red'],
              ['Gross Profit', fmt.currency(kpis.gross_profit), kpis.gross_profit >= 0 ? 'green' : 'red'],
              ['Pending Payments', fmt.currency(kpis.pending_payments), 'gold'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 700, color: `var(--${color})`, fontSize: 14 }}>{value}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--primary-pale)', borderRadius: 8, fontSize: 12.5, color: 'var(--primary)' }}>
              💡 Go to <strong>P&L Summary</strong> for the full breakdown with expenses and net profit.
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header"><span className="card-title">Recent Activity</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Reference</th><th>Party</th><th>Bags</th><th>Type</th>
              </tr>
            </thead>
            <tbody>
              {recent_activity.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No transactions yet</td></tr>
              )}
              {recent_activity.map((r, i) => (
                <tr key={i}>
                  <td>{fmt.date(r.date)}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.ref}</td>
                  <td>{r.party}</td>
                  <td style={{ fontWeight: 700 }}>{fmt.number(r.quantity)}</td>
                  <td><span className={`badge ${r.type === 'Receipt' ? 'badge-green' : 'badge-red'}`}>{r.type}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
