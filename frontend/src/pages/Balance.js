import React, { useEffect, useState, useCallback } from 'react';
import { Scale, TrendingUp, TrendingDown, AlertTriangle, Download, Package } from 'lucide-react';
import api from '../utils/api';
import { fmt } from '../utils/format';
import { exportBalanceToExcel } from '../utils/exportExcel';
import { exportBalancePDF } from '../utils/exportPDF';

export default function Balance() {
  const [commodities, setCommodities] = useState([]);
  const [selected, setSelected]       = useState('all'); // commodity id or 'all'
  const [receipts, setReceipts]       = useState([]);
  const [issues, setIssues]           = useState([]);
  const [settings, setSettings]       = useState({});
  const [loading, setLoading]         = useState(true);

  // Load commodities once
  useEffect(() => {
    api.get('/commodities')
      .then(r => setCommodities((r.data || []).filter(c => c.is_active)))
      .catch(() => {});
  }, []);

  // Load transactions whenever filter changes
  const load = useCallback(() => {
    setLoading(true);
    const params = selected !== 'all' ? { commodity_id: selected } : {};
    Promise.all([
      api.get('/receipts', { params }),
      api.get('/issues',   { params }),
      api.get('/dashboard/settings'),
    ]).then(([rec, iss, set]) => {
      setReceipts(rec.data.receipts || []);
      setIssues(iss.data.issues     || []);
      setSettings(set.data          || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  // ── Compute per-commodity summary cards ────────────────────────────────────
  const commSummary = commodities.map(c => {
    const cIn  = receipts.filter(r => r.commodity_id === c.id).reduce((s, r) => s + r.quantity, 0);
    const cOut = issues.filter(i => i.commodity_id === c.id).reduce((s, i) => s + i.quantity, 0);
    const bal  = cIn - cOut;
    const cap  = c.warehouse_capacity || 1000;
    const pct  = cap > 0 ? (bal / cap) * 100 : 0;
    return { ...c, total_in: cIn, total_out: cOut, balance: bal, capacity_used: pct };
  }).filter(c => c.total_in > 0 || c.total_out > 0 || selected !== 'all');

  // ── Active filter commodity ────────────────────────────────────────────────
  const activeCom  = commodities.find(c => c.id === parseInt(selected));
  const unitLabel  = activeCom?.unit || 'units';

  // ── Ledger for selected view ───────────────────────────────────────────────
  const filtRec = selected === 'all' ? receipts : receipts.filter(r => r.commodity_id === parseInt(selected));
  const filtIss = selected === 'all' ? issues   : issues.filter(i => i.commodity_id   === parseInt(selected));

  const ledger = [
    ...filtRec.map(r => ({ ...r, type:'Receipt', party:r.supplier_name, ref:r.grn_number,     direction:+r.quantity, unit: r.commodity_unit || unitLabel })),
    ...filtIss.map(i => ({ ...i, type:'Issue',   party:i.customer_name, ref:i.invoice_number, direction:-i.quantity, unit: i.commodity_unit || unitLabel })),
  ].sort((a,b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.id - b.id);

  let running = 0;
  const ledgerWithBal = ledger.map(row => { running += row.direction; return { ...row, running_balance: running }; });
  const displayLedger = [...ledgerWithBal].reverse();

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalIn  = filtRec.reduce((s,r) => s+r.quantity, 0);
  const totalOut = filtIss.reduce((s,i) => s+i.quantity, 0);
  const balance  = totalIn - totalOut;
  const reorder  = parseInt(activeCom?.reorder_level || settings.reorder_level || 50);
  const cap      = parseInt(activeCom?.warehouse_capacity || settings.warehouse_capacity || 1000);
  const capPct   = cap > 0 ? (balance/cap)*100 : 0;
  const unitPrice = parseFloat(activeCom?.unit_price || settings.unit_price || 0);
  const stockVal  = balance * unitPrice;

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Stock Balance</div>
          <div className="page-sub">Live warehouse ledger — all movements with running balance</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => exportBalanceToExcel(displayLedger)}>
            <Download size={14}/> Excel
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportBalancePDF(displayLedger, { total_in:totalIn, total_out:totalOut, balance })}>
            <Download size={14}/> PDF
          </button>
        </div>
      </div>

      {/* ── Commodity Filter Tabs ────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        <button
          onClick={() => setSelected('all')}
          className={selected === 'all' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
        >
          All Commodities
        </button>
        {commodities.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id.toString())}
            className={selected === c.id.toString() ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60 }}>
          <div style={{ width:36, height:36, border:'3px solid var(--primary-pale)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
        </div>
      ) : (
        <>
          {/* ── ALL view: per-commodity summary cards ─────────────────────── */}
          {selected === 'all' && commSummary.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:14, marginBottom:20 }}>
              {commSummary.map(c => {
                const isLow = c.balance <= (c.reorder_level || 50);
                return (
                  <div
                    key={c.id}
                    className="card"
                    style={{ marginBottom:0, cursor:'pointer', borderLeft:`3px solid ${isLow ? 'var(--red)' : 'var(--primary)'}` }}
                    onClick={() => setSelected(c.id.toString())}
                  >
                    <div className="card-body">
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{c.unit}</div>
                        </div>
                        {isLow && <span className="badge badge-red" style={{ fontSize:10 }}>Low Stock</span>}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, textAlign:'center' }}>
                        {[
                          ['In',      fmt.number(c.total_in),  'var(--green)'],
                          ['Out',     fmt.number(c.total_out), 'var(--red)'  ],
                          ['Balance', fmt.number(c.balance),   isLow ? 'var(--red)' : 'var(--primary)'],
                        ].map(([lbl,val,col]) => (
                          <div key={lbl}>
                            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>{lbl}</div>
                            <div style={{ fontSize:14, fontWeight:800, color:col, marginTop:3 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      {/* Capacity mini bar */}
                      <div style={{ marginTop:10 }}>
                        <div className="progress-bar-wrap" style={{ height:5 }}>
                          <div className="progress-bar" style={{
                            width:`${Math.min(c.capacity_used,100)}%`,
                            background: c.capacity_used > 90 ? 'var(--red)' : c.capacity_used > 70 ? 'var(--gold)' : 'var(--primary)',
                          }}/>
                        </div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                          {fmt.percent(c.capacity_used)} of {fmt.number(c.warehouse_capacity)} {c.unit} capacity
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Single commodity KPI cards ───────────────────────────────── */}
          {selected !== 'all' && (
            <>
              <div className="kpi-grid" style={{ marginBottom:16 }}>
                {[
                  { label:'Total Received', value:`${fmt.number(totalIn)} ${unitLabel}`,  icon:TrendingUp,    color:'var(--primary)' },
                  { label:'Total Issued',   value:`${fmt.number(totalOut)} ${unitLabel}`, icon:TrendingDown,  color:'var(--red)'     },
                  { label:'Balance',        value:`${fmt.number(balance)} ${unitLabel}`,  icon:Scale,         color:'var(--green)'   },
                  { label:'Stock Value',    value:fmt.currency(stockVal),                 icon:TrendingUp,    color:'var(--gold)'    },
                  { label:'Capacity Used',  value:fmt.percent(capPct),                    icon:AlertTriangle, color:'var(--orange)'  },
                  { label:'Reorder Status', value:balance <= reorder ? 'REORDER NOW' : 'OK', icon:AlertTriangle, color: balance <= reorder ? 'var(--red)' : 'var(--green)' },
                ].map(({ label, value, icon:Icon, color }) => (
                  <div className="kpi-card" key={label}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <div className="kpi-icon-wrap" style={{ background:color+'20' }}>
                        <Icon size={18} color={color} strokeWidth={2}/>
                      </div>
                      <span className="kpi-label">{label}</span>
                    </div>
                    <div className="kpi-value" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Capacity bar */}
              <div className="card" style={{ marginBottom:16 }}>
                <div className="card-body">
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontWeight:600, fontSize:13 }}>{activeCom?.name} — Warehouse Capacity</span>
                    <span style={{ fontSize:13, color:'var(--text-muted)' }}>
                      {fmt.number(balance)} / {fmt.number(cap)} {unitLabel} ({fmt.percent(capPct)})
                    </span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" style={{
                      width:`${Math.min(capPct,100)}%`,
                      background: capPct > 90 ? 'var(--red)' : capPct > 70 ? 'var(--gold)' : 'var(--primary)',
                    }}/>
                  </div>
                </div>
              </div>

              {balance <= reorder && (
                <div className="alert alert-danger" style={{ marginBottom:16 }}>
                  <AlertTriangle size={16}/> {activeCom?.name} stock is below reorder level ({reorder} {unitLabel}) — reorder immediately.
                </div>
              )}
            </>
          )}

          {/* ── ALL view KPI summary ─────────────────────────────────────── */}
          {selected === 'all' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
              {[
                ['Total In',       fmt.number(totalIn),                               'var(--primary)'],
                ['Total Out',      fmt.number(totalOut),                              'var(--red)'    ],
                ['Net Balance',    fmt.number(balance),                               'var(--green)'  ],
                ['Commodities',    commSummary.length,                                'var(--blue)'   ],
                ['Low Stock',      commSummary.filter(c=>c.balance<=c.reorder_level).length, 'var(--orange)'],
              ].map(([lbl,val,col]) => (
                <div key={lbl} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'12px 16px' }}>
                  <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px' }}>{lbl}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:col, marginTop:4 }}>{val}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Ledger table ─────────────────────────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {selected === 'all' ? 'Full Transaction Ledger' : `${activeCom?.name} Ledger`}
              </span>
              <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>
                {ledger.length} transaction{ledger.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="table-wrap">
              {displayLedger.length === 0 ? (
                <div className="empty-state">
                  <Package size={36} style={{ opacity:0.25, marginBottom:10 }}/>
                  <h3>No transactions yet</h3>
                  <p>Start by recording a delivery in Stock Receipts.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Date</th><th>Commodity</th><th>Type</th>
                      <th>Reference</th><th>Party</th>
                      <th>In</th><th>Out</th><th>Balance</th><th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayLedger.map((row, idx) => (
                      <tr key={`${row.type}-${row.id}`}>
                        <td style={{ color:'var(--text-muted)', fontSize:12 }}>{ledger.length - idx}</td>
                        <td style={{ whiteSpace:'nowrap' }}>{fmt.date(row.date)}</td>
                        <td>
                          <span style={{ fontSize:12, fontWeight:600 }}>
                            {row.commodity_name || '—'}
                          </span>
                        </td>
                        <td><span className={`badge ${row.type === 'Receipt' ? 'badge-teal' : 'badge-red'}`}>{row.type}</span></td>
                        <td style={{ fontFamily:'monospace', fontWeight:600, fontSize:12 }}>{row.ref}</td>
                        <td style={{ fontWeight:500 }}>{row.party}</td>
                        <td style={{ fontWeight:700, color:'var(--green)' }}>
                          {row.type === 'Receipt' ? `${fmt.number(row.quantity)} ${row.unit}` : '—'}
                        </td>
                        <td style={{ fontWeight:700, color:'var(--red)' }}>
                          {row.type === 'Issue' ? `${fmt.number(row.quantity)} ${row.unit}` : '—'}
                        </td>
                        <td>
                          <span style={{ fontWeight:800, color: row.running_balance <= reorder ? 'var(--red)' : 'var(--primary)' }}>
                            {fmt.number(row.running_balance)} {row.unit}
                          </span>
                        </td>
                        <td style={{ color:'var(--text-muted)', fontSize:12 }}>{row.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="tfoot-row">
                      <td colSpan={6}>TOTALS {selected !== 'all' && activeCom ? `— ${activeCom.name}` : '— All Commodities'}</td>
                      <td>{fmt.number(totalIn)} {unitLabel}</td>
                      <td>{fmt.number(totalOut)} {unitLabel}</td>
                      <td>{fmt.number(balance)} {unitLabel}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
