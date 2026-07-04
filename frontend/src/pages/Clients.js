import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, ChevronDown, ChevronUp,
  Phone, Mail, MapPin, User, Building2, TrendingUp, TrendingDown,
  AlertCircle, FileText, BarChart2, Users, RefreshCw, Filter,
  Award, MessageSquare, Package, DollarSign, ShoppingCart, Clock,
  Shield, Star, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts';
import api from '../utils/api';
import { fmt } from '../utils/format';
import toast from 'react-hot-toast';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES   = ['Corporate','Retail','Wholesale','Traditional Market'];
const REGIONS_GH   = ['Greater Accra','Ashanti','Western','Eastern','Central','Volta','Northern','Upper East','Upper West','Brong-Ahafo','Oti','Savannah','North East','Western North','Ahafo','Bono East'];
const PAYMENT_OPTS = ['Cash','Credit','Mobile Money','Bank Transfer','Cheque'];
const NOTE_TYPES   = ['General','Meeting','Follow-up','Complaint','Preference','Pricing','Credit'];
const STATUS_OPTS  = ['Active','Inactive'];
const CAT_COLORS   = { Corporate:'#8B5CF6', Retail:'#02A793', Wholesale:'#3B82F6', 'Traditional Market':'#F97316' };
const PIE_COLORS   = ['#02A793','#8B5CF6','#3B82F6','#F97316','#10B981','#EF4444'];
const EMPTY_CLIENT = {
  name:'', company_name:'', category:'Retail', contact_person:'',
  phone:'', phone2:'', email:'', address:'', city:'', region:'',
  gps_address:'', tax_id:'', sales_rep:'', credit_limit:'',
  payment_terms:'Cash', status:'Active', notes:'',
};

// ── Chart Tooltip ──────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', fontSize:12.5, boxShadow:'var(--shadow)' }}>
      <div style={{ fontWeight:700, marginBottom:6, color:'var(--text)', borderBottom:'1px solid var(--border)', paddingBottom:4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <span style={{ width:8, height:8, borderRadius:2, background:p.color, display:'inline-block', flexShrink:0 }}/>
          <span style={{ color:'var(--text-muted)', minWidth:55 }}>{p.name}:</span>
          <span style={{ fontWeight:700, color:'var(--text)' }}>
            {p.name.toLowerCase().includes('rev') ? fmt.currency(p.value) : fmt.number(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card — icon top, clean vertical stack ─────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{
      background:'var(--card)', border:'1px solid var(--border)',
      borderRadius:'var(--radius)', padding:'18px 20px',
      boxShadow:'var(--shadow)', display:'flex', flexDirection:'column', gap:8,
      transition:'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e=>{ e.currentTarget.style.boxShadow='var(--shadow-hover)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow='var(--shadow)'; e.currentTarget.style.transform='none'; }}
    >
      <div style={{ width:38, height:38, borderRadius:10, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={18} color={color} strokeWidth={2}/>
      </div>
      <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.6px', lineHeight:1.3 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', lineHeight:1, wordBreak:'break-word' }}>{value}</div>
      {sub && <div style={{ fontSize:11.5, color:'var(--text-muted)', lineHeight:1.4 }}>{sub}</div>}
    </div>
  );
}

// ── Badges ─────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return <span className={`badge ${status==='Active'?'badge-green':'badge-red'}`}>{status}</span>;
}
function CatBadge({ cat }) {
  const c = CAT_COLORS[cat]||'var(--primary)';
  return <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:c+'18', color:c, border:`1px solid ${c}30`, whiteSpace:'nowrap' }}>{cat}</span>;
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size=34, color }) {
  const bg = color||CAT_COLORS['Retail'];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg+'22', border:`2px solid ${bg}44`, display:'flex', alignItems:'center', justifyContent:'center', color:bg, fontWeight:800, fontSize:size*0.34, flexShrink:0 }}>
      {name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'??'}
    </div>
  );
}

// ── Tab Toggle ─────────────────────────────────────────────────────────────────
function TabToggle({ options, value, onChange }) {
  return (
    <div style={{ display:'flex', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:8, padding:2, gap:2 }}>
      {options.map(o => (
        <button key={o.key} onClick={()=>onChange(o.key)} style={{
          padding:'5px 13px', borderRadius:6, border:'none', cursor:'pointer',
          fontFamily:'var(--font)', fontSize:12, fontWeight:600,
          background: value===o.key ? 'var(--primary)' : 'transparent',
          color: value===o.key ? '#fff' : 'var(--text-muted)', transition:'all 0.15s',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

// ── Stat mini card ─────────────────────────────────────────────────────────────
function StatMini({ label, value, color }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'11px 14px' }}>
      <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.3px', marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:800, color:color||'var(--text)' }}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPANDED CLIENT PROFILE ROW
// ═══════════════════════════════════════════════════════════════════════════════
function ClientProfileRow({ clientId, onEdit, onDelete, allRanked, kpis }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [orderPeriod, setOrderPeriod] = useState('alltime');
  const [noteText, setNoteText]   = useState('');
  const [noteType, setNoteType]   = useState('General');
  const [addingNote, setAddingNote] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/clients/${clientId}`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await api.post(`/clients/${clientId}/notes`, { content: noteText, note_type: noteType });
      setNoteText(''); toast.success('Note added.');
      load();
    } catch { toast.error('Failed to add note.'); }
    finally { setAddingNote(false); }
  }

  async function handleDeleteNote(nid) {
    if (!window.confirm('Delete this note?')) return;
    await api.delete(`/clients/${clientId}/notes/${nid}`);
    toast.success('Note deleted.'); load();
  }

  if (loading || !data) return (
    <tr>
      <td colSpan={9} style={{ padding:28, background:'var(--bg)', borderBottom:'2px solid var(--border)' }}>
        <div style={{ display:'flex', justifyContent:'center' }}>
          <div style={{ width:28, height:28, border:'3px solid var(--primary-pale)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        </div>
      </td>
    </tr>
  );

  const { client, lifetime, thisMonth, lastMonth, monthlyTrend, purchases, notes, revenueRank, bagsRank, totalClients, avgDaysBetween, revGrowth } = data;
  const color = CAT_COLORS[client.category]||'var(--primary)';

  const revenueShare = allRanked?.length > 0
    ? ((lifetime?.revenue||0) / allRanked.reduce((s,r)=>s+(r.revenue||0),0)) * 100 : 0;

  // Chart data
  const trendData = (monthlyTrend||[]).map(m => ({
    name: new Date(m.month+'-01').toLocaleDateString('en-GH',{month:'short',year:'2-digit'}),
    Bags: m.bags, Revenue: m.revenue, Orders: m.orders,
  }));

  // Period stats for orders tab
  const periodStats = orderPeriod === 'alltime' ? {
    orders: lifetime?.orders||0, bags: lifetime?.bags||0,
    revenue: lifetime?.revenue||0, avgValue: lifetime?.avg_value||0,
    avgBags: lifetime?.avg_bags||0, largest: lifetime?.largest_order||0,
  } : {
    orders: thisMonth?.orders||0, bags: thisMonth?.bags||0,
    revenue: thisMonth?.revenue||0,
    avgValue: thisMonth?.orders ? (thisMonth.revenue/thisMonth.orders) : 0,
    avgBags:  thisMonth?.orders ? (thisMonth.bags/thisMonth.orders)    : 0,
    largest: 0,
  };

  const filteredPurchases = orderPeriod === 'alltime'
    ? (purchases||[])
    : (purchases||[]).filter(p => p.date.slice(0,7) === new Date().toISOString().slice(0,7));

  const TABS = [
    { key:'overview',  label:'Overview',  icon: User },
    { key:'orders',    label:'Orders',    icon: ShoppingCart },
    { key:'analytics', label:'Analytics', icon: Activity },
    { key:'notes',     label:`Notes${notes?.length ? ` (${notes.length})` : ''}`, icon: MessageSquare },
  ];

  return (
    <tr>
      <td colSpan={9} style={{ padding:0, background:'var(--bg)', borderBottom:`3px solid ${color}55` }}>
        <div className="client-expanded-wrap">

        {/* ── Client Summary Card ────────────────────────────────────── */}
        <div style={{
          margin:'12px 12px 0',
          background:'var(--card)',
          border:`1px solid var(--border)`,
          borderTop:`3px solid ${color}`,
          borderRadius:'var(--radius)',
          boxShadow:'var(--shadow)',
          overflow:'hidden',
        }}>
          {/* Gradient header strip */}
          <div style={{
            background:`linear-gradient(135deg, ${color}15 0%, var(--card) 100%)`,
            padding:'16px 16px 14px',
          }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
              <Avatar name={client.name} size={44} color={color}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:4 }}>
                  <span style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>{client.name}</span>
                  <StatusBadge status={client.status}/>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                  <CatBadge cat={client.category}/>
                  <span style={{ fontSize:10.5, color:'var(--text-muted)', fontFamily:'monospace', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:5, padding:'1px 6px' }}>{client.client_code}</span>
                </div>
                {client.company_name && <div style={{ fontSize:12.5, color:'var(--text-muted)' }}>{client.company_name}</div>}
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>onEdit(client)}><Edit2 size={13}/> Edit</button>
                <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }} onClick={()=>onDelete(client.id,client.name)}><Trash2 size={13}/></button>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', borderTop:`1px solid var(--border)` }}>
            {[
              [DollarSign, fmt.currency(lifetime?.revenue||0),  'Revenue',       color],
              [ShoppingCart, lifetime?.orders||0,               'Orders',        'var(--blue)'],
              [Package, fmt.number(lifetime?.bags||0)+' bags',  'Volume',        'var(--green)'],
              [Clock, fmt.date(lifetime?.last_date)||'Never',   'Last Purchase', 'var(--text-muted)'],
            ].map(([Icon, val, lbl, c], i) => (
              <div key={lbl} style={{
                padding:'10px 8px', textAlign:'center',
                borderRight: i < 3 ? `1px solid var(--border)` : 'none',
              }}>
                <Icon size={13} style={{ color:c, marginBottom:3 }}/>
                <div style={{ fontSize:11.5, fontWeight:800, color:c, lineHeight:1.2 }}>{val}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* Rank strip — only if ranked */}
          {revenueRank && (
            <div style={{ padding:'8px 16px', borderTop:`1px solid var(--border)`, background:'var(--bg)', display:'flex', alignItems:'center', gap:8 }}>
              <Award size={12} style={{ color:'var(--gold)', flexShrink:0 }}/>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--gold)' }}>Ranked #{revenueRank} of {totalClients} by revenue</span>
              {revenueShare > 0 && <span style={{ fontSize:11.5, color:'var(--text-muted)', marginLeft:'auto' }}>{fmt.percent(revenueShare)} of total</span>}
            </div>
          )}
        </div>

        {/* ── Tabs — sticky ──────────────────────────────────────────── */}
        <div className="client-tabs-bar">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={()=>setActiveTab(key)} className={`client-tab-btn${activeTab===key?' client-tab-active':''}`}>
              <Icon size={13}/> {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ────────────────────────────────────────────── */}
        <div className="client-tab-content">

          {/* ─ OVERVIEW ─ */}
          {activeTab === 'overview' && (
            <div className="client-overview-grid">

              {/* Contact info */}
              <div className="card" style={{ marginBottom:0 }}>
                <div className="card-header"><span className="card-title">Contact Information</span></div>
                <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:11 }}>
                  {[
                    [Phone,    'Primary Phone',   client.phone||'—'],
                    [Phone,    'Secondary Phone', client.phone2||'—'],
                    [Mail,     'Email',            client.email||'—'],
                    [User,     'Contact Person',   client.contact_person||'—'],
                    [MapPin,   'Address',          [client.address,client.city,client.region].filter(Boolean).join(', ')||'—'],
                    [MapPin,   'GPS Address',      client.gps_address||'—'],
                    [Building2,'Tax ID',           client.tax_id||'—'],
                    [User,     'Sales Rep',        client.sales_rep||'—'],
                  ].map(([Icon, lbl, val]) => (
                    <div key={lbl} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      <Icon size={13} style={{ color:'var(--text-muted)', marginTop:3, flexShrink:0 }}/>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.3px' }}>{lbl}</div>
                        <div style={{ fontSize:13, color:'var(--text)', wordBreak:'break-word' }}>{val}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop:'1px solid var(--border)', paddingTop:10, marginTop:2, display:'flex', gap:20, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase' }}>Payment Terms</div>
                      <div style={{ fontWeight:700, color:'var(--text)', fontSize:13 }}>{client.payment_terms}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase' }}>Credit Limit</div>
                      <div style={{ fontWeight:700, color:'var(--text)', fontSize:13 }}>{client.credit_limit>0?fmt.currency(client.credit_limit):'None'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lifetime stats */}
              <div className="card" style={{ marginBottom:0 }}>
                <div className="card-header"><span className="card-title">Lifetime Performance</span></div>
                <div className="card-body">
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[
                      ['Total Revenue',  fmt.currency(lifetime?.revenue||0),     color],
                      ['Total Orders',   lifetime?.orders||0,                    'var(--blue)'],
                      ['Total Bags',     fmt.number(lifetime?.bags||0),          'var(--green)'],
                      ['Avg Order Value',fmt.currency(lifetime?.avg_value||0),   'var(--purple)'],
                      ['Avg Bags/Order', fmt.number(lifetime?.avg_bags||0),      'var(--orange)'],
                      ['Largest Order',  fmt.currency(lifetime?.largest_order||0),'var(--gold)'],
                    ].map(([lbl,val,c])=>(
                      <div key={lbl} style={{ padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                        <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.3px' }}>{lbl}</div>
                        <div style={{ fontSize:15, fontWeight:800, color:c, marginTop:3 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:4 }}>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                      First purchase: <strong style={{ color:'var(--text)' }}>{fmt.date(lifetime?.first_date)||'—'}</strong>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                      Last purchase: <strong style={{ color:'var(--text)' }}>{fmt.date(lifetime?.last_date)||'—'}</strong>
                    </div>
                    {avgDaysBetween && (
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                        Avg days between orders: <strong style={{ color:'var(--text)' }}>{avgDaysBetween}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Month comparison + ranking */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div className="card" style={{ marginBottom:0 }}>
                  <div className="card-header"><span className="card-title">This Month vs Last</span></div>
                  <div className="card-body">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase' }}>This Month</div>
                        <div style={{ fontSize:18, fontWeight:800, color:color, marginTop:4 }}>{fmt.currency(thisMonth?.revenue||0)}</div>
                        <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:3 }}>{thisMonth?.bags||0} bags · {thisMonth?.orders||0} orders</div>
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase' }}>vs Last Month</div>
                        <div style={{ fontSize:18, fontWeight:800, color:revGrowth>=0?'var(--green)':'var(--red)', display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                          {revGrowth>=0?<TrendingUp size={16}/>:<TrendingDown size={16}/>}
                          {fmt.percent(Math.abs(revGrowth))}
                        </div>
                        <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:3 }}>Prev: {fmt.currency(lastMonth?.revenue||0)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {(revenueRank || bagsRank) && (
                  <div className="card" style={{ marginBottom:0 }}>
                    <div className="card-header"><span className="card-title">Client Ranking</span></div>
                    <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {revenueRank && (
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>By Revenue</div>
                            <span style={{ fontWeight:800, color:'var(--gold)', fontSize:14 }}>#{revenueRank} <span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)' }}>of {totalClients}</span></span>
                          </div>
                          <div style={{ height:6, background:'var(--border)', borderRadius:99 }}>
                            <div style={{ width:`${Math.max(((totalClients-revenueRank)/Math.max(totalClients-1,1))*100,3)}%`, height:'100%', background:'var(--gold)', borderRadius:99 }}/>
                          </div>
                        </div>
                      )}
                      {bagsRank && (
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>By Volume</div>
                            <span style={{ fontWeight:800, color:'var(--blue)', fontSize:14 }}>#{bagsRank} <span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)' }}>of {totalClients}</span></span>
                          </div>
                          <div style={{ height:6, background:'var(--border)', borderRadius:99 }}>
                            <div style={{ width:`${Math.max(((totalClients-bagsRank)/Math.max(totalClients-1,1))*100,3)}%`, height:'100%', background:'var(--blue)', borderRadius:99 }}/>
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:2 }}>
                        Revenue share: <strong style={{ color:color }}>{fmt.percent(revenueShare)}</strong> of total
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ ORDERS ─ */}
          {activeTab === 'orders' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
                <span style={{ fontSize:13, color:'var(--text-muted)' }}>
                  {orderPeriod==='alltime' ? `${purchases?.length||0} total transactions` : `${filteredPurchases.length} transactions this month`}
                </span>
                <TabToggle
                  options={[{key:'alltime',label:'All Time'},{key:'monthly',label:'This Month'}]}
                  value={orderPeriod}
                  onChange={setOrderPeriod}
                />
              </div>

              {/* Period summary */}
              <div className="client-orders-stats">
                <StatMini label="Orders"    value={periodStats.orders}                color="var(--blue)"/>
                <StatMini label="Bags"      value={`${fmt.number(periodStats.bags)} bags`} color="var(--green)"/>
                <StatMini label="Revenue"   value={fmt.currency(periodStats.revenue)} color={color}/>
                <StatMini label="Avg Value" value={fmt.currency(periodStats.avgValue)} color="var(--purple)"/>
                <StatMini label="Avg Bags"  value={fmt.number(periodStats.avgBags)}   color="var(--orange)"/>
                {orderPeriod==='alltime' && <StatMini label="Largest" value={fmt.currency(periodStats.largest)} color="var(--gold)"/>}
              </div>

              {/* Table */}
              {filteredPurchases.length === 0 ? (
                <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
                  <FileText size={32} style={{ opacity:0.3, marginBottom:10 }}/>
                  <div style={{ fontWeight:600 }}>No transactions {orderPeriod==='monthly'?'this month':'yet'}</div>
                </div>
              ) : (
                <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', borderRadius:10, border:'1px solid var(--border)' }}>
                  <table style={{ minWidth:520, width:'100%' }}>
                    <thead>
                      <tr><th>Date</th><th>Invoice</th><th>Qty (Bags)</th><th>Unit Price</th><th>Total</th><th>Method</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map(p => (
                        <tr key={p.id}>
                          <td style={{ whiteSpace:'nowrap', fontSize:12, color:'var(--text-muted)' }}>{fmt.date(p.date)}</td>
                          <td style={{ fontSize:12, fontFamily:'monospace', color:'var(--primary)' }}>{p.invoice_number}</td>
                          <td style={{ fontWeight:700 }}>{fmt.number(p.quantity)}</td>
                          <td style={{ fontSize:12.5 }}>{fmt.currency(p.selling_price)}</td>
                          <td style={{ fontWeight:800, color:'var(--primary)' }}>{fmt.currency(p.total_sales)}</td>
                          <td><span className="badge badge-blue" style={{ fontSize:10 }}>{p.payment_method}</span></td>
                          <td><span className={`badge ${p.payment_status==='Paid'?'badge-green':'badge-red'}`} style={{ fontSize:10 }}>{p.payment_status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="tfoot-row">
                        <td colSpan={2} style={{ fontWeight:700 }}>TOTAL {orderPeriod==='alltime'?'(All Time)':'(This Month)'}</td>
                        <td style={{ fontWeight:800 }}>{fmt.number(periodStats.bags)} bags</td>
                        <td></td>
                        <td style={{ fontWeight:800 }}>{fmt.currency(periodStats.revenue)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─ ANALYTICS ─ */}
          {activeTab === 'analytics' && (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {trendData.length === 0 ? (
                <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
                  <BarChart2 size={36} style={{ opacity:0.3, marginBottom:12 }}/>
                  <div style={{ fontWeight:600, fontSize:14 }}>No transaction data yet</div>
                  <div style={{ fontSize:12, marginTop:4 }}>Charts will appear once purchases are recorded</div>
                </div>
              ) : (
                <>
                  {/* Revenue area chart */}
                  <div className="card" style={{ marginBottom:0 }}>
                    <div className="card-header">
                      <span className="card-title">Revenue Over Time</span>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>Monthly · GHS</span>
                    </div>
                    <div className="card-body">
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={trendData} margin={{ top:10, right:20, left:10, bottom:0 }}>
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={color} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={color} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                          <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                          <YAxis
                            tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}
                            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                            width={48} label={{ value:'GHS', angle:-90, position:'insideLeft', offset:10, style:{ fontSize:10, fill:'var(--text-muted)' } }}
                          />
                          <Tooltip content={<ChartTip/>}/>
                          <Area type="monotone" dataKey="Revenue" name="Revenue" stroke={color} strokeWidth={2.5} fill="url(#revGrad)" dot={{ r:3, fill:color, strokeWidth:0 }} activeDot={{ r:5, strokeWidth:0 }}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Bags bar + Orders line side by side */}
                  <div className="client-charts-grid">
                    <div className="card" style={{ marginBottom:0 }}>
                      <div className="card-header">
                        <span className="card-title">Bags Purchased</span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>Monthly · Bags</span>
                      </div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={trendData} margin={{ top:8, right:16, left:8, bottom:0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                            <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                            <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} width={32} allowDecimals={false}
                              label={{ value:'Bags', angle:-90, position:'insideLeft', offset:14, style:{ fontSize:10, fill:'var(--text-muted)' } }}
                            />
                            <Tooltip content={<ChartTip/>}/>
                            <Bar dataKey="Bags" name="Bags" fill="var(--blue)" radius={[4,4,0,0]} maxBarSize={40}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card" style={{ marginBottom:0 }}>
                      <div className="card-header">
                        <span className="card-title">Orders Placed</span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>Monthly · Count</span>
                      </div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={trendData} margin={{ top:8, right:16, left:8, bottom:0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                            <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                            <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} width={32}
                              label={{ value:'Orders', angle:-90, position:'insideLeft', offset:14, style:{ fontSize:10, fill:'var(--text-muted)' } }}
                            />
                            <Tooltip content={<ChartTip/>}/>
                            <Line type="monotone" dataKey="Orders" name="Orders" stroke="var(--purple)" strokeWidth={2.5} dot={{ r:4, fill:'var(--purple)', strokeWidth:0 }} activeDot={{ r:6, strokeWidth:0 }}/>
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─ NOTES ─ */}
          {activeTab === 'notes' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ marginBottom:0 }}>
                <div className="card-header"><span className="card-title">Add Note</span></div>
                <div className="card-body">
                  <form onSubmit={handleAddNote}>
                    <div style={{ display:'flex', gap:10, marginBottom:10, flexWrap:'wrap' }}>
                      <select className="form-control" style={{ width:150 }} value={noteType} onChange={e=>setNoteType(e.target.value)}>
                        {NOTE_TYPES.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <textarea className="form-control" rows={2} value={noteText} onChange={e=>setNoteText(e.target.value)} style={{ resize:'vertical', marginBottom:10 }} placeholder="Write your note here…" required/>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={addingNote}>
                      {addingNote ? 'Saving…' : <><Plus size={13}/> Add Note</>}
                    </button>
                  </form>
                </div>
              </div>

              {(!notes||notes.length===0) ? (
                <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
                  <MessageSquare size={28} style={{ opacity:0.3, marginBottom:8 }}/>
                  <div style={{ fontWeight:600 }}>No notes yet</div>
                </div>
              ) : notes.map(n => (
                <div key={n.id} className="card" style={{ marginBottom:0 }}>
                  <div className="card-body" style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                          <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--primary-pale)', color:'var(--primary)' }}>{n.note_type}</span>
                          <span style={{ fontSize:11, color:'var(--text-muted)' }}>{n.author||'Staff'} · {fmt.date(n.created_at?.slice(0,10))}</span>
                        </div>
                        <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.6, margin:0 }}>{n.content}</p>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={()=>handleDeleteNote(n.id)} style={{ color:'var(--red)', flexShrink:0 }}><Trash2 size={13}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>{/* end client-tab-content */}
        </div>{/* end viewport-constrain wrapper */}
      </td>
    </tr>
  );
}

// ── Form field wrapper — OUTSIDE modal (prevents re-mount on every keystroke) ──
function F({ label, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT FORM MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function ClientModal({ client, onClose, onSaved }) {
  const [form, setForm]     = useState(client ? { ...client } : { ...EMPTY_CLIENT });
  const [saving, setSaving] = useState(false);
  const isEdit = !!client?.id;

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (isEdit) { await api.put(`/clients/${client.id}`, form); toast.success('Client updated'); }
      else        { await api.post('/clients', form); toast.success('Client added'); }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error||'Error saving.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth:600 }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Client' : 'Add New Client'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ fontSize:11, fontWeight:700, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Basic Info</div>
            <div className="form-grid" style={{ marginBottom:16 }}>
              <F label="Client Name *"><input className="form-control" value={form.name} onChange={e=>set('name',e.target.value)} required/></F>
              <F label="Company Name"><input className="form-control" value={form.company_name} onChange={e=>set('company_name',e.target.value)}/></F>
              <F label="Category">
                <select className="form-control" value={form.category} onChange={e=>set('category',e.target.value)}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </F>
              <F label="Status">
                <select className="form-control" value={form.status} onChange={e=>set('status',e.target.value)}>
                  {STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
                </select>
              </F>
            </div>

            <div style={{ fontSize:11, fontWeight:700, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Contact Details</div>
            <div className="form-grid" style={{ marginBottom:16 }}>
              <F label="Contact Person"><input className="form-control" value={form.contact_person} onChange={e=>set('contact_person',e.target.value)}/></F>
              <F label="Phone"><input className="form-control" value={form.phone} onChange={e=>set('phone',e.target.value)}/></F>
              <F label="Phone 2"><input className="form-control" value={form.phone2} onChange={e=>set('phone2',e.target.value)}/></F>
              <F label="Email"><input className="form-control" type="email" value={form.email} onChange={e=>set('email',e.target.value)}/></F>
            </div>

            <div style={{ fontSize:11, fontWeight:700, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Location</div>
            <div className="form-grid" style={{ marginBottom:16 }}>
              <F label="Address"><input className="form-control" value={form.address} onChange={e=>set('address',e.target.value)}/></F>
              <F label="City"><input className="form-control" value={form.city} onChange={e=>set('city',e.target.value)}/></F>
              <F label="Region">
                <select className="form-control" value={form.region} onChange={e=>set('region',e.target.value)}>
                  <option value="">Select region…</option>
                  {REGIONS_GH.map(r=><option key={r}>{r}</option>)}
                </select>
              </F>
              <F label="GPS Address"><input className="form-control" value={form.gps_address} onChange={e=>set('gps_address',e.target.value)}/></F>
            </div>

            <div style={{ fontSize:11, fontWeight:700, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Business Terms</div>
            <div className="form-grid" style={{ marginBottom:16 }}>
              <F label="Sales Representative"><input className="form-control" value={form.sales_rep} onChange={e=>set('sales_rep',e.target.value)}/></F>
              <F label="Tax ID"><input className="form-control" value={form.tax_id} onChange={e=>set('tax_id',e.target.value)}/></F>
              <F label="Payment Terms">
                <select className="form-control" value={form.payment_terms} onChange={e=>set('payment_terms',e.target.value)}>
                  {PAYMENT_OPTS.map(p=><option key={p}>{p}</option>)}
                </select>
              </F>
              <F label="Credit Limit (GHS)"><input className="form-control" type="number" min="0" value={form.credit_limit} onChange={e=>set('credit_limit',e.target.value)}/></F>
            </div>

            <F label="Notes / Special Instructions">
              <textarea className="form-control" rows={3} value={form.notes} onChange={e=>set('notes',e.target.value)} style={{ resize:'vertical' }}/>
            </F>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Update Client' : 'Add Client'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Clients() {
  const [clients, setClients]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [kpis, setKpis]             = useState(null);
  const [insights, setInsights]     = useState(null);
  const [regions, setRegions]       = useState([]);
  const [modal, setModal]           = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [activeView, setActiveView] = useState('directory');
  const LIMIT = 20;

  const loadClients = useCallback(() => {
    setLoading(true);
    api.get('/clients', { params:{ search, category:filterCat, status:filterStatus, region:filterRegion, page, limit:LIMIT } })
      .then(r => { setClients(r.data.clients); setTotal(r.data.total); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, filterCat, filterStatus, filterRegion, page]);

  useEffect(() => { loadClients(); }, [loadClients]);

  useEffect(() => {
    api.get('/clients/kpis').then(r=>setKpis(r.data)).catch(()=>{});
    api.get('/clients/insights').then(r=>setInsights(r.data)).catch(()=>{});
    api.get('/clients/regions').then(r=>setRegions(r.data)).catch(()=>{});
  }, []);

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await api.delete(`/clients/${id}`);
    toast.success('Client deleted.');
    loadClients();
    if (expandedId === id) setExpandedId(null);
  }

  function onSaved() {
    setModal(null); loadClients();
    api.get('/clients/kpis').then(r=>setKpis(r.data));
  }

  const totalPages = Math.ceil(total / LIMIT);
  const catData = CATEGORIES.map(c => ({ name:c, value:clients.filter(cl=>cl.category===c).length })).filter(d=>d.value>0);

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Client Management</div>
          <div className="page-sub">CRM and Business Intelligence Dashboard</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <TabToggle
            options={[{key:'directory',label:'Directory'},{key:'insights',label:'Insights'}]}
            value={activeView}
            onChange={setActiveView}
          />
          <button className="btn btn-primary" onClick={()=>setModal(true)}>
            <Plus size={15}/> Add Client
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      {kpis && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(155px,1fr))', gap:12, marginBottom:24 }}>
          <KpiCard icon={Users}       label="Total Clients"    value={fmt.number(kpis.total_clients)}        color="var(--primary)"  sub={`${kpis.active_clients} active`}/>
          <KpiCard icon={Plus}        label="New This Month"   value={kpis.new_this_month}                   color="var(--green)"    sub="added recently"/>
          <KpiCard icon={DollarSign}  label="Total Revenue"    value={fmt.currency(kpis.total_revenue)}      color="var(--purple)"   sub="all time"/>
          <KpiCard icon={Package}     label="Bags Sold"        value={`${fmt.number(kpis.total_bags)} bags`} color="var(--blue)"     sub="all clients"/>
          <KpiCard icon={ShoppingCart} label="Avg Order Value" value={fmt.currency(kpis.avg_order_value)}    color="var(--orange)"   sub="per transaction"/>
          <KpiCard icon={RefreshCw}   label="Returning Rate"   value={fmt.percent(kpis.returning_rate)}      color="var(--gold)"     sub="placed 2+ orders"/>
          <KpiCard icon={Award}       label="Top Spender"      value={kpis.top_spender}                      color="var(--red)"      sub={fmt.currency(kpis.top_spender_rev)}/>
          <KpiCard icon={TrendingUp}  label="Top Volume"       value={kpis.top_volume}                       color="var(--primary)"  sub={`${fmt.number(kpis.top_volume_bags)} bags`}/>
        </div>
      )}

      {/* ══ DIRECTORY VIEW ══════════════════════════════════════════════ */}
      {activeView === 'directory' && (
        <div>
          {/* Search & Filter bar */}
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:180 }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
              <input className="form-control" style={{ paddingLeft:32 }} value={search}
                onChange={e=>{ setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, code, phone, email…"/>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowFilters(f=>!f)}>
              <Filter size={13}/> Filter {showFilters && <X size={11}/>}
            </button>
            <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>{total} client{total!==1?'s':''}</span>
          </div>

          {showFilters && (
            <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
              <select className="form-control" style={{ width:150 }} value={filterCat} onChange={e=>{ setFilterCat(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <select className="form-control" style={{ width:120 }} value={filterStatus} onChange={e=>{ setFilterStatus(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option>Active</option><option>Inactive</option>
              </select>
              <select className="form-control" style={{ width:170 }} value={filterRegion} onChange={e=>{ setFilterRegion(e.target.value); setPage(1); }}>
                <option value="">All Regions</option>
                {REGIONS_GH.map(r=><option key={r}>{r}</option>)}
              </select>
              {(filterCat||filterStatus||filterRegion) && (
                <button className="btn btn-ghost btn-sm" onClick={()=>{ setFilterCat(''); setFilterStatus(''); setFilterRegion(''); setPage(1); }}>
                  <X size={12}/> Clear
                </button>
              )}
            </div>
          )}

          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            <div className="table-wrap" style={{ minWidth:640 }}>
              {loading ? (
                <div style={{ textAlign:'center', padding:48 }}>
                  <div style={{ width:32, height:32, border:'3px solid var(--primary-pale)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
                </div>
              ) : clients.length === 0 ? (
                <div className="empty-state">
                  <Users size={36} style={{ opacity:0.25, marginBottom:10 }}/>
                  <h3>No clients found</h3>
                  <p>Add your first client or adjust your search filters.</p>
                  <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={13}/> Add Client</button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Client</th><th>Category</th><th>Contact</th><th>Region</th>
                      <th style={{ textAlign:'center' }}>Orders</th>
                      <th>Revenue</th><th>Last Purchase</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(c => (
                      <React.Fragment key={c.id}>
                        <tr
                          style={{ cursor:'pointer', background: expandedId===c.id ? 'var(--primary-pale)' : undefined }}
                          onClick={()=>setExpandedId(expandedId===c.id ? null : c.id)}
                        >
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <Avatar name={c.name} size={32} color={CAT_COLORS[c.category]}/>
                              <div>
                                <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>{c.client_code}</div>
                              </div>
                            </div>
                          </td>
                          <td><CatBadge cat={c.category}/></td>
                          <td style={{ fontSize:12 }}>
                            {c.phone && <div style={{ display:'flex', alignItems:'center', gap:4, color:'var(--text-muted)' }}><Phone size={10}/>{c.phone}</div>}
                            {c.email && <div style={{ display:'flex', alignItems:'center', gap:4, color:'var(--text-muted)' }}><Mail size={10}/>{c.email}</div>}
                          </td>
                          <td style={{ fontSize:12, color:'var(--text-muted)' }}>{c.region||'—'}</td>
                          <td style={{ fontWeight:700, textAlign:'center' }}>{c.total_orders||0}</td>
                          <td style={{ fontWeight:800, color:'var(--primary)', whiteSpace:'nowrap' }}>{fmt.currency(c.total_revenue||0)}</td>
                          <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{c.last_purchase_date ? fmt.date(c.last_purchase_date) : '—'}</td>
                          <td><StatusBadge status={c.status}/></td>
                          <td>
                            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                              <button className="btn btn-ghost btn-sm client-action-btn" onClick={e=>{ e.stopPropagation(); setModal(c); }} title="Edit"><Edit2 size={13}/></button>
                              <button className="btn btn-ghost btn-sm client-action-btn delete" onClick={e=>{ e.stopPropagation(); handleDelete(c.id,c.name); }} title="Delete"><Trash2 size={13}/></button>
                              <button
                                className="client-expand-btn"
                                onClick={e=>{ e.stopPropagation(); setExpandedId(expandedId===c.id ? null : c.id); }}
                                title={expandedId===c.id ? 'Collapse' : 'Expand'}
                              >
                                {expandedId===c.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expandedId === c.id && (
                          <ClientProfileRow
                            clientId={c.id}
                            onEdit={cl=>setModal(cl)}
                            onDelete={handleDelete}
                            allRanked={insights?.allRanked||[]}
                            kpis={kpis}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>{/* end table-wrap */}
            </div>{/* end scroll wrapper */}

            {totalPages > 1 && (
              <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Page {page} of {totalPages} · {total} total</span>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-ghost btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
                  <button className="btn btn-ghost btn-sm" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ INSIGHTS VIEW ═══════════════════════════════════════════════ */}
      {activeView === 'insights' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Top clients + Category — stacked on mobile via CSS class */}
          <div className="insights-top-grid">
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header">
                <span className="card-title" style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <Award size={15} style={{ color:'var(--gold)' }}/> Top Clients by Revenue
                </span>
              </div>
              <div className="card-body">
                {(insights?.mostProfitable||[]).length === 0
                  ? <div style={{ textAlign:'center', color:'var(--text-muted)', padding:24 }}>No data yet</div>
                  : (insights.mostProfitable||[]).map((c,i) => (
                    <div key={c.customer_name} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                      <div style={{ width:26, height:26, borderRadius:'50%', background:i===0?'var(--gold)':i===1?'#aaa':i===2?'#CD7F32':'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', flexShrink:0 }}>
                        {i+1}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.customer_name}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{c.orders} orders · {fmt.number(c.bags)} bags</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontWeight:800, color:'var(--primary)', fontSize:13 }}>{fmt.currency(c.rev)}</div>
                        {kpis?.total_revenue>0 && <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{fmt.percent((c.rev/kpis.total_revenue)*100)} share</div>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header">
                <span className="card-title" style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <Users size={14}/> Client Categories
                </span>
              </div>
              <div className="card-body">
                {clients.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                        {catData.map((entry,i)=><Cell key={i} fill={CAT_COLORS[entry.name]||PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v,n)=>[v+' clients',n]}/>
                      <Legend wrapperStyle={{ fontSize:11.5 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div style={{ textAlign:'center', color:'var(--text-muted)', padding:40 }}>Add clients to see distribution</div>}
              </div>
            </div>
          </div>

          {/* Business Intelligence */}
          <div className="card" style={{ marginBottom:0 }}>
            <div className="card-header">
              <span className="card-title" style={{ display:'flex', alignItems:'center', gap:7 }}>
                <Shield size={14} style={{ color:'var(--primary)' }}/> Business Intelligence
              </span>
            </div>
            <div className="card-body">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:12 }}>
                {(insights?.growing||[]).length > 0 && (
                  <div style={{ background:'var(--green-light)', border:'1px solid var(--green)', borderRadius:10, padding:'13px 15px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700, color:'var(--green)', fontSize:13, marginBottom:10 }}>
                      <TrendingUp size={14}/> Fastest Growing
                    </div>
                    {insights.growing.map(g=>(
                      <div key={g.customer_name} style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:5 }}>
                        <span style={{ fontWeight:600 }}>{g.customer_name}</span>
                        <span style={{ color:'var(--green)', fontWeight:700 }}>+{fmt.percent(g.growth)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(insights?.inactive90||[]).length > 0 && (
                  <div style={{ background:'var(--red-light)', border:'1px solid var(--red)', borderRadius:10, padding:'13px 15px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700, color:'var(--red)', fontSize:13, marginBottom:10 }}>
                      <AlertCircle size={14}/> Inactive 90+ Days
                    </div>
                    {insights.inactive90.map(c=>(
                      <div key={c.customer_name} style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:5 }}>
                        <span style={{ fontWeight:600 }}>{c.customer_name}</span>
                        <span style={{ color:'var(--text-muted)', fontSize:11 }}>Last: {fmt.date(c.last_date)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(insights?.mostProfitable||[]).length > 0 && kpis && (
                  <div style={{ background:'var(--primary-pale)', border:'1px solid var(--primary)', borderRadius:10, padding:'13px 15px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700, color:'var(--primary)', fontSize:13, marginBottom:10 }}>
                      <Star size={14}/> Revenue Concentration
                    </div>
                    <div style={{ fontSize:12.5, lineHeight:1.6 }}>
                      Top client contributes <strong>{kpis.total_revenue>0?fmt.percent((insights.mostProfitable[0]?.rev/kpis.total_revenue)*100):'0%'}</strong> of total revenue.
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:5 }}>
                      Returning client rate: <strong>{fmt.percent(kpis.returning_rate)}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Regional breakdown */}
          {regions.length > 0 && (
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header">
                <span className="card-title" style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <MapPin size={14} style={{ color:'var(--primary)' }}/> Regional Breakdown
                </span>
              </div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
                  {regions.map(r=>(
                    <div key={r.region} style={{ border:'1px solid var(--border)', borderRadius:10, padding:'11px 14px' }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>{r.region}</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>{r.clients} client{r.clients!==1?'s':''}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--primary)' }}>{fmt.currency(r.revenue)}</span>
                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>{fmt.number(r.bags)} bags</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Full ranking table */}
          {(insights?.allRanked||[]).length > 0 && (
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header">
                <span className="card-title" style={{ display:'flex', alignItems:'center', gap:7 }}><BarChart2 size={14}/> Full Client Rankings</span>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{insights.allRanked.length} clients</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Client</th><th>Orders</th><th>Bags</th><th>Revenue</th><th>Revenue Share</th></tr></thead>
                  <tbody>
                    {insights.allRanked.map((c,i) => (
                      <tr key={c.customer_name} style={{ cursor:'pointer' }} onClick={()=>{ setActiveView('directory'); }}>
                        <td style={{ fontWeight:800, color:i===0?'var(--gold)':i===1?'#aaa':i===2?'#CD7F32':'var(--text-muted)', width:40 }}>#{i+1}</td>
                        <td style={{ fontWeight:700 }}>{c.customer_name}</td>
                        <td style={{ textAlign:'center' }}>{c.orders}</td>
                        <td style={{ fontWeight:600 }}>{fmt.number(c.bags)}</td>
                        <td style={{ fontWeight:800, color:'var(--primary)' }}>{fmt.currency(c.revenue)}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:5, background:'var(--border)', borderRadius:99 }}>
                              <div style={{ width:`${kpis?.total_revenue>0?(c.revenue/kpis.total_revenue)*100:0}%`, height:'100%', background:'var(--primary)', borderRadius:99 }}/>
                            </div>
                            <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0, minWidth:36 }}>
                              {kpis?.total_revenue>0?fmt.percent((c.revenue/kpis.total_revenue)*100):'0%'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {modal && (
        <ClientModal
          client={typeof modal === 'object' && modal.id ? modal : null}
          onClose={()=>setModal(null)}
          onSaved={onSaved}
        />
      )}

      <style>{`
        /* ── Insights grid: 2-col desktop, 1-col mobile ────────────── */
        .insights-top-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 16px;
        }

        /* ── Expanded row: hard-clamp to viewport, never overflow ─── */
        .client-expanded-wrap {
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          /* push content away from the edges on mobile */
          padding-bottom: 12px;
        }

        /* ── Tab content: safe padding, no overflow ───────────────── */
        .client-tab-content {
          padding: 16px 12px;
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
        }

        /* ── Cards inside expanded row: full-width, no bleed ────────  */
        .client-expanded-wrap .card {
          box-sizing: border-box;
          width: 100%;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        /* ── Overview cards: 3-col desktop → 1-col mobile ─────────── */
        .client-overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
          box-sizing: border-box;
          width: 100%;
        }

        /* ── Orders stats: auto desktop → 2-col mobile ─────────────── */
        .client-orders-stats {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 8px;
          margin-bottom: 16px;
          box-sizing: border-box;
          width: 100%;
        }

        /* ── Analytics charts: 2-col desktop → 1-col mobile ────────── */
        .client-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          box-sizing: border-box;
          width: 100%;
        }

        /* ── Sticky tabs ──────────────────────────────────────────── */
        .client-tabs-bar {
          display: flex;
          border-bottom: 1px solid var(--border);
          background: var(--card);
          overflow-x: auto;
          position: sticky;
          top: 60px;
          z-index: 20;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .client-tabs-bar::-webkit-scrollbar { display: none; }

        .client-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border: none;
          cursor: pointer;
          background: none;
          font-family: var(--font);
          font-weight: 600;
          font-size: 12.5px;
          color: var(--text-muted);
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .client-tab-btn:hover  { color: var(--text); background: var(--bg); }
        .client-tab-active     { color: var(--primary) !important; border-bottom-color: var(--primary) !important; }

        /* ── Expand chevron circle ────────────────────────────────── */
        .client-expand-btn {
          width: 30px; height: 30px;
          border-radius: 50%;
          border: 1.5px solid var(--border);
          background: var(--bg);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
          transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
          flex-shrink: 0;
        }
        .client-expand-btn:hover {
          background: var(--primary-pale);
          border-color: var(--primary);
          color: var(--primary);
          transform: scale(1.1);
        }

        /* ── Table action buttons (edit/delete) ───────────────────── */
        .client-action-btn {
          width: 28px !important;
          height: 28px !important;
          min-width: 28px !important;
          padding: 0 !important;
          border-radius: 7px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1.5px solid var(--border) !important;
          background: var(--card) !important;
          color: var(--text-muted) !important;
          transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .client-action-btn:hover {
          background: var(--primary-pale) !important;
          color: var(--primary) !important;
          border-color: var(--primary) !important;
          transform: scale(1.08);
        }
        .client-action-btn.delete:hover {
          background: #FEE2E2 !important;
          color: var(--red) !important;
          border-color: var(--red) !important;
        }

        /* ── Global button polish ─────────────────────────────────── */
        .btn:active        { transform: scale(0.96); }
        .btn-primary:hover { filter: brightness(1.07); }

        /* ── Mobile overrides ─────────────────────────────────────── */
        @media (max-width: 640px) {
          .insights-top-grid    { grid-template-columns: 1fr; }
          .client-overview-grid { grid-template-columns: 1fr; }
          .client-charts-grid   { grid-template-columns: 1fr; }
          .client-orders-stats  { grid-template-columns: 1fr 1fr; }
          .client-tab-content   { padding: 12px 10px; }
          .client-tabs-bar      { top: 56px; }
        }
      `}</style>
    </div>
  );
}
