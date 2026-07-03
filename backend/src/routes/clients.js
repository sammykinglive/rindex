const express = require('express');
const { run, get, all } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Auto-migrate: create clients & client_notes tables if not exist ────────────
async function ensureClientTables() {
  await run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_code TEXT UNIQUE,
    name TEXT NOT NULL,
    company_name TEXT,
    category TEXT DEFAULT 'Retail',
    contact_person TEXT,
    phone TEXT,
    phone2 TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    region TEXT,
    gps_address TEXT,
    tax_id TEXT,
    sales_rep TEXT,
    credit_limit REAL DEFAULT 0,
    payment_terms TEXT DEFAULT 'Cash',
    status TEXT DEFAULT 'Active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS client_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    note_type TEXT DEFAULT 'General',
    content TEXT NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  )`);
}
ensureClientTables();

// ── Helpers ────────────────────────────────────────────────────────────────────
function generateCode(id) {
  return 'CLI-' + String(id).padStart(4, '0');
}

// ── GET /clients — directory with search, filter, pagination ──────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, category, status, region, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ` AND (c.name LIKE ? OR c.company_name LIKE ? OR c.client_code LIKE ?
                   OR c.phone LIKE ? OR c.email LIKE ? OR c.contact_person LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q, q, q, q);
    }
    if (category) { where += ' AND c.category = ?'; params.push(category); }
    if (status)   { where += ' AND c.status = ?';   params.push(status); }
    if (region)   { where += ' AND c.region = ?';   params.push(region); }

    const clients = await all(`
      SELECT c.*,
        COUNT(DISTINCT i.id)       as total_orders,
        COALESCE(SUM(i.quantity),0) as total_bags,
        COALESCE(SUM(i.total_sales),0) as total_revenue,
        MAX(i.date)                as last_purchase_date
      FROM clients c
      LEFT JOIN stock_issues i ON LOWER(TRIM(i.customer_name)) = LOWER(TRIM(c.name))
      ${where}
      GROUP BY c.id
      ORDER BY c.name ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const countRow = await get(`SELECT COUNT(*) as n FROM clients c ${where}`, params);

    res.json({ clients, total: countRow.n, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /clients/kpis — dashboard summary ─────────────────────────────────────
router.get('/kpis', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const lastMonth = now.getMonth() === 0
      ? `${now.getFullYear()-1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;

    const total      = await get('SELECT COUNT(*) as n FROM clients');
    const active     = await get("SELECT COUNT(*) as n FROM clients WHERE status='Active'");
    const newThisMonth = await get("SELECT COUNT(*) as n FROM clients WHERE created_at LIKE ?", [`${thisMonth}%`]);

    // Revenue & volume from issues matched to clients
    const revRow     = await get('SELECT COALESCE(SUM(total_sales),0) as v, COALESCE(SUM(quantity),0) as bags FROM stock_issues');
    const ordersRow  = await get('SELECT COUNT(*) as n FROM stock_issues');
    const avgOrder   = ordersRow.n > 0 ? revRow.v / ordersRow.n : 0;

    // Top spender
    const topSpender = await get(`
      SELECT customer_name, SUM(total_sales) as rev
      FROM stock_issues GROUP BY LOWER(TRIM(customer_name))
      ORDER BY rev DESC LIMIT 1`);

    // Top volume
    const topVolume = await get(`
      SELECT customer_name, SUM(quantity) as bags
      FROM stock_issues GROUP BY LOWER(TRIM(customer_name))
      ORDER BY bags DESC LIMIT 1`);

    // Returning clients (placed >1 order)
    const returningRow = await get(`
      SELECT COUNT(*) as n FROM (
        SELECT customer_name FROM stock_issues
        GROUP BY LOWER(TRIM(customer_name)) HAVING COUNT(*)>1
      )`);
    const uniqueBuyers = await get('SELECT COUNT(DISTINCT LOWER(TRIM(customer_name))) as n FROM stock_issues');
    const returningRate = uniqueBuyers.n > 0 ? (returningRow.n / uniqueBuyers.n) * 100 : 0;

    // Avg monthly purchase (avg revenue per client per month)
    const clientCount = total.n || 1;
    const avgMonthly = revRow.v / Math.max(clientCount, 1) / 12;

    res.json({
      total_clients: total.n,
      active_clients: active.n,
      new_this_month: newThisMonth.n,
      total_revenue: revRow.v,
      total_bags: revRow.bags,
      avg_order_value: avgOrder,
      avg_monthly_purchase: avgMonthly,
      top_spender: topSpender?.customer_name || '—',
      top_spender_rev: topSpender?.rev || 0,
      top_volume: topVolume?.customer_name || '—',
      top_volume_bags: topVolume?.bags || 0,
      returning_rate: returningRate,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /clients/regions — regional summary ────────────────────────────────────
router.get('/regions', authMiddleware, async (req, res) => {
  try {
    const rows = await all(`
      SELECT c.region,
        COUNT(DISTINCT c.id) as clients,
        COALESCE(SUM(i.total_sales),0) as revenue,
        COALESCE(SUM(i.quantity),0) as bags
      FROM clients c
      LEFT JOIN stock_issues i ON LOWER(TRIM(i.customer_name))=LOWER(TRIM(c.name))
      WHERE c.region IS NOT NULL AND c.region != ''
      GROUP BY c.region ORDER BY revenue DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /clients/insights — business intelligence ─────────────────────────────
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const ninetyDaysAgo = new Date(now - 90*24*60*60*1000).toISOString().slice(0,10);
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const lastMonth = now.getMonth() === 0
      ? `${now.getFullYear()-1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;

    // Inactive 90+ days (have bought before but not recently)
    const inactive90 = await all(`
      SELECT customer_name, MAX(date) as last_date, COUNT(*) as orders
      FROM stock_issues GROUP BY LOWER(TRIM(customer_name))
      HAVING MAX(date) < ? ORDER BY last_date ASC LIMIT 5`, [ninetyDaysAgo]);

    // Fastest growing (this month vs last)
    const thisMonthByClient = await all(`
      SELECT customer_name, SUM(total_sales) as rev
      FROM stock_issues WHERE date LIKE ? GROUP BY LOWER(TRIM(customer_name))`, [`${thisMonth}%`]);
    const lastMonthByClient = await all(`
      SELECT customer_name, SUM(total_sales) as rev
      FROM stock_issues WHERE date LIKE ? GROUP BY LOWER(TRIM(customer_name))`, [`${lastMonth}%`]);

    const lastMap = {};
    lastMonthByClient.forEach(r => { lastMap[r.customer_name.toLowerCase().trim()] = r.rev; });

    const growing = thisMonthByClient
      .map(r => {
        const prev = lastMap[r.customer_name.toLowerCase().trim()] || 0;
        const growth = prev > 0 ? ((r.rev - prev) / prev) * 100 : (r.rev > 0 ? 100 : 0);
        return { customer_name: r.customer_name, growth, this_month: r.rev, last_month: prev };
      })
      .filter(r => r.growth > 0)
      .sort((a,b) => b.growth - a.growth)
      .slice(0, 3);

    // Most profitable (highest total revenue)
    const mostProfitable = await all(`
      SELECT customer_name, SUM(total_sales) as rev, SUM(quantity) as bags, COUNT(*) as orders
      FROM stock_issues GROUP BY LOWER(TRIM(customer_name))
      ORDER BY rev DESC LIMIT 5`);

    // Client rankings for all
    const allRanked = await all(`
      SELECT customer_name,
        SUM(total_sales) as revenue,
        SUM(quantity) as bags,
        COUNT(*) as orders
      FROM stock_issues
      GROUP BY LOWER(TRIM(customer_name))
      ORDER BY revenue DESC`);

    res.json({ inactive90, growing, mostProfitable, allRanked });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

// ── GET /clients/:id — single client full profile ─────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const client = await get('SELECT * FROM clients WHERE id=?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found.' });

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const lastMonth = now.getMonth() === 0
      ? `${now.getFullYear()-1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;

    const nameFilter = `LOWER(TRIM(customer_name))=LOWER(TRIM(?))`;

    // Lifetime stats
    const lifetime = await get(`
      SELECT COUNT(*) as orders, COALESCE(SUM(quantity),0) as bags,
        COALESCE(SUM(total_sales),0) as revenue,
        COALESCE(AVG(quantity),0) as avg_bags,
        COALESCE(AVG(total_sales),0) as avg_value,
        MAX(total_sales) as largest_order,
        MIN(date) as first_date, MAX(date) as last_date
      FROM stock_issues WHERE ${nameFilter}`, [client.name]);

    // This month
    const thisMonthStats = await get(`
      SELECT COUNT(*) as orders, COALESCE(SUM(quantity),0) as bags,
        COALESCE(SUM(total_sales),0) as revenue
      FROM stock_issues WHERE ${nameFilter} AND date LIKE ?`, [client.name, `${thisMonth}%`]);

    // Last month
    const lastMonthStats = await get(`
      SELECT COALESCE(SUM(quantity),0) as bags, COALESCE(SUM(total_sales),0) as revenue
      FROM stock_issues WHERE ${nameFilter} AND date LIKE ?`, [client.name, `${lastMonth}%`]);

    // Monthly trend (last 12 months)
    const monthlyTrend = await all(`
      SELECT substr(date,1,7) as month,
        SUM(quantity) as bags, SUM(total_sales) as revenue, COUNT(*) as orders
      FROM stock_issues WHERE ${nameFilter}
      GROUP BY substr(date,1,7) ORDER BY month ASC`, [client.name]);

    // All purchases
    const purchases = await all(`
      SELECT * FROM stock_issues WHERE ${nameFilter} ORDER BY date DESC`, [client.name]);

    // Ranking vs all clients
    const allRevenue = await all(`
      SELECT customer_name, SUM(total_sales) as rev
      FROM stock_issues GROUP BY LOWER(TRIM(customer_name)) ORDER BY rev DESC`);
    const rankIdx = allRevenue.findIndex(r => r.customer_name.toLowerCase().trim() === client.name.toLowerCase().trim());
    const revenueRank = rankIdx >= 0 ? rankIdx + 1 : null;

    const allBags = await all(`
      SELECT customer_name, SUM(quantity) as bags
      FROM stock_issues GROUP BY LOWER(TRIM(customer_name)) ORDER BY bags DESC`);
    const bagsRankIdx = allBags.findIndex(r => r.customer_name.toLowerCase().trim() === client.name.toLowerCase().trim());
    const bagsRank = bagsRankIdx >= 0 ? bagsRankIdx + 1 : null;

    // Notes
    const notes = await all(`
      SELECT n.*, u.name as author
      FROM client_notes n LEFT JOIN users u ON n.created_by=u.id
      WHERE n.client_id=? ORDER BY n.created_at DESC`, [req.params.id]);

    // Avg days between purchases
    let avgDaysBetween = null;
    if (purchases.length > 1) {
      let totalDays = 0;
      for (let i = 0; i < purchases.length - 1; i++) {
        const d1 = new Date(purchases[i].date);
        const d2 = new Date(purchases[i+1].date);
        totalDays += Math.abs(d1 - d2) / (1000*60*60*24);
      }
      avgDaysBetween = Math.round(totalDays / (purchases.length - 1));
    }

    const revGrowth = lastMonthStats.revenue > 0
      ? ((thisMonthStats.revenue - lastMonthStats.revenue) / lastMonthStats.revenue) * 100
      : (thisMonthStats.revenue > 0 ? 100 : 0);

    res.json({
      client, lifetime, thisMonth: thisMonthStats, lastMonth: lastMonthStats,
      monthlyTrend, purchases, notes,
      revenueRank, bagsRank, totalClients: allRevenue.length,
      avgDaysBetween, revGrowth,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

// ── POST /clients — create ─────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, company_name, category, contact_person, phone, phone2, email,
            address, city, region, gps_address, tax_id, sales_rep,
            credit_limit, payment_terms, status, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Client name is required.' });

    const result = await run(`
      INSERT INTO clients (name, company_name, category, contact_person, phone, phone2, email,
        address, city, region, gps_address, tax_id, sales_rep, credit_limit, payment_terms, status, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name, company_name||'', category||'Retail', contact_person||'', phone||'', phone2||'',
       email||'', address||'', city||'', region||'', gps_address||'', tax_id||'',
       sales_rep||'', parseFloat(credit_limit)||0, payment_terms||'Cash', status||'Active', notes||'']);

    const newId = result.lastInsertRowid;
    const code = generateCode(newId);
    await run('UPDATE clients SET client_code=? WHERE id=?', [code, newId]);

    res.status(201).json({ id: newId, client_code: code });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

// ── PUT /clients/:id — update ──────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, company_name, category, contact_person, phone, phone2, email,
            address, city, region, gps_address, tax_id, sales_rep,
            credit_limit, payment_terms, status, notes } = req.body;
    await run(`
      UPDATE clients SET name=?,company_name=?,category=?,contact_person=?,phone=?,phone2=?,
        email=?,address=?,city=?,region=?,gps_address=?,tax_id=?,sales_rep=?,
        credit_limit=?,payment_terms=?,status=?,notes=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=?`,
      [name, company_name||'', category||'Retail', contact_person||'', phone||'', phone2||'',
       email||'', address||'', city||'', region||'', gps_address||'', tax_id||'',
       sales_rep||'', parseFloat(credit_limit)||0, payment_terms||'Cash', status||'Active',
       notes||'', req.params.id]);
    res.json({ message: 'Updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── DELETE /clients/:id ────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM clients WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── POST /clients/:id/notes ────────────────────────────────────────────────────
router.post('/:id/notes', authMiddleware, async (req, res) => {
  try {
    const { content, note_type } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content required.' });
    const result = await run(
      'INSERT INTO client_notes (client_id, note_type, content, created_by) VALUES (?,?,?,?)',
      [req.params.id, note_type||'General', content, req.user.id]);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── DELETE /clients/:id/notes/:nid ────────────────────────────────────────────
router.delete('/:id/notes/:nid', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM client_notes WHERE id=? AND client_id=?', [req.params.nid, req.params.id]);
    res.json({ message: 'Note deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
