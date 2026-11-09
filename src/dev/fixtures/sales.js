// Dev-only sample API answers and preview routes for the U5 sales pages (/ui-kit/shell/...).
// answer(url, params) returns the response body, or undefined to let the next fixture / default answer.
// routes: [{ path, element }] mounted under /ui-kit/shell (element built with createElement, no JSX here).
//
// Details pages read an encrypted id from the URL (utility/crypto, key "default_secret_key"); any id is
// answered. An id containing "draft" gives a draft document, "paid" a fully paid invoice.
//   /ui-kit/shell/sales/invoices/view/<encId('si-1')>      /ui-kit/shell/sales/return/view/<encId('sr-1')>
//   /ui-kit/shell/sales/credit-note/view/<encId('cn-1')>   /ui-kit/shell/sales/customers/view/<encId('c-sharma')>
//   /ui-kit/shell/sales/customers/ledger/<encId('c-sharma')>
import { createElement } from 'react';
import { CUSTOMERS, INVOICES, day, listOf } from '../previewApi';
import SalesInvoiceDetails from '@/pages/sales/salesInvoices/SalesInvoiceDetails';
import SalesReturnDetails from '@/pages/sales/salesReturn/SalesReturnDetails';
import CreditNoteDetails from '@/pages/sales/creditNotes/CreditNoteDetails';
import CustomerDetails from '@/pages/customer/CustomerDetails';
import SalesReturnList from '@/pages/sales/salesReturn/SalesReturnList';
import CreditNoteList from '@/pages/sales/creditNotes/CreditNoteList';
import CustomerList from '@/pages/customer/CustomerList';
import PaymentAccount from '@/pages/sales/paymentAccout/PaymentAccount';
import CustomerLedger from '@/pages/sales/customerLedger/CustomerLedger';

/* ─── Sample records (built on demand) ─────────────────────────────────── */

const SELLER = {
  name: 'Shree Ganesh Kirana Stores', address: 'Shop 7, Sadashiv Peth, Tilak Road', city: 'Pune', state: 'Maharashtra',
  pincode: '411030', gstin: '27ABCPG4521K1Z8', stateCode: '27', phone: '9823012345', email: 'billing@shreeganeshkirana.in',
};
const BILL_TO = { street: 'Shop 4, Laxmi Market, Dadar W', city: 'Mumbai', state: 'Maharashtra', pincode: '400028', country: 'India' };
const SNAPSHOT = { name: 'Sharma General Store', phone: '9820155000', email: 'accounts@sharmastore.in', gstin: '27AABCS1429B1Z5', stateCode: '27', billingAddress: BILL_TO };

/** One line: qty × rate, discount %, GST % (intra-state, CGST + SGST). */
function line(productName, hsnCode, qty, rate, taxPercent, discountPercent = 0, extra = {}) {
  const taxable = Math.round(qty * rate * (1 - discountPercent / 100) * 100) / 100;
  const taxAmount = Math.round(taxable * taxPercent) / 100;
  return {
    productName, hsnCode, qty, rate, unit: extra.unit || 'pcs', taxPercent, discountPercent,
    discountAmount: Math.round((qty * rate - taxable) * 100) / 100, taxableValue: taxable, taxAmount,
    cgstAmount: taxAmount / 2, sgstAmount: taxAmount / 2, total: taxable + taxAmount, ...extra,
  };
}

function totalsOf(lines) {
  const subtotal = lines.reduce((s, l) => s + l.taxableValue, 0);
  const tax = lines.reduce((s, l) => s + l.taxAmount, 0);
  const raw = subtotal + tax;
  const total = Math.round(raw);
  return {
    subtotal, taxAmount: tax, cgstTotal: tax / 2, sgstTotal: tax / 2, igstTotal: 0,
    roundOff: Math.round((total - raw) * 100) / 100, totalAmount: total,
  };
}

function invoiceFull(id) {
  const lines = [
    line('India Gate Basmati Rice 25 kg', '1006', 2, 2450, 5, 0, { unit: 'bag' }),
    line('Fortune Sunflower Oil 15 L', '1512', 1, 2590, 5, 2, { unit: 'tin' }),
    line('Amul Butter 500 g', '0405', 6, 275, 12),
    line('Maggi Noodles 12-pack', '1902', 4, 168, 18, 0, { unit: 'pack' }),
  ];
  const t = totalsOf(lines);
  const status = id.includes('draft') ? 'draft' : id.includes('paid') ? 'paid' : 'partially_paid';
  const receipts = status === 'draft' ? [] : [
    { _id: 'rcpt-1', receiptNumber: 'RCPT-2026-0141', paymentDate: day(-6), paymentMethod: 'upi', reference: 'UPI 412398765510', amount: 5000 },
    { _id: 'rcpt-2', receiptNumber: 'RCPT-2026-0153', paymentDate: day(-2), paymentMethod: 'cash', reference: '', amount: status === 'paid' ? t.totalAmount - 5000 : 2500 },
  ];
  const paid = receipts.reduce((s, r) => s + r.amount, 0);
  return {
    _id: id,
    invoiceNumber: 'INV-2026-0409',
    invoiceDate: day(-8),
    dueDate: day(7),
    invoiceType: 'B2B',
    status,
    customerId: 'c-sharma',
    customerSnapshot: SNAPSHOT,
    isInterState: false,
    placeOfSupply: 'Maharashtra',
    placeOfSupplyCode: '27',
    lineItems: lines,
    ...t,
    paidAmount: paid,
    balanceAmount: status === 'draft' ? 0 : t.totalAmount - paid,
    paymentHistory: receipts,
    canReturn: true,
    returns: status === 'paid'
      ? [{ _id: 'sr-1', returnNumber: 'SR-2026-0023', returnDate: day(-1), status: 'approved', totalAmount: 616, lineItems: [{ productName: 'Amul Butter 500 g', qty: 2 }] }]
      : [],
    print: { layout: {}, seller: SELLER },
  };
}

function returnFull(id) {
  const lines = [
    line('Amul Butter 500 g', '0405', 2, 275, 12, 0, { condition: 'good', returnReason: 'Customer ordered extra' }),
    line('Maggi Noodles 12-pack', '1902', 1, 168, 18, 0, { unit: 'pack', condition: 'damaged', returnReason: 'Pack torn in transit' }),
  ];
  return {
    _id: id,
    returnNumber: 'SR-2026-0023',
    returnDate: day(-1),
    status: id.includes('draft') ? 'draft' : 'approved',
    customerSnapshot: SNAPSHOT,
    salesInvoiceId: { _id: 'si-1', invoiceNumber: 'INV-2026-0409', customerSnapshot: SNAPSHOT },
    lineItems: lines,
    ...totalsOf(lines),
    notes: 'Butter returned unopened and put back on the shelf. Noodle pack moved to damaged stock.',
    print: { layout: {}, seller: SELLER },
  };
}

function creditNoteFull(id) {
  const lines = [
    line('Fortune Sunflower Oil 15 L', '1512', 1, 2590, 5, 0, { unit: 'tin', sku: 'OIL-FT15' }),
    line('Amul Butter 500 g', '0405', 2, 275, 12, 0, { sku: 'BUT-AM500' }),
  ];
  return {
    _id: id,
    creditNoteNumber: 'CN-2026-0011',
    creditNoteDate: day(-3),
    status: id.includes('draft') ? 'draft' : 'issued',
    customerSnapshot: SNAPSHOT,
    salesInvoiceId: { _id: 'si-1', invoiceNumber: 'INV-2026-0409', customerSnapshot: SNAPSHOT },
    lineItems: lines,
    ...totalsOf(lines),
    notes: 'Rate difference on oil tin agreed with Mr. Sharma on the phone.',
  };
}

const RETURNS = [
  ['Sharma General Store', '9820155000', 'INV-2026-0409', 1144, 'approved'],
  ['Gupta Kirana', '9811022000', 'INV-2026-0402', 2450, 'draft'],
  ['Walk-in', '', 'INV-2026-0398', 168, 'approved'],
  ['Mehta Electricals', '9876543210', 'INV-2026-0391', 3120, 'rejected'],
  ['Fresh Mart', '9123456780', 'INV-2026-0385', 550, 'draft'],
].map(([name, phone, inv, total, status], i) => ({
  _id: `sr-${i}`,
  returnNumber: `SR-2026-${String(23 - i).padStart(4, '0')}`,
  returnDate: day(-i * 2),
  customerSnapshot: { name, phone },
  salesInvoiceId: { invoiceNumber: inv },
  totalAmount: total,
  status,
}));

const CREDIT_NOTES = [
  ['Sharma General Store', '9820155000', 'INV-2026-0409', 3216, 'issued'],
  ['Krishna Traders', '9845012000', 'INV-2026-0400', 12400, 'issued'],
  ['Hotel Shivam', '9333311111', 'INV-2026-0396', 890, 'draft'],
  ['Sai Medicals', '9000011111', 'INV-2026-0388', 1575, 'issued'],
].map(([name, phone, inv, total, status], i) => ({
  _id: `cn-${i}`,
  creditNoteNumber: `CN-2026-${String(11 - i).padStart(4, '0')}`,
  creditNoteDate: day(-i * 3),
  customerSnapshot: { name, phone },
  salesInvoiceId: { invoiceNumber: inv },
  totalAmount: total,
  status,
}));

function customerRows() {
  return [
    { ...CUSTOMERS[0], status: 'active' },
    ['Gupta', 'Kirana', '9811022000', 'gupta.kirana@gmail.com', 'active'],
    ['Mehta', 'Electricals', '9876543210', 'mehta.elec@yahoo.in', 'active'],
    ['Priya', 'Patel', '9898989898', 'priya.patel@gmail.com', 'inactive'],
    ['Hotel', 'Shivam', '9333311111', 'purchase@hotelshivam.in', 'active'],
    ['Raj', 'Malhotra', '9555511111', '', 'inactive'],
  ].map((c, i) => (Array.isArray(c) ? { _id: `c-${i}`, firstName: c[0], lastName: c[1], phone: c[2], email: c[3], status: c[4] } : c));
}

function customerFull(id) {
  return {
    ...CUSTOMERS[0],
    _id: id,
    status: 'active',
    stateCode: '27',
    creditLimit: 50000,
    openingBalance: 12500,
    addresses: [
      { type: 'billing', isDefault: true, ...BILL_TO },
      { type: 'shipping', isDefault: false, street: 'Godown 2, Senapati Bapat Marg, Lower Parel', city: 'Mumbai', state: 'Maharashtra', pincode: '400013', country: 'India' },
    ],
  };
}

function ledgerRows() {
  let bal = 12500;
  return [
    ['opening_balance', 'OB-2026', 12500, 0, 'Opening balance carried forward', -40],
    ['invoice', 'INV-2026-0382', 18450, 0, '', -21],
    ['payment', 'RCPT-2026-0118', 0, 20000, 'NEFT from HDFC', -18],
    ['invoice', 'INV-2026-0409', 9327, 0, '', -8],
    ['payment', 'RCPT-2026-0141', 0, 5000, 'UPI', -6],
    ['credit_note', 'CN-2026-0011', 0, 3216, 'Rate difference on oil', -3],
    ['sales_return', 'SR-2026-0023', 0, 1144, 'Butter + noodles return', -1],
  ].map(([transactionType, referenceNumber, debit, credit, notes, d], i) => {
    if (i > 0) bal += debit - credit;
    return { _id: `led-${i}`, date: day(d), transactionType, referenceNumber, debit, credit, balance: bal, notes };
  });
}

/* ─── API answers ──────────────────────────────────────────────────────── */

export function answer(url, params = {}) {
  const q = params || {};

  const inv = url.match(/^\/sales-invoices\/([^/?]+)$/);
  if (inv && inv[1] !== 'summary') return { data: invoiceFull(inv[1]) };

  if (url === '/sales-returns') return listOf(RETURNS, q, [(r) => r.returnNumber, (r) => r.customerSnapshot.name]);
  const sr = url.match(/^\/sales-returns\/([^/?]+)$/);
  if (sr) return { data: returnFull(sr[1]) };

  if (url === '/credit-notes') return listOf(CREDIT_NOTES, q, [(r) => r.creditNoteNumber, (r) => r.customerSnapshot.name]);
  const cn = url.match(/^\/credit-notes\/([^/?]+)$/);
  if (cn) return { data: creditNoteFull(cn[1]) };

  if (url === '/customers' || url.startsWith('/customers?')) {
    const rows = customerRows();
    return { data: { docs: rows, totalItems: rows.length, totalPages: 1, currentPage: 1, limit: 10 } };
  }
  const cust = url.match(/^\/customers\/([^/?]+)$/);
  if (cust) return { data: customerFull(cust[1]) };

  if (url === '/payment-account') {
    return {
      data: {
        verificationStatus: 'bank_saved',
        legalBusinessName: 'Shree Ganesh Kirana Stores',
        businessType: 'proprietorship',
        accountHolderName: 'Ganesh Prakash Kulkarni',
        bankName: 'HDFC Bank, Tilak Road',
        ifsc: 'HDFC0000146',
        accountNumberMasked: 'XXXXXXXX4127',
        beneficiaryEmail: 'billing@shreeganeshkirana.in',
        beneficiaryPhone: '9823012345',
        razorpayLinkedAccountId: 'acc_PqR7sT2uV9wXy1',
        stakeholderId: 'sth_LmN4oP6qR8sT0u',
        platformCommissionPercent: 1.5,
      },
    };
  }

  const ledgerStats = url.match(/^\/customer-ledger\/([^/?]+)\/stats$/);
  if (ledgerStats) {
    return {
      data: {
        openingBalance: 12500, openingBalanceDate: day(-40), totalInvoiced: 27777, totalPaid: 25000,
        totalCredited: 4360, outstandingBalance: 10917,
      },
    };
  }
  if (/^\/customer-ledger\/[^/?]+$/.test(url)) {
    const rows = ledgerRows();
    return { data: rows, meta: { total: rows.length, page: 1, limit: 10, totalPages: 1 } };
  }

  // Credit note "Apply" picker reads the invoice list (default answer has it).
  if (url === '/sales-invoices' && q.limit === 1000) return listOf(INVOICES, { limit: 1000 }, []);
  return undefined;
}

/* ─── Preview routes ───────────────────────────────────────────────────── */

export const routes = [
  { path: 'sales/invoices/view/:id', element: createElement(SalesInvoiceDetails) },
  { path: 'sales/return/view/:id', element: createElement(SalesReturnDetails) },
  { path: 'sales/credit-note/view/:id', element: createElement(CreditNoteDetails) },
  { path: 'sales/customers/view/:id', element: createElement(CustomerDetails) },
  { path: 'sales/return', element: createElement(SalesReturnList) },
  { path: 'sales/credit-note', element: createElement(CreditNoteList) },
  { path: 'sales/customers', element: createElement(CustomerList) },
  { path: 'sales/payment-account', element: createElement(PaymentAccount) },
  { path: 'sales/customers/ledger/:customerId', element: createElement(CustomerLedger) },
];
