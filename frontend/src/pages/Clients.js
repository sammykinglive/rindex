import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, Eye, ChevronDown, ChevronUp,
  Phone, Mail, MapPin, User, Building2, Tag, Star, TrendingUp,
  TrendingDown, AlertCircle, Download, FileText, BarChart2,
  MessageSquare, Calendar, Award, RefreshCw, Filter,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../utils/api';
import { fmt, MONTHS } from '../utils/format';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES   = ['Corporate', 'Retail', 'Wholesale', 'Traditional Market'];
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

// ── Tooltip ───────────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'9px 13px', fontSize:13 }}>
      <div style={{ fontWeight:700, marginBottom:4, color:'var(--text)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:p.color, display:'inline-block' }} />
          <span style={{ color:'var(--text-muted)' }}>{p.name}:</span>
          <span style={{ fontWeight:700 }}>{p.name.includes('Rev') || p.name === 'Revenue' ? fmt.currency(p.value) : fmt.number(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="kpi-card" style={{ minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div className="kpi-icon-wrap" style={{ background: color + '18', flexShrink:0 }}>
          <Icon size={18} color={color} />
        </div>
        <div style={{ minWidth:0, flex:1 }}>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value" style={{ fontSize:17, marginTop:4 }}>{value}</div>
          {sub && <div className="kpi-sub" style={{ marginTop:4 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return <span className={`badge ${status === 'Active' ? 'badge-green' : 'badge-red'}`}>{status}</span>;
}
function CatBadge({ cat }) {
  const color = CAT_COLORS[cat] || 'var(--primary)';
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background: color+'18', color, border:`1px solid ${color}30`, whiteSpace:'nowrap' }}>
      {cat}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 34, color }) {
  const initials = name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || '??';
  const bg = color || CAT_COLORS['Retail'];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg+'22', border:`2px solid ${bg}44`, display:'flex', alignItems:'center', justifyContent:'center', color:bg, fontWeight:800, fontSize:size*0.34, flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ── Sparkline mini bar chart ──────────────────────────────────────────────────
function Sparkline({ data }) {
  if (!data || data.length === 0) return <span style={{ color:'var(--text-muted)', fontSize:12 }}>No data</span>;
  const max = Math.max(...data.map(d=>d.revenue), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:28 }}>
      {data.slice(-6).map((d,i) => (
        <div key={i} style={{ flex:1, height: Math.max((d.revenue/max)*28, 2), background:'var(--primary)', borderRadius:2, opacity:0.6+i*0.07 }} title={`${d.month}: ${fmt.currency(d.revenue)}`} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT PROFILE PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function ClientProfile({ clientId, onClose, onEdit, onDelete, allRanked }) {
  const { user } = useAuth();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('General');
  const [addingNote, setAddingNote] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState('monthly');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/clients/${clientId}`).then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <div style={{ width:36, height:36, border:'3px solid var(--primary-pale)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  );

  const { client, lifetime, thisMonth, lastMonth, monthlyTrend, purchases, notes, revenueRank, bagsRank, totalClients, avgDaysBetween, revGrowth } = data;
  const color = CAT_COLORS[client.category] || 'var(--primary)';

  // Revenue rank among all clients for display
  const revenueShare = allRanked && allRanked.length > 0
    ? ((lifetime?.revenue || 0) / allRanked.reduce((s,r) => s + (r.revenue||0), 0)) * 100 : 0;

  // Chart data
  const trendData = (monthlyTrend || []).map(m => ({
    name: m.month.slice(5), bags: m.bags, Revenue: m.revenue, orders: m.orders,
  }));

  const TABS = ['overview','purchases','analytics','notes'];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* ── Profile Header ─────────────────────────────────────────── */}
      <div style={{ background:`linear-gradient(135deg, ${color}22 0%, var(--card) 100%)`, borderBottom:'1px solid var(--border)', padding:'20px 24px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
          <Avatar name={client.name} size={52} color={color} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text)', margin:0 }}>{client.name}</h2>
              <StatusBadge status={client.status} />
            </div>
            {client.company_name && <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{client.company_name}</div>}
            <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
              <CatBadge cat={client.category} />
              <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace' }}>{client.client_code}</span>
              {revenueRank && <span style={{ fontSize:12, color:'var(--gold)', fontWeight:700 }}>#{revenueRank} of {totalClients} by revenue</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(client)}><Edit2 size={14}/></button>
            <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }} onClick={() => { onDelete(client.id, client.name); onClose(); }}><Trash2 size={14}/></button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
          </div>
        </div>

        {/* Quick stats strip */}
        <div style={{ display:'flex', gap:20, marginTop:16, flexWrap:'wrap' }}>
          {[
            ['Total Revenue', fmt.currency(lifetime?.revenue || 0), color],
            ['Total Orders',  fmt.number(lifetime?.orders || 0),    'var(--blue)'],
            ['Total Bags',    fmt.number(lifetime?.bags || 0)+'  bags', 'var(--green)'],
            ['Last Purchase', fmt.date(lifetime?.last_date),         'var(--text-muted)'],
          ].map(([lbl, val, c]) => (
            <div key={lbl}>
              <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{lbl}</div>
              <div style={{ fontSize:14, fontWeight:800, color:c, marginTop:2 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', background:'var(--card)', flexShrink:0, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding:'11px 18px', border:'none', cursor:'pointer', background:'none',
            fontFamily:'var(--font)', fontWeight:600, fontSize:13,
            color: activeTab===t ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab===t ? '2px solid var(--primary)' : '2px solid transparent',
            transition:'all 0.15s', whiteSpace:'nowrap', textTransform:'capitalize',
          }}>
            {t === 'notes' ? `Notes (${notes?.length||0})` : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

        {/* ─ OVERVIEW ─ */}
        {activeTab === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Contact Info */}
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header"><span className="card-title">Contact Information</span></div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[
                    [Phone, 'Phone', client.phone || '—'],
                    [Phone, 'Phone 2', client.phone2 || '—'],
                    [Mail,  'Email',   client.email || '—'],
                    [User,  'Contact', client.contact_person || '—'],
                    [MapPin,'Address', [client.address, client.city, client.region].filter(Boolean).join(', ') || '—'],
                    [MapPin,'GPS',     client.gps_address || '—'],
                    [Building2,'Tax ID', client.tax_id || '—'],
                    [User,  'Sales Rep', client.sales_rep || '—'],
                  ].map(([Icon, lbl, val]) => (
                    <div key={lbl} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                      <Icon size={13} style={{ color:'var(--text-muted)', marginTop:3, flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600 }}>{lbl}</div>
                        <div style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop:'1px solid var(--border)', marginTop:12, paddingTop:12, display:'flex', gap:16, flexWrap:'wrap' }}>
                  <div><span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>PAYMENT TERMS</span><div style={{ fontWeight:700, color:'var(--text)' }}>{client.payment_terms}</div></div>
                  <div><span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>CREDIT LIMIT</span><div style={{ fontWeight:700, color:'var(--text)' }}>{client.credit_limit > 0 ? fmt.currency(client.credit_limit) : 'None'}</div></div>
                </div>
              </div>
            </div>

            {/* This month vs last */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="card" style={{ marginBottom:0 }}>
                <div className="card-header"><span className="card-title" style={{ fontSize:12 }}>This Month</span></div>
                <div className="card-body" style={{ paddingTop:10 }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'var(--primary)' }}>{fmt.currency(thisMonth?.revenue||0)}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{fmt.number(thisMonth?.bags||0)} bags · {thisMonth?.orders||0} orders</div>
                </div>
              </div>
              <div className="card" style={{ marginBottom:0 }}>
                <div className="card-header"><span className="card-title" style={{ fontSize:12 }}>vs Last Month</span></div>
                <div className="card-body" style={{ paddingTop:10 }}>
                  <div style={{ fontSize:20, fontWeight:800, color: revGrowth >= 0 ? 'var(--green)' : 'var(--red)', display:'flex', alignItems:'center', gap:6 }}>
                    {revGrowth >= 0 ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                    {fmt.percent(Math.abs(revGrowth))}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Prev: {fmt.currency(lastMonth?.revenue||0)}</div>
                </div>
              </div>
            </div>

            {/* Lifetime stats */}
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header"><span className="card-title">Lifetime Summary</span></div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {[
                    ['Total Revenue', fmt.currency(lifetime?.revenue||0), 'var(--primary)'],
                    ['Total Bags', fmt.number(lifetime?.bags||0), 'var(--blue)'],
                    ['Total Orders', lifetime?.orders||0, 'var(--purple)'],
                    ['Avg Order Value', fmt.currency(lifetime?.avg_value||0), 'var(--green)'],
                    ['Avg Bags/Order', fmt.number(lifetime?.avg_bags||0), 'var(--orange)'],
                    ['Largest Order', fmt.currency(lifetime?.largest_order||0), 'var(--gold)'],
                  ].map(([lbl,val,c]) => (
                    <div key={lbl} style={{ textAlign:'center', padding:'10px 0' }}>
                      <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px' }}>{lbl}</div>
                      <div style={{ fontSize:15, fontWeight:800, color:c, marginTop:4 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop:'1px solid var(--border)', marginTop:12, paddingTop:12, display:'flex', gap:20, flexWrap:'wrap', fontSize:12 }}>
                  <div><span style={{ color:'var(--text-muted)' }}>First Purchase: </span><strong>{fmt.date(lifetime?.first_date)}</strong></div>
                  <div><span style={{ color:'var(--text-muted)' }}>Last Purchase: </span><strong>{fmt.date(lifetime?.last_date)}</strong></div>
                  {avgDaysBetween && <div><span style={{ color:'var(--text-muted)' }}>Avg days between orders: </span><strong>{avgDaysBetween} days</strong></div>}
                  {revenueRank && <div><span style={{ color:'var(--text-muted)' }}>Revenue rank: </span><strong style={{ color:'var(--gold)' }}>#{revenueRank} of {totalClients}</strong></div>}
                  {bagsRank && <div><span style={{ color:'var(--text-muted)' }}>Volume rank: </span><strong style={{ color:'var(--blue)' }}>#{bagsRank} of {totalClients}</strong></div>}
                  <div><span style={{ color:'var(--text-muted)' }}>Revenue share: </span><strong>{fmt.percent(revenueShare)}</strong></div>
                </div>
              </div>
            </div>

            {/* General notes */}
            {client.notes && (
              <div className="card" style={{ marginBottom:0 }}>
                <div className="card-header"><span className="card-title">Client Notes</span></div>
                <div className="card-body"><p style={{ fontSize:13, color:'var(--text)', lineHeight:1.6, margin:0 }}>{client.notes}</p></div>
              </div>
            )}
          </div>
        )}

        {/* ─ PURCHASES ─ */}
        {activeTab === 'purchases' && (
          <div>
            <div style={{ marginBottom:12, fontSize:13, color:'var(--text-muted)' }}>
              {purchases?.length || 0} total transaction{(purchases?.length||0) !== 1 ? 's' : ''}
            </div>
            {(!purchases || purchases.length === 0) ? (
              <div className="empty-state"><div className="empty-state-icon">🧾</div><h3>No purchases yet</h3><p>Transactions will appear here once recorded.</p></div>
            ) : (
              <div className="table-wrap" style={{ borderRadius:10, overflow:'hidden' }}>
                <table>
                  <thead>
                    <tr><th>Date</th><th>Invoice</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Method</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {purchases.map(p => (
                      <tr key={p.id}>
                        <td style={{ whiteSpace:'nowrap', fontSize:12, color:'var(--text-muted)' }}>{fmt.date(p.date)}</td>
                        <td style={{ fontSize:12, fontFamily:'monospace', color:'var(--primary)' }}>{p.invoice_number}</td>
                        <td style={{ fontWeight:700 }}>{fmt.number(p.quantity)} bags</td>
                        <td style={{ fontSize:12.5 }}>{fmt.currency(p.selling_price)}</td>
                        <td style={{ fontWeight:800, color:'var(--primary)' }}>{fmt.currency(p.total_sales)}</td>
                        <td><span className="badge badge-blue" style={{ fontSize:10 }}>{p.payment_method}</span></td>
                        <td><span className={`badge ${p.payment_status==='Paid' ? 'badge-green' : 'badge-red'}`} style={{ fontSize:10 }}>{p.payment_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="tfoot-row">
                      <td colSpan={2} style={{ fontWeight:700 }}>TOTAL</td>
                      <td style={{ fontWeight:800 }}>{fmt.number(lifetime?.bags||0)} bags</td>
                      <td></td>
                      <td style={{ fontWeight:800 }}>{fmt.currency(lifetime?.revenue||0)}</td>
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
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {trendData.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📈</div><h3>No transaction data yet</h3><p>Charts will appear once purchases are recorded.</p></div>
            ) : (
              <>
                <div className="card" style={{ marginBottom:0 }}>
                  <div className="card-header"><span className="card-title">Revenue Trend</span></div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={trendData} margin={{ top:4, right:4, left:0, bottom:0 }}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                        <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                        <YAxis hide/>
                        <Tooltip content={<ChartTip/>}/>
                        <Area type="monotone" dataKey="Revenue" name="Revenue" stroke="var(--primary)" strokeWidth={2.2} fill="url(#revGrad)" dot={false} activeDot={{ r:4 }}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card" style={{ marginBottom:0 }}>
                  <div className="card-header"><span className="card-title">Volume Trend (Bags)</span></div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={trendData} margin={{ top:4, right:4, left:0, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                        <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                        <YAxis hide/>
                        <Tooltip content={<ChartTip/>}/>
                        <Bar dataKey="bags" name="Bags" fill="var(--blue)" radius={[4,4,0,0]} maxBarSize={32}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="card" style={{ marginBottom:0 }}>
                    <div className="card-header"><span className="card-title">Orders per Month</span></div>
                    <div className="card-body">
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={trendData}>
                          <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                          <YAxis hide/>
                          <Tooltip content={<ChartTip/>}/>
                          <Bar dataKey="orders" name="Orders" fill="var(--purple)" radius={[3,3,0,0]} maxBarSize={24}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="card" style={{ marginBottom:0 }}>
                    <div className="card-header"><span className="card-title">Ranking</span></div>
                    <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {revenueRank && (
                        <div>
                          <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>Revenue</div>
                          <div style={{ fontSize:18, fontWeight:800, color:'var(--gold)' }}>#{revenueRank} <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)' }}>of {totalClients}</span></div>
                          <div style={{ background:'var(--border)', borderRadius:99, height:5, marginTop:4 }}>
                            <div style={{ width:`${Math.max(((totalClients-revenueRank)/totalClients)*100,3)}%`, height:'100%', background:'var(--gold)', borderRadius:99 }}/>
                          </div>
                        </div>
                      )}
                      {bagsRank && (
                        <div>
                          <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>Volume</div>
                          <div style={{ fontSize:18, fontWeight:800, color:'var(--blue)' }}>#{bagsRank} <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)' }}>of {totalClients}</span></div>
                          <div style={{ background:'var(--border)', borderRadius:99, height:5, marginTop:4 }}>
                            <div style={{ width:`${Math.max(((totalClients-bagsRank)/totalClients)*100,3)}%`, height:'100%', background:'var(--blue)', borderRadius:99 }}/>
                          </div>
                        </div>
                      )}
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
            {/* Add note form */}
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header"><span className="card-title">Add Note</span></div>
              <div className="card-body">
                <form onSubmit={handleAddNote}>
                  <div className="form-group" style={{ marginBottom:10 }}>
                    <label className="form-label">Type</label>
                    <select className="form-control" value={noteType} onChange={e=>setNoteType(e.target.value)}>
                      {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom:10 }}>
                    <label className="form-label">Note</label>
                    <textarea className="form-control" rows={3} value={noteText} onChange={e=>setNoteText(e.target.value)} style={{ resize:'vertical' }} required/>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={addingNote}>
                    {addingNote ? 'Saving…' : <><Plus size={13}/> Add Note</>}
                  </button>
                </form>
              </div>
            </div>

            {/* Notes list */}
            {(!notes || notes.length === 0) ? (
              <div className="empty-state" style={{ padding:32 }}><div className="empty-state-icon">📝</div><h3>No notes yet</h3><p>Add meeting notes, follow-ups, preferences, and more.</p></div>
            ) : (
              notes.map(n => (
                <div key={n.id} className="card" style={{ marginBottom:0 }}>
                  <div className="card-body" style={{ paddingTop:12, paddingBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                          <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--primary-pale)', color:'var(--primary)' }}>{n.note_type}</span>
                          <span style={{ fontSize:11, color:'var(--text-muted)' }}>{n.author || 'Staff'} · {fmt.date(n.created_at?.slice(0,10))}</span>
                        </div>
                        <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.6, margin:0 }}>{n.content}</p>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteNote(n.id)} style={{ color:'var(--red)', flexShrink:0 }}><Trash2 size=12/></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT FORM MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function ClientModal({ client, onClose, onSaved }) {
  const [form, setForm]   = useState(client ? { ...client } : { ...EMPTY_CLIENT });
  const [saving, setSaving] = useState(false);
  const isEdit = !!client?.id;

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (isEdit) { await api.put(`/clients/${client.id}`, form); toast.success('Client updated ✅'); }
      else        { await api.post('/clients', form); toast.success('Client added ✅'); }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving client.'); }
    finally { setSaving(false); }
  }

  const F = ({ label, children }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:600, maxHeight:'92vh', display:'flex', flexDirection:'column' }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Client' : 'Add New Client'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
          <div className="modal-body" style={{ overflowY:'auto', flex:1 }}>
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
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? '✅ Update Client' : '✅ Add Client'}</button>
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
  // Directory state
  const [clients, setClients]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // KPIs & insights
  const [kpis, setKpis]         = useState(null);
  const [insights, setInsights] = useState(null);
  const [regions, setRegions]   = useState([]);

  // UI state
  const [modal, setModal]       = useState(null); // null | 'create' | clientObj
  const [profileId, setProfileId] = useState(null);
  const [activeView, setActiveView] = useState('directory'); // 'directory' | 'insights'

  const LIMIT = 20;

  const loadClients = useCallback(() => {
    setLoading(true);
    api.get('/clients', { params: { search, category: filterCat, status: filterStatus, region: filterRegion, page, limit: LIMIT } })
      .then(r => { setClients(r.data.clients); setTotal(r.data.total); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, filterCat, filterStatus, filterRegion, page]);

  useEffect(() => { loadClients(); }, [loadClients]);

  useEffect(() => {
    api.get('/clients/kpis').then(r => setKpis(r.data)).catch(()=>{});
    api.get('/clients/insights').then(r => setInsights(r.data)).catch(()=>{});
    api.get('/clients/regions').then(r => setRegions(r.data)).catch(()=>{});
  }, []);

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete client "${name}"? This cannot be undone.`)) return;
    await api.delete(`/clients/${id}`);
    toast.success('Client deleted.'); loadClients();
    if (profileId === id) setProfileId(null);
  }

  function onSaved() { setModal(null); loadClients(); api.get('/clients/kpis').then(r=>setKpis(r.data)); }

  const totalPages = Math.ceil(total / LIMIT);

  // Category breakdown for pie
  const catData = CATEGORIES.map(c => ({
    name: c, value: clients.filter(cl => cl.category === c).length
  })).filter(d => d.value > 0);

  return (
    <div style={{ position:'relative' }}>

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">👥 Client Management</div>
          <div className="page-sub">CRM & Business Intelligence Dashboard</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, padding:3 }}>
            {['directory','insights'].map(v => (
              <button key={v} onClick={()=>setActiveView(v)} style={{
                padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer',
                fontFamily:'var(--font)', fontSize:12.5, fontWeight:600,
                background: activeView===v ? 'var(--primary)' : 'transparent',
                color: activeView===v ? '#fff' : 'var(--text-muted)', transition:'all 0.2s',
              }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={()=>setModal(true)}>
            <Plus size={15}/> Add Client
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      {kpis && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:12, marginBottom:20 }}>
          <KpiCard icon={User}      label="Total Clients"      value={fmt.number(kpis.total_clients)}     color="var(--primary)"  sub={`${kpis.active_clients} active`}/>
          <KpiCard icon={Star}      label="New This Month"     value={kpis.new_this_month}                color="var(--green)"    sub="added this month"/>
          <KpiCard icon={TrendingUp} label="Total Revenue"     value={fmt.currency(kpis.total_revenue)}   color="var(--purple)"   sub="all time"/>
          <KpiCard icon={BarChart2} label="Total Bags Sold"    value={`${fmt.number(kpis.total_bags)} bags`} color="var(--blue)" sub="all clients"/>
          <KpiCard icon={FileText}  label="Avg Order Value"    value={fmt.currency(kpis.avg_order_value)} color="var(--orange)"  sub="per transaction"/>
          <KpiCard icon={RefreshCw} label="Returning Rate"     value={fmt.percent(kpis.returning_rate)}   color="var(--gold)"    sub=">1 order placed"/>
          <KpiCard icon={Award}     label="Top Spender"        value={kpis.top_spender}                   color="var(--red)"     sub={fmt.currency(kpis.top_spender_rev)}/>
          <KpiCard icon={Award}     label="Top Volume"         value={kpis.top_volume}                    color="var(--primary)" sub={`${fmt.number(kpis.top_volume_bags)} bags`}/>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* DIRECTORY VIEW                                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeView === 'directory' && (
        <div style={{ display:'flex', gap:16 }}>

          {/* Client table */}
          <div style={{ flex:1, minWidth:0 }}>
            {/* Controls */}
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:180 }}>
                <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
                <input className="form-control" style={{ paddingLeft:32 }} value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search clients…"/>
              </div>
              <button className={`btn btn-ghost btn-sm${showFilters?' btn-active':''}`} onClick={()=>setShowFilters(f=>!f)}><Filter size={13}/> Filter</button>
              <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>{total} client{total!==1?'s':''}</span>
            </div>

            {showFilters && (
              <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                <select className="form-control" style={{ width:140 }} value={filterCat} onChange={e=>{setFilterCat(e.target.value);setPage(1);}}>
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
                <select className="form-control" style={{ width:120 }} value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}}>
                  <option value="">All Status</option>
                  <option>Active</option><option>Inactive</option>
                </select>
                <select className="form-control" style={{ width:160 }} value={filterRegion} onChange={e=>{setFilterRegion(e.target.value);setPage(1);}}>
                  <option value="">All Regions</option>
                  {REGIONS_GH.map(r=><option key={r}>{r}</option>)}
                </select>
                {(filterCat||filterStatus||filterRegion) && (
                  <button className="btn btn-ghost btn-sm" onClick={()=>{setFilterCat('');setFilterStatus('');setFilterRegion('');setPage(1);}}><X size={13}/> Clear</button>
                )}
              </div>
            )}

            <div className="card">
              <div className="table-wrap">
                {loading ? (
                  <div style={{ textAlign:'center', padding:48 }}>
                    <div style={{ width:32, height:32, border:'3px solid var(--primary-pale)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <h3>No clients found</h3>
                    <p>Add your first client or adjust your search filters.</p>
                    <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={13}/> Add Client</button>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Client</th><th>Category</th><th>Contact</th><th>Region</th>
                        <th>Orders</th><th>Revenue</th><th>Last Purchase</th><th>Status</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map(c => (
                        <tr key={c.id} style={{ cursor:'pointer' }} onClick={()=>setProfileId(c.id)}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <Avatar name={c.name} size={30} color={CAT_COLORS[c.category]}/>
                              <div>
                                <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>{c.client_code}</div>
                              </div>
                            </div>
                          </td>
                          <td><CatBadge cat={c.category}/></td>
                          <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                            {c.phone && <div style={{ display:'flex', gap:4, alignItems:'center' }}><Phone size={10}/>{c.phone}</div>}
                            {c.email && <div style={{ display:'flex', gap:4, alignItems:'center' }}><Mail size={10}/>{c.email}</div>}
                          </td>
                          <td style={{ fontSize:12, color:'var(--text-muted)' }}>{c.region||'—'}</td>
                          <td style={{ fontWeight:700, textAlign:'center' }}>{c.total_orders||0}</td>
                          <td style={{ fontWeight:800, color:'var(--primary)', whiteSpace:'nowrap' }}>{fmt.currency(c.total_revenue||0)}</td>
                          <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmt.date(c.last_purchase_date)||'Never'}</td>
                          <td><StatusBadge status={c.status}/></td>
                          <td>
                            <div style={{ display:'flex', gap:4 }}>
                              <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();setModal(c);}} title="Edit"><Edit2 size={12}/></button>
                              <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }} onClick={e=>{e.stopPropagation();handleDelete(c.id,c.name);}} title="Delete"><Trash2 size={12}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>Page {page} of {totalPages} · {total} total</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-ghost btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
                    <button className="btn btn-ghost btn-sm" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Client Profile Side Panel */}
          {profileId && (
            <div style={{
              width:480, flexShrink:0,
              background:'var(--card)', borderRadius:'var(--radius)', border:'1px solid var(--border)',
              boxShadow:'var(--shadow-lg)', display:'flex', flexDirection:'column',
              height:'calc(100vh - 160px)', position:'sticky', top:80, overflow:'hidden',
            }}>
              <ClientProfile
                clientId={profileId}
                onClose={()=>setProfileId(null)}
                onEdit={c=>setModal(c)}
                onDelete={handleDelete}
                allRanked={insights?.allRanked || []}
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* INSIGHTS VIEW                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeView === 'insights' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Top clients + Category pie */}
          <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>

            {/* Top 5 by revenue */}
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header"><span className="card-title">🏆 Top Clients by Revenue</span></div>
              <div className="card-body">
                {(insights?.mostProfitable || []).map((c,i) => (
                  <div key={c.customer_name} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background: i===0?'var(--gold)':i===1?'var(--border)':i===2?'#CD7F32':'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color: i<3?'#fff':'var(--text-muted)', flexShrink:0 }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.customer_name}</div>
                      <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--text-muted)' }}>
                        <span>{c.orders} orders</span><span>{fmt.number(c.bags)} bags</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontWeight:800, color:'var(--primary)', fontSize:13 }}>{fmt.currency(c.rev)}</div>
                      {kpis?.total_revenue > 0 && <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{fmt.percent((c.rev/kpis.total_revenue)*100)} share</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category distribution */}
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header"><span className="card-title">Client Categories</span></div>
              <div className="card-body">
                {clients.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                        {catData.map((entry,i) => <Cell key={i} fill={CAT_COLORS[entry.name]||PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v,n)=>[v+' clients',n]}/>
                      <Legend wrapperStyle={{ fontSize:11 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div style={{ textAlign:'center', color:'var(--text-muted)', padding:40 }}>No data yet</div>}
              </div>
            </div>
          </div>

          {/* Business Intelligence alerts */}
          <div className="card" style={{ marginBottom:0 }}>
            <div className="card-header"><span className="card-title">💡 Business Intelligence</span></div>
            <div className="card-body">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>

                {/* Fastest growing */}
                {(insights?.growing||[]).length > 0 && (
                  <div style={{ background:'var(--green-light)', border:'1px solid var(--green)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700, color:'var(--green)', fontSize:13, marginBottom:8 }}>
                      <TrendingUp size={14}/> Fastest Growing
                    </div>
                    {insights.growing.map(g => (
                      <div key={g.customer_name} style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:4 }}>
                        <span style={{ fontWeight:600 }}>{g.customer_name}</span>
                        <span style={{ color:'var(--green)', fontWeight:700 }}>+{fmt.percent(g.growth)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inactive 90 days */}
                {(insights?.inactive90||[]).length > 0 && (
                  <div style={{ background:'var(--red-light)', border:'1px solid var(--red)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700, color:'var(--red)', fontSize:13, marginBottom:8 }}>
                      <AlertCircle size={14}/> Inactive 90+ Days
                    </div>
                    {insights.inactive90.map(c => (
                      <div key={c.customer_name} style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:4 }}>
                        <span style={{ fontWeight:600 }}>{c.customer_name}</span>
                        <span style={{ color:'var(--text-muted)' }}>Last: {fmt.date(c.last_date)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Revenue concentration */}
                {(insights?.mostProfitable||[]).length > 0 && kpis && (
                  <div style={{ background:'var(--primary-pale)', border:'1px solid var(--primary)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700, color:'var(--primary)', fontSize:13, marginBottom:8 }}>
                      <Star size={14}/> Revenue Concentration
                    </div>
                    <div style={{ fontSize:12.5 }}>
                      Top client contributes <strong>{kpis.total_revenue>0 ? fmt.percent((insights.mostProfitable[0]?.rev/kpis.total_revenue)*100) : '0%'}</strong> of revenue.
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
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
              <div className="card-header"><span className="card-title">🗺️ Regional Breakdown</span></div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
                  {regions.map(r => (
                    <div key={r.region} style={{ border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px' }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>{r.region}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', flexDirection:'column', gap:2 }}>
                        <span>{r.clients} client{r.clients!==1?'s':''}</span>
                        <span style={{ fontWeight:700, color:'var(--primary)' }}>{fmt.currency(r.revenue)}</span>
                        <span>{fmt.number(r.bags)} bags</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Full client ranking table */}
          {(insights?.allRanked||[]).length > 0 && (
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header">
                <span className="card-title">Full Client Rankings</span>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{insights.allRanked.length} clients</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Client</th><th>Orders</th><th>Bags</th><th>Revenue</th><th>Rev Share</th></tr></thead>
                  <tbody>
                    {insights.allRanked.map((c,i) => (
                      <tr key={c.customer_name} style={{ cursor:'pointer' }} onClick={()=>{
                        const found = clients.find(cl=>cl.name.toLowerCase().trim()===c.customer_name.toLowerCase().trim());
                        if (found) { setProfileId(found.id); setActiveView('directory'); }
                      }}>
                        <td style={{ fontWeight:800, color: i===0?'var(--gold)':i===1?'var(--text-muted)':i===2?'#CD7F32':'var(--text-muted)', width:40 }}>#{i+1}</td>
                        <td style={{ fontWeight:700 }}>{c.customer_name}</td>
                        <td style={{ textAlign:'center' }}>{c.orders}</td>
                        <td style={{ fontWeight:600 }}>{fmt.number(c.bags)}</td>
                        <td style={{ fontWeight:800, color:'var(--primary)' }}>{fmt.currency(c.revenue)}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ flex:1, height:5, background:'var(--border)', borderRadius:99 }}>
                              <div style={{ width:`${kpis?.total_revenue>0?(c.revenue/kpis.total_revenue)*100:0}%`, height:'100%', background:'var(--primary)', borderRadius:99 }}/>
                            </div>
                            <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{kpis?.total_revenue>0?fmt.percent((c.revenue/kpis.total_revenue)*100):'0%'}</span>
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

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {modal && (
        <ClientModal
          client={typeof modal === 'object' && modal.id ? modal : null}
          onClose={()=>setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
