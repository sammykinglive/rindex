import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRIMARY   = [2, 167, 147];
const DARK      = [26, 31, 54];
const MUTED     = [107, 114, 128];
const LIGHT_BG  = [246, 247, 251];

function addHeader(doc, title, subtitle) {
  // Header bar
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 22, 'F');

  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('🌽 RINDEX', 12, 13);

  // Title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 70, 13);

  // Date
  const dateStr = new Date().toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(dateStr, 198, 13, { align: 'right' });

  // Subtitle
  if (subtitle) {
    doc.setFillColor(...LIGHT_BG);
    doc.rect(0, 22, 210, 10, 'F');
    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.text(subtitle, 12, 28);
  }

  return subtitle ? 36 : 28;
}

function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.5);
    doc.line(10, 285, 200, 285);
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.text('Rindex — Maize Inventory Management System', 10, 290);
    doc.text(`Page ${i} of ${pageCount}`, 200, 290, { align: 'right' });
  }
}

// ── Print Invoice ─────────────────────────────────────────────────
export function printInvoice(issue, settings) {
  const doc = new jsPDF();
  let y = addHeader(doc, 'SALES INVOICE', `Invoice No: ${issue.invoice_number}`);

  y += 6;

  // Two column info block
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLD BY:', 12, y);
  doc.text('SOLD TO:', 110, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  y += 5;
  doc.text(settings.business_name || 'Rindex', 12, y);
  doc.text(issue.customer_name, 110, y);
  y += 4;
  doc.text(settings.warehouse_location || 'Accra, Ghana', 12, y);
  y += 4;
  doc.text(`Date: ${issue.date}`, 12, y);
  doc.text(`Invoice: ${issue.invoice_number}`, 110, y);
  y += 4;
  doc.text(`Payment: ${issue.payment_method}`, 110, y);
  y += 4;
  doc.text(`Status: ${issue.payment_status}`, 110, y);

  y += 8;

  // Divider
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(12, y, 198, y);
  y += 6;

  // Items table
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Unit', 'Quantity', 'Unit Price (GHS)', 'Total (GHS)']],
    body: [
      ['Maize (50 kg bags)', '50 kg bags',
       issue.quantity.toLocaleString(),
       Number(issue.selling_price).toLocaleString('en-GH', { minimumFractionDigits: 2 }),
       Number(issue.total_sales).toLocaleString('en-GH', { minimumFractionDigits: 2 }),
      ]
    ],
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 60 },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 12, right: 12 },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Total box
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(120, y, 78, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT:', 124, y + 7);
  doc.setFontSize(12);
  doc.text(
    `GHS ${Number(issue.total_sales).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`,
    196, y + 12, { align: 'right' }
  );

  y += 28;

  // Remarks
  if (issue.remarks) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`Remarks: ${issue.remarks}`, 12, y);
    y += 8;
  }

  // Thank you note
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.3);
  doc.line(12, y, 198, y);
  y += 6;
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, y, { align: 'center' });

  addFooter(doc);
  doc.save(`Invoice_${issue.invoice_number}.pdf`);
}

// ── Export Receipts PDF ───────────────────────────────────────────
export function exportReceiptsPDF(receipts, totals) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const y = addHeader(doc, 'STOCK RECEIPTS REPORT', `Generated: ${new Date().toLocaleDateString()} · Total: ${totals.total_bags} bags received`);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'GRN No.', 'Supplier', 'Qty (Bags)', 'Unit Cost', 'Total Cost', 'Condition']],
    body: receipts.map(r => [
      r.date, r.grn_number, r.supplier_name,
      r.quantity.toLocaleString(),
      `GHS ${Number(r.unit_cost).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`,
      `GHS ${Number(r.total_cost).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`,
      r.condition,
    ]),
    foot: [['TOTAL', '', '', totals.total_bags.toLocaleString(), '', `GHS ${Number(totals.total_cost).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`, '']],
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    footStyles: { fillColor: LIGHT_BG, textColor: DARK, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    margin: { left: 10, right: 10 },
  });

  addFooter(doc);
  doc.save(`Rindex_Stock_Receipts_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ── Export Issues PDF ─────────────────────────────────────────────
export function exportIssuesPDF(issues, totals) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const y = addHeader(doc, 'STOCK ISSUES REPORT', `Generated: ${new Date().toLocaleDateString()} · Total: ${totals.total_bags} bags sold`);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Invoice No.', 'Customer', 'Qty (Bags)', 'Price/Bag', 'Total Sales', 'Payment', 'Status']],
    body: issues.map(r => [
      r.date, r.invoice_number, r.customer_name,
      r.quantity.toLocaleString(),
      `GHS ${Number(r.selling_price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`,
      `GHS ${Number(r.total_sales).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`,
      r.payment_method, r.payment_status,
    ]),
    foot: [['TOTAL', '', '', totals.total_bags.toLocaleString(), '', `GHS ${Number(totals.total_sales).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`, '', '']],
    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    footStyles: { fillColor: LIGHT_BG, textColor: DARK, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    margin: { left: 10, right: 10 },
  });

  addFooter(doc);
  doc.save(`Rindex_Stock_Issues_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ── Export Balance PDF ────────────────────────────────────────────
export function exportBalancePDF(ledger, kpis) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const y = addHeader(doc, 'STOCK BALANCE LEDGER',
    `Balance: ${kpis.balance} bags · Value: GHS ${Number(kpis.stock_value).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
  );

  autoTable(doc, {
    startY: y,
    head: [['#', 'Date', 'Type', 'Reference', 'Party', 'Bags In', 'Bags Out', 'Balance']],
    body: ledger.map((r, i) => [
      i + 1, r.date,
      r.type, r.ref, r.party,
      r.type === 'Receipt' ? r.quantity.toLocaleString() : '—',
      r.type === 'Issue'   ? r.quantity.toLocaleString() : '—',
      r.running_balance.toLocaleString(),
    ]),
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    margin: { left: 10, right: 10 },
  });

  addFooter(doc);
  doc.save(`Rindex_Stock_Balance_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ── Export Expenses PDF ───────────────────────────────────────────
export function exportExpensesPDF(expenses, total, monthLabel) {
  const doc = new jsPDF();
  const y = addHeader(doc, 'EXPENSES REPORT', `Period: ${monthLabel} · Total: GHS ${Number(total).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Category', 'Paid By', 'Paid To', 'Method', 'Amount (GHS)']],
    body: expenses.map(e => [
      e.date || '—', e.category,
      e.paid_by || '—', e.paid_to || '—',
      e.payment_method || 'Cash',
      Number(e.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 }),
    ]),
    foot: [['TOTAL', '', '', '', '', Number(total).toLocaleString('en-GH', { minimumFractionDigits: 2 })]],
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    footStyles: { fillColor: LIGHT_BG, textColor: DARK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    margin: { left: 12, right: 12 },
  });

  addFooter(doc);
  doc.save(`Rindex_Expenses_${monthLabel.replace(' ', '_')}.pdf`);
}

// ── Export P&L PDF ────────────────────────────────────────────────
export function exportPnLPDF(data, periodLabel) {
  const doc = new jsPDF();
  const y   = addHeader(doc, 'PROFIT & LOSS REPORT', `Period: ${periodLabel}`);
  const fmt = (v) => Number(v || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 });

  const rows = [
    ['REVENUE', '', true],
    ['Gross Revenue', `GHS ${fmt(data.revenue)}`, false],
    ['Bags Sold', `${(data.bags_sold||0).toLocaleString()} bags`, false],
    ['Avg Selling Price / Bag', `GHS ${fmt(data.avg_sell)}`, false],
    ['', '', false],
    ['COST OF GOODS SOLD (COGS)', '', true],
    ['Total COGS', `GHS ${fmt(data.cogs)}`, false],
    ['Bags Purchased', `${(data.bags_purchased||0).toLocaleString()} bags`, false],
    ['Avg Purchase Cost / Bag', `GHS ${fmt(data.avg_cost)}`, false],
    ['', '', false],
    ['GROSS PROFIT', '', true],
    ['Gross Profit', `GHS ${fmt(data.grossProfit)}`, false],
    ['Gross Margin', `${(data.grossMargin||0).toFixed(1)}%`, false],
    ['', '', false],
    ['OPERATING EXPENSES', '', true],
    ['Total Operating Expenses', `GHS ${fmt(data.opex)}`, false],
    ['', '', false],
    ['NET PROFIT', '', true],
    ['Net Profit / (Loss)', `GHS ${fmt(data.netProfit)}`, false],
    ['Net Margin', `${(data.netMargin||0).toFixed(1)}%`, false],
    ['Return on Investment (ROI)', `${(data.roi||0).toFixed(1)}%`, false],
    ['Profit per Bag Sold', `GHS ${fmt(data.profitPerBag)}`, false],
  ];

  autoTable(doc, {
    startY: y,
    body: rows.map(([label, value, isSection]) => [label, value]),
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      const isSection = rows[hookData.row.index]?.[2];
      if (isSection) {
        hookData.cell.styles.fillColor = PRIMARY;
        hookData.cell.styles.textColor = [255, 255, 255];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fontSize  = 9;
      }
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    margin: { left: 12, right: 12 },
  });

  addFooter(doc);
  doc.save(`Rindex_PnL_${periodLabel.replace(' ', '_')}.pdf`);
}
