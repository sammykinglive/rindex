const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { from, to, customer, status, commodity_id } = req.query;
    let query = `
      SELECT i.*, u.name as created_by_name,
             c.name as commodity_name, c.unit as commodity_unit
      FROM stock_issues i
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN commodities c ON i.commodity_id = c.id
      WHERE 1=1`;
    let totalsQuery = `SELECT COALESCE(SUM(quantity),0) as total_bags, COALESCE(SUM(total_sales),0) as total_sales FROM stock_issues WHERE 1=1`;
    const params = [], tp = [];
    if (from)         { query += ' AND i.date >= ?';            totalsQuery += ' AND date >= ?';         params.push(from);                tp.push(from); }
    if (to)           { query += ' AND i.date <= ?';            totalsQuery += ' AND date <= ?';         params.push(to);                  tp.push(to); }
    if (customer)     { query += ' AND i.customer_name LIKE ?'; totalsQuery += ' AND customer_name LIKE ?'; params.push(`%${customer}%`); tp.push(`%${customer}%`); }
    if (status)       { query += ' AND i.payment_status = ?';   totalsQuery += ' AND payment_status = ?'; params.push(status);            tp.push(status); }
    if (commodity_id) { query += ' AND i.commodity_id = ?';     totalsQuery += ' AND commodity_id = ?'; params.push(parseInt(commodity_id)); tp.push(parseInt(commodity_id)); }
    query += ' ORDER BY i.date DESC, i.id DESC';
    const issues = await all(query, params);
    const totals  = await get(totalsQuery, tp);
    res.json({ issues, totals });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
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
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { commodity_id, date, invoice_number, customer_name, quantity, selling_price, payment_method, payment_status, remarks } = req.body;
    const total_sales = parseFloat(quantity) * parseFloat(selling_price);
    await run(
      `UPDATE stock_issues SET commodity_id=?, date=?, invoice_number=?, customer_name=?, quantity=?, selling_price=?, total_sales=?, payment_method=?, payment_status=?, remarks=? WHERE id=?`,
      [commodity_id ? parseInt(commodity_id) : null, date, invoice_number, customer_name,
       parseInt(quantity), parseFloat(selling_price), total_sales,
       payment_method, payment_status, remarks, req.params.id]
    );
    res.json({ message: 'Issue updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM stock_issues WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
