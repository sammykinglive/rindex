const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { from, to, customer, status } = req.query;
    let query = `SELECT i.*, u.name as created_by_name FROM stock_issues i LEFT JOIN users u ON i.created_by = u.id WHERE 1=1`;
    const params = [];
    if (from)     { query += ' AND i.date >= ?'; params.push(from); }
    if (to)       { query += ' AND i.date <= ?'; params.push(to); }
    if (customer) { query += ' AND i.customer_name LIKE ?'; params.push(`%${customer}%`); }
    if (status)   { query += ' AND i.payment_status = ?'; params.push(status); }
    query += ' ORDER BY i.date DESC, i.id DESC';
    const issues = await all(query, params);
    const totals  = await get(`SELECT COALESCE(SUM(quantity),0) as total_bags, COALESCE(SUM(total_sales),0) as total_sales FROM stock_issues`);
    res.json({ issues, totals });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { date, invoice_number, customer_name, quantity, selling_price, payment_method, payment_status, remarks } = req.body;
    if (!date || !invoice_number || !customer_name || !quantity || !selling_price)
      return res.status(400).json({ error: 'Date, invoice number, customer, quantity, and selling price are required.' });
    const totalInRow  = await get('SELECT COALESCE(SUM(quantity),0) as total FROM stock_receipts');
    const totalOutRow = await get('SELECT COALESCE(SUM(quantity),0) as total FROM stock_issues');
    const balance = totalInRow.total - totalOutRow.total;
    if (parseInt(quantity) > balance)
      return res.status(400).json({ error: `Insufficient stock. Current balance: ${balance} bags.` });
    const total_sales = parseFloat(quantity) * parseFloat(selling_price);
    const result = await run(
      `INSERT INTO stock_issues (date, invoice_number, customer_name, quantity, selling_price, total_sales, payment_method, payment_status, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, invoice_number, customer_name, parseInt(quantity), parseFloat(selling_price), total_sales, payment_method || 'Cash', payment_status || 'Paid', remarks || '', req.user.id]
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Stock issue recorded successfully.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { date, invoice_number, customer_name, quantity, selling_price, payment_method, payment_status, remarks } = req.body;
    const total_sales = parseFloat(quantity) * parseFloat(selling_price);
    await run(
      `UPDATE stock_issues SET date=?, invoice_number=?, customer_name=?, quantity=?, selling_price=?, total_sales=?, payment_method=?, payment_status=?, remarks=? WHERE id=?`,
      [date, invoice_number, customer_name, parseInt(quantity), parseFloat(selling_price), total_sales, payment_method, payment_status, remarks, req.params.id]
    );
    res.json({ message: 'Issue updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM stock_issues WHERE id = ?', [req.params.id]);
    res.json({ message: 'Issue deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
