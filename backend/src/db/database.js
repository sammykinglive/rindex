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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS stock_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tables) {
    await run(sql);
  }

  const settingsData = [
    ['reorder_level', '50'],
    ['unit_price', '320'],
    ['warehouse_capacity', '1000'],
    ['supplier_name', 'Default Supplier'],
    ['warehouse_location', 'Accra'],
    ['business_name', 'Rindex'],
  ];
  for (const [key, value] of settingsData) {
    await run(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }

  const existingAdmin = await get(
    'SELECT id FROM users WHERE email = ?',
    ['admin@rindex.com']
  );
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