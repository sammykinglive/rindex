const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { from, to, customer, status, commodity_id } = req.query;

    let q  = `SELECT * FROM stock_issues WHERE 1=1`;
    let tq = `SELECT COALESCE(SUM(quantity),0) as total_bags, COALESCE(SUM(total_sales),0) as total_sales FROM stock_issues WHERE 1=1`;
    const p = [], tp = [];

    if (from)         { q += ' AND date >= ?';            tq += ' AND date >= ?';            p.push(from);                  tp.push(from); }
    if (to)           { q += ' AND date <= ?';            tq += ' AND date <= ?';            p.push(to);                    tp.push(to); }
    if (customer)     { q += ' AND customer_name LIKE ?'; tq += ' AND customer_name LIKE ?'; p.push(`%${customer}%`);       tp.push(`%${customer}%`); }
    if (status)       { q += ' AND payment_status = ?';   tq += ' AND payment_status = ?';   p.push(status);                tp.push(status); }
    if (commodity_id) { q += ' AND commodity_id = ?';     tq += ' AND commodity_id = ?';     p.push(parseInt(commodity_id)); tp.push(parseInt(commodity_id)); }

    q += ' ORDER BY date DESC, id DESC';

    const [issues, totals, commodities] = await Promise.all([
      all(q, p),
      get(tq, tp),
      all(`SELECT id, name, unit FROM commodities`),
    ]);

    const commMap = {};
    commodities.forEach(c => { commMap[c.id] = c; });
    const enriched = issues.map(i => ({
      ...i,
      commodity_name: commMap[i.commodity_id]?.name || null,
      commodity_unit: commMap[i.commodity_id]?.unit || null,
    }));

    res.json({ issues: enriched, totals: totals || { total_bags: 0, total_sales: 0 } });
  } catch (err) {
    console.error('GET /issues error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { commodity_id, date, invoice_number, customer_name, quantity, selling_price, payment_method, payment_status, remarks } = req.body;
    if (!date || !invoice_number || !customer_name || !quantity || !selling_price)
      return res.status(400).json({ error: 'Date, invoice number, customer, quantity, and selling price are required.' });
    const total_sales = parseFloat(quantity) * parseFloat(selling_price);
    const result = await run(
      `INSERT INTO stock_issues (commodity_id, date, invoice_number, customer_name, quantity, selling_price, total_sales, payment_method, payment_status, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [commodity_id ? parseInt(commodity_id) : null, date, invoice_number, customer_name,
       parseInt(quantity), parseFloat(selling_price), total_sales,
       payment_method || 'Cash', payment_status || 'Paid', remarks || '', req.user.id]
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Issue recorded.' });
  } catch (err) {
    console.error('POST /issues error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { commodity_id, date, invoice_number, customer_name, quantity, selling_price, payment_method, payment_status, remarks } = req.body;
    const total_sales = parseFloat(quantity) * parseFloat(selling_price);
    await run(
      `UPDATE stock_issues SET commodity_id=?, date=?, invoice_number=?, customer_name=?, quantity=?, selling_price=?, total_sales=?, payment_method=?, payment_status=?, remarks=? WHERE id=?`,
      [commodity_id ? parseInt(commodity_id) : null, date, invoice_number, customer_name,
       parseInt(quantity), parseFloat(selling_price), total_sales,
       payment_method, payment_status, remarks || '', req.params.id]
    );
    res.json({ message: 'Issue updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM stock_issues WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
