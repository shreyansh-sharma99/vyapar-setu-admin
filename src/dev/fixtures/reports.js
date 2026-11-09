// Dev-only sample API answers and preview routes for the U6 reports pages (/ui-kit/shell/...).
// answer(url, params) returns the response body, or undefined to let the next fixture / default answer.
// routes: [{ path, element }] mounted under /ui-kit/shell (element built with createElement, no JSX here).
import { createElement } from 'react';
import { day } from '../previewApi';
import SalesRegister from '@/pages/reports/SalesRegister';
import Gstr1Report from '@/pages/reports/Gstr1Report';
import HsnSummary from '@/pages/reports/HsnSummary';
import AgeingReport from '@/pages/reports/AgeingReport';
import Profit from '@/pages/reports/Profit';
import PriceOverrides from '@/pages/reports/PriceOverrides';

/* ─── Sample data (built lazily, only when a preview asks) ──────────────── */

const r2 = (n) => Math.round(n * 100) / 100;
const ok = (data) => ({ success: true, data });

// [invoiceNo, daysAgo, customer, gstin, placeOfSupply, taxable, gst%, paid share]
const INVOICE_ROWS = [
  ['INV-2026-0412', 1, 'Sharma General Store', '27AABCS1429B1Z5', '27-Maharashtra', 18420, 5, 1],
  ['INV-2026-0411', 1, 'Walk-in customer', '', '27-Maharashtra', 1240, 12, 1],
  ['INV-2026-0410', 2, 'Patil Kirana & Sons', '27AAGFP7731K1Z2', '27-Maharashtra', 42650, 5, 0.5],
  ['INV-2026-0409', 3, 'Hotel Shree Datta', '27AAFFH2210Q1Z8', '27-Maharashtra', 26800, 18, 0],
  ['INV-2026-0408', 4, 'Walk-in customer', '', '27-Maharashtra', 860, 18, 1],
  ['INV-2026-0407', 6, 'Krishna Supermart', '29AAKCK4412M1Z6', '29-Karnataka', 58300, 5, 1],
  ['INV-2026-0406', 8, 'Deshmukh Provision Stores', '', '27-Maharashtra', 9450, 12, 0.4],
  ['INV-2026-0405', 11, 'Anand Bakery, Kothrud', '27AAJFA9932H1Z1', '27-Maharashtra', 15600, 18, 1],
  ['INV-2026-0404', 15, 'Walk-in customer', '', '27-Maharashtra', 2310, 5, 1],
  ['INV-2026-0403', 22, 'Mehta Caterers', '27ABCFM5521L1Z9', '27-Maharashtra', 33900, 12, 0],
  ['INV-2026-0402', 38, 'Patil Kirana & Sons', '27AAGFP7731K1Z2', '27-Maharashtra', 21750, 5, 0.6],
  ['INV-2026-0401', 47, 'Joshi Tiffin Services', '', '27-Maharashtra', 7280, 5, 0],
  ['INV-2026-0400', 66, 'Hotel Shree Datta', '27AAFFH2210Q1Z8', '27-Maharashtra', 12400, 18, 0.25],
  ['INV-2026-0399', 104, 'Sai Medical & General', '27AAQFS6614C1Z3', '27-Maharashtra', 6900, 12, 0],
];

const salesRows = () =>
  INVOICE_ROWS.map(([invoiceNumber, ago, customer, gstin, placeOfSupply, taxable, rate, share]) => {
    const inter = !placeOfSupply.startsWith('27');
    const tax = r2((taxable * rate) / 100);
    const cgst = inter ? 0 : r2(tax / 2);
    const sgst = inter ? 0 : r2(tax / 2);
    const igst = inter ? tax : 0;
    const total = r2(taxable + tax);
    const paid = r2(total * share);
    const balance = r2(total - paid);
    return {
      invoiceNumber,
      invoiceDate: day(-ago),
      invoiceType: gstin ? 'B2B' : 'B2C',
      customer,
      gstin,
      placeOfSupply,
      taxable,
      rate,
      cgst,
      sgst,
      igst,
      cess: 0,
      total,
      paid,
      balance,
      status: balance <= 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid',
      ago,
    };
  });

const sum = (rows, k) => r2(rows.reduce((t, r) => t + (Number(r[k]) || 0), 0));
const TAX_KEYS = ['taxable', 'cgst', 'sgst', 'igst', 'cess', 'total'];

function salesRegister() {
  const rows = salesRows();
  const totals = { count: rows.length, paid: sum(rows, 'paid'), balance: sum(rows, 'balance') };
  TAX_KEYS.forEach((k) => (totals[k] = sum(rows, k)));
  return ok({ rows: rows.map((r) => { const out = { ...r }; delete out.rate; delete out.ago; return out; }), totals });
}

function gstr1() {
  const rows = salesRows();
  const group = (list, keyOf) => {
    const map = new Map();
    list.forEach((r) => {
      const k = keyOf(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return [...map.entries()];
  };
  const byType = group(rows, (r) => r.invoiceType).map(([type, list]) => {
    const out = { type, count: list.length };
    TAX_KEYS.forEach((k) => (out[k] = sum(list, k)));
    return out;
  });
  const byRate = group(rows, (r) => r.rate)
    .sort((a, b) => a[0] - b[0])
    .map(([taxRate, list]) => ({ taxRate, taxable: sum(list, 'taxable'), cgst: sum(list, 'cgst'), sgst: sum(list, 'sgst'), igst: sum(list, 'igst'), cess: 0 }));
  return ok({ byType, byRate });
}

// [hsn, qty, taxable, gst%, igst share]
const HSN_ROWS = [
  ['1006', 182, 98400, 5, 0.22],
  ['1512', 64, 41600, 5, 0.1],
  ['0405', 210, 28350, 12, 0],
  ['1902', 340, 19200, 18, 0],
  ['0902', 48, 14880, 5, 0.3],
  ['1701', 120, 12600, 5, 0],
  ['3401', 95, 8930, 18, 0],
  ['2106', 40, 6200, 18, 0],
];

const hsnSummary = () =>
  ok(
    HSN_ROWS.map(([hsnCode, qty, taxable, rate, igstShare]) => {
      const tax = r2((taxable * rate) / 100);
      const igst = r2(tax * igstShare);
      const half = r2((tax - igst) / 2);
      return { hsnCode, qty, taxable, cgst: half, sgst: half, igst, cess: 0, total: r2(taxable + tax) };
    })
  );

function ageing() {
  const bucketOf = (ago) => (ago <= 30 ? '1-30' : ago <= 60 ? '31-60' : ago <= 90 ? '61-90' : '90+');
  const map = new Map();
  salesRows()
    .filter((r) => r.balance > 0)
    .forEach((r) => {
      if (!map.has(r.customer)) map.set(r.customer, new Map());
      const b = map.get(r.customer);
      const k = bucketOf(r.ago);
      b.set(k, r2((b.get(k) || 0) + r.balance));
    });
  const rows = [...map.entries()]
    .map(([customer, b]) => {
      const buckets = [...b.entries()].map(([bucket, amount]) => ({ bucket, amount, count: 1 }));
      return { customer, buckets, totalOutstanding: sum(buckets, 'amount') };
    })
    .sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  return ok({ rows, grandTotal: sum(rows, 'totalOutstanding'), asOf: new Date().toISOString() });
}

const shapeProfit = (r) => {
  const profit = r2(r.revenue - r.cost);
  return { ...r, profit, marginPercent: r.revenue > 0 ? r2((profit / r.revenue) * 100) : 0 };
};

function profit(q = {}) {
  const groupBy = ['invoice', 'product', 'day'].includes(q.groupBy) ? q.groupBy : 'invoice';
  let rows;
  if (groupBy === 'product') {
    rows = [
      ['India Gate Basmati Rice 25 kg', 38, 93100, 81700],
      ['Fortune Sunflower Oil 15 L', 16, 41440, 36480],
      ['Amul Butter 500 g', 120, 33000, 29400],
      ['Tata Tea Gold 1 kg', 30, 17550, 15600],
      ['Maggi Noodles 12-pack', 85, 14280, 12750],
      ['Madhur Sugar 5 kg', 44, 10780, 9240],
      ['Lux Soap 4 x 100 g', 25, 4200, 4310],
    ].map(([label, qty, revenue, cost]) => shapeProfit({ _id: label, label, qty, revenue, cost, lines: Math.ceil(qty / 4) }));
  } else if (groupBy === 'day') {
    rows = [1, 2, 3, 4, 6, 8, 11].map((ago, i) => {
      const revenue = [18420 + 1240, 42650, 26800, 860, 58300, 9450, 15600][i];
      const label = day(-ago).slice(0, 10);
      return shapeProfit({ _id: label, label, qty: Math.round(revenue / 450), revenue, cost: r2(revenue * (0.84 + (i % 3) * 0.03)), lines: 3 + i });
    });
  } else {
    rows = salesRows()
      .slice(0, 10)
      .map((r, i) => shapeProfit({ _id: r.invoiceNumber, label: r.invoiceNumber, date: r.invoiceDate, customer: r.customer, qty: Math.round(r.taxable / 420), revenue: r.taxable, cost: r2(r.taxable * (i === 4 ? 1.04 : 0.83 + (i % 3) * 0.03)), lines: 2 + (i % 5) }));
  }
  const revenue = sum(rows, 'revenue');
  const cost = sum(rows, 'cost');
  return ok({
    groupBy,
    rows,
    totals: shapeProfit({ revenue, cost, lines: rows.reduce((t, r) => t + r.lines, 0) }),
    withoutCost: { lines: 6, revenue: 4820 },
  });
}

function batchSales(q = {}) {
  const product = { _id: q.productId || 'p-rice', name: 'India Gate Basmati Rice 25 kg', unit: 'bag' };
  const rows = [
    ['B-0726-01', 92, 260, 2600, 2120, 20, 14, 0],
    ['B-0826-02', 61, 200, 2600, 2150, 15, 15, 0],
    ['B-0926-03', 30, 330, 2650, 2180, 12, 9, 3],
    ['B-1026-04', 9, 400, 2650, 2190, 10, 0, 10],
  ].map(([batchNo, ago, expiryDays, mrp, unitCost, qtyIn, soldQty, qtyLeft], i) => {
    const revenue = r2(soldQty * 2333.33);
    const cost = r2(soldQty * unitCost);
    return {
      batchId: `b-${i + 1}`, batchNo, storeName: 'Kothrud, Pune', receivedAt: day(-ago), expiryDate: day(expiryDays),
      mrp, unitCost, qtyIn, soldQty, qtyLeft, revenue, cost, profit: r2(revenue - cost), invoiceCount: soldQty ? 3 + i : 0,
    };
  });
  rows.push({ batchId: null, batchNo: 'Old stock (no batch)', storeName: '', receivedAt: null, expiryDate: null, mrp: 0, unitCost: 0, qtyIn: 0, soldQty: 2, qtyLeft: 0, revenue: 4660, cost: 4200, profit: 460, invoiceCount: 2 });
  const totals = {};
  ['qtyIn', 'soldQty', 'qtyLeft', 'revenue', 'cost', 'profit'].forEach((k) => (totals[k] = sum(rows, k)));
  return ok({ product, rows, totals });
}

const OVERRIDES = [
  ['inv-410', 'INV-2026-0410', 2, 'Patil Kirana & Sons', 'India Gate Basmati Rice 25 kg', 4, 'bag', 2572.5, 2520, 'Regular bulk buyer', 'Ramesh Kumar'],
  ['inv-409', 'INV-2026-0409', 3, 'Hotel Shree Datta', 'Amul Butter 500 g', 12, 'pcs', 308, 300, 'Hotel contract rate', 'Sunita Pawar'],
  ['inv-407', 'INV-2026-0407', 6, 'Krishna Supermart', 'Fortune Sunflower Oil 15 L', 6, 'tin', 2719.5, 2650, 'Matched competitor price', 'Ramesh Kumar'],
  ['inv-405', 'INV-2026-0405', 11, 'Anand Bakery, Kothrud', 'Madhur Sugar 5 kg', 10, 'bag', 257.25, 262, 'Old rate on the bill book', 'Sunita Pawar'],
  ['inv-403', 'INV-2026-0403', 22, 'Mehta Caterers', 'Tata Tea Gold 1 kg', 8, 'pack', 614.25, 590, 'Festival order, owner approved', 'Ramesh Kumar'],
];

function priceOverrides(q = {}) {
  const rows = OVERRIDES.map(([invoiceId, invoiceNumber, ago, customer, productName, qty, unit, listUnit, chargedUnit, reason, by]) => ({
    invoiceId, invoiceNumber, invoiceDate: day(-ago), customer, productName, qty, unit, listUnit, chargedUnit, difference: r2((chargedUnit - listUnit) * qty), reason, by,
  }));
  const people = [...new Set(rows.map((r) => r.by))].sort();
  const shown = q.by ? rows.filter((r) => r.by === q.by) : rows;
  return ok({ rows: shown, people, totals: { lines: shown.length, difference: sum(shown, 'difference') } });
}

export function answer(url, q = {}) {
  if (url === '/reports/sales-register') return salesRegister();
  if (url === '/reports/gstr1') return gstr1();
  if (url === '/reports/hsn-summary') return hsnSummary();
  if (url === '/reports/ageing') return ageing();
  if (url === '/reports/batch-sales') return batchSales(q); // product view → Batches
  if (url === '/reports/profit') return profit(q);
  if (url === '/reports/price-overrides') return priceOverrides(q);
  return undefined;
}

/* ─── Preview routes ────────────────────────────────────────────────────── */

export const routes = [
  { path: 'reports/sales-register', element: createElement(SalesRegister) },
  { path: 'reports/gstr1', element: createElement(Gstr1Report) },
  { path: 'reports/hsn-summary', element: createElement(HsnSummary) },
  { path: 'reports/ageing', element: createElement(AgeingReport) },
  { path: 'reports/profit', element: createElement(Profit) },
  { path: 'reports/price-overrides', element: createElement(PriceOverrides) },
];
