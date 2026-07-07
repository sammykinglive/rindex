const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { from, to, supplier, commodity_id } = req.query;
    let q = 'SELECT r.*, u.name as created_by_name, c.name as commodity_name, c.unit as commodity_unit FROM stock_receipts r LEFT JOIN users u ON r.created_by = u.id LEFT JOIN commodities c ON r.commodity_id = c.id WHERE 1=1';
    let tq = 'SELECT COALESCE(SUM(quantity),0) as total_bags, COALESCE(SUM(total_cost),0) as total_cost FROM stock_receipts WHERE 1=1';
    const p = [], tp = [];
    if (from)         { q += ' AND r.date >= ?';            tq += ' AND date >= ?';              p.push(from);                 tp.push(from); }
    if (to)           { q += ' AND r.date <= ?';            tq += ' AND date <= ?';              p.push(to);                   tp.push(to); }
    if (supplier)     { q += ' AND r.supplier_name LIKE ?'; tq += ' AND supplier_name LIKE ?';   p.push(`%${supplier}%`);      tp.push(`%${supplier}%`); }
    if (commodity_id) { q += ' AND r.commodity_id = ?';     tq += ' AND commodity_id = ?';       p.push(parseInt(commodity_id)); tp.push(parseInt(commodity_id)); }
    q += ' ORDER BY r.date DESC, r.id DESC';
    const receipts = await all(q, p);
    const totals   = await get(tq, tp);
    res.json({ receipts, totals });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { commodity_id, date, grn_number, supplier_name, quantity, unit_cost, delivery_note, condition, remarks } = req.body;
    if (!date || !grn_number || !supplier_name || !quantity || !unit_cost)
      return res.status(400).json({ error: 'Date, GRN number, supplier, quantity, and unit cost are required.' });
    const total_cost = parseFloat(quantity) * parseFloat(unit_cost);
    const result = await run(
      'INSERT INTO stock_receipts (commodity_id, date, grn_number, supplier_name, quantity, unit_cost, total_cost, delivery_note, condition, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [commodity_id ? parseInt(commodity_id) : null, date, grn_number, supplier_name, parseInt(quantity), parseFloat(unit_cost), total_cost, delivery_note || '', condition || 'Good', remarks || '', req.user.id]
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Receipt recorded.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { commodity_id, date, grn_number, supplier_name, quantity, unit_cost, delivery_note, condition, remarks } = req.body;
    const total_cost = parseFloat(quantity) * parseFloat(unit_cost);
    await run(
      'UPDATE stock_receipts SET commodity_id=?, date=?, grn_number=?, supplier_name=?, quantity=?, unit_cost=?, total_cost=?, delivery_note=?, condition=?, remarks=? WHERE id=?',
      [commodity_id ? parseInt(commodity_id) : null, date, grn_number, supplier_name, parseInt(quantity), parseFloat(unit_cost), total_cost, delivery_note, condition, remarks, req.params.id]
    );
    res.json({ message: 'Receipt updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM stock_receipts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
