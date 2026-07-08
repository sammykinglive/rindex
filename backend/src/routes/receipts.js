const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Safe commodity lookup — returns empty map if table missing
async function getCommodityMap() {
  try {
    const rows = await all(`SELECT id, name, unit FROM commodities`);
    const map = {};
    (rows || []).forEach(c => { map[c.id] = c; });
    return map;
  } catch (_) { return {}; }
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { from, to, supplier, commodity_id } = req.query;
    let q  = `SELECT * FROM stock_receipts WHERE 1=1`;
    let tq = `SELECT COALESCE(SUM(quantity),0) as total_bags, COALESCE(SUM(total_cost),0) as total_cost FROM stock_receipts WHERE 1=1`;
    const p = [], tp = [];
    if (from)         { q += ' AND date >= ?';            tq += ' AND date >= ?';            p.push(from);                   tp.push(from); }
    if (to)           { q += ' AND date <= ?';            tq += ' AND date <= ?';            p.push(to);                     tp.push(to); }
    if (supplier)     { q += ' AND supplier_name LIKE ?'; tq += ' AND supplier_name LIKE ?'; p.push(`%${supplier}%`);        tp.push(`%${supplier}%`); }
    if (commodity_id) { q += ' AND commodity_id = ?';     tq += ' AND commodity_id = ?';     p.push(parseInt(commodity_id)); tp.push(parseInt(commodity_id)); }
    q += ' ORDER BY date DESC, id DESC';

    const receipts = await all(q, p);
    const totals   = await get(tq, tp);
    const commMap  = await getCommodityMap();

    const enriched = (receipts || []).map(r => ({
      ...r,
      commodity_name: commMap[r.commodity_id]?.name || null,
      commodity_unit: commMap[r.commodity_id]?.unit || null,
    }));

    res.json({ receipts: enriched, totals: totals || { total_bags: 0, total_cost: 0 } });
  } catch (err) {
    console.error('GET /receipts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { commodity_id, date, grn_number, supplier_name, quantity, unit_cost, delivery_note, condition, remarks } = req.body;
    if (!date || !grn_number || !supplier_name || !quantity || !unit_cost)
      return res.status(400).json({ error: 'Date, GRN number, supplier, quantity and unit cost are required.' });
    const total_cost = parseFloat(quantity) * parseFloat(unit_cost);
    const result = await run(
      `INSERT INTO stock_receipts (commodity_id, date, grn_number, supplier_name, quantity, unit_cost, total_cost, delivery_note, condition, remarks, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [commodity_id ? parseInt(commodity_id) : null, date, grn_number, supplier_name,
       parseInt(quantity), parseFloat(unit_cost), total_cost,
       delivery_note||'', condition||'Good', remarks||'', req.user.id]
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Receipt recorded.' });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { commodity_id, date, grn_number, supplier_name, quantity, unit_cost, delivery_note, condition, remarks } = req.body;
    const total_cost = parseFloat(quantity) * parseFloat(unit_cost);
    await run(
      `UPDATE stock_receipts SET commodity_id=?,date=?,grn_number=?,supplier_name=?,quantity=?,unit_cost=?,total_cost=?,delivery_note=?,condition=?,remarks=? WHERE id=?`,
      [commodity_id ? parseInt(commodity_id) : null, date, grn_number, supplier_name,
       parseInt(quantity), parseFloat(unit_cost), total_cost,
       delivery_note||'', condition||'Good', remarks||'', req.params.id]
    );
    res.json({ message: 'Updated.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM stock_receipts WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
