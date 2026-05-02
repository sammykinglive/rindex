import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import api from '../utils/api';
import { fmt, MONTH_NAMES } from '../utils/format';

// ── Silhouette icon SVGs ─────────────────────────────────────────
function IconRevenue({ size = 28, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill={color} opacity="0.9"/>
      <path d="M11 9.5h2M11 12.5h2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="7" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M9 11l2 2 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCogs({ size = 28, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke={color} strokeWidth="1.5" fill="none"/>
      <circle cx="12" cy="12" r="2" fill={color}/>
    </svg>
  );
}

function IconGross({ size = 28, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17 6 23 6 23 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconOpex({ size = 28, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="12" y1="12" x2="12" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="10" y1="14" x2="14" y2="14" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconNet({ size = 28, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
      <path d="M2 17l10 5 10-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12l10 5 10-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconMargin({ size = 28, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M12 8v8M8 12h8" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconStock({ size = 28, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

// ── Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, sub, gradient, icon: Icon, iconColor = '#fff', positive, isNeutral }) {
  const isPositive = isNeutral ? null : (positive === undefined ? null : positive);
  return (
    <div style={{
      background: gradient,
      borderRadius: 16,
      padding: '22px 24px',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.18)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; }}
    >
      {/* Background icon silhouette */}
      <div style={{ position: 'absolute', right: -8, bottom: -8, opacity: 0.12, transform: 'scale(2.8)', transformOrigin: 'bottom right' }}>
        <Icon size={32} color="#fff" />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={iconColor} />
        </div>
        {isPositive !== null && (
          <span style={{
            background: isPositive ? 'rgba(255,255,255,0.25)' : 'rgba(255,100,100,0.3)',
            borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700
          }}>
            {isPositive ? '▲ Profit' : '▼ Loss'}
          </span>
        )}
      </div>

      {/* Label */}
      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
        {label}
      </div>

      {/* Value */}
      <div style={{ fontSize: value.length > 14 ? 20 : 26, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
        {value}
      </div>

      {/* Sub */}
      {sub && (
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Tooltip ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow)', fontSize: 13 }}>
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

// ── PnL Row for statement ────────────────────────────────────────
function PnLRow({ label, value, bold, color, bg, borderTop, indent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: indent ? '10px 20px 10px 32px' : '11px 20px',
      borderTop: borderTop ? '2px solid var(--border)' : '1px solid var(--border)',
      background: bg || 'transparent',
    }}>
      <span style={{ fontWeight: bold ? 700 : 400, fontSize: bold ? 13.5 : 13, color: 'var(--text)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, fontSize: bold ? 14 : 13.5, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function PnL() {
  const navigate  = useNavigate();
  const now       = new Date();

  // Filter state
  const [mode, setMode]   = useState('alltime'); // 'alltime' | 'month'
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  // Data state
  const [dash, setDash]         = useState(null);
  const [totalOpEx, setTotalOpEx] = useState(0);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Monthly filtered P&L numbers
  const [monthlyReceipts, setMonthlyReceipts] = useState(null);
  const [monthlyIssues, setMonthlyIssues]     = useState(null);

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  useEffect(() => {
    setLoading(true);
    const expMonth = mode === 'month' ? month : now.getMonth() + 1;
    const expYear  = mode === 'month' ? year  : now.getFullYear();

    Promise.all([
      api.get('/dashboard'),
      api.get('/dashboard/expenses', { params: { month: expMonth, year: expYear } }),
      mode === 'month' ? api.get('/receipts', { params: { from: `${year}-${String(month).padStart(2,'0')}-01`, to: `${year}-${String(month).padStart(2,'0')}-31` } }) : Promise.resolve(null),
      mode === 'month' ? api.get('/issues',   { params: { from: `${year}-${String(month).padStart(2,'0')}-01`, to: `${year}-${String(month).padStart(2,'0')}-31` } }) : Promise.resolve(null),
    ]).then(([d, e, rec, iss]) => {
      setDash(d.data);
      setTotalOpEx(e.data.total);
      setMonthlyData(d.data.monthly || []);
      setMonthlyReceipts(rec ? rec.data : null);
      setMonthlyIssues(iss ? iss.data : null);
      setLoading(false);
    });
  }, [mode, month, year]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, border: '3px solid var(--primary-pale)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading P&L data…</span>
    </div>
  );

  const { kpis } = dash;

  // Calculate figures based on mode
  let revenue, cogs, bags_sold, bags_purchased, avg_sell, avg_cost;

  if (mode === 'alltime') {
    revenue        = kpis.total_revenue;
    cogs           = kpis.total_cogs;
    bags_sold      = kpis.total_out;
    bags_purchased = kpis.total_in;
    avg_sell       = bags_sold > 0 ? revenue / bags_sold : 0;
    avg_cost       = bags_purchased > 0 ? cogs / bags_purchased : 0;
  } else {
    revenue   = monthlyIssues?.totals?.total_sales || 0;
    cogs      = monthlyReceipts?.totals?.total_cost || 0;
    bags_sold = monthlyIssues?.totals?.total_bags  || 0;
    bags_purchased = monthlyReceipts?.totals?.total_bags || 0;
    avg_sell  = bags_sold > 0 ? revenue / bags_sold : 0;
    avg_cost  = bags_purchased > 0 ? cogs / bags_purchased : 0;
  }

  const grossProfit  = revenue - cogs;
  const netProfit    = grossProfit - totalOpEx;
  const grossMargin  = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin    = revenue > 0 ? (netProfit   / revenue) * 100 : 0;
  const roi          = cogs    > 0 ? (netProfit   / cogs)    * 100 : 0;
  const profitPerBag = bags_sold > 0 ? netProfit / bags_sold : 0;

  // Chart data — always show full year trend
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartData = monthlyData.map((m, i) => ({
    name: MONTHS_SHORT[i],
    Revenue: parseFloat((m.revenue || 0).toFixed(2)),
  }));

  const periodLabel = mode === 'alltime'
    ? 'All Time'
    : `${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">💰 P&L Summary</div>
          <div className="page-sub">Profit & Loss — {periodLabel}</div>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: 4, gap: 4 }}>
            <button
              onClick={() => setMode('alltime')}
              style={{
                padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
                background: mode === 'alltime' ? 'var(--primary)' : 'transparent',
                color: mode === 'alltime' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              All Time
            </button>
            <button
              onClick={() => setMode('month')}
              style={{
                padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
                background: mode === 'month' ? 'var(--primary)' : 'transparent',
                color: mode === 'month' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              By Month
            </button>
          </div>

          {/* Month & Year selectors — only show in month mode */}
          {mode === 'month' && (
            <>
              <select className="form-control" style={{ width: 130 }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select className="form-control" style={{ width: 95 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
                {years.map(y => <option key={y}>{y}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Period badge */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: mode === 'alltime' ? 'var(--primary-pale)' : 'var(--gold-light)',
          color: mode === 'alltime' ? 'var(--primary-dark)' : '#92400E',
          border: `1px solid ${mode === 'alltime' ? 'var(--primary)' : 'var(--gold)'}`,
          borderRadius: 99, padding: '4px 14px', fontSize: 13, fontWeight: 600,
        }}>
          {mode === 'alltime' ? '📊' : '📅'} Showing: {periodLabel}
        </span>
      </div>

      {/* ── Main KPI Cards ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <StatCard
          label="Gross Revenue"
          value={fmt.currency(revenue)}
          sub={`${fmt.number(bags_sold)} bags sold · avg ${fmt.currency(avg_sell)}/bag`}
          gradient="linear-gradient(135deg, #02A793 0%, #04c9af 100%)"
          icon={IconRevenue}
          isNeutral
        />
        <StatCard
          label="Cost of Goods (COGS)"
          value={fmt.currency(cogs)}
          sub={`${fmt.number(bags_purchased)} bags purchased · avg ${fmt.currency(avg_cost)}/bag`}
          gradient="linear-gradient(135deg, #EF4444 0%, #f87171 100%)"
          icon={IconCogs}
          isNeutral
        />
        <StatCard
          label="Gross Profit"
          value={fmt.currency(grossProfit)}
          sub={`Gross margin: ${fmt.percent(grossMargin)}`}
          gradient={grossProfit >= 0
            ? "linear-gradient(135deg, #10B981 0%, #34d399 100%)"
            : "linear-gradient(135deg, #EF4444 0%, #f87171 100%)"}
          icon={IconGross}
          positive={grossProfit >= 0}
        />
        <StatCard
          label="Operating Expenses"
          value={fmt.currency(totalOpEx)}
          sub={`${mode === 'month' ? MONTH_NAMES[month-1] + ' ' + year : 'Current month'} costs`}
          gradient="linear-gradient(135deg, #F97316 0%, #fb923c 100%)"
          icon={IconOpex}
          isNeutral
        />
        <StatCard
          label="Net Profit / (Loss)"
          value={fmt.currency(netProfit)}
          sub={`Net margin: ${fmt.percent(netMargin)}`}
          gradient={netProfit >= 0
            ? "linear-gradient(135deg, #8B5CF6 0%, #a78bfa 100%)"
            : "linear-gradient(135deg, #EF4444 0%, #f87171 100%)"}
          icon={IconNet}
          positive={netProfit >= 0}
        />
        <StatCard
          label="Return on Investment"
          value={fmt.percent(roi)}
          sub={`${fmt.currency(profitPerBag)} profit per bag sold`}
          gradient={roi >= 0
            ? "linear-gradient(135deg, #3B82F6 0%, #60a5fa 100%)"
            : "linear-gradient(135deg, #EF4444 0%, #f87171 100%)"}
          icon={IconMargin}
          positive={roi >= 0}
        />
      </div>

      {/* ── Charts + Statement row ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Revenue trend chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue Trend — {year}</div>
              <div className="card-sub">Monthly revenue across the full year</div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#02A793" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#02A793" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Revenue" stroke="#02A793" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#02A793' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* P&L Statement */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">P&L Statement</div>
              <div className="card-sub">{periodLabel}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--green)', padding: '6px 20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue</div>
          <PnLRow label="Gross Revenue" value={fmt.currency(revenue)} bold color="var(--green)" bg="var(--green-light)" />
          <PnLRow label="Bags Sold" value={fmt.number(bags_sold) + ' bags'} indent />
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--red)', padding: '6px 20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost of Goods</div>
          <PnLRow label="Total COGS" value={fmt.currency(cogs)} bold color="var(--red)" bg="var(--red-light)" />
          <PnLRow label="Bags Purchased" value={fmt.number(bags_purchased) + ' bags'} indent />
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--primary)', padding: '6px 20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profit</div>
          <PnLRow label="Gross Profit" value={fmt.currency(grossProfit)} bold color={grossProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
          <PnLRow label="Operating Expenses" value={fmt.currency(totalOpEx)} color="var(--orange)" indent />
          <PnLRow label="Net Profit / (Loss)" value={fmt.currency(netProfit)} bold color={netProfit >= 0 ? 'var(--green)' : 'var(--red)'} bg={netProfit >= 0 ? 'var(--green-light)' : 'var(--red-light)'} borderTop />
          <PnLRow label="Net Margin" value={fmt.percent(netMargin)} indent color={netMargin >= 0 ? 'var(--primary)' : 'var(--red)'} />
          <div style={{ padding: '10px 20px' }}>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }} onClick={() => navigate('/expenses')}>
              💸 Manage expenses →
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom metrics row ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'Gross Margin',      value: fmt.percent(grossMargin),  color: 'var(--green)',   bg: 'var(--green-light)' },
          { label: 'Net Margin',         value: fmt.percent(netMargin),    color: netMargin >= 0 ? 'var(--green)' : 'var(--red)',   bg: netMargin >= 0 ? 'var(--green-light)' : 'var(--red-light)' },
          { label: 'ROI',                value: fmt.percent(roi),          color: roi >= 0 ? 'var(--blue)' : 'var(--red)',  bg: roi >= 0 ? 'var(--blue-light)' : 'var(--red-light)' },
          { label: 'Profit per Bag',     value: fmt.currency(profitPerBag), color: profitPerBag >= 0 ? 'var(--primary)' : 'var(--red)', bg: 'var(--primary-pale)' },
          { label: 'Avg Sell Price/Bag', value: fmt.currency(avg_sell),    color: 'var(--purple)',  bg: 'var(--purple-light)' },
          { label: 'Avg Cost Price/Bag', value: fmt.currency(avg_cost),    color: 'var(--orange)',  bg: 'var(--orange-light)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
