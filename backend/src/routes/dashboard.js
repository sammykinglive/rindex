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

router.get('/', authMiddleware, async (req, res) => {
  try {
    const settingsRows = await all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const totalInRow       = await get('SELECT COALESCE(SUM(quantity),0) as v FROM stock_receipts');
    const totalOutRow      = await get('SELECT COALESCE(SUM(quantity),0) as v FROM stock_issues');
    const totalRevenueRow  = await get('SELECT COALESCE(SUM(total_sales),0) as v FROM stock_issues');
    const totalCOGSRow     = await get('SELECT COALESCE(SUM(total_cost),0) as v FROM stock_receipts');

    const totalIn = totalInRow.v, totalOut = totalOutRow.v;
    const totalRevenue = totalRevenueRow.v, totalCOGS = totalCOGSRow.v;
    const balance = totalIn - totalOut;
    const unitPrice    = parseFloat(settings.unit_price) || 320;
    const reorderLevel = parseInt(settings.reorder_level) || 50;
    const capacity     = parseInt(settings.warehouse_capacity) || 1000;

    // ── Per-commodity KPIs ──────────────────────────────────────────────────
    let commodityKpis = [];
    try {
      const commodities = await all(`SELECT * FROM commodities WHERE is_active = 1 ORDER BY name ASC`);
      const inRows  = await all(`SELECT commodity_id, COALESCE(SUM(quantity),0) as total FROM stock_receipts GROUP BY commodity_id`);
      const outRows = await all(`SELECT commodity_id, COALESCE(SUM(quantity),0) as total FROM stock_issues   GROUP BY commodity_id`);
      const inMap = {}, outMap = {};
      inRows.forEach(r  => { inMap[r.commodity_id]  = r.total; });
      outRows.forEach(r => { outMap[r.commodity_id] = r.total; });
      commodityKpis = commodities.map(c => {
        const cin  = inMap[c.id]  || 0;
        const cout = outMap[c.id] || 0;
        const bal  = cin - cout;
        return {
          id: c.id, name: c.name, unit: c.unit,
          total_in: cin, total_out: cout, balance: bal,
          unit_price: c.unit_price, reorder_level: c.reorder_level,
          warehouse_capacity: c.warehouse_capacity,
          stock_value: bal * (c.unit_price || 0),
          reorder_alert: bal <= (c.reorder_level || 50),
          capacity_used: c.warehouse_capacity > 0 ? (bal / c.warehouse_capacity) * 100 : 0,
        };
      }).filter(c => c.total_in > 0 || c.total_out > 0);
    } catch (_) { commodityKpis = []; }

    const currentYear = new Date().getFullYear();
    const monthly = [];
    for (let m = 1; m <= 12; m++) {
      const prefix = `${currentYear}-${String(m).padStart(2,'0')}`;
      const bagsInRow  = await get(`SELECT COALESCE(SUM(quantity),0) as v FROM stock_receipts WHERE date LIKE ?`, [`${prefix}%`]);
      const bagsOutRow = await get(`SELECT COALESCE(SUM(quantity),0) as v FROM stock_issues   WHERE date LIKE ?`, [`${prefix}%`]);
      const revenueRow = await get(`SELECT COALESCE(SUM(total_sales),0) as v FROM stock_issues WHERE date LIKE ?`, [`${prefix}%`]);
      monthly.push({ month: m, bags_in: bagsInRow.v, bags_out: bagsOutRow.v, revenue: revenueRow.v });
    }

    const recentReceipts = await all(`SELECT date, grn_number as ref, supplier_name as party, quantity, 'Receipt' as type, commodity_id FROM stock_receipts ORDER BY id DESC LIMIT 5`);
    const recentIssues   = await all(`SELECT date, invoice_number as ref, customer_name as party, quantity, 'Issue' as type, commodity_id FROM stock_issues ORDER BY id DESC LIMIT 5`);
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

    const now = new Date();
    const totalExpensesRow   = await get(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE year=? AND month=?`, [now.getFullYear(), now.getMonth()+1]);
    const pendingPaymentsRow = await get(`SELECT COALESCE(SUM(total_sales),0) as v FROM stock_issues WHERE payment_status != 'Paid'`);

    const avgCostPerBag = totalIn > 0 ? totalCOGS / totalIn : 0;
    const adjustedCOGS  = avgCostPerBag * totalOut;

    res.json({
      kpis: {
        total_in: totalIn, total_out: totalOut, balance,
        stock_value: balance * unitPrice,
        total_revenue: totalRevenue,
        total_cogs: adjustedCOGS,
        total_purchase_cost: totalCOGS,
        avg_cost_per_bag: avgCostPerBag,
        gross_profit: totalRevenue - adjustedCOGS,
        reorder_alert: balance <= reorderLevel,
        capacity_used: capacity > 0 ? (balance/capacity)*100 : 0,
        pending_payments: pendingPaymentsRow.v,
      },
      commodity_kpis: commodityKpis,
      monthly, recent_activity: recentActivity, settings,
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
