import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { fmt, MONTH_NAMES } from '../utils/format';

function PnLRow({ label, value, bold, color, bg, borderTop, indent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: indent ? '10px 20px 10px 36px' : '12px 20px',
      borderTop: borderTop ? '2px solid var(--border)' : '1px solid var(--border)',
      background: bg || 'transparent',
    }}>
      <span style={{ fontWeight: bold ? 700 : 400, fontSize: bold ? 14 : 13.5 }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, fontSize: bold ? 15 : 14, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}

function SectionHeader({ children, color }) {
  return (
    <div style={{ padding: '10px 20px', background: color || 'var(--primary)' }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {children}
      </span>
    </div>
  );
}

export default function PnL() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [dash, setDash]         = useState(null);
  const [totalOpEx, setTotalOpEx] = useState(0);
  const [loading, setLoading]   = useState(true);

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/dashboard'),
      api.get('/dashboard/expenses', { params: { month, year } }),
    ]).then(([d, e]) => {
      setDash(d.data);
      setTotalOpEx(e.data.total);
      setLoading(false);
    });
  }, [month, year]);

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
  const avgCostPerBag = kpis.total_in > 0 ? kpis.total_cogs / kpis.total_in : 0;
  const avgSellPerBag = kpis.total_out > 0 ? kpis.total_revenue / kpis.total_out : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">💰 P&L Summary</div>
          <div className="page-sub">Profit & Loss — Revenue, Costs, and Net Profit</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Expenses for:</span>
          <select className="form-control" style={{ width: 140 }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="form-control" style={{ width: 100 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          ['Total Revenue',  fmt.currency(kpis.total_revenue), 'var(--green)',  'var(--green-light)'],
          ['Total COGS',     fmt.currency(kpis.total_cogs),    'var(--red)',    'var(--red-light)'],
          ['Gross Profit',   fmt.currency(grossProfit),        grossProfit >= 0 ? 'var(--green)' : 'var(--red)', 'var(--primary-pale)'],
          ['Operating Costs',fmt.currency(totalOpEx),          'var(--orange)', '#FEF0DC'],
          ['Net Profit',     fmt.currency(netProfit),          netProfit >= 0 ? 'var(--green)' : 'var(--red)', netProfit >= 0 ? 'var(--green-light)' : 'var(--red-light)'],
          ['ROI',            fmt.percent(roi),                 'var(--purple)', 'var(--purple-light)'],
        ].map(([label, value, color, bg]) => (
          <div key={label} style={{ background: bg, padding: '14px 16px', borderRadius: 'var(--radius)', border: `1px solid ${color}22` }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>

        {/* P&L Statement */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Full P&L Statement</span>
          </div>

          <SectionHeader color="var(--green)">Revenue — All Time</SectionHeader>
          <PnLRow label="Total Bags Sold" value={fmt.number(kpis.total_out) + ' bags'} />
          <PnLRow label="Average Selling Price / Bag" value={fmt.currency(avgSellPerBag)} indent />
          <PnLRow label="Gross Revenue" value={fmt.currency(kpis.total_revenue)} bold color="var(--green)" bg="var(--green-light)" />

          <SectionHeader color="var(--red)">Cost of Goods Sold — All Time</SectionHeader>
          <PnLRow label="Total Bags Purchased" value={fmt.number(kpis.total_in) + ' bags'} />
          <PnLRow label="Average Purchase Cost / Bag" value={fmt.currency(avgCostPerBag)} indent />
          <PnLRow label="Total COGS" value={fmt.currency(kpis.total_cogs)} bold color="var(--red)" bg="var(--red-light)" />

          <SectionHeader color="var(--primary-light)">Gross Profit</SectionHeader>
          <PnLRow label="Gross Profit" value={fmt.currency(grossProfit)} bold color={grossProfit >= 0 ? 'var(--green)' : 'var(--red)'} bg="var(--primary-pale)" borderTop />
          <PnLRow label="Gross Margin %" value={fmt.percent(grossMargin)} color={grossMargin >= 0 ? 'var(--green)' : 'var(--red)'} indent />

          <SectionHeader color="var(--orange)">Operating Expenses — {MONTH_NAMES[month - 1]} {year}</SectionHeader>
          <PnLRow label="Total Operating Expenses" value={fmt.currency(totalOpEx)} bold color="var(--red)" bg="var(--red-light)" />
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/expenses')}
              style={{ color: 'var(--primary)', fontSize: 13 }}
            >
              💸 View & manage expenses →
            </button>
          </div>

          <SectionHeader color="var(--sidebar-bg)">Net Profit</SectionHeader>
          <PnLRow label="Net Profit / (Loss)" value={fmt.currency(netProfit)} bold color={netProfit >= 0 ? 'var(--green)' : 'var(--red)'} bg={netProfit >= 0 ? 'var(--green-light)' : 'var(--red-light)'} borderTop />
          <PnLRow label="Net Margin %" value={fmt.percent(netMargin)} color={netMargin >= 0 ? 'var(--green)' : 'var(--red)'} indent />
          <PnLRow label="Return on Investment (ROI)" value={fmt.percent(roi)} color={roi >= 0 ? 'var(--green)' : 'var(--red)'} indent />
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stock position */}
          <div className="card">
            <div className="card-header"><span className="card-title">Current Stock Position</span></div>
            <div className="card-body">
              {[
                ['Bags in Warehouse',       fmt.number(kpis.balance) + ' bags',   'var(--green)'],
                ['Value at Selling Price',  fmt.currency(kpis.stock_value),        'var(--primary)'],
                ['Value at Cost Price',     fmt.currency(kpis.balance * avgCostPerBag), 'var(--text-muted)'],
                ['Pending Payments',        fmt.currency(kpis.pending_payments),   'var(--red)'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Margin summary */}
          <div className="card">
            <div className="card-header"><span className="card-title">Margin Analysis</span></div>
            <div className="card-body">
              {[
                ['Gross Margin',  fmt.percent(grossMargin), grossMargin >= 0 ? 'var(--green)' : 'var(--red)'],
                ['Net Margin',    fmt.percent(netMargin),   netMargin   >= 0 ? 'var(--green)' : 'var(--red)'],
                ['ROI',           fmt.percent(roi),         roi         >= 0 ? 'var(--green)' : 'var(--red)'],
                ['Profit / Bag Sold', fmt.currency(kpis.total_out > 0 ? netProfit / kpis.total_out : 0), netProfit >= 0 ? 'var(--green)' : 'var(--red)'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 800, color, fontSize: 15 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{ padding: '14px 18px', background: 'var(--gold-light)', borderRadius: 'var(--radius)', fontSize: 13, color: '#856000', border: '1px solid var(--gold)' }}>
            <strong>💡 Note:</strong> Revenue and COGS are all-time totals. Operating expenses are filtered by the selected month and year. Use the <strong>💸 Expenses</strong> page in the sidebar to add or manage individual expense entries.
          </div>
        </div>
      </div>
    </div>
  );
}
