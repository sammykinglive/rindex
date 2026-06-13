const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

async function migrateExpenses() {
  const cols = ['date TEXT', 'paid_by TEXT', 'paid_to TEXT', 'receipt_no TEXT', "payment_method TEXT DEFAULT 'Cash'"];
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
    const totalRevenue = totalRevenueRow.v, totalPurchaseCost = totalCOGSRow.v;
    const balance = totalIn - totalOut;
    const unitPrice = parseFloat(settings.unit_price) || 320;
    const reorderLevel = parseInt(settings.reorder_level) || 50;
    const capacity = parseInt(settings.warehouse_capacity) || 1000;

    // COGS = cost of goods ACTUALLY SOLD, not all goods purchased.
    // Using weighted-average cost per bag across all receipts, applied to bags sold.
    const avgCostPerBag = totalIn > 0 ? totalPurchaseCost / totalIn : 0;
    const totalCOGS = avgCostPerBag * totalOut;

    const currentYear = new Date().getFullYear();
    const monthly = [];
    for (let m = 1; m <= 12; m++) {
      const prefix = `${currentYear}-${String(m).padStart(2,'0')}`;
      const bagsInRow  = await get(`SELECT COALESCE(SUM(quantity),0) as v FROM stock_receipts WHERE date LIKE ?`, [`${prefix}%`]);
      const bagsOutRow = await get(`SELECT COALESCE(SUM(quantity),0) as v FROM stock_issues WHERE date LIKE ?`, [`${prefix}%`]);
      const revenueRow = await get(`SELECT COALESCE(SUM(total_sales),0) as v FROM stock_issues WHERE date LIKE ?`, [`${prefix}%`]);
      monthly.push({ month: m, bags_in: bagsInRow.v, bags_out: bagsOutRow.v, revenue: revenueRow.v });
    }

    const recentReceipts = await all(`SELECT date, grn_number as ref, supplier_name as party, quantity, 'Receipt' as type FROM stock_receipts ORDER BY id DESC LIMIT 5`);
    const recentIssues   = await all(`SELECT date, invoice_number as ref, customer_name as party, quantity, 'Issue' as type FROM stock_issues ORDER BY id DESC LIMIT 5`);
    const recentActivity = [...recentReceipts, ...recentIssues].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,10);

    const now = new Date();
    const totalExpensesRow   = await get(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE year=? AND month=?`, [now.getFullYear(), now.getMonth()+1]);
    const pendingPaymentsRow = await get(`SELECT COALESCE(SUM(total_sales),0) as v FROM stock_issues WHERE payment_status != 'Paid'`);

    res.json({
      kpis: {
        total_in: totalIn, total_out: totalOut, balance,
        stock_value: balance * unitPrice,
        total_revenue: totalRevenue, total_cogs: totalCOGS,
        total_purchase_cost: totalPurchaseCost, avg_cost_per_bag: avgCostPerBag,
        gross_profit: totalRevenue - totalCOGS,
        reorder_alert: balance <= reorderLevel,
        capacity_used: capacity > 0 ? (balance/capacity)*100 : 0,
        pending_payments: pendingPaymentsRow.v,
      },
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
    const { allTime, allYear } = req.query;
    const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    let expenses, totalRow, byCategory, trend;

    if (allTime === 'true') {
      // All-time view
      expenses   = await all('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
      totalRow   = await get('SELECT COALESCE(SUM(amount),0) as v FROM expenses');
      byCategory = await all('SELECT category, COALESCE(SUM(amount),0) as total FROM expenses GROUP BY category ORDER BY total DESC');
      // Trend: group by year
      const yearlyRows = await all('SELECT year, COALESCE(SUM(amount),0) as total FROM expenses GROUP BY year ORDER BY year ASC');
      trend = yearlyRows.map(r => ({ label: String(r.year), total: r.total }));

    } else if (allYear === 'true') {
      // Full year view
      const y = parseInt(req.query.year) || now.getFullYear();
      expenses   = await all('SELECT * FROM expenses WHERE year=? ORDER BY date DESC, created_at DESC', [y]);
      totalRow   = await get('SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE year=?', [y]);
      byCategory = await all('SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE year=? GROUP BY category ORDER BY total DESC', [y]);
      // Trend: group by month
      const monthlyRows = await all('SELECT month, COALESCE(SUM(amount),0) as total FROM expenses WHERE year=? GROUP BY month ORDER BY month ASC', [y]);
      // Fill all 12 months
      trend = MONTH_NAMES_SHORT.map((name, i) => {
        const found = monthlyRows.find(r => r.month === i + 1);
        return { label: name, total: found ? found.total : 0 };
      });

    } else {
      // Monthly view (default)
      const m = parseInt(req.query.month) || now.getMonth()+1;
      const y = parseInt(req.query.year)  || now.getFullYear();
      expenses   = await all('SELECT * FROM expenses WHERE month=? AND year=? ORDER BY date DESC, created_at DESC', [m, y]);
      totalRow   = await get('SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE month=? AND year=?', [m, y]);
      byCategory = await all('SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE month=? AND year=? GROUP BY category ORDER BY total DESC', [m, y]);
      // Trend: last 6 months
      const trendMonths = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(y, m - 1 - i, 1);
        trendMonths.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: MONTH_NAMES_SHORT[d.getMonth()] });
      }
      trend = [];
      for (const tm of trendMonths) {
        const r = await get('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE month=? AND year=?', [tm.month, tm.year]);
        trend.push({ label: tm.label, total: r.total });
      }
      totalRow = totalRow || { v: 0 };
    }

    res.json({ expenses, total: totalRow ? totalRow.v : 0, byCategory, trend });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

// Search expenses across all time
router.get('/expenses/search', authMiddleware, async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const results = await all(
      `SELECT * FROM expenses
       WHERE category LIKE ? OR paid_by LIKE ? OR paid_to LIKE ? OR description LIKE ? OR receipt_no LIKE ?
       ORDER BY date DESC, created_at DESC LIMIT 100`,
      [q, q, q, q, q]
    );
    res.json({ results });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/expenses', authMiddleware, async (req, res) => {
  try {
    const { category, amount, description, month, year, date, paid_by, paid_to, receipt_no, payment_method } = req.body;
    if (!category || !amount) return res.status(400).json({ error: 'Category and amount are required.' });
    const result = await run(
      `INSERT INTO expenses (category, amount, description, month, year, date, paid_by, paid_to, receipt_no, payment_method, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category, parseFloat(amount), description||'', parseInt(month), parseInt(year), date||null, paid_by||'', paid_to||'', receipt_no||'', payment_method||'Cash', req.user.id]
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Expense recorded.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/expenses/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Expense deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
