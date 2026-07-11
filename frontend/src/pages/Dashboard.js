import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RefreshCw, AlertTriangle, Package, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../utils/api';
import { fmt } from '../utils/format';

// ── SVG icon helper ───────────────────────────────────────────────────────────
const Icon = ({ path, color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);
const icons = {
  received:  c => <Icon color={c} path={<><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></>}/>,
  issued:    c => <Icon color={c} path={<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>}/>,
  balance:   c => <Icon color={c} path={<><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>}/>,
  value:     c => <Icon color={c} path={<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>}/>,
  revenue:   c => <Icon color={c} path={<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>}/>,
  warehouse: c => <Icon color={c} path={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></>}/>,
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, sub2, iconKey, iconColor, valueColor, onClick }) {
  return (
    <div className="kpi-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <div className="kpi-icon-wrap" style={{ background: iconColor+'18' }}>
          {icons[iconKey]?.(iconColor)}
        </div>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value" style={{ color: valueColor||'var(--text)' }}>{value}</div>
      {sub  && <div className="kpi-sub">{sub}</div>}
      {sub2 && <div className="kpi-sub">{sub2}</div>}
    </div>
  );
}

// ── Chart Tooltip ─────────────────────────────────────────────────────────────
function Tip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'9px 13px', boxShadow:'var(--shadow)', fontSize:13 }}>
      <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
          <span style={{ width:8, height:8, borderRadius:2, background:p.color, display:'inline-block' }}/>
          <span style={{ color:'var(--text-muted)' }}>{p.name}:</span>
          <span style={{ fontWeight:700 }}>{currency ? fmt.currency(p.value) : fmt.number(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Commodity KPI row card ────────────────────────────────────────────────────
function CommodityCard({ c, onClick }) {
  const isLow = c.reorder_alert;
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        marginBottom:0, cursor:'pointer',
        borderLeft:`3px solid ${isLow ? 'var(--red)' : 'var(--primary)'}`,
        transition:'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--shadow-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=''; }}
    >
      <div className="card-body" style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {isLow && <span className="badge badge-red" style={{ fontSize:10 }}>Low Stock</span>}
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{c.unit}</span>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
          {[
            ['In',       fmt.number(c.total_in),    'var(--green)'                             ],
            ['Out',      fmt.number(c.total_out),   'var(--red)'                               ],
            ['Balance',  fmt.number(c.balance),     isLow ? 'var(--red)' : 'var(--primary)'   ],
            ['Value',    fmt.currency(c.stock_value),'var(--gold)'                             ],
          ].map(([lbl,val,col]) => (
            <div key={lbl} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.3px' }}>{lbl}</div>
              <div style={{ fontSize:13, fontWeight:800, color:col, marginTop:2 }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:8 }}>
          <div className="progress-bar-wrap" style={{ height:4 }}>
            <div className="progress-bar" style={{
              width:`${Math.min(c.capacity_used,100)}%`,
              background: c.capacity_used>90 ? 'var(--red)' : c.capacity_used>70 ? 'var(--gold)' : 'var(--primary)',
            }}/>
          </div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
            {fmt.percent(c.capacity_used)} capacity used
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid var(--primary-pale)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <span style={{ color:'var(--text-muted)', fontSize:14 }}>Loading dashboard…</span>
    </div>
  );

  const { kpis, commodity_kpis = [], monthly, recent_activity, settings } = data;
  const now  = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const grossProfit = kpis.total_revenue - kpis.total_cogs;
  const grossMargin = kpis.total_revenue > 0 ? (grossProfit / kpis.total_revenue * 100) : 0;

  const barData  = monthly.map((m,i) => ({ name:MONTHS_SHORT[i], 'In':m.bags_in, 'Out':m.bags_out }));
  const areaData = monthly.map((m,i) => ({ name:MONTHS_SHORT[i], Revenue:parseFloat((m.revenue||0).toFixed(2)) }));

  // Reorder alerts per commodity
  const lowStockComms = commodity_kpis.filter(c => c.reorder_alert);

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">{greeting}</div>
          <div className="page-sub">{now.toLocaleDateString('en-GH', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => load(true)}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''}/> Refresh
        </button>
      </div>

      {/* ── Reorder alerts ────────────────────────────────────────────── */}
      {lowStockComms.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom:16, flexDirection:'column', alignItems:'flex-start', gap:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700 }}>
            <AlertTriangle size={16}/> Low Stock Alert — {lowStockComms.length} commodity{lowStockComms.length>1?'ies':''} need restocking
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {lowStockComms.map(c => (
              <span key={c.id} style={{ fontSize:12, background:'rgba(239,68,68,0.12)', padding:'2px 10px', borderRadius:99, border:'1px solid rgba(239,68,68,0.3)' }}>
                {c.name}: {fmt.number(c.balance)} {c.unit} left
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Overall KPI cards ─────────────────────────────────────────── */}
      <div className="kpi-grid">
        {[
          { label:'Total Received', value:`${fmt.number(kpis.total_in)} units`,   sub:'All commodities',        iconKey:'received',  iconColor:'#02A793', onClick:()=>navigate('/receipts') },
          { label:'Total Issued',   value:`${fmt.number(kpis.total_out)} units`,  sub:'All commodities',        iconKey:'issued',    iconColor:'#EF4444', onClick:()=>navigate('/issues') },
          { label:'Net Balance',    value:`${fmt.number(kpis.balance)} units`,    sub:lowStockComms.length>0?`${lowStockComms.length} low stock`:'All healthy', iconKey:'balance', iconColor: lowStockComms.length>0?'#EF4444':'#10B981', valueColor:lowStockComms.length>0?'var(--red)':'var(--text)', onClick:()=>navigate('/balance') },
          { label:'Stock Value',    value:fmt.currency(kpis.stock_value),         sub:'At current prices',      iconKey:'value',     iconColor:'#F59E0B' },
          { label:'Total Revenue',  value:fmt.currency(kpis.total_revenue),       sub:`Margin: ${fmt.percent(grossMargin)}`, iconKey:'revenue', iconColor:'#8B5CF6', onClick:()=>navigate('/pnl') },
          { label:'Gross Profit',   value:fmt.currency(grossProfit),              sub:grossProfit>=0?'Profitable':'Loss',    iconKey:'revenue', iconColor: grossProfit>=0?'#10B981':'#EF4444', valueColor: grossProfit>=0?'var(--green)':'var(--red)' },
        ].map(card => <KpiCard key={card.label} {...card}/>)}
      </div>

      {/* ── Per-Commodity breakdown ───────────────────────────────────── */}
      {commodity_kpis.length > 0 && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Commodity Breakdown</div>
              <div className="card-sub">Current stock position per commodity</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/balance')}>View ledger</button>
          </div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:10 }}>
              {commodity_kpis.map(c => (
                <CommodityCard key={c.id} c={c} onClick={()=>navigate('/balance')}/>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Charts ────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16, marginBottom:16 }} className="chart-grid">
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Stock Movement</div><div className="card-sub">{now.getFullYear()} — All commodities</div></div>
            <div style={{ display:'flex', gap:12 }}>
              {[['var(--primary)','In'],['var(--red)','Out']].map(([color,lbl]) => (
                <span key={lbl} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--text-muted)' }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:color, display:'inline-block' }}/>{lbl}
                </span>
              ))}
            </div>
          </div>
          <div className="card-body" style={{ paddingTop:10 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barGap={3} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip/>} cursor={{ fill:'var(--bg)', radius:4 }}/>
                <Bar dataKey="In"  fill="var(--primary)" radius={[5,5,0,0]}/>
                <Bar dataKey="Out" fill="var(--red)"     radius={[5,5,0,0]} opacity={0.85}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">P&L Snapshot</div><div className="card-sub">Revenue trend</div></div>
          </div>
          <div className="card-body" style={{ paddingTop:8 }}>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={<Tip currency/>}/>
                <Area type="monotone" dataKey="Revenue" stroke="var(--primary)" strokeWidth={2.5} fill="url(#revG)" dot={false} activeDot={{ r:4, fill:'var(--primary)' }}/>
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
              {[
                ['Revenue',      fmt.currency(kpis.total_revenue), 'var(--green)'],
                ['COGS',         fmt.currency(kpis.total_cogs),    'var(--red)'  ],
                ['Gross Profit', fmt.currency(grossProfit),        grossProfit>=0?'var(--green)':'var(--red)'],
              ].map(([l,v,c]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12.5 }}>
                  <span style={{ color:'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontWeight:700, color:c }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center', fontSize:12, marginTop:10 }} onClick={()=>navigate('/pnl')}>
              View full P&L →
            </button>
          </div>
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Recent Activity</div><div className="card-sub">Latest movements</div></div>
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/balance')}>View all</button>
        </div>
        <div className="table-wrap">
          {recent_activity.length === 0 ? (
            <div className="empty-state">
              <Package size={36} style={{ opacity:0.25, marginBottom:10 }}/>
              <h3>No transactions yet</h3>
              <p>Record your first delivery to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Date</th><th>Commodity</th><th>Ref</th><th>Party</th><th>Qty</th><th>Type</th></tr>
              </thead>
              <tbody>
                {recent_activity.map((r,i) => (
                  <tr key={i}>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{fmt.date(r.date)}</td>
                    <td style={{ fontSize:12.5, fontWeight:600 }}>{r.commodity_name || '—'}</td>
                    <td style={{ fontFamily:'monospace', fontWeight:600, fontSize:12 }}>{r.ref}</td>
                    <td style={{ fontWeight:500 }}>{r.party}</td>
                    <td style={{ fontWeight:700 }}>{fmt.number(r.quantity)} <span style={{ fontSize:11, color:'var(--text-muted)' }}>{r.commodity_unit||''}</span></td>
                    <td><span className={`badge ${r.type==='Receipt'?'badge-teal':'badge-red'}`}>{r.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .chart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
