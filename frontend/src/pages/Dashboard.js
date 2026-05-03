import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { fmt, MONTHS } from '../utils/format';

const Icon = ({ path, color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);

const icons = {
  received:  (c) => <Icon color={c} path={<><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></>} />,
  issued:    (c) => <Icon color={c} path={<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>} />,
  balance:   (c) => <Icon color={c} path={<><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>} />,
  value:     (c) => <Icon color={c} path={<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>} />,
  revenue:   (c) => <Icon color={c} path={<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>} />,
  warehouse: (c) => <Icon color={c} path={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></>} />,
};

function KpiCard({ label, value, sub, sub2, iconKey, iconColor, valueColor, onClick }) {
  return (
    <div className="kpi-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div className="kpi-icon-wrap" style={{ background: iconColor + '18' }}>
          {icons[iconKey]?.(iconColor)}
        </div>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value" style={{ color: valueColor || 'var(--text)' }}>{value}</div>
      {sub  && <div className="kpi-sub">{sub}</div>}
      {sub2 && <div className="kpi-sub">{sub2}</div>}
    </div>
  );
}

function Tip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 13px', boxShadow: 'var(--shadow)', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-muted)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{currency ? fmt.currency(p.value) : fmt.number(p.value) + ' bags'}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--primary-pale)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading dashboard…</span>
    </div>
  );

  const { kpis, monthly, recent_activity, settings } = data;
  const now  = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const grossProfit = kpis.total_revenue - kpis.total_cogs;
  const grossMargin = kpis.total_revenue > 0 ? (grossProfit / kpis.total_revenue * 100) : 0;

  const barData  = monthly.map((m, i) => ({ name: MONTHS_SHORT[i], 'Bags In': m.bags_in, 'Bags Out': m.bags_out }));
  const areaData = monthly.map((m, i) => ({ name: MONTHS_SHORT[i], Revenue: parseFloat((m.revenue || 0).toFixed(2)) }));

  const cards = [
    { label: 'Total Received', value: fmt.number(kpis.total_in) + ' bags', sub: 'All time', iconKey: 'received', iconColor: '#02A793', onClick: () => navigate('/receipts') },
    { label: 'Total Issued',   value: fmt.number(kpis.total_out) + ' bags', sub: 'All time', iconKey: 'issued',   iconColor: '#EF4444', onClick: () => navigate('/issues') },
    { label: 'Balance',        value: fmt.number(kpis.balance) + ' bags', sub: kpis.reorder_alert ? '⚠ Low stock' : '✔ Healthy', iconKey: 'balance', iconColor: kpis.reorder_alert ? '#EF4444' : '#10B981', valueColor: kpis.reorder_alert ? 'var(--red)' : 'var(--text)', onClick: () => navigate('/balance') },
    { label: 'Stock Value',    value: fmt.currency(kpis.stock_value), sub: `@ ${fmt.currency(settings.unit_price)}/bag`, iconKey: 'value', iconColor: '#F59E0B' },
    { label: 'Revenue',        value: fmt.currency(kpis.total_revenue), sub: `Margin: ${fmt.percent(grossMargin)}`, iconKey: 'revenue', iconColor: '#8B5CF6', onClick: () => navigate('/pnl') },
    { label: 'Warehouse',      value: fmt.percent(kpis.capacity_used), sub: `${fmt.number(kpis.balance)} / ${fmt.number(settings.warehouse_capacity)} bags`, iconKey: 'warehouse', iconColor: '#F97316', valueColor: kpis.capacity_used > 90 ? 'var(--red)' : 'var(--text)' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{greeting} 👋</div>
          <div className="page-sub">{now.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => load(true)} style={{ gap: 6, flexShrink: 0 }}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {kpis.reorder_alert && (
        <div className="alert alert-danger">
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span><strong>Reorder Alert:</strong> Only {fmt.number(kpis.balance)} bags left — below your minimum of {fmt.number(settings.reorder_level)} bags.</span>
        </div>
      )}

      {/* 6 KPI cards — 3×2 grid */}
      <div className="kpi-grid">
        {cards.map(card => <KpiCard key={card.label} {...card} />)}
      </div>

      {/* Capacity bar */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Warehouse Capacity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt.number(kpis.balance)} / {fmt.number(settings.warehouse_capacity)} bags</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: kpis.capacity_used > 90 ? 'var(--red)' : kpis.capacity_used > 70 ? 'var(--gold)' : 'var(--green)' }}>{fmt.percent(kpis.capacity_used)}</span>
          </div>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar" style={{ width: `${Math.min(kpis.capacity_used, 100)}%`, background: kpis.capacity_used > 90 ? 'var(--red)' : kpis.capacity_used > 70 ? 'var(--gold)' : 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)' }} />
        </div>
      </div>

      {/* Charts — stack on mobile */}
      <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Stock Movement</div><div className="card-sub">{now.getFullYear()}</div></div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[['var(--primary)', 'In'], ['var(--red)', 'Out']].map(([color, lbl]) => (
                <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />{lbl}
                </span>
              ))}
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barGap={3} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} cursor={{ fill: 'var(--bg)', radius: 4 }} />
                <Bar dataKey="Bags In"  fill="var(--primary)" radius={[5,5,0,0]} />
                <Bar dataKey="Bags Out" fill="var(--red)"     radius={[5,5,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">P&L Snapshot</div><div className="card-sub">Revenue trend</div></div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<Tip currency />} />
                <Area type="monotone" dataKey="Revenue" stroke="var(--primary)" strokeWidth={2.5} fill="url(#revG)" dot={false} activeDot={{ r: 4, fill: 'var(--primary)' }} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['Revenue', fmt.currency(kpis.total_revenue), 'var(--green)'], ['COGS', fmt.currency(kpis.total_cogs), 'var(--red)'], ['Gross Profit', fmt.currency(grossProfit), grossProfit >= 0 ? 'var(--green)' : 'var(--red)']].map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginTop: 10 }} onClick={() => navigate('/pnl')}>View full P&L →</button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Recent Activity</div><div className="card-sub">Latest movements</div></div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/balance')}>View all</button>
        </div>
        <div className="table-wrap">
          {recent_activity.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📦</div><h3>No transactions yet</h3><p>Record your first delivery to get started.</p></div>
          ) : (
            <table>
              <thead><tr><th>Date</th><th>Ref</th><th>Party</th><th>Bags</th><th>Type</th></tr></thead>
              <tbody>
                {recent_activity.map((r, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmt.date(r.date)}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{r.ref}</td>
                    <td style={{ fontWeight: 500 }}>{r.party}</td>
                    <td style={{ fontWeight: 700 }}>{fmt.number(r.quantity)}</td>
                    <td><span className={`badge ${r.type === 'Receipt' ? 'badge-teal' : 'badge-red'}`}>{r.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
