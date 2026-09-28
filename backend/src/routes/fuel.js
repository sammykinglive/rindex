const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// F{truck number}-{YYYYMMDD}-{sequence, continuing across all of this
// truck's fuel transactions, not reset per day} — e.g. F01-20260808-001,
// then F01-20260809-002 for the same truck's next fill-up a day later.
async function generateFuelCode(vehicleId, fuelDate) {
  const vehicle = await get('SELECT truck_code FROM vehicles WHERE id = ?', [vehicleId]);
  const truckNum = (vehicle?.truck_code || 'T00').replace(/^T/i, '');
  const countRow = await get('SELECT COUNT(*) as n FROM fuel_logs WHERE vehicle_id = ?', [vehicleId]);
  const seq = String((countRow?.n || 0) + 1).padStart(3, '0');
  const ymd = (fuelDate || '').replace(/-/g, '');
  return `F${truckNum}-${ymd}-${seq}`;
}

// Finds the most recent PRIOR fuel entry for this vehicle (by odometer
// reading, not by date — protects against out-of-order data entry) and
// computes distance travelled + efficiency since that fill-up.
async function calcEfficiency(vehicleId, odometerKm, excludeId = null) {
  if (!odometerKm) return { distance: null, efficiency: null };
  let query = 'SELECT odometer_km FROM fuel_logs WHERE vehicle_id = ? AND odometer_km < ?';
  const params = [vehicleId, odometerKm];
  if (excludeId) { query += ' AND id != ?'; params.push(excludeId); }
  query += ' ORDER BY odometer_km DESC LIMIT 1';
  const prior = await get(query, params);
  if (!prior) return { distance: null, efficiency: null };
  const distance = odometerKm - prior.odometer_km;
  return { distance, efficiency: null }; // efficiency filled in after litres is known
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { vehicle_id, from, to } = req.query;
    let query = `
      SELECT f.*, v.registration_no as vehicle_reg
      FROM fuel_logs f
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    if (vehicle_id) { query += ' AND f.vehicle_id = ?'; params.push(vehicle_id); }
    if (from)       { query += ' AND f.fuel_date >= ?'; params.push(from); }
    if (to)         { query += ' AND f.fuel_date <= ?'; params.push(to); }
    query += ' ORDER BY f.fuel_date DESC, f.id DESC';
    const logs = await all(query, params);

    const totals = await get(`
      SELECT COUNT(*) as total_entries,
             SUM(litres) as total_litres,
             SUM(cost) as total_cost,
             AVG(efficiency_km_per_l) as avg_efficiency
      FROM fuel_logs
    `);

    res.json({ logs, totals });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const b = req.body;
    if (!b.fuel_date || !b.vehicle_id || !b.litres) return res.status(400).json({ error: 'Date, vehicle, and litres are required.' });

    const odo = b.odometer_km ? Number(b.odometer_km) : null;
    const { distance } = await calcEfficiency(b.vehicle_id, odo);
    const efficiency = distance && b.litres ? Math.round((distance / Number(b.litres)) * 100) / 100 : null;

    // Cost and price-per-litre stay consistent with each other regardless
    // of which one the person actually typed in.
    let cost = b.cost ? Number(b.cost) : null;
    let pricePerLitre = b.price_per_litre ? Number(b.price_per_litre) : null;
    if (pricePerLitre && !cost) cost = Math.round(pricePerLitre * Number(b.litres) * 100) / 100;
    else if (cost && !pricePerLitre) pricePerLitre = Math.round((cost / Number(b.litres)) * 100) / 100;

    const fuelCode = await generateFuelCode(b.vehicle_id, b.fuel_date);

    const result = await run(
      `INSERT INTO fuel_logs
        (fuel_code, fuel_date, vehicle_id, trip_id, odometer_km, litres, source, location, price_per_litre, cost,
         distance_since_last_km, efficiency_km_per_l, issued_by, confirmed_by_driver, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        fuelCode, b.fuel_date, b.vehicle_id, b.trip_id || null, odo, b.litres, b.source || '',
        b.location || '', pricePerLitre, cost,
        distance, efficiency, b.issued_by || '', b.confirmed_by_driver ? 1 : 0, b.notes || ''
      ]
    );
    res.status(201).json({ id: result.lastInsertRowid, fuel_code: fuelCode, message: 'Fuel entry logged successfully.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const b = req.body;
    const odo = b.odometer_km ? Number(b.odometer_km) : null;
    const { distance } = await calcEfficiency(b.vehicle_id, odo, req.params.id);
    const efficiency = distance && b.litres ? Math.round((distance / Number(b.litres)) * 100) / 100 : null;

    let cost = b.cost ? Number(b.cost) : null;
    let pricePerLitre = b.price_per_litre ? Number(b.price_per_litre) : null;
    if (pricePerLitre && !cost) cost = Math.round(pricePerLitre * Number(b.litres) * 100) / 100;
    else if (cost && !pricePerLitre) pricePerLitre = Math.round((cost / Number(b.litres)) * 100) / 100;

    // fuel_code is intentionally not in this UPDATE — it's set once at
    // creation and never changes, same as a trip's Trip Code.
    await run(
      `UPDATE fuel_logs SET
        fuel_date=?, vehicle_id=?, trip_id=?, odometer_km=?, litres=?, source=?, location=?, price_per_litre=?, cost=?,
        distance_since_last_km=?, efficiency_km_per_l=?, issued_by=?, confirmed_by_driver=?, notes=?
       WHERE id=?`,
      [
        b.fuel_date, b.vehicle_id, b.trip_id || null, odo, b.litres, b.source || '',
        b.location || '', pricePerLitre, cost,
        distance, efficiency, b.issued_by || '', b.confirmed_by_driver ? 1 : 0, b.notes || '', req.params.id
      ]
    );
    res.json({ message: 'Fuel entry updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM fuel_logs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Fuel entry deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
