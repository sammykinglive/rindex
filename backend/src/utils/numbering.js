// ── GRN / Batch number generation ──────────────────────────────────────────
// Formats (approved by the client, 29 Sept 2026):
//   GRN Number:   GRN-DDMMYY-XXX    e.g. GRN-290926-001   (receipts only,
//                 one running count per calendar day, across all commodities)
//   Batch Number: B-CODE-DDMMYY-XX  e.g. B-MZ-290926-01   (receipts AND issues
//                 share one running count per commodity per calendar day, so a
//                 batch tag is never reused for the same commodity on the same
//                 day even if it appears once as a receipt and once as an issue)
// `get` is required lazily inside each function (not at the top of the
// file) to avoid a circular require with db/database.js, which itself
// uses codeForCommodity()/ddmmyy() during its startup migration — a
// top-level require here would see database.js's exports before they
// exist yet.

// Curated 2–3 letter codes for the default commodity list. Anything not in
// here (a commodity added later) falls back to deriveCode() below.
const KNOWN_CODES = {
  'Maize':                   'MZ',
  'Soybeans':                'SB',
  'Sorghum':                 'SG',
  'Cowpea':                  'CP',
  'Groundnuts':              'GN',
  'Wheat Bran':              'WB',
  'PKC (Palm Kernel Cake)':  'PKC',
  'Shea':                    'SH',
  'Crude Palm Oil':          'CPO',
  'Fish Meal':               'FM',
  'Bone Meal':               'BM',
  'Limestone':               'LS',
  'Salt (Feed Grade)':       'SF',
  'Premix / Vitamins':       'PV',
  'Dicalcium Phosphate':     'DCP',
  'Methionine':              'MT',
  'Lysine':                  'LY',
  'Soybean Meal':            'SBM',
  'Cottonseed Cake':         'CSC',
  'Sunflower Cake':          'SFC',
};

// Fallback for a commodity with no explicit code: first letter of up to the
// first 3 significant words, e.g. "Rice Bran Extract" -> "RBE".
function deriveCode(name) {
  const words = String(name || '')
    .replace(/\([^)]*\)/g, ' ')   // drop parenthetical text
    .split(/[\s/-]+/)
    .filter(w => /[A-Za-z]/.test(w));
  if (words.length === 0) return 'XX';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

function codeForCommodity(commodity) {
  if (!commodity) return 'XX';
  if (commodity.code) return commodity.code;
  return KNOWN_CODES[commodity.name] || deriveCode(commodity.name);
}

// 'YYYY-MM-DD' -> 'DDMMYY'. Falls back to today if the date is missing/bad.
function ddmmyy(dateStr) {
  let d;
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, day] = dateStr.slice(0, 10).split('-');
    return `${day}${m}${y.slice(2)}`;
  }
  d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}${pad(d.getMonth() + 1)}${String(d.getFullYear()).slice(2)}`;
}

// Next GRN number for a given receipt date. One counter per calendar day,
// shared by every commodity (a GRN covers a whole delivery, not one item).
async function nextGrnNumber(dateStr) {
  const { get } = require('../db/database');
  const stamp  = ddmmyy(dateStr);
  const prefix = `GRN-${stamp}-`;
  const row = await get(
    `SELECT COUNT(*) as n FROM stock_receipts WHERE grn_number LIKE ?`,
    [prefix + '%']
  );
  const seq = (row?.n || 0) + 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

// Next batch number for a commodity + date. Receipts and issues share one
// counter per commodity per day (see header comment) — this is the whole
// reason the count is a UNION of both tables rather than just one.
async function nextBatchNumber(commodity, dateStr) {
  const { get } = require('../db/database');
  const code   = codeForCommodity(commodity);
  const stamp  = ddmmyy(dateStr);
  const prefix = `B-${code}-${stamp}-`;
  const commodityId = commodity?.id ?? null;
  const like = prefix + '%';
  const row = await get(
    `SELECT (
       (SELECT COUNT(*) FROM stock_receipts WHERE commodity_id = ? AND batch_number LIKE ?) +
       (SELECT COUNT(*) FROM stock_issues   WHERE commodity_id = ? AND batch_number LIKE ?)
     ) as n`,
    [commodityId, like, commodityId, like]
  );
  const seq = (row?.n || 0) + 1;
  return `${prefix}${String(seq).padStart(2, '0')}`;
}

module.exports = { codeForCommodity, deriveCode, ddmmyy, nextGrnNumber, nextBatchNumber, KNOWN_CODES };
