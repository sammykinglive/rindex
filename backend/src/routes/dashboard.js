const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

async function migrateExpenses() {
  const cols = [
    'date TEXT',
    'paid_by TEXT',
    'paid_to TEXT',
    'receipt_no TEXT',
    "payment_method TEXT DEFAULT 'Cash'",
    'commodity_id INTEGER',
  ];
  for (const col of cols) {
    try { await run(`ALTER TABLE expenses ADD COLUMN ${col}`); } catch(e) {}
  }
}
migrateExpenses();

// ── Date-range helpers (all dates are plain 'YYYY-MM-DD' strings) ─────────────
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const cleanDate = v => (typeof v === 'string' && ISO_DATE.test(v) ? v : '');
const isoToUTC  = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const addDaysISO = (iso, n) => new Date(isoToUTC(iso) + n * 86400000).toISOString().slice(0, 10);
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Chart buckets for the movement / revenue charts.
// Short ranges (≤ 45 days) get one bucket per day, longer ones one per month.
function buildBuckets(start, end) {
  const spanDays = Math.round((isoToUTC(end) - isoToUTC(start)) / 86400000) + 1;
  const buckets = [];
  if (spanDays <= 45) {
    for (let i = 0; i < spanDays; i++) {
      const d = addDaysISO(start, i);
      buckets.push({ key: d, label: `${parseInt(d.slice(8), 10)} ${MONTHS_SHORT[parseInt(d.slice(5, 7), 10) - 1]}` });
    }
    return { granularity: 'day', buckets };
  }
  let y = parseInt(start.slice(0, 4), 10), m = parseInt(start.slice(5, 7), 10);
  const endY = parseInt(end.slice(0, 4), 10), endM = parseInt(end.slice(5, 7), 10);
  const multiYear = y !== endY;
  while (y < endY || (y === endY && m <= endM)) {
    buckets.push({ key: `${y}-${String(m).padStart(2, '0')}`, label: multiYear ? `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}` : MONTHS_SHORT[m - 1] });
    if (++m > 12) { m = 1; y++; }
  }
  return { granularity: 'month', buckets: buckets.slice(-60) };
}

// GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD   (both optional)
//   no params  → all-time figures (unchanged behaviour; the P&L page relies on this)
//   from / to  → movements inside the period; opening balance carried in from before `from`;
//                balances are stock "as at" the end of the period
router.get('/', authMiddleware, async (req, res) => {
  try {
    const from = cleanDate(req.query.from);
    const to   = cleanDate(req.query.to);
    const filtered = !!(from || to);

    // WHERE fragments — always parameterised
    const per = { sql: '', p: [] };
    if (from) { per.sql += ' AND date >= ?'; per.p.push(from); }
    if (to)   { per.sql += ' AND date <= ?'; per.p.push(to);   }
    const upTo = to ? { sql: ' AND date <= ?', p: [to] } : { sql: '', p: [] };

    const settingsRows = await all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    // ── Period totals ───────────────────────────────────────────────────────
    const totalIn      = (await get(`SELECT COALESCE(SUM(quantity),0) as v FROM stock_receipts WHERE 1=1${per.sql}`, per.p)).v;
    const totalOut     = (await get(`SELECT COALESCE(SUM(quantity),0) as v FROM stock_issues   WHERE 1=1${per.sql}`, per.p)).v;
    const totalRevenue = (await get(`SELECT COALESCE(SUM(total_sales),0) as v FROM stock_issues WHERE 1=1${per.sql}`, per.p)).v;
    const periodCost   = (await get(`SELECT COALESCE(SUM(total_cost),0) as v FROM stock_receipts WHERE 1=1${per.sql}`, per.p)).v;

    // Opening balance = everything received/issued before the period starts
    let openingIn = 0, openingOut = 0;
    const openInMap = {}, openOutMap = {};
    if (from) {
      openingIn  = (await get(`SELECT COALESCE(SUM(quantity),0) as v FROM stock_receipts WHERE date < ?`, [from])).v;
      openingOut = (await get(`SELECT COALESCE(SUM(quantity),0) as v FROM stock_issues   WHERE date < ?`, [from])).v;
      (await all(`SELECT commodity_id, COALESCE(SUM(quantity),0) as total FROM stock_receipts WHERE date < ? GROUP BY commodity_id`, [from])).forEach(r => { openInMap[r.commodity_id]  = r.total; });
      (await all(`SELECT commodity_id, COALESCE(SUM(quantity),0) as total FROM stock_issues   WHERE date < ? GROUP BY commodity_id`, [from])).forEach(r => { openOutMap[r.commodity_id] = r.total; });
    }

    const openingBalance = openingIn - openingOut;
    const balance = openingBalance + totalIn - totalOut; // closing balance
    const unitPrice    = parseFloat(settings.unit_price) || 320;
    const reorderLevel = parseInt(settings.reorder_level) || 50;
    const capacity     = parseInt(settings.warehouse_capacity) || 1000;

    // Average purchase cost: weighted over all receipts up to the end of the period
    const costUpTo = await get(`SELECT COALESCE(SUM(total_cost),0) as cost, COALESCE(SUM(quantity),0) as qty FROM stock_receipts WHERE 1=1${upTo.sql}`, upTo.p);
    const avgCostPerBag = costUpTo.qty > 0 ? costUpTo.cost / costUpTo.qty : 0;
    const adjustedCOGS  = avgCostPerBag * totalOut;

    // ── Activity counts (replacement KPI cards) ─────────────────────────────
    const receiptCount = (await get(`SELECT COUNT(*) as v FROM stock_receipts WHERE 1=1${per.sql}`, per.p)).v;
    const issueCount   = (await get(`SELECT COUNT(*) as v FROM stock_issues   WHERE 1=1${per.sql}`, per.p)).v;
    const customers    = (await get(`SELECT COUNT(DISTINCT LOWER(TRIM(customer_name))) as v FROM stock_issues   WHERE 1=1${per.sql}`, per.p)).v;
    const suppliers    = (await get(`SELECT COUNT(DISTINCT LOWER(TRIM(supplier_name))) as v FROM stock_receipts WHERE 1=1${per.sql}`, per.p)).v;
    const issueCountRows = await all(`SELECT commodity_id, COUNT(*) as n FROM stock_issues WHERE 1=1${per.sql} GROUP BY commodity_id`, per.p);
    const issueCountMap = {};
    issueCountRows.forEach(r => { issueCountMap[r.commodity_id] = r.n; });

    // ── Per-commodity KPIs ──────────────────────────────────────────────────
    let commodityKpis = [];
    let topCommodity = null;
    try {
      const commodities = await all(`SELECT * FROM commodities WHERE is_active = 1 ORDER BY name ASC`);
      const inRows  = await all(`SELECT commodity_id, COALESCE(SUM(quantity),0) as total FROM stock_receipts WHERE 1=1${per.sql} GROUP BY commodity_id`, per.p);
      const outRows = await all(`SELECT commodity_id, COALESCE(SUM(quantity),0) as total FROM stock_issues   WHERE 1=1${per.sql} GROUP BY commodity_id`, per.p);
      const inMap = {}, outMap = {};
      inRows.forEach(r  => { inMap[r.commodity_id]  = r.total; });
      outRows.forEach(r => { outMap[r.commodity_id] = r.total; });
      commodityKpis = commodities.map(c => {
        const cin  = inMap[c.id]  || 0;
        const cout = outMap[c.id] || 0;
        const open = (openInMap[c.id] || 0) - (openOutMap[c.id] || 0);
        const bal  = open + cin - cout;
        return {
          id: c.id, name: c.name, unit: c.unit,
          opening: open, total_in: cin, total_out: cout, balance: bal,
          unit_price: c.unit_price, reorder_level: c.reorder_level,
          warehouse_capacity: c.warehouse_capacity,
          stock_value: bal * (c.unit_price || 0),
          reorder_alert: bal <= (c.reorder_level || 50),
          capacity_used: c.warehouse_capacity > 0 ? (bal / c.warehouse_capacity) * 100 : 0,
          issue_count: issueCountMap[c.id] || 0,
        };
      }).filter(c => c.total_in > 0 || c.total_out > 0 || c.opening !== 0);

      // Most active commodity = most stock issues (a count, so mixed units don't matter)
      const top = [...commodityKpis].sort((a, b) => b.issue_count - a.issue_count)[0];
      if (top && top.issue_count > 0) topCommodity = { name: top.name, issues: top.issue_count };
    } catch (_) { commodityKpis = []; }

    // ── Chart series (stock in / out / revenue) ─────────────────────────────
    let start, end;
    if (!filtered) {
      const y = new Date().getFullYear();           // unchanged: current year, by month
      start = `${y}-01-01`; end = `${y}-12-31`;
    } else {
      const today = new Date().toISOString().slice(0, 10);
      let earliest = today;
      if (!from) {
        const e = await get(`SELECT MIN(d) as v FROM (SELECT MIN(date) as d FROM stock_receipts UNION ALL SELECT MIN(date) as d FROM stock_issues)`);
        if (e && e.v) earliest = e.v;
      }
      start = from || earliest;
      end   = to   || today;
      if (end < start) end = start;
    }
    const { granularity, buckets } = buildBuckets(start, end);
    const keyExpr = granularity === 'day' ? 'date' : 'substr(date,1,7)';
    const rangeSql = ' AND date >= ? AND date <= ?';
    const inSeries  = await all(`SELECT ${keyExpr} as k, COALESCE(SUM(quantity),0) as q FROM stock_receipts WHERE 1=1${rangeSql} GROUP BY k`, [start, end]);
    const outSeries = await all(`SELECT ${keyExpr} as k, COALESCE(SUM(quantity),0) as q, COALESCE(SUM(total_sales),0) as rev FROM stock_issues WHERE 1=1${rangeSql} GROUP BY k`, [start, end]);
    const inBy = {}, outBy = {}, revBy = {};
    inSeries.forEach(r  => { inBy[r.k] = r.q; });
    outSeries.forEach(r => { outBy[r.k] = r.q; revBy[r.k] = r.rev; });
    const series = buckets.map(b => ({ label: b.label, bags_in: inBy[b.key] || 0, bags_out: outBy[b.key] || 0, revenue: revBy[b.key] || 0 }));

    // ── Recent activity (within the period) ─────────────────────────────────
    const recentReceipts = await all(`SELECT date, grn_number as ref, supplier_name as party, quantity, 'Receipt' as type, commodity_id FROM stock_receipts WHERE 1=1${per.sql} ORDER BY id DESC LIMIT 5`, per.p);
    const recentIssues   = await all(`SELECT date, invoice_number as ref, customer_name as party, quantity, 'Issue' as type, commodity_id FROM stock_issues WHERE 1=1${per.sql} ORDER BY id DESC LIMIT 5`, per.p);
    const recentActivity = [...recentReceipts, ...recentIssues].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,10);

    // Attach commodity names to recent activity
    try {
      const comms = await all(`SELECT id, name, unit FROM commodities`);
      const cm = {};
      comms.forEach(c => { cm[c.id] = c; });
      recentActivity.forEach(r => {
        r.commodity_name = cm[r.commodity_id]?.name || null;
        r.commodity_unit = cm[r.commodity_id]?.unit || null;
      });
    } catch (_) {}

    const pendingPaymentsRow = await get(`SELECT COALESCE(SUM(total_sales),0) as v FROM stock_issues WHERE payment_status != 'Paid'`);

    res.json({
      kpis: {
        total_in: totalIn, total_out: totalOut, balance,
        opening_balance: openingBalance,
        stock_value: balance * unitPrice,
        total_revenue: totalRevenue,
        total_cogs: adjustedCOGS,
        total_purchase_cost: periodCost,
        avg_cost_per_bag: avgCostPerBag,
        gross_profit: totalRevenue - adjustedCOGS,
        reorder_alert: balance <= reorderLevel,
        capacity_used: capacity > 0 ? (balance/capacity)*100 : 0,
        pending_payments: pendingPaymentsRow.v,
        receipt_count: receiptCount,
        issue_count: issueCount,
        customers_served: customers,
        suppliers_delivered: suppliers,
        top_commodity: topCommodity,
      },
      commodity_kpis: commodityKpis,
      series, granularity,
      period: { from, to },
      recent_activity: recentActivity, settings,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.put('/settings', authMiddleware, adminOnly, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await run(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`, [key, String(value)]);
    }
    res.json({ message: 'Settings updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.get('/expenses', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const { allTime, allYear, month, year, commodity_id } = req.query;
    const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Build commodity filter clause
    const commClause = commodity_id ? ` AND commodity_id = ${parseInt(commodity_id)}` : '';
    const commClauseInit = commodity_id ? ` WHERE commodity_id = ${parseInt(commodity_id)}` : '';

    let expenses, totalRow, byCategory, trend;

    if (allTime === 'true') {
      expenses   = await all(`SELECT * FROM expenses WHERE 1=1${commClause} ORDER BY date DESC, created_at DESC`);
      totalRow   = await get(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE 1=1${commClause}`);
      byCategory = await all(`SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE 1=1${commClause} GROUP BY category ORDER BY total DESC`);
      const yearlyRows = await all(`SELECT year, COALESCE(SUM(amount),0) as total FROM expenses WHERE 1=1${commClause} GROUP BY year ORDER BY year ASC`);
      trend = yearlyRows.map(r => ({ label: String(r.year), total: r.total }));

    } else if (allYear === 'true') {
      const y = parseInt(year) || now.getFullYear();
      expenses   = await all(`SELECT * FROM expenses WHERE year=?${commClause} ORDER BY date DESC, created_at DESC`, [y]);
      totalRow   = await get(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE year=?${commClause}`, [y]);
      byCategory = await all(`SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE year=?${commClause} GROUP BY category ORDER BY total DESC`, [y]);
      const monthlyRows = await all(`SELECT month, COALESCE(SUM(amount),0) as total FROM expenses WHERE year=?${commClause} GROUP BY month ORDER BY month ASC`, [y]);
      trend = MONTH_NAMES_SHORT.map((name, i) => {
        const found = monthlyRows.find(r => r.month === i + 1);
        return { label: name, total: found ? found.total : 0 };
      });

    } else {
      const m = parseInt(month) || now.getMonth()+1;
      const y = parseInt(year)  || now.getFullYear();
      expenses   = await all(`SELECT * FROM expenses WHERE month=? AND year=?${commClause} ORDER BY date DESC, created_at DESC`, [m, y]);
      totalRow   = await get(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE month=? AND year=?${commClause}`, [m, y]);
      byCategory = await all(`SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE month=? AND year=?${commClause} GROUP BY category ORDER BY total DESC`, [m, y]);
      // Trend: last 6 months
      const trendMonths = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(y, m - 1 - i, 1);
        trendMonths.push({ month: d.getMonth()+1, year: d.getFullYear(), label: MONTH_NAMES_SHORT[d.getMonth()] });
      }
      trend = [];
      for (const tm of trendMonths) {
        const r = await get(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE month=? AND year=?${commClause}`, [tm.month, tm.year]);
        trend.push({ label: tm.label, total: r.total });
      }
    }

    // Attach commodity names
    let commMap = {};
    try {
      const comms = await all(`SELECT id, name FROM commodities`);
      comms.forEach(c => { commMap[c.id] = c.name; });
    } catch(_) {}
    const enriched = expenses.map(e => ({ ...e, commodity_name: commMap[e.commodity_id] || null }));

    res.json({ expenses: enriched, total: totalRow ? totalRow.v : 0, byCategory, trend });
  } catch (err) { console.error('GET /expenses error:', err.message); res.status(500).json({ error: err.message }); }
});

router.post('/expenses', authMiddleware, async (req, res) => {
  try {
    const { category, amount, description, month, year, date, paid_by, paid_to, receipt_no, payment_method, commodity_id } = req.body;
    if (!category || !amount) return res.status(400).json({ error: 'Category and amount are required.' });
    const result = await run(
      `INSERT INTO expenses (category, amount, description, month, year, date, paid_by, paid_to, receipt_no, payment_method, commodity_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category, parseFloat(amount), description||'', parseInt(month), parseInt(year), date||null,
       paid_by||'', paid_to||'', receipt_no||'', payment_method||'Cash',
       commodity_id ? parseInt(commodity_id) : null, req.user.id]
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Expense recorded.' });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.get('/expenses/search', authMiddleware, async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const results = await all(
      `SELECT * FROM expenses WHERE category LIKE ? OR paid_by LIKE ? OR paid_to LIKE ? OR description LIKE ? OR receipt_no LIKE ? ORDER BY date DESC, created_at DESC LIMIT 100`,
      [q, q, q, q, q]
    );
    res.json({ results });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/expenses/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Expense deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
