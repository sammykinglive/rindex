import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { fmt, MONTHS } from '../utils/format';

// ── Icons ────────────────────────────────────────────────────────
const Icon = ({ d, color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const icons = {
  received: (c) => <Icon color={c} d={<><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><circle cx="12" cy="12" r="1" fill={c}/></>} />,
  issued:   (c) => <Icon color={c} d={<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>} />,
  balance:  (c) => <Icon color={c} d={<><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>} />,
  value:    (c) => <Icon color={c} d={<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><line x1="9" y1="10" x2="9.01" y2="10" strokeWidth="3"/></>} />,
  revenue:  (c) => <Icon color={c} d={<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>} />,
  capacity: (c) => <Icon color={c} d={<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>} />,
};

// ── KPI Card ─────────────────────────────────────────────────────
function KpiCard({ label, value, sub, sub2, iconKey, iconColor, valueColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '16px 18px',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Icon + Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: iconColor + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icons[iconKey]?.(iconColor)}
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.3 }}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div style={{ fontSize: 20, fontWeight: 800, color: valueColor || 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1 }}>
        {value}
      </div>

      {/* Subs */}
      {sub  && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{sub}</div>}
      {sub2 && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{sub2}</div>}
    </div>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────
function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 13px', boxShadow: 'var(--shadow)', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-muted)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{fmt.number(p.value)} bags</span>
        </div>
      ))}
    </div>
  );
}

function AreaTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 13px', boxShadow: 'var(--shadow)', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-muted)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{fmt.currency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate  = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    api.get('/dashboard').then(r => {
      setData(r.data);
      setLoading(false);
      setRefreshing(false);
    });
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, border: '3px solid var(--primary-pale)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading dashboard…</span>
    </div>
  );

  const { kpis, monthly, recent_activity, settings } = data;
  const now = new Date();
  const hr  = now.getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  const chartData = monthly.map((m, i) => ({
    name: MONTHS[i],
    'Bags In':  m.bags_in,
    'Bags Out': m.bags_out,
  }));

  const pnlData = monthly.map((m, i) => ({
    name: MONTHS[i],
    Revenue: parseFloat((m.revenue || 0).toFixed(2)),
  }));

  const grossProfit = kpis.total_revenue - kpis.total_cogs;
  const grossMargin = kpis.total_revenue > 0 ? (grossProfit / kpis.total_revenue * 100) : 0;

  // 6 KPI card definitions
  const cards = [
    {
      label: 'Total Bags Received', value: fmt.number(kpis.total_in) + ' bags',
      sub: 'All time deliveries',
      iconKey: 'received', iconColor: '#02A793',
      onClick: () => navigate('/receipts'),
    },
    {
      label: 'Total Bags Issued', value: fmt.number(kpis.total_out) + ' bags',
      sub: 'All time sales',
      iconKey: 'issued', iconColor: '#EF4444',
      onClick: () => navigate('/issues'),
    },
    {
      label: 'Current Balance', value: fmt.number(kpis.balance) + ' bags',
      sub: 'In warehouse now',
      sub2: kpis.reorder_alert ? '⚠ Below reorder level' : '✔ Stock level healthy',
      iconKey: 'balance', iconColor: kpis.reorder_alert ? '#EF4444' : '#10B981',
      valueColor: kpis.reorder_alert ? 'var(--red)' : 'var(--text)',
      onClick: () => navigate('/balance'),
    },
    {
      label: 'Stock Value', value: fmt.currency(kpis.stock_value),
      sub: `@ ${fmt.currency(settings.unit_price)} per bag`,
      iconKey: 'value', iconColor: '#F59E0B',
      onClick: () => navigate('/balance'),
    },
    {
      label: 'Total Revenue', value: fmt.currency(kpis.total_revenue),
      sub: 'All time sales value',
      sub2: `Gross margin: ${fmt.percent(grossMargin)}`,
      iconKey: 'revenue', iconColor: '#8B5CF6',
      onClick: () => navigate('/pnl'),
    },
    {
      label: 'Warehouse Used', value: fmt.percent(kpis.capacity_used),
      sub: `${fmt.number(kpis.balance)} of ${fmt.number(settings.warehouse_capacity)} bags`,
      iconKey: 'capacity', iconColor: '#F97316',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">{greeting} 👋</div>
          <div className="page-sub">
            {now.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => load(true)}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Reorder alert */}
      {kpis.reorder_alert && (
        <div className="alert alert-danger">
          <AlertTriangle size={17} />
          <strong>Reorder Alert:</strong> Stock is at {fmt.number(kpis.balance)} bags — below reorder level of {fmt.number(settings.reorder_level)} bags.
        </div>
      )}

      {/* ── 6 KPI Cards — 3 × 2 grid ─────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
        marginBottom: 20,
      }}>
        {cards.map(c => <KpiCard key={c.label} {...c} />)}
      </div>

      {/* Capacity bar */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Warehouse Capacity</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {fmt.number(kpis.balance)} / {fmt.number(settings.warehouse_capacity)} bags &nbsp;·&nbsp;
            <span style={{ fontWeight: 700, color: kpis.capacity_used > 90 ? 'var(--red)' : kpis.capacity_used > 70 ? 'var(--gold)' : 'var(--green)' }}>
              {fmt.percent(kpis.capacity_used)}
            </span>
          </span>
        </div>
        <div className="progress-bar-wrap" style={{ height: 7 }}>
          <div className="progress-bar" style={{
            width: `${Math.min(kpis.capacity_used, 100)}%`,
            background: kpis.capacity_used > 90 ? 'var(--red)' : kpis.capacity_used > 70 ? 'var(--gold)' : 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: 'var(--text-light)' }}>
          <span>Empty</span>
          <span style={{ color: kpis.reorder_alert ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
            {kpis.reorder_alert ? '⚠ Reorder Now' : '✔ OK'}
          </span>
          <span>Full</span>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginBottom: 18 }}>

        {/* Stock movement bar chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Stock Movement</div>
              <div className="card-sub">{now.getFullYear()} — Bags In vs Bags Out</div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['var(--primary)', 'Bags In'], ['var(--red)', 'Bags Out']].map(([color, label]) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />{label}
                </span>
              ))}
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={4} barCategoryGap="32%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<BarTip />} cursor={{ fill: 'var(--bg)', radius: 4 }} />
                <Bar dataKey="Bags In"  fill="var(--primary)" radius={[5,5,0,0]} />
                <Bar dataKey="Bags Out" fill="var(--red)"     radius={[5,5,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* P&L snapshot */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">P&L Snapshot</div>
              <div className="card-sub">Revenue trend {now.getFullYear()}</div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={pnlData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<AreaTip />} />
                <Area type="monotone" dataKey="Revenue" stroke="var(--primary)" strokeWidth={2.2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--primary)' }} />
              </AreaChart>
            </ResponsiveContainer>

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                ['Revenue',      fmt.currency(kpis.total_revenue), 'var(--green)'],
                ['COGS',         fmt.currency(kpis.total_cogs),    'var(--red)'],
                ['Gross Profit', fmt.currency(grossProfit),         grossProfit >= 0 ? 'var(--green)' : 'var(--red)'],
                ['Margin',       fmt.percent(grossMargin),          'var(--primary)'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }} onClick={() => navigate('/pnl')}>
                View full P&L report →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Activity</div>
            <div className="card-sub">Latest stock movements</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/balance')}>View all</button>
        </div>
        <div className="table-wrap">
          {recent_activity.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <h3>No transactions yet</h3>
              <p>Start by recording a delivery in Stock Receipts.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Date</th><th>Reference</th><th>Party</th><th>Bags</th><th>Type</th></tr>
              </thead>
              <tbody>
                {recent_activity.map((r, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{fmt.date(r.date)}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{r.ref}</td>
                    <td style={{ fontWeight: 500 }}>{r.party}</td>
                    <td style={{ fontWeight: 700 }}>{fmt.number(r.quantity)}</td>
                    <td>
                      <span className={`badge ${r.type === 'Receipt' ? 'badge-teal' : 'badge-red'}`}>
                        {r.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .dash-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

