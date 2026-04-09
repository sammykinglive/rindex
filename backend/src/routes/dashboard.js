const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const settingsRows = await all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const totalInRow      = await get('SELECT COALESCE(SUM(quantity),0) as v FROM stock_receipts');
    const totalOutRow     = await get('SELECT COALESCE(SUM(quantity),0) as v FROM stock_issues');
    const totalRevenueRow = await get('SELECT COALESCE(SUM(total_sales),0) as v FROM stock_issues');
    const totalCOGSRow    = await get('SELECT COALESCE(SUM(total_cost),0) as v FROM stock_receipts');

    const totalIn      = totalInRow.v;
    const totalOut     = totalOutRow.v;
    const totalRevenue = totalRevenueRow.v;
    const totalCOGS    = totalCOGSRow.v;
    const balance      = totalIn - totalOut;
    const unitPrice    = parseFloat(settings.unit_price) || 320;
    const reorderLevel = parseInt(settings.reorder_level) || 50;
    const capacity     = parseInt(settings.warehouse_capacity) || 1000;

    const currentYear = new Date().getFullYear();
    const monthly = [];
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      const prefix = `${currentYear}-${mm}`;
      const bagsInRow  = await get(`SELECT COALESCE(SUM(quantity),0) as v FROM stock_receipts WHERE date LIKE ?`, [`${prefix}%`]);
      const bagsOutRow = await get(`SELECT COALESCE(SUM(quantity),0) as v FROM stock_issues WHERE date LIKE ?`, [`${prefix}%`]);
      const revenueRow = await get(`SELECT COALESCE(SUM(total_sales),0) as v FROM stock_issues WHERE date LIKE ?`, [`${prefix}%`]);
      monthly.push({ month: m, bags_in: bagsInRow.v, bags_out: bagsOutRow.v, revenue: revenueRow.v });
    }

    const recentReceipts = await all(`SELECT date, grn_number as ref, supplier_name as party, quantity, 'Receipt' as type FROM stock_receipts ORDER BY id DESC LIMIT 5`);
    const recentIssues   = await all(`SELECT date, invoice_number as ref, customer_name as party, quantity, 'Issue' as type FROM stock_issues ORDER BY id DESC LIMIT 5`);
    const recentActivity = [...recentReceipts, ...recentIssues]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    const now = new Date();
    const totalExpensesRow  = await get(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE year=? AND month=?`, [now.getFullYear(), now.getMonth() + 1]);
    const pendingPaymentsRow = await get(`SELECT COALESCE(SUM(total_sales),0) as v FROM stock_issues WHERE payment_status != 'Paid'`);

    res.json({
      kpis: {
        total_in: totalIn, total_out: totalOut, balance,
        stock_value: balance * unitPrice,
        total_revenue: totalRevenue, total_cogs: totalCOGS,
        gross_profit: totalRevenue - totalCOGS,
        reorder_alert: balance <= reorderLevel,
        capacity_used: capacity > 0 ? (balance / capacity) * 100 : 0,
        pending_payments: pendingPaymentsRow.v,
      },
      monthly,
      recent_activity: recentActivity,
      settings,
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
    res.json({ message: 'Settings updated successfully.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.get('/expenses', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const m = parseInt(req.query.month) || now.getMonth() + 1;
    const y = parseInt(req.query.year)  || now.getFullYear();
    const expenses = await all('SELECT * FROM expenses WHERE month=? AND year=? ORDER BY created_at DESC', [m, y]);
    const totalRow = await get('SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE month=? AND year=?', [m, y]);
    res.json({ expenses, total: totalRow.v });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/expenses', authMiddleware, async (req, res) => {
  try {
    const { category, amount, description, month, year } = req.body;
    const result = await run(
      'INSERT INTO expenses (category, amount, description, month, year, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [category, parseFloat(amount), description || '', parseInt(month), parseInt(year), req.user.id]
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Expense recorded.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/expenses/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Expense deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
