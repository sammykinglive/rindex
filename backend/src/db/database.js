const bcrypt = require('bcryptjs');

const DB_URL = process.env.TURSO_DB_URL;
const DB_TOKEN = process.env.TURSO_DB_TOKEN;

const TURSO_HTTP = DB_URL
  ? DB_URL.replace('libsql://', 'https://') + '/v2/pipeline'
  : null;

async function execute(statements) {
  const body = {
    requests: statements.map(s => ({
      type: 'execute',
      stmt: {
        sql: s.sql,
        args: (s.args || []).map(v => {
          if (v === null || v === undefined) return { type: 'null' };
          if (typeof v === 'number' && Number.isInteger(v)) return { type: 'integer', value: String(v) };
          if (typeof v === 'number') return { type: 'float', value: v };
          return { type: 'text', value: String(v) };
        })
      }
    }))
  };
  body.requests.push({ type: 'close' });

  const res = await fetch(TURSO_HTTP, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso HTTP error ${res.status}: ${text}`);
  }

  return await res.json();
}

function mapRow(cols, row) {
  const obj = {};
  cols.forEach((col, i) => {
    const v = row[i];
    if (v && v.type === 'integer') obj[col] = parseInt(v.value);
    else if (v && v.type === 'float') obj[col] = parseFloat(v.value);
    else if (v && v.type === 'null') obj[col] = null;
    else obj[col] = v ? v.value : null;
  });
  return obj;
}

async function run(sql, params = []) {
  const result = await execute([{ sql, args: params }]);
  const r = result.results[0];
  if (r.type === 'error') throw new Error(r.error.message);
  return {
    lastInsertRowid: parseInt(r.response.result.last_insert_rowid || 0),
    changes: r.response.result.affected_row_count || 0
  };
}

async function get(sql, params = []) {
  const result = await execute([{ sql, args: params }]);
  const r = result.results[0];
  if (r.type === 'error') throw new Error(r.error.message);
  const { cols, rows } = r.response.result;
  const colNames = cols.map(c => c.name);
  if (!rows || rows.length === 0) return null;
  return mapRow(colNames, rows[0]);
}

async function all(sql, params = []) {
  const result = await execute([{ sql, args: params }]);
  const r = result.results[0];
  if (r.type === 'error') throw new Error(r.error.message);
  const { cols, rows } = r.response.result;
  const colNames = cols.map(c => c.name);
  if (!rows) return [];
  return rows.map(row => mapRow(colNames, row));
}

async function initDb() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      permissions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS commodities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      unit TEXT NOT NULL DEFAULT 'bags',
      unit_price REAL NOT NULL DEFAULT 0,
      reorder_level INTEGER NOT NULL DEFAULT 50,
      warehouse_capacity INTEGER NOT NULL DEFAULT 1000,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS stock_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commodity_id INTEGER REFERENCES commodities(id),
      date TEXT NOT NULL,
      grn_number TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      delivery_note TEXT,
      condition TEXT DEFAULT 'Good',
      remarks TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS stock_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commodity_id INTEGER REFERENCES commodities(id),
      date TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      selling_price REAL NOT NULL,
      total_sales REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      payment_status TEXT DEFAULT 'Paid',
      remarks TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT,
      paid_by TEXT,
      paid_to TEXT,
      receipt_no TEXT,
      payment_method TEXT DEFAULT 'Cash',
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS clients (
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS client_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      note_type TEXT DEFAULT 'General',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of tables) {
    await run(sql);
  }

  // ── Idempotent column migrations ─────────────────────────────────────────
  const migrations = [
    `ALTER TABLE users ADD COLUMN permissions TEXT`,
    `ALTER TABLE stock_receipts ADD COLUMN commodity_id INTEGER`,
    `ALTER TABLE stock_issues ADD COLUMN commodity_id INTEGER`,
    `ALTER TABLE expenses ADD COLUMN date TEXT`,
    `ALTER TABLE expenses ADD COLUMN paid_by TEXT`,
    `ALTER TABLE expenses ADD COLUMN paid_to TEXT`,
    `ALTER TABLE expenses ADD COLUMN receipt_no TEXT`,
    `ALTER TABLE expenses ADD COLUMN payment_method TEXT`,
  ];
  for (const sql of migrations) {
    try { await run(sql); } catch (_) { /* column already exists */ }
  }

  // ── Default commodities — INSERT OR IGNORE by name ───────────────────────
  // Runs on every startup — adds any missing commodity, skips existing ones
  const DEFAULT_COMMODITIES = [
    // Grains & Cereals
    ['Maize',                 'bags',   320,  50,  1000],
    ['Soybeans',              'bags',   420,  40,  800 ],
    ['Sorghum',               'bags',   280,  30,  600 ],
    ['Cowpea',                'bags',   380,  30,  600 ],
    ['Groundnuts',            'bags',   450,  30,  500 ],
    ['Wheat Bran',            'bags',   180,  40,  800 ],
    // Feed Ingredients
    ['PKC (Palm Kernel Cake)','bags',   260,  40,  700 ],
    ['Shea',                  'bags',   350,  30,  500 ],
    ['Crude Palm Oil',        'litres',   8, 500, 10000],
    ['Fish Meal',             'bags',   650,  20,  400 ],
    ['Bone Meal',             'bags',   300,  20,  400 ],
    ['Limestone',             'bags',    80,  50, 1000 ],
    ['Salt (Feed Grade)',     'bags',    60,  30,  600 ],
    ['Premix / Vitamins',     'kg',      25, 100, 2000 ],
    ['Dicalcium Phosphate',   'bags',   420,  20,  400 ],
    ['Methionine',            'kg',      80,  50, 1000 ],
    ['Lysine',                'kg',      90,  50, 1000 ],
    ['Soybean Meal',          'bags',   480,  40,  800 ],
    ['Cottonseed Cake',       'bags',   240,  30,  600 ],
    ['Sunflower Cake',        'bags',   260,  30,  600 ],
  ];

  for (const [name, unit, unit_price, reorder_level, warehouse_capacity] of DEFAULT_COMMODITIES) {
    await run(
      `INSERT OR IGNORE INTO commodities (name, unit, unit_price, reorder_level, warehouse_capacity) VALUES (?, ?, ?, ?, ?)`,
      [name, unit, unit_price, reorder_level, warehouse_capacity]
    );
  }

  const totalComm = await get(`SELECT COUNT(*) as n FROM commodities`);
  console.log(`✅ Commodities in DB: ${totalComm.n}`);

  // ── Migrate existing maize transactions ──────────────────────────────────
  // Tag any untagged receipts/issues with the Maize commodity id
  const maize = await get(`SELECT id FROM commodities WHERE name = 'Maize'`);
  if (maize) {
    await run(`UPDATE stock_receipts SET commodity_id = ? WHERE commodity_id IS NULL`, [maize.id]);
    await run(`UPDATE stock_issues  SET commodity_id = ? WHERE commodity_id IS NULL`, [maize.id]);
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  const settingsData = [
    ['reorder_level',       '50'],
    ['unit_price',          '320'],
    ['warehouse_capacity',  '1000'],
    ['supplier_name',       'Default Supplier'],
    ['warehouse_location',  'Accra'],
    ['business_name',       'Rindex'],
  ];
  for (const [key, value] of settingsData) {
    await run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
  }

  // ── Default admin ─────────────────────────────────────────────────────────
  const existingAdmin = await get('SELECT id FROM users WHERE email = ?', ['admin@rindex.com']);
  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await run(
      `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
      ['Admin', 'admin@rindex.com', hashedPassword, 'admin']
    );
    console.log('✅ Default admin created: admin@rindex.com / admin123');
  }

  console.log('✅ Database initialised successfully');
}

module.exports = { initDb, run, get, all };