import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import api from '../utils/api';
import { fmt, MONTH_NAMES } from '../utils/format';

// ── Icons ────────────────────────────────────────────────────────
const Icon = ({ path, color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const icons = {
  revenue:  (c) => <Icon color={c} path={<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>} />,
  cogs:     (c) => <Icon color={c} path={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></>} />,
  gross:    (c) => <Icon color={c} path={<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>} />,
  opex:     (c) => <Icon color={c} path={<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>} />,
  net:      (c) => <Icon color={c} path={<><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>} />,
  roi:      (c) => <Icon color={c} path={<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>} />,
};

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, sub2, iconKey, iconColor, valueColor }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      padding: '16px 18px',
      border: '1px solid var(--border)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.2s, transform 0.2s',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Top row — icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: iconColor + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icons[iconKey]?.(iconColor)}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.3 }}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div style={{ fontSize: 20, fontWeight: 800, color: valueColor || 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1 }}>
        {value}
      </div>

      {/* Subs */}
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{sub}</div>}
      {sub2 && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{sub2}</div>}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 13px', boxShadow: 'var(--shadow)', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-muted)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{fmt.currency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Mini trend chart ──────────────────────────────────────────────
function TrendChart({ data, dataKey, color, label }) {
  return (
    <div className="card" style={{ padding: '16px 20px 8px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>{label}</div>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={2.2} fill={`url(#grad-${dataKey})`} dot={false} activeDot={{ r: 4, fill: color }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── PnL Row ───────────────────────────────────────────────────────
function PnLRow({ label, value, bold, color, bg, borderTop, indent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: indent ? '9px 18px 9px 30px' : '10px 18px',
      borderTop: borderTop ? '2px solid var(--border)' : '1px solid var(--border)',
      background: bg || 'transparent',
    }}>
      <span style={{ fontWeight: bold ? 700 : 400, fontSize: 13, color: 'var(--text)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, fontSize: bold ? 14 : 13, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function PnL() {
  const navigate = useNavigate();
  const now      = new Date();

  const [mode, setMode]   = useState('alltime');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  const [dash, setDash]         = useState(null);
  const [allTimeOpEx, setAllTimeOpEx] = useState(0);
  const [monthlyOpEx, setMonthlyOpEx] = useState(0);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [monthRec, setMonthRec] = useState(null);
  const [monthIss, setMonthIss] = useState(null);

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  useEffect(() => {
    setLoading(true);
    const mm = String(month).padStart(2, '0');
    const fromDate = `${year}-${mm}-01`;
    const toDate   = `${year}-${mm}-31`;

    // Always fetch all 12 months of expenses for all-time total
    const expPromises = Array.from({ length: 12 }, (_, i) =>
      api.get('/dashboard/expenses', { params: { month: i + 1, year } })
    );

    Promise.all([
      api.get('/dashboard'),
      api.get('/dashboard/expenses', { params: { month, year } }),
      api.get('/receipts', { params: { from: fromDate, to: toDate } }),
      api.get('/issues',   { params: { from: fromDate, to: toDate } }),
      ...expPromises,
    ]).then(([d, monthExp, rec, iss, ...monthlyExps]) => {
      setDash(d.data);
      setMonthlyOpEx(monthExp.data.total || 0);
      setMonthRec(rec.data);
      setMonthIss(iss.data);

      // All-time OpEx = sum of all monthly expenses for current year
      const totalAllTime = monthlyExps.reduce((sum, r) => sum + (r.data.total || 0), 0);
      setAllTimeOpEx(totalAllTime);

      // Store all expenses for chart
      setAllExpenses(monthlyExps.map(r => r.data.total || 0));

      setLoading(false);
    });
  }, [mode, month, year]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--primary-pale)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading P&L data…</span>
    </div>
  );

  const { kpis } = dash;
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // ── Figures based on mode ───────────────────────────────────────
  let revenue, cogs, bags_sold, bags_purchased, opex;

  if (mode === 'alltime') {
    revenue        = kpis.total_revenue;
    cogs           = kpis.total_cogs;
    bags_sold      = kpis.total_out;
    bags_purchased = kpis.total_in;
    opex           = allTimeOpEx;
  } else {
    revenue        = monthIss?.totals?.total_sales || 0;
    cogs           = monthRec?.totals?.total_cost  || 0;
    bags_sold      = monthIss?.totals?.total_bags  || 0;
    bags_purchased = monthRec?.totals?.total_bags  || 0;
    opex           = monthlyOpEx;
  }

  const grossProfit  = revenue - cogs;
  const netProfit    = grossProfit - opex;
  const grossMargin  = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin    = revenue > 0 ? (netProfit   / revenue) * 100 : 0;
  const roi          = cogs    > 0 ? (netProfit   / cogs)    * 100 : 0;
  const avg_sell     = bags_sold      > 0 ? revenue / bags_sold      : 0;
  const avg_cost     = bags_purchased > 0 ? cogs    / bags_purchased : 0;
  const profitPerBag = bags_sold      > 0 ? netProfit / bags_sold    : 0;

  // ── Chart data ──────────────────────────────────────────────────
  const monthlyData = dash.monthly || [];
  const chartData   = monthlyData.map((m, i) => ({
    name:         MONTHS_SHORT[i],
    Revenue:      parseFloat((m.revenue   || 0).toFixed(2)),
    GrossProfit:  parseFloat(((m.revenue || 0) - (
      // approximate COGS per month proportionally
      kpis.total_in > 0
        ? (kpis.total_cogs / kpis.total_in) * (m.bags_in || 0)
        : 0
    )).toFixed(2)),
    Expenses:     parseFloat((allExpenses[i] || 0).toFixed(2)),
  }));

  const periodLabel = mode === 'alltime'
    ? 'All Time'
    : `${MONTH_NAMES[month - 1]} ${year}`;

  // ── Card definitions ────────────────────────────────────────────
  const cards = [
    {
      label: 'Gross Revenue', value: fmt.currency(revenue),
      sub: `${fmt.number(bags_sold)} bags sold`,
      sub2: `Avg ${fmt.currency(avg_sell)} / bag`,
      iconKey: 'revenue', iconColor: '#02A793',
      valueColor: 'var(--text)',
    },
    {
      label: 'Cost of Goods (COGS)', value: fmt.currency(cogs),
      sub: `${fmt.number(bags_purchased)} bags purchased`,
      sub2: `Avg ${fmt.currency(avg_cost)} / bag`,
      iconKey: 'cogs', iconColor: '#EF4444',
      valueColor: 'var(--text)',
    },
    {
      label: 'Gross Profit', value: fmt.currency(grossProfit),
      sub: `Gross margin: ${fmt.percent(grossMargin)}`,
      sub2: null,
      iconKey: 'gross', iconColor: grossProfit >= 0 ? '#10B981' : '#EF4444',
      valueColor: grossProfit >= 0 ? 'var(--green)' : 'var(--red)',
    },
    {
      label: 'Operating Expenses', value: fmt.currency(opex),
      sub: mode === 'alltime' ? `Full year ${year}` : `${MONTH_NAMES[month-1]} ${year}`,
      sub2: null,
      iconKey: 'opex', iconColor: '#F97316',
      valueColor: 'var(--text)',
    },
    {
      label: 'Net Profit / (Loss)', value: fmt.currency(netProfit),
      sub: `Net margin: ${fmt.percent(netMargin)}`,
      sub2: `${fmt.currency(profitPerBag)} per bag sold`,
      iconKey: 'net', iconColor: netProfit >= 0 ? '#8B5CF6' : '#EF4444',
      valueColor: netProfit >= 0 ? '#8B5CF6' : 'var(--red)',
    },
    {
      label: 'Return on Investment', value: fmt.percent(roi),
      sub: `Based on COGS invested`,
      sub2: null,
      iconKey: 'roi', iconColor: roi >= 0 ? '#3B82F6' : '#EF4444',
      valueColor: roi >= 0 ? '#3B82F6' : 'var(--red)',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">💰 P&L Summary</div>
          <div className="page-sub">Profit & Loss — {periodLabel}</div>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: 3 }}>
            {['alltime', 'month'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
                background: mode === m ? 'var(--primary)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}>
                {m === 'alltime' ? 'All Time' : 'By Month'}
              </button>
            ))}
          </div>
          {mode === 'month' && (
            <>
              <select className="form-control" style={{ width: 130 }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                {MONTH_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <select className="form-control" style={{ width: 92 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
                {years.map(y => <option key={y}>{y}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Period badge */}
      <div style={{ marginBottom: 18 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: mode === 'alltime' ? 'var(--primary-pale)' : 'var(--gold-light)',
          color: mode === 'alltime' ? 'var(--primary-dark)' : '#92400E',
          border: `1px solid ${mode === 'alltime' ? 'var(--primary)' : 'var(--gold)'}`,
          borderRadius: 99, padding: '4px 14px', fontSize: 12.5, fontWeight: 600,
        }}>
          {mode === 'alltime' ? '📊' : '📅'} Showing: {periodLabel}
        </span>
      </div>

      {/* ── 6 Cards — 3 x 2 grid ─────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
        marginBottom: 20,
      }}>
        {cards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* ── Charts + Statement ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, marginBottom: 18 }}>

        {/* Trend charts stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TrendChart data={chartData} dataKey="Revenue"     color="#02A793" label="Revenue Trend" />
          <TrendChart data={chartData} dataKey="GrossProfit" color="#10B981" label="Gross Profit Trend" />
          <TrendChart data={chartData} dataKey="Expenses"    color="#F97316" label="Expenses Trend" />
        </div>

        {/* P&L Statement */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">P&L Statement</div>
              <div className="card-sub">{periodLabel}</div>
            </div>
          </div>

          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--green)', padding: '5px 18px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue</div>
          <PnLRow label="Gross Revenue" value={fmt.currency(revenue)} bold color="var(--green)" bg="var(--green-light)" />
          <PnLRow label="Bags Sold" value={fmt.number(bags_sold) + ' bags'} indent />
          <PnLRow label="Avg Selling Price" value={fmt.currency(avg_sell) + '/bag'} indent />

          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--red)', padding: '5px 18px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost of Goods</div>
          <PnLRow label="Total COGS" value={fmt.currency(cogs)} bold color="var(--red)" bg="var(--red-light)" />
          <PnLRow label="Bags Purchased" value={fmt.number(bags_purchased) + ' bags'} indent />
          <PnLRow label="Avg Purchase Cost" value={fmt.currency(avg_cost) + '/bag'} indent />

          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--primary)', padding: '5px 18px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross Profit</div>
          <PnLRow label="Gross Profit" value={fmt.currency(grossProfit)} bold color={grossProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
          <PnLRow label="Gross Margin" value={fmt.percent(grossMargin)} indent color="var(--primary)" />

          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--orange)', padding: '5px 18px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expenses</div>
          <PnLRow label="Operating Expenses" value={fmt.currency(opex)} bold color="var(--orange)" />

          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--sidebar-bg)', padding: '5px 18px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Profit</div>
          <PnLRow label="Net Profit / (Loss)" value={fmt.currency(netProfit)} bold color={netProfit >= 0 ? 'var(--green)' : 'var(--red)'} bg={netProfit >= 0 ? 'var(--green-light)' : 'var(--red-light)'} borderTop />
          <PnLRow label="Net Margin" value={fmt.percent(netMargin)} indent color={netMargin >= 0 ? 'var(--primary)' : 'var(--red)'} />
          <PnLRow label="ROI" value={fmt.percent(roi)} indent color={roi >= 0 ? '#3B82F6' : 'var(--red)'} />

          <div style={{ padding: '10px 18px' }}>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }} onClick={() => navigate('/expenses')}>
              💸 Manage expenses →
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom metrics ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          ['Gross Margin',       fmt.percent(grossMargin),   'var(--green)'],
          ['Net Margin',          fmt.percent(netMargin),     netMargin >= 0 ? 'var(--green)' : 'var(--red)'],
          ['ROI',                 fmt.percent(roi),           roi >= 0 ? '#3B82F6' : 'var(--red)'],
          ['Profit per Bag',      fmt.currency(profitPerBag), profitPerBag >= 0 ? 'var(--primary)' : 'var(--red)'],
          ['Avg Sell Price/Bag',  fmt.currency(avg_sell),    'var(--purple)'],
          ['Avg Cost Price/Bag',  fmt.currency(avg_cost),    'var(--orange)'],
        ].map(([label, value, color]) => (
          <div key={label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .pnl-cards { grid-template-columns: repeat(2, 1fr) !important; }
          .pnl-main  { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .pnl-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
