import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Calendar, User, CreditCard, Hash, Download, Search } from 'lucide-react';
import api from '../utils/api';
import { fmt, MONTH_NAMES } from '../utils/format';
import toast from 'react-hot-toast';
import { exportExpensesToExcel } from '../utils/exportExcel';
import { exportExpensesPDF } from '../utils/exportPDF';

const CATEGORIES = [
  'Warehouse Rent','Transport / Logistics','Labour / Staff',
  'Driver Allowance','Fuel','Utilities','Office Supplies',
  'Marketing','Meals / Lunch','Maintenance','Other',
];
const PAYMENT_METHODS = ['Cash','Mobile Money','Bank Transfer','Cheque'];
const CAT_COLORS = {
  'Warehouse Rent':'#02A793','Transport / Logistics':'#F97316',
  'Labour / Staff':'#10B981','Driver Allowance':'#3B82F6',
  'Fuel':'#EF4444','Utilities':'#8B5CF6','Office Supplies':'#F59E0B',
  'Marketing':'#EC4899','Meals / Lunch':'#14B8A6',
  'Maintenance':'#6B7280','Other':'#9CA3AF',
};

const CHART_HEIGHT = 110;

const EMPTY = {
  date: new Date().toISOString().slice(0,10),
  category: 'Warehouse Rent', amount: '',
  paid_by: '', paid_to: '', receipt_no: '',
  payment_method: 'Cash', description: '',
  commodity_id: '',
};

const VIEW_MONTH   = 'month';
const VIEW_YEAR    = 'year';
const VIEW_ALLTIME = 'alltime';

function IconInput({ icon: Icon, ...props }) {
  return (
    <div style={{ position:'relative' }}>
      <Icon size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
      <input {...props} style={{ ...props.style, paddingLeft:32 }}/>
    </div>
  );
}

function TrendChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div style={{ width:'100%' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:CHART_HEIGHT }}>
        {data.map((d, i) => {
          const barH = Math.max((d.total / max) * CHART_HEIGHT, d.total > 0 ? 4 : 2);
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%', minWidth:0 }}>
              <div
                title={`${d.label}: ${fmt.currency(d.total)}`}
                style={{ width:'100%', height:barH, background: d.total > 0 ? 'var(--primary)' : 'var(--border)', borderRadius:'4px 4px 0 0', transition:'height 0.4s ease', opacity: d.total > 0 ? 1 : 0.25 }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:4, marginTop:4 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex:1, textAlign:'center', fontSize:9.5, color:'var(--text-muted)', fontWeight:600, overflow:'hidden', minWidth:0 }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Expenses() {
  const now = new Date();
  const [viewMode, setViewMode]       = useState(VIEW_MONTH);
  const [month, setMonth]             = useState(now.getMonth() + 1);
  const [year, setYear]               = useState(now.getFullYear());
  const [filterCommodity, setFilterCommodity] = useState('');
  const [commodities, setCommodities] = useState([]);
  const [expenses, setExpenses]       = useState([]);
  const [byCategory, setByCategory]   = useState([]);
  const [total, setTotal]             = useState(0);
  const [trendData, setTrendData]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY);
  const [saving, setSaving]           = useState(false);
  const [expanded, setExpanded]       = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]     = useState(false);
  const [showSearch, setShowSearch]   = useState(false);

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) years.push(y);

  // Load active commodities
  useEffect(() => {
    api.get('/commodities')
      .then(r => setCommodities((r.data||[]).filter(c => c.is_active)))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (viewMode === VIEW_ALLTIME)    params.allTime = true;
    else if (viewMode === VIEW_YEAR)  { params.allYear = true; params.year = year; }
    else                              { params.month = month; params.year = year; }
    if (filterCommodity) params.commodity_id = filterCommodity;

    api.get('/dashboard/expenses', { params }).then(r => {
      setExpenses(r.data.expenses   || []);
      setTotal(r.data.total         || 0);
      setByCategory(r.data.byCategory || []);
      setTrendData(r.data.trend     || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [viewMode, month, year, filterCommodity]);

  useEffect(() => { load(); }, [load]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Enter a valid amount.');
    setSaving(true);
    try {
      await api.post('/dashboard/expenses', {
        ...form, amount: parseFloat(form.amount), month, year,
        commodity_id: form.commodity_id || null,
      });
      toast.success('Expense recorded! ✅');
      setForm({ ...EMPTY, date: new Date().toISOString().slice(0,10) });
      setShowForm(false); load();
    } catch { toast.error('Error saving expense.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense entry?')) return;
    await api.delete(`/dashboard/expenses/${id}`);
    toast.success('Deleted.'); load();
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await api.get('/dashboard/expenses/search', { params:{ q: searchQuery.trim() } });
      setSearchResults(r.data.results || []);
    } catch { toast.error('Search failed.'); }
    finally { setSearching(false); }
  }

  const methodBadge = { Cash:'badge-green','Mobile Money':'badge-blue','Bank Transfer':'badge-purple',Cheque:'badge-gold' };

  const periodLabel = viewMode === VIEW_ALLTIME
    ? 'All Time'
    : viewMode === VIEW_YEAR
      ? `Year ${year}`
      : `${MONTH_NAMES[month-1]} ${year}`;

  const filterComm = commodities.find(c => c.id === parseInt(filterCommodity));
  const fullLabel  = `${periodLabel}${filterComm ? ` — ${filterComm.name}` : ''}`;

  return (
    <div>
      {/* ── Controls Bar ───────────────────────────────────────────── */}
      <div className="page-header" style={{ flexWrap:'wrap', gap:10 }}>
        <div>
          <div className="page-title">Expenses</div>
          <div className="page-sub">Track and manage all operating costs</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {/* View mode tabs */}
          <div style={{ display:'flex', background:'var(--surface-alt)', borderRadius:'var(--radius)', padding:3, gap:2 }}>
            {[{key:VIEW_MONTH,label:'Month'},{key:VIEW_YEAR,label:'Year'},{key:VIEW_ALLTIME,label:'All Time'}].map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key)} style={{
                padding:'5px 12px', borderRadius:'calc(var(--radius) - 2px)', border:'none', cursor:'pointer', fontSize:12.5, fontWeight:600,
                background: viewMode===v.key ? 'var(--primary)' : 'transparent',
                color: viewMode===v.key ? '#fff' : 'var(--text-muted)', transition:'all 0.18s',
              }}>{v.label}</button>
            ))}
          </div>
          {viewMode === VIEW_MONTH && (
            <select className="form-control" style={{ width:110 }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {MONTH_NAMES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          )}
          {viewMode !== VIEW_ALLTIME && (
            <select className="form-control" style={{ width:90 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          )}
          {/* Commodity filter */}
          <select className="form-control" style={{ width:170 }} value={filterCommodity} onChange={e => setFilterCommodity(e.target.value)}>
            <option value="">All Commodities</option>
            {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ flex:1 }}/>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowSearch(s=>!s); if (showSearch) { setSearchQuery(''); setSearchResults([]); } }}>
            <Search size={14}/>
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportExpensesToExcel(expenses, total, fullLabel)}>
            <Download size={14}/> Excel
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportExpensesPDF(expenses, total, fullLabel)}>
            <Download size={14}/> PDF
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={15}/> Add Expense
          </button>
        </div>
      </div>

      {/* ── Search Panel ──────────────────────────────────────────── */}
      {showSearch && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-header">
            <span className="card-title">Search Expenses</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}><X size={16}/></button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSearch} style={{ display:'flex', gap:8, marginBottom: searchResults.length>0 ? 14 : 0 }}>
              <input className="form-control" style={{ flex:1 }} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search by category, paid by, paid to, description…"/>
              <button type="submit" className="btn btn-primary btn-sm" disabled={searching}>{searching ? '…' : <><Search size={13}/> Search</>}</button>
            </form>
            {searchResults.length > 0 && (
              <div className="table-wrap" style={{ borderRadius:8, overflow:'hidden' }}>
                <table>
                  <thead><tr><th>Date</th><th>Commodity</th><th>Category</th><th>Paid By</th><th>Amount</th><th>Notes</th></tr></thead>
                  <tbody>
                    {searchResults.map(ex => (
                      <tr key={ex.id}>
                        <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmt.date(ex.date)}</td>
                        <td style={{ fontSize:12 }}>{ex.commodity_name || <span style={{ color:'var(--text-muted)' }}>General</span>}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ width:8, height:8, borderRadius:'50%', background:CAT_COLORS[ex.category]||'var(--text-muted)', display:'inline-block' }}/>
                            <span style={{ fontWeight:600, fontSize:12.5 }}>{ex.category}</span>
                          </div>
                        </td>
                        <td style={{ fontSize:12.5 }}>{ex.paid_by||'—'}</td>
                        <td style={{ fontWeight:800, color:'var(--red)', whiteSpace:'nowrap' }}>{fmt.currency(ex.amount)}</td>
                        <td style={{ fontSize:12, color:'var(--text-muted)' }}>{ex.description||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {searchResults.length === 0 && searchQuery && !searching && (
              <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13, padding:'12px 0' }}>No results for "{searchQuery}"</div>
            )}
          </div>
        </div>
      )}

      {/* ── Compact Total Banner ───────────────────────────────────── */}
      <div style={{
        background:'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
        borderRadius:'var(--radius)', padding:'12px 20px', marginBottom:18,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
          <div>
            <div style={{ color:'rgba(255,255,255,0.7)', fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px' }}>
              Total Expenses — {fullLabel}
            </div>
            <div style={{ color:'#fff', fontSize:24, fontWeight:800, marginTop:2, letterSpacing:'-0.5px' }}>
              {fmt.currency(total)}
            </div>
          </div>
          <div style={{ color:'rgba(255,255,255,0.55)', fontSize:12, borderLeft:'1px solid rgba(255,255,255,0.2)', paddingLeft:20 }}>
            {expenses.length} entr{expenses.length !== 1 ? 'ies' : 'y'}
          </div>
          {filterComm && (
            <div style={{ color:'rgba(255,255,255,0.55)', fontSize:12, borderLeft:'1px solid rgba(255,255,255,0.2)', paddingLeft:20 }}>
              {filterComm.name}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Expense Form ───────────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom:18 }}>
          <div className="card-header">
            <span className="card-title">New Expense Entry</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={16}/></button>
          </div>
          <div className="card-body">
            <form onSubmit={handleAdd}>

              {/* Commodity — optional */}
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Commodity (optional)</label>
                <select className="form-control" value={form.commodity_id} onChange={e => set('commodity_id', e.target.value)}>
                  <option value="">General / Not commodity-specific</option>
                  {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:3, display:'block' }}>
                  Tag this expense to a specific commodity for accurate P&L per commodity
                </span>
              </div>

              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Date *</label>
                <IconInput icon={Calendar} className="form-control" type="date" value={form.date} onChange={e => set('date', e.target.value)} required/>
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Category *</label>
                <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Amount (GHS) *</label>
                <input className="form-control" type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} required/>
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Paid By (Personnel)</label>
                <IconInput icon={User} className="form-control" value={form.paid_by} onChange={e => set('paid_by', e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Paid To (Recipient)</label>
                <IconInput icon={User} className="form-control" value={form.paid_to} onChange={e => set('paid_to', e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Payment Method</label>
                <div style={{ position:'relative' }}>
                  <CreditCard size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
                  <select className="form-control" style={{ paddingLeft:32 }} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Receipt / Voucher No.</label>
                <IconInput icon={Hash} className="form-control" value={form.receipt_no} onChange={e => set('receipt_no', e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Description / Notes</label>
                <textarea className="form-control" rows={2} value={form.description} onChange={e => set('description', e.target.value)} style={{ resize:'vertical' }}/>
              </div>

              {form.amount && parseFloat(form.amount) > 0 && (
                <div style={{ background:'var(--primary-pale)', border:'1px solid var(--primary)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13 }}>
                  <span style={{ color:'var(--primary-dark)', fontWeight:600 }}>Preview: </span>
                  {fmt.currency(parseFloat(form.amount))} for <strong>{form.category}</strong>
                  {form.commodity_id && ` (${commodities.find(c=>c.id===parseInt(form.commodity_id))?.name || ''})`}
                  {form.paid_by && ` — paid by ${form.paid_by}`}
                </div>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex:1, justifyContent:'center' }}>
                  {saving ? 'Saving…' : 'Save Expense'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── By Category + Trend Chart ──────────────────────────────── */}
      {(byCategory.length > 0 || trendData.length > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }} className="expense-grid">
          {byCategory.length > 0 && (
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header"><span className="card-title">By Category</span></div>
              <div className="card-body">
                {byCategory.map(({ category, total: catTotal }) => {
                  const pct = total > 0 ? (catTotal/total)*100 : 0;
                  const color = CAT_COLORS[category]||'var(--text-muted)';
                  return (
                    <div key={category} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:10, height:10, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }}/>
                          <span style={{ fontSize:13, fontWeight:600 }}>{category}</span>
                        </div>
                        <span style={{ fontSize:13, fontWeight:700, color }}>{fmt.currency(catTotal)}</span>
                      </div>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar" style={{ width:`${pct}%`, background:color }}/>
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{fmt.percent(pct)} of total</div>
                    </div>
                  );
                })}
                <div style={{ paddingTop:10, borderTop:'2px solid var(--border)', display:'flex', justifyContent:'space-between', fontWeight:800, color:'var(--primary)' }}>
                  <span>TOTAL</span><span>{fmt.currency(total)}</span>
                </div>
              </div>
            </div>
          )}

          {trendData.length > 0 && (
            <div className="card" style={{ marginBottom:0 }}>
              <div className="card-header">
                <span className="card-title">Expense Trend</span>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{periodLabel}</span>
              </div>
              <div className="card-body" style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', height:'calc(100% - 48px)', boxSizing:'border-box' }}>
                <TrendChart data={trendData}/>
                <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
                  {trendData.filter(d=>d.total>0).sort((a,b)=>b.total-a.total).slice(0,3).map((d,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                      <span style={{ color:'var(--text-muted)' }}>{d.label}</span>
                      <span style={{ fontWeight:700, color:'var(--primary)' }}>{fmt.currency(d.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Expenses Table ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Entries — {fullLabel}</span>
          <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{expenses.length} item{expenses.length!==1?'s':''}</span>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign:'center', padding:48 }}>
              <div style={{ width:32, height:32, border:'3px solid var(--primary-pale)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
            </div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize:36, opacity:0.3, marginBottom:10 }}>💸</div>
              <h3>No expenses yet</h3>
              <p>Click "Add Expense" to record your first entry for {fullLabel}.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Commodity</th><th style={{ minWidth:130 }}>Category</th>
                  <th>Paid By</th><th>Paid To</th><th>Method</th><th>Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(ex => (
                  <React.Fragment key={ex.id}>
                    <tr onClick={() => setExpanded(expanded===ex.id ? null : ex.id)} style={{ cursor:'pointer' }}>
                      <td style={{ fontSize:12.5, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmt.date(ex.date)}</td>
                      <td>
                        {ex.commodity_name
                          ? <span style={{ fontSize:12, fontWeight:600, color:'var(--primary)' }}>{ex.commodity_name}</span>
                          : <span style={{ fontSize:11.5, color:'var(--text-muted)', fontStyle:'italic' }}>General</span>
                        }
                      </td>
                      <td style={{ minWidth:130 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:CAT_COLORS[ex.category]||'var(--text-muted)', display:'inline-block', flexShrink:0 }}/>
                          <span style={{ fontWeight:600, fontSize:12.5 }}>{ex.category}</span>
                        </div>
                      </td>
                      <td>
                        {ex.paid_by
                          ? <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--primary-pale)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--primary)', flexShrink:0 }}>
                                {ex.paid_by[0]?.toUpperCase()}
                              </div>
                              <span style={{ fontSize:12.5 }}>{ex.paid_by}</span>
                            </div>
                          : <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>
                        }
                      </td>
                      <td style={{ fontSize:12.5, color:ex.paid_to?'var(--text)':'var(--text-muted)' }}>{ex.paid_to||'—'}</td>
                      <td><span className={`badge ${methodBadge[ex.payment_method]||'badge-teal'}`} style={{ fontSize:10.5 }}>{ex.payment_method||'Cash'}</span></td>
                      <td style={{ fontWeight:800, color:'var(--red)', whiteSpace:'nowrap' }}>{fmt.currency(ex.amount)}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={e=>{ e.stopPropagation(); handleDelete(ex.id); }} style={{ color:'var(--red)', padding:'4px 8px' }}>
                          <Trash2 size={13}/>
                        </button>
                      </td>
                    </tr>
                    {expanded === ex.id && (
                      <tr style={{ background:'var(--primary-pale)' }}>
                        <td colSpan={8} style={{ padding:'10px 16px', fontSize:13 }}>
                          {ex.description && <span><strong>Notes:</strong> {ex.description}</span>}
                          {ex.receipt_no  && <span style={{ marginLeft:16 }}><strong>Receipt:</strong> {ex.receipt_no}</span>}
                          {!ex.description && !ex.receipt_no && <span style={{ color:'var(--text-muted)', fontStyle:'italic' }}>No additional details.</span>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={6} style={{ fontWeight:700 }}>TOTAL — {fullLabel}</td>
                  <td style={{ fontWeight:800 }}>{fmt.currency(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) { .expense-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
