// Dev-only sample API answers and preview routes for the U5 purchase pages (/ui-kit/shell/...).
// answer(url, params) returns the response body, or undefined to let the next fixture / default answer.
// routes: [{ path, element }] mounted under /ui-kit/shell (element built with createElement, no JSX here).
//
// Details pages read an encrypted id from the URL; any id is answered, so open e.g.
//   /ui-kit/shell/purchase/orders/view/<encId('po-0')>   (an id containing "draft" gives a draft document)
import { createElement } from 'react';
import { BILLS, SUPPLIERS, day, listOf } from '../previewApi';
import PurchaseOrderDetails from '@/pages/purchase/purchaseOrders/PurchaseOrderDetails';
import PurchaseBillDetails from '@/pages/purchase/purchaseBills/PurchaseBillDetails';
import PurchaseReturnDetails from '@/pages/purchase/purchaseReturns/PurchaseReturnDetails';
import PaymentOutDetails from '@/pages/purchase/paymentsOut/PaymentOutDetails';
import SupplierDetails from '@/pages/purchase/suppliers/SupplierDetails';
import PurchaseReturnList from '@/pages/purchase/purchaseReturns/PurchaseReturnList';
import PaymentOutList from '@/pages/purchase/paymentsOut/PaymentOutList';
import SupplierList from '@/pages/purchase/suppliers/SupplierList';

/* ─── Sample records (built on demand) ─────────────────────────────────── */

function supplierFull(id) {
  const base = SUPPLIERS[0];
  return {
    ...base,
    _id: id,
    companyName: 'Annapurna Wholesale Pvt Ltd',
    email: 'orders@annapurnawholesale.in',
    pan: 'AAFCA4410P',
    openingBalance: 12500,
    address: { street: 'Gala 12, Market Yard, Gultekdi', city: 'Pune', state: 'Maharashtra', pincode: '411037' },
    bankDetails: { accountName: 'Annapurna Wholesale Pvt Ltd', accountNumber: '50200041887213', ifsc: 'HDFC0000146', bankName: 'HDFC Bank, Market Yard', upiId: 'annapurna@hdfcbank' },
    notes: 'Delivers Tuesday and Friday before 11 am. Ask for Ramesh for rate changes.',
    stats: {
      totalPurchased: 482650,
      bills: 18,
      billsDue: 42000,
      overdue: 8400,
      openPurchaseOrders: 2,
      lastReceipt: { date: day(-3), number: 'PUR-2026-0087', amount: 101106 },
    },
  };
}

const snapshot = () => ({
  name: 'Annapurna Wholesale',
  companyName: 'Annapurna Wholesale Pvt Ltd',
  phone: '9820041000',
  gstin: '27AAFCA4410P1Z3',
  address: 'Gala 12, Market Yard, Gultekdi, Pune, Maharashtra 411037',
});

const LINES = [
  ['p-rice', 'India Gate Basmati Rice 25 kg', 'RICE-IG25', '1006', 'bag', 20, 2150, 5, 2600, 2450, 'IG-2610'],
  ['p-oil', 'Fortune Sunflower Oil 15 L', 'OIL-FT15', '1512', 'tin', 12, 2280, 5, 2750, 0, 'FT-0925'],
  ['p-maggi', 'Maggi Noodles 12-pack', 'MAG-12', '1902', 'pack', 40, 150, 18, 180, 168, ''],
  ['p-butter', 'Amul Butter 500 g', 'BUT-AM500', '0405', 'pcs', 60, 245, 12, 285, 0, 'AM-1102'],
];

function lines() {
  return LINES.map(([productId, productName, sku, hsnCode, unit, qty, rate, taxPercent, mrp, sellingPrice, batchNo]) => {
    const taxableValue = qty * rate;
    const taxAmount = Math.round(taxableValue * taxPercent) / 100;
    return {
      productId: { _id: productId, name: productName },
      productName,
      sku,
      hsnCode,
      unit,
      qty,
      rate,
      discountPercent: productId === 'p-maggi' ? 2 : 0,
      taxPercent,
      taxableValue,
      taxAmount,
      total: taxableValue + taxAmount,
      mrp,
      sellingPrice,
      batchNo,
      expiryDate: batchNo ? day(240) : null,
      reason: productId === 'p-oil' ? 'Tin dented in transit' : 'Short expiry',
      fromBucket: productId === 'p-oil' ? 'damaged' : 'sellable',
    };
  });
}

function totals(items) {
  const taxableAmount = items.reduce((n, l) => n + l.taxableValue, 0);
  const taxAmount = items.reduce((n, l) => n + l.taxAmount, 0);
  const raw = taxableAmount + taxAmount + 450;
  const totalAmount = Math.round(raw);
  return {
    subtotal: taxableAmount,
    discountAmount: 0,
    taxableAmount,
    taxAmount,
    cgstTotal: taxAmount / 2,
    sgstTotal: taxAmount / 2,
    igstTotal: 0,
    cessTotal: 0,
    otherCharges: 450,
    roundOff: Math.round((totalAmount - raw) * 100) / 100,
    totalAmount,
    isInterState: false,
  };
}

function bill(id) {
  const items = lines();
  const t = totals(items);
  const paid = 60000;
  return {
    _id: id,
    billNumber: 'BILL-2026-0061',
    supplierBillNo: 'AW/2026/1187',
    billDate: day(-12),
    receivedDate: day(-12),
    dueDate: day(3),
    status: 'partially_paid',
    supplierId: supplierFull('s-annapurna'),
    supplierSnapshot: snapshot(),
    purchaseOrderId: { _id: 'po-0', poNumber: 'PUR-2026-0087', poDate: day(-14) },
    autoFromPo: true,
    items,
    ...t,
    paidAmount: paid,
    adjustedAmount: 0,
    balanceAmount: t.totalAmount - paid,
    payments: [
      { _id: 'pay-1', paymentNumber: 'PAY-2026-0142', paymentDate: day(-10), paymentMethod: 'upi', reference: 'UTR 4521 8890 1123', amount: 40000 },
      { _id: 'pay-2', paymentNumber: 'PAY-2026-0151', paymentDate: day(-4), paymentMethod: 'cash', reference: '', amount: 20000 },
    ],
    returns: [],
    notes: 'Two tins of oil were dented; supplier agreed to replace on the next delivery.',
  };
}

function purchaseOrder(id) {
  const draft = id.includes('draft');
  const items = lines();
  const t = totals(items);
  const b = bill('bill-0');
  return {
    _id: id,
    poNumber: draft ? 'PUR-2026-0089' : 'PUR-2026-0087',
    poDate: day(-14),
    expectedDate: day(-12),
    supplierInvoiceNo: 'AW/2026/1187',
    supplierInvoiceDate: day(-12),
    status: draft ? 'draft' : 'received',
    supplierId: 's-annapurna',
    supplierSnapshot: snapshot(),
    purchaseBillId: draft ? null : 'bill-0',
    items,
    ...t,
    createdByName: 'Rohit Patil',
    createdAt: day(-14),
    notes: 'Deliver to the back gate. Call 98200 41000 before unloading.',
    terms: 'Payment within 15 days of invoice. Damaged goods replaced on next delivery.',
    bill: draft
      ? null
      : {
          _id: b._id,
          billNumber: b.billNumber,
          status: b.status,
          totalAmount: b.totalAmount,
          paidAmount: b.paidAmount,
          adjustedAmount: 0,
          balanceAmount: b.balanceAmount,
          supplierId: 's-annapurna',
          payments: b.payments,
          returns: [],
        },
  };
}

function purchaseReturn(id) {
  const draft = id.includes('draft');
  const items = lines().slice(1, 3).map((l) => ({ ...l, qty: l.unit === 'tin' ? 2 : 5 }));
  items.forEach((l) => {
    l.taxableValue = l.qty * l.rate;
    l.taxAmount = Math.round(l.taxableValue * l.taxPercent) / 100;
    l.total = l.taxableValue + l.taxAmount;
  });
  const t = { ...totals(items), otherCharges: 0 };
  t.totalAmount = Math.round(t.taxableAmount + t.taxAmount);
  t.roundOff = Math.round((t.totalAmount - t.taxableAmount - t.taxAmount) * 100) / 100;
  return {
    _id: id,
    returnNumber: draft ? 'PR-2026-0015' : 'PR-2026-0014',
    returnDate: day(-5),
    status: draft ? 'draft' : 'confirmed',
    supplierId: 's-annapurna',
    supplierSnapshot: snapshot(),
    purchaseBillId: { _id: 'bill-0', billNumber: 'BILL-2026-0061' },
    items,
    ...t,
    agreedAmount: t.totalAmount - 300,
    lossAmount: 300,
    billAdjustedAmount: draft ? 0 : 3000,
    refundDue: draft ? 0 : t.totalAmount - 300 - 3000,
    refundReceived: draft ? 0 : 1000,
    refundReceivedAt: day(-2),
    refundMethod: 'upi',
    refundStatus: draft ? undefined : 'pending',
    createdByName: 'Rohit Patil',
    notes: 'Oil tins dented in transit, Maggi packs close to expiry.',
  };
}

function payment(id) {
  return {
    _id: id,
    paymentNumber: 'PAY-2026-0151',
    paymentDate: day(-4),
    paymentMethod: 'bank_transfer',
    reference: 'NEFT HDFCN52026101544',
    status: 'completed',
    supplierId: supplierFull('s-annapurna'),
    supplierName: 'Annapurna Wholesale',
    amount: 50000,
    unallocatedAmount: 8000,
    allocations: [
      { purchaseBillId: 'bill-0', billNumber: 'BILL-2026-0061', supplierBillNo: 'AW/2026/1187', amount: 30000 },
      { purchaseBillId: 'bill-3', billNumber: 'BILL-2026-0058', supplierBillNo: 'AW/2026/1102', amount: 12000 },
    ],
    createdByName: 'Rohit Patil',
    notes: 'Paid from the current account. Advance kept for the next order.',
  };
}

/* ─── Lists ─────────────────────────────────────────────────────────────── */

function returnRows() {
  return [
    ['Annapurna Wholesale', 'BILL-2026-0061', 5150, 300, 'confirmed', 1150, 'pending', 3000],
    ['Krishna Traders', 'BILL-2026-0060', 2360, 0, 'confirmed', 0, 'received', 0],
    ['Fortune Oils Depot', null, 4560, 0, 'draft', 0, undefined, 0],
    ['Metro Cash & Carry', 'BILL-2026-0056', 8920, 520, 'confirmed', 0, undefined, 8400],
    ['Krishna Traders', null, 1180, 0, 'cancelled', 0, undefined, 0],
  ].map(([name, billNo, total, loss, status, due, refundStatus, adj], i) => ({
    _id: `pr-${i}`,
    returnNumber: `PR-2026-${String(14 - i).padStart(4, '0')}`,
    returnDate: day(-i * 4 - 1),
    supplierSnapshot: { name },
    purchaseBillId: billNo ? { _id: `bill-${i}`, billNumber: billNo } : null,
    totalAmount: total,
    lossAmount: loss,
    agreedAmount: total - loss,
    billAdjustedAmount: adj,
    refundDue: due,
    refundReceived: 0,
    refundStatus,
    status,
  }));
}

function paymentRows() {
  return [
    ['Annapurna Wholesale', 'bank_transfer', 'NEFT HDFCN52026101544', 50000, 8000, ['AW/2026/1187', 'AW/2026/1102']],
    ['Krishna Traders', 'upi', 'UTR 4521 8890 1123', 45600, 0, ['KT-778']],
    ['Fortune Oils Depot', 'cheque', 'Chq 004512', 62750, 0, ['FOD/0925']],
    ['Annapurna Wholesale', 'cash', '', 20000, 0, ['AW/2026/1187']],
    ['Metro Cash & Carry', 'card', 'Visa ••4417', 12000, 12000, []],
    ['Krishna Traders', 'upi', 'UTR 3390 1022 7781', 9800, 0, ['KT-760']],
  ].map(([name, method, reference, amount, advance, bills], i) => ({
    _id: `pay-${i}`,
    paymentNumber: `PAY-2026-${String(151 - i).padStart(4, '0')}`,
    paymentDate: day(-i * 2),
    supplierName: name,
    supplierId: { _id: `s-${i}`, name },
    paymentMethod: method,
    reference,
    amount,
    unallocatedAmount: advance,
    allocations: bills.map((b) => ({ supplierBillNo: b })),
    status: i === 5 ? 'cancelled' : 'completed',
  }));
}

function supplierRows() {
  return [
    ...SUPPLIERS.map((s, i) => ({ ...s, companyName: i === 0 ? 'Annapurna Wholesale Pvt Ltd' : '', address: { city: i === 0 ? 'Pune' : 'Bengaluru' } })),
    { _id: 's-fortune', name: 'Fortune Oils Depot', companyName: 'Adani Wilmar Distributor', phone: '9822011223', gstin: '27AABCF7781K1Z9', paymentTermsDays: 30, payableBalance: -4500, isActive: true, address: { city: 'Mumbai' } },
    { _id: 's-metro', name: 'Metro Cash & Carry', companyName: 'Metro Wholesale India', phone: '9833044556', gstin: '27AAACM3301Q1ZE', paymentTermsDays: 7, payableBalance: 33400, isActive: true, address: { city: 'Mumbai' } },
    { _id: 's-sai', name: 'Sai Dairy Farm', companyName: '', phone: '9766055443', gstin: '', paymentTermsDays: 0, payableBalance: 0, isActive: false, address: { city: 'Pune' } },
  ];
}

function ledgerRows() {
  return [
    ['payment', 'PaymentOut', 'PAY-2026-0151', 0, 20000, 42000, ''],
    ['purchase_return', 'PurchaseReturn', 'PR-2026-0014', 0, 3000, 62000, 'Damaged oil tins'],
    ['payment', 'PaymentOut', 'PAY-2026-0142', 0, 40000, 65000, ''],
    ['purchase_bill', 'PurchaseBill', 'BILL-2026-0061', 101106, 0, 105000, 'Monthly stock'],
    ['opening_balance', null, '', 3894, 0, 3894, 'Balance before VayaParSetu'],
  ].map(([transactionType, referenceModel, referenceNumber, credit, debit, balance, notes], i) => ({
    _id: `led-${i}`,
    date: day(-i * 3),
    transactionType,
    referenceModel,
    referenceId: referenceModel ? `ref-${i}` : null,
    referenceNumber,
    credit,
    debit,
    balance,
    notes,
  }));
}

/* ─── Answer ────────────────────────────────────────────────────────────── */

export function answer(url, params = {}) {
  let m;
  if ((m = url.match(/^\/purchase-orders\/([^/?]+)$/))) return { data: purchaseOrder(m[1]) };
  if ((m = url.match(/^\/purchase-bills\/([^/?]+)$/))) {
    const b = bill(m[1]);
    const sample = BILLS.find((x) => x._id === m[1]);
    return { data: sample ? { ...b, billNumber: sample.billNumber } : b };
  }
  if (url === '/purchase-returns/stats') {
    return {
      data: {
        received: 2360,
        toReceive: 1150,
        loss: 820,
        setOff: 11400,
        topSuppliers: [
          { id: 's-krishna', rank: 1, name: 'Krishna Traders', returns: 4, value: 6120 },
          { id: 's-annapurna', rank: 2, name: 'Annapurna Wholesale', returns: 3, value: 5150 },
          { id: 's-metro', rank: 3, name: 'Metro Cash & Carry', returns: 1, value: 8920 },
          { id: 's-fortune', rank: 4, name: 'Fortune Oils Depot', returns: 1, value: 4560 },
        ],
        topProducts: [
          { id: 'p-oil', rank: 1, name: 'Fortune Sunflower Oil 15 L', qty: 6, value: 14400 },
          { id: 'p-maggi', rank: 2, name: 'Maggi Noodles 12-pack', qty: 5, value: 885 },
        ],
      },
    };
  }
  if (url === '/purchase-returns') {
    let rows = returnRows();
    if (params.refundStatus === 'pending') rows = rows.filter((r) => r.refundDue > 0);
    else if (params.refundStatus === 'received') rows = rows.filter((r) => r.refundStatus === 'received');
    return listOf(rows, params, [(r) => r.returnNumber, (r) => r.supplierSnapshot.name]);
  }
  if ((m = url.match(/^\/purchase-returns\/([^/?]+)$/))) return { data: purchaseReturn(m[1]) };
  if (url === '/payments-out') {
    let rows = paymentRows();
    if (params.paymentMethod) rows = rows.filter((r) => r.paymentMethod === params.paymentMethod);
    return { ...listOf(rows, params, [(r) => r.paymentNumber, (r) => r.supplierName, (r) => r.reference]), stats: { totalPaid: 199350, payments: 6 } };
  }
  if ((m = url.match(/^\/payments-out\/([^/?]+)$/))) return { data: payment(m[1]) };
  if ((m = url.match(/^\/suppliers\/([^/?]+)\/ledger$/))) {
    const s = supplierFull(m[1]);
    return { ...listOf(ledgerRows(), params, []), supplier: { openingBalance: s.openingBalance, payableBalance: s.payableBalance } };
  }
  if ((m = url.match(/^\/suppliers\/([^/?]+)$/))) return { data: supplierFull(m[1]) };
  if (url === '/suppliers') {
    let rows = supplierRows();
    if (params.isActive !== undefined) rows = rows.filter((s) => s.isActive === params.isActive);
    const all = supplierRows();
    return {
      ...listOf(rows, params, [(s) => s.name, (s) => s.phone, (s) => s.gstin, (s) => s.address?.city]),
      stats: { total: all.length, active: all.filter((s) => s.isActive).length, totalPayable: all.reduce((n, s) => n + Math.max(0, s.payableBalance), 0) },
    };
  }
  return undefined;
}

export const routes = [
  { path: 'purchase/orders/view/:id', element: createElement(PurchaseOrderDetails) },
  { path: 'purchase/bills/view/:id', element: createElement(PurchaseBillDetails) },
  { path: 'purchase/returns/view/:id', element: createElement(PurchaseReturnDetails) },
  { path: 'purchase/payments/view/:id', element: createElement(PaymentOutDetails) },
  { path: 'purchase/suppliers/view/:id', element: createElement(SupplierDetails) },
  { path: 'purchase/returns', element: createElement(PurchaseReturnList) },
  { path: 'purchase/payments', element: createElement(PaymentOutList) },
  { path: 'purchase/suppliers', element: createElement(SupplierList) },
];
