import * as XLSX from 'xlsx';

function autoWidth(ws, data) {
  const colWidths = [];
  data.forEach(row => {
    row.forEach((cell, i) => {
      const len = cell ? String(cell).length : 10;
      colWidths[i] = Math.max(colWidths[i] || 10, len + 4);
    });
  });
  ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 40) }));
}

// ── Export Receipts ───────────────────────────────────────────────
// unitLabel: the filtered commodity's unit (e.g. 'bags', 'litres'), or '' for
// "All Commodities" — each row then carries its own commodity and unit instead.
export function exportReceiptsToExcel(receipts, totals, unitLabel = '') {
  const wb = XLSX.utils.book_new();
  const qtyHeader = unitLabel ? `Qty (${unitLabel[0].toUpperCase()}${unitLabel.slice(1)})` : 'Qty';

  const headers = ['Date', 'Commodity', 'GRN Number', 'Supplier Name', qtyHeader, 'Unit', 'Unit Cost (GHS)', 'Total Cost (GHS)', 'Delivery Note', 'Condition', 'Remarks'];
  const rows = receipts.map(r => [
    r.date, r.commodity_name || '—', r.grn_number, r.supplier_name,
    r.quantity, r.commodity_unit || unitLabel || '',
    r.unit_cost, r.total_cost,
    r.delivery_note || '', r.condition, r.remarks || ''
  ]);

  const totalsRow = ['TOTAL', '', '', '', totals.total_bags, unitLabel || '(mixed units)', '', totals.total_cost, '', '', ''];
  const data = [headers, ...rows, [], totalsRow];

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);

  // Style header row
  ws['!rows'] = [{ hpt: 20 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Stock Receipts');
  XLSX.writeFile(wb, `Rindex_Stock_Receipts_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ── Export Issues ─────────────────────────────────────────────────
// unitLabel: the filtered commodity's unit, or '' for "All Commodities".
export function exportIssuesToExcel(issues, totals, unitLabel = '') {
  const wb = XLSX.utils.book_new();
  const qtyHeader = unitLabel ? `Qty (${unitLabel[0].toUpperCase()}${unitLabel.slice(1)})` : 'Qty';

  const headers = ['Date', 'Commodity', 'Invoice No.', 'Customer Name', qtyHeader, 'Unit', 'Selling Price (GHS)', 'Total Sales (GHS)', 'Payment Method', 'Payment Status', 'Remarks'];
  const rows = issues.map(r => [
    r.date, r.commodity_name || '—', r.invoice_number, r.customer_name,
    r.quantity, r.commodity_unit || unitLabel || '',
    r.selling_price, r.total_sales,
    r.payment_method, r.payment_status, r.remarks || ''
  ]);

  const totalsRow = ['TOTAL', '', '', '', totals.total_bags, unitLabel || '(mixed units)', '', totals.total_sales, '', '', ''];
  const data = [headers, ...rows, [], totalsRow];

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);

  XLSX.utils.book_append_sheet(wb, ws, 'Stock Issues');
  XLSX.writeFile(wb, `Rindex_Stock_Issues_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ── Export Balance Ledger ─────────────────────────────────────────
// Each ledger row already carries its own commodity_name and unit (Balance.js
// attaches these), so this works the same for one commodity or all of them.
export function exportBalanceToExcel(ledger) {
  const wb = XLSX.utils.book_new();

  const headers = ['#', 'Date', 'Commodity', 'Type', 'Reference', 'Party', 'In', 'Out', 'Unit', 'Balance', 'Remarks'];
  const rows = ledger.map((r, i) => [
    i + 1, r.date, r.commodity_name || '—', r.type, r.ref,
    r.party,
    r.type === 'Receipt' ? r.quantity : '',
    r.type === 'Issue'   ? r.quantity : '',
    r.unit || '',
    r.running_balance,
    r.remarks || ''
  ]);

  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);

  XLSX.utils.book_append_sheet(wb, ws, 'Stock Balance');
  XLSX.writeFile(wb, `Rindex_Stock_Balance_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ── Export Expenses ───────────────────────────────────────────────
export function exportExpensesToExcel(expenses, total, monthLabel) {
  const wb = XLSX.utils.book_new();

  const headers = ['Date', 'Category', 'Paid By', 'Paid To', 'Payment Method', 'Receipt No.', 'Amount (GHS)', 'Description'];
  const rows = expenses.map(e => [
    e.date || '', e.category,
    e.paid_by || '', e.paid_to || '',
    e.payment_method || 'Cash', e.receipt_no || '',
    e.amount, e.description || ''
  ]);

  const totalsRow = ['TOTAL', '', '', '', '', '', total, ''];
  const data = [headers, ...rows, [], totalsRow];

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoWidth(ws, data);

  XLSX.utils.book_append_sheet(wb, ws, `Expenses ${monthLabel}`);
  XLSX.writeFile(wb, `Rindex_Expenses_${monthLabel.replace(' ', '_')}.xlsx`);
}

// ── Export P&L Summary ────────────────────────────────────────────
export function exportPnLToExcel(data, periodLabel) {
  const wb = XLSX.utils.book_new();

  const { revenue, cogs, grossProfit, opex, netProfit, grossMargin, netMargin, roi, bags_sold, bags_purchased, avg_sell, avg_cost, profitPerBag } = data;

  const rows = [
    ['RINDEX — P&L SUMMARY', ''],
    ['Period', periodLabel],
    ['Generated', new Date().toLocaleDateString()],
    ['', ''],
    ['REVENUE', ''],
    ['Gross Revenue (GHS)', revenue],
    ['Bags Sold', bags_sold],
    ['Avg Selling Price / Bag (GHS)', avg_sell],
    ['', ''],
    ['COST OF GOODS SOLD', ''],
    ['Total COGS (GHS)', cogs],
    ['Bags Purchased', bags_purchased],
    ['Avg Purchase Cost / Bag (GHS)', avg_cost],
    ['', ''],
    ['GROSS PROFIT', ''],
    ['Gross Profit (GHS)', grossProfit],
    ['Gross Margin %', grossMargin.toFixed(1) + '%'],
    ['', ''],
    ['OPERATING EXPENSES', ''],
    ['Total OpEx (GHS)', opex],
    ['', ''],
    ['NET PROFIT', ''],
    ['Net Profit / (Loss) (GHS)', netProfit],
    ['Net Margin %', netMargin.toFixed(1) + '%'],
    ['ROI %', roi.toFixed(1) + '%'],
    ['Profit per Bag (GHS)', profitPerBag],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 35 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, ws, 'P&L Summary');
  XLSX.writeFile(wb, `Rindex_PnL_${periodLabel.replace(' ', '_')}.xlsx`);
}
