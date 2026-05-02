


import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  Package, TrendingUp, TrendingDown, Scale,
  AlertTriangle, CheckCircle, Warehouse, DollarSign,
  ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import { fmt, MONTHS } from '../utils/format';

/* ── Custom Tooltip ─────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: 'var(--shadow)', fontSize: 13
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-muted)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{fmt.number(p.value)} bags</span>
        </div>
      ))}
    </div>
  );
}

function PnLTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: 'var(--shadow)', fontSize: 13
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-muted)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{fmt.currency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── KPI Card ───────────────────────────────────────────────── */
function KpiCard({ label, value, sub, iconBg, icon: Icon, trend, trendLabel, onClick }) {
  return (
    <div className="kpi-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="kpi-icon-wrap" style={{ background: iconBg + '20' }}>
          <Icon size={20} color={iconBg} strokeWidth={2.5} />
        </div>
        {trend !== undefined && (
          <span className={`change-chip ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="kpi-label" style={{ marginTop: 4 }}>{label}</div>
      <div className={`kpi-value ${String(value).length > 10 ? 'sm' : ''}`}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
      {trendLabel && (
        <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 6 }}>{trendLabel}</div>
      )}
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function load(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
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

  // Chart data
  const chartData = monthly.map((m, i) => ({
    name: MONTHS[i],
    'Bags In':  m.bags_in,
    'Bags Out': m.bags_out,
  }));

  const pnlData = monthly.map((m, i) => ({
    name: MONTHS[i],
    'Revenue': parseFloat((m.revenue || 0).toFixed(2)),
  }));

  const grossProfit  = kpis.total_revenue - kpis.total_cogs;
  const grossMargin  = kpis.total_revenue > 0 ? (grossProfit / kpis.total_revenue * 100) : 0;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">{greeting} 👋</div>
          <div className="page-sub">
            Here is your stock overview for {now.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => load(true)}
          style={{ gap: 6 }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Reorder alert */}
      {kpis.reorder_alert && (
        <div className="alert alert-danger">
          <AlertTriangle size={17} />
          <strong>Reorder Alert:</strong> Stock is at {fmt.number(kpis.balance)} bags — below your reorder level of {fmt.number(settings.reorder_level)} bags. Order more stock now.
        </div>
      )}

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Received"
          value={fmt.number(kpis.total_in) + ' bags'}
          sub="All time deliveries"
          iconBg="var(--primary)"
          icon={Package}
          onClick={() => navigate('/receipts')}
        />
        <KpiCard
          label="Total Issued"
          value={fmt.number(kpis.total_out) + ' bags'}
          sub="All time sales"
          iconBg="var(--red)"
          icon={TrendingDown}
          onClick={() => navigate('/issues')}
        />
        <KpiCard
          label="Current Balance"
          value={fmt.number(kpis.balance) + ' bags'}
          sub="In warehouse now"
          iconBg="var(--green)"
          icon={Scale}
          trendLabel={kpis.reorder_alert ? '⚠ Below reorder level' : '✔ Stock level healthy'}
          onClick={() => navigate('/balance')}
        />
        <KpiCard
          label="Stock Value"
          value={fmt.currency(kpis.stock_value)}
          sub={`@ ${fmt.currency(settings.unit_price)}/bag`}
          iconBg="var(--gold)"
          icon={DollarSign}
        />
        <KpiCard
          label="Total Revenue"
          value={fmt.currency(kpis.total_revenue)}
          sub="All time sales value"
          iconBg="var(--purple)"
          icon={TrendingUp}
          onClick={() => navigate('/pnl')}
        />
        <KpiCard
          label="Warehouse Used"
          value={fmt.percent(kpis.capacity_used)}
          sub={`of ${fmt.number(settings.warehouse_capacity)} bag capacity`}
          iconBg="var(--orange)"
          icon={Warehouse}
        />
      </div>

      {/* Capacity bar */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Warehouse Capacity</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>
              {fmt.number(kpis.balance)} of {fmt.number(settings.warehouse_capacity)} bags occupied
            </span>
          </div>
          <span style={{
            fontWeight: 700, fontSize: 13,
            color: kpis.capacity_used > 90 ? 'var(--red)' : kpis.capacity_used > 70 ? 'var(--gold)' : 'var(--green)'
          }}>
            {fmt.percent(kpis.capacity_used)}
          </span>
        </div>
        <div className="progress-bar-wrap" style={{ height: 8 }}>
          <div className="progress-bar" style={{
            width: `${Math.min(kpis.capacity_used, 100)}%`,
            background: kpis.capacity_used > 90
              ? 'var(--red)' : kpis.capacity_used > 70
              ? 'var(--gold)' : 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-light)' }}>
          <span>Empty</span>
          <span style={{ color: kpis.reorder_alert ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
            {kpis.reorder_alert ? '⚠ Reorder Now' : '✔ OK'}
          </span>
          <span>Full</span>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Stock Movement Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Stock Movement</div>
              <div className="card-sub">{new Date().getFullYear()} — Bags In vs Bags Out</div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)', display: 'inline-block' }} />
                Bags In
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--red)', display: 'inline-block' }} />
                Bags Out
              </span>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 14 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg)', radius: 4 }} />
                <Bar dataKey="Bags In"  fill="var(--primary)" radius={[6,6,0,0]} />
                <Bar dataKey="Bags Out" fill="var(--red)"     radius={[6,6,0,0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* P&L Snapshot */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">P&L Snapshot</div>
              <div className="card-sub">Revenue trend {new Date().getFullYear()}</div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 14 }}>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={pnlData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<PnLTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: 'var(--primary)' }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* P&L numbers */}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Revenue',      fmt.currency(kpis.total_revenue), 'var(--green)'],
                ['COGS',         fmt.currency(kpis.total_cogs),    'var(--red)'],
                ['Gross Profit', fmt.currency(grossProfit),        grossProfit >= 0 ? 'var(--green)' : 'var(--red)'],
                ['Gross Margin', fmt.percent(grossMargin),         grossMargin >= 0 ? 'var(--primary)' : 'var(--red)'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
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
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Party</th>
                  <th>Bags</th>
                  <th>Type</th>
                </tr>
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
    </div>
  );
}




