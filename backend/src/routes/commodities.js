const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── List all commodities ──────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Fetch commodities and totals in separate simple queries
    // (avoids Turso pipeline issues with complex multi-join GROUP BY)
    const commodities = await all(`SELECT * FROM commodities ORDER BY name ASC`);

    const inRows  = await all(`SELECT commodity_id, COALESCE(SUM(quantity),0) as total FROM stock_receipts GROUP BY commodity_id`);
    const outRows = await all(`SELECT commodity_id, COALESCE(SUM(quantity),0) as total FROM stock_issues   GROUP BY commodity_id`);

    const inMap  = {};
    const outMap = {};
    inRows.forEach(r  => { inMap[r.commodity_id]  = r.total; });
    outRows.forEach(r => { outMap[r.commodity_id] = r.total; });

    const result = commodities.map(c => ({
      ...c,
      total_in:  inMap[c.id]  || 0,
      total_out: outMap[c.id] || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /commodities error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Get single commodity ──────────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const c = await get(`SELECT * FROM commodities WHERE id = ?`, [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Commodity not found.' });
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Create commodity ──────────────────────────────────────────────────────────
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, unit, unit_price, reorder_level, warehouse_capacity } = req.body;
    if (!name || !unit) return res.status(400).json({ error: 'Name and unit are required.' });
    const result = await run(
      `INSERT INTO commodities (name, unit, unit_price, reorder_level, warehouse_capacity) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), unit, parseFloat(unit_price)||0, parseInt(reorder_level)||50, parseInt(warehouse_capacity)||1000]
    );
    res.status(201).json({ id: result.lastInsertRowid, name, unit });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'A commodity with this name already exists.' });
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Update commodity ──────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, unit, unit_price, reorder_level, warehouse_capacity, is_active } = req.body;
    await run(
      `UPDATE commodities SET name=?, unit=?, unit_price=?, reorder_level=?, warehouse_capacity=?, is_active=? WHERE id=?`,
      [name, unit, parseFloat(unit_price)||0, parseInt(reorder_level)||50, parseInt(warehouse_capacity)||1000, is_active ?? 1, req.params.id]
    );
    res.json({ message: 'Updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Delete commodity (only if no transactions) ────────────────────────────────
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    // Check receipts and issues separately (avoids UNION issues in Turso)
    const inReceipts = await get(`SELECT id FROM stock_receipts WHERE commodity_id=? LIMIT 1`, [req.params.id]);
    const inIssues   = await get(`SELECT id FROM stock_issues   WHERE commodity_id=? LIMIT 1`, [req.params.id]);
    if (inReceipts || inIssues) {
      return res.status(400).json({ error: 'Cannot delete — this commodity has transactions. Deactivate it instead.' });
    }
    await run(`DELETE FROM commodities WHERE id=?`, [req.params.id]);
    res.json({ message: 'Deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
