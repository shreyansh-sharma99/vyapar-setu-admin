/**
 * The one shape every invoice template draws from.
 * - sampleDoc(): the made-up invoice shown in the Invoice Layout live preview
 * - docFromInvoice(): a real sales invoice (GET /sales-invoices/:id, with its `print` context)
 */

const num = (v) => Number(v) || 0;
const round2 = (v) => Math.round(num(v) * 100) / 100;

/** ₹1,234.50 */
export const inr = (v) => `₹${num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** 1,234.50 (no symbol, for dense tables) */
export const amt = (v) => num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** "5%" / "2.5%" */
export const pct = (v) => `${round2(v)}%`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 19 Sep 2026 */
export const fmtDate = (d) => {
  const x = d ? new Date(d) : null;
  if (!x || Number.isNaN(x.getTime())) return '';
  return `${String(x.getDate()).padStart(2, '0')} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
};

// ── amount in words (Indian system, same as the server) ──────────────────────
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const upTo999 = (n) => {
  let s = '';
  if (n > 99) { s += `${ONES[Math.floor(n / 100)]} Hundred`; n %= 100; if (n) s += ' '; }
  if (n > 19) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += ` ${ONES[n % 10]}`; } else if (n > 0) s += ONES[n];
  return s;
};
const intWords = (n) => {
  if (n === 0) return 'Zero';
  let w = '';
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) w += `${intWords(crore)} Crore `;
  if (lakh) w += `${upTo999(lakh)} Lakh `;
  if (thousand) w += `${upTo999(thousand)} Thousand `;
  if (n) w += upTo999(n);
  return w.trim();
};
export const amountInWords = (amount, currency = 'INR') => {
  const abs = Math.abs(num(amount));
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);
  let w = `${intWords(rupees)} ${currency === 'INR' ? 'Rupees' : currency}`;
  if (paise > 0) w += ` and ${intWords(paise)} ${currency === 'INR' ? 'Paise' : 'Cents'}`;
  return `${num(amount) < 0 ? 'Minus ' : ''}${w} Only`;
};

const joinAddr = (parts) => parts.map((p) => String(p || '').trim()).filter(Boolean).join(', ');

/** "street, city, state - pin" */
const addrLine = (a) => {
  if (!a) return '';
  const head = joinAddr([a.street, a.area, a.city, a.state]);
  const pin = String(a.pincode || '').trim();
  return pin ? (head ? `${head} - ${pin}` : pin) : head;
};

/** Tax rows grouped by GST rate, and by HSN. */
const groupTax = (items, keyOf) => {
  const map = new Map();
  for (const it of items) {
    const k = keyOf(it);
    const row = map.get(k) || { key: k, rate: it.taxRate, taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, tax: 0 };
    row.taxable += it.taxable;
    row.cgst += it.cgst;
    row.sgst += it.sgst;
    row.igst += it.igst;
    row.cess += it.cess;
    row.tax += it.taxAmt;
    map.set(k, row);
  }
  return [...map.values()].map((r) => ({
    ...r,
    taxable: round2(r.taxable), cgst: round2(r.cgst), sgst: round2(r.sgst), igst: round2(r.igst), cess: round2(r.cess), tax: round2(r.tax),
  }));
};

const finish = (d) => {
  const taxRows = groupTax(d.items, (it) => String(it.taxRate)).sort((a, b) => a.rate - b.rate);
  const hsnRows = groupTax(d.items, (it) => it.hsn || '—');
  return { ...d, taxRows, hsnRows, words: amountInWords(d.totals.total, d.currency) };
};

/** A line as the templates need it. */
const toItem = (l, i, isInter) => {
  const qty = num(l.qty);
  const rate = num(l.rate);
  const discount = num(l.discountAmount != null ? l.discountAmount : l.discountAmt);
  const taxable = l.taxableValue != null ? num(l.taxableValue) : Math.max(0, qty * rate - discount);
  const taxRate = num(l.taxPercent);
  const cess = num(l.cessAmount);
  let cgst = num(l.cgstAmount);
  let sgst = num(l.sgstAmount);
  let igst = num(l.igstAmount);
  const taxAmt = num(l.taxAmount != null ? l.taxAmount : l.taxAmt) || cgst + sgst + igst;
  if (!cgst && !sgst && !igst && taxAmt) {
    if (isInter) igst = taxAmt;
    else { cgst = round2(taxAmt / 2); sgst = round2(taxAmt - cgst); }
  }
  return {
    id: l._id || i,
    name: l.productName || l.name || '',
    hsn: l.hsnCode || '',
    qty,
    unit: l.unit || '',
    rate,
    discount,
    taxable,
    taxRate,
    taxAmt,
    cgst,
    sgst,
    igst,
    cess,
    cgstRate: num(l.cgstRate) || (isInter ? 0 : taxRate / 2),
    sgstRate: num(l.sgstRate) || (isInter ? 0 : taxRate / 2),
    igstRate: num(l.igstRate) || (isInter ? taxRate : 0),
    total: num(l.total) || taxable + taxAmt + cess,
  };
};

const STATUS_LABEL = { draft: 'Draft', unpaid: 'Unpaid', partially_paid: 'Partly paid', paid: 'Paid', overdue: 'Overdue', void: 'Void', cancelled: 'Cancelled' };

/** A real sales invoice → template data. `invoice.print` = { layout, seller, dispatch } from the server. */
export const docFromInvoice = (invoice) => {
  const print = invoice?.print || {};
  const seller = print.seller || {};
  const snap = invoice?.customerSnapshot || {};
  const isInter = !!invoice?.isInterState;
  const items = (invoice?.lineItems || []).map((l, i) => toItem(l, i, isInter));
  const dispatch = print.dispatch || (invoice?.storeSnapshot?.name ? { name: invoice.storeSnapshot.name, code: invoice.storeSnapshot.code } : null);
  const sumOf = (k) => round2(items.reduce((s, it) => s + it[k], 0));
  const discount = num(invoice?.discountAmount);
  const subtotal = num(invoice?.subtotal) || round2(items.reduce((s, it) => s + it.qty * it.rate, 0));
  const tax = num(invoice?.taxAmount) || sumOf('taxAmt');
  return finish({
    title: 'TAX INVOICE',
    number: invoice?.invoiceNumber || '',
    date: fmtDate(invoice?.invoiceDate),
    dueDate: invoice?.dueDate ? fmtDate(invoice.dueDate) : 'On Receipt',
    status: STATUS_LABEL[invoice?.status] || (invoice?.status ? String(invoice.status) : ''),
    currency: invoice?.currency || 'INR',
    reverseCharge: !!invoice?.reverseCharge,
    isInter,
    placeOfSupply: invoice?.placeOfSupply
      ? `${invoice.placeOfSupply}${invoice.placeOfSupplyCode ? ` (${invoice.placeOfSupplyCode})` : ''}`
      : '',
    seller: {
      name: seller.name || '',
      address: joinAddr([seller.address, seller.city, seller.state]) + (seller.pincode ? ` - ${seller.pincode}` : ''),
      gstin: seller.gstin || invoice?.sellerGstin || '',
      state: seller.state || '',
      stateCode: seller.stateCode || '',
      phone: seller.phone || '',
      email: seller.email || '',
    },
    buyer: {
      name: snap.name || 'Walk-in Customer',
      phone: snap.phone || '',
      gstin: snap.gstin || '',
      state: snap.billingAddress?.state || '',
      stateCode: snap.stateCode || '',
      address: addrLine(snap.billingAddress),
      shipAddress: addrLine(snap.shippingAddress) || addrLine(snap.billingAddress),
    },
    dispatch: dispatch
      ? { name: dispatch.name || '', code: dispatch.code || '', address: addrLine(dispatch.address), phone: dispatch.phone || '' }
      : null,
    items,
    totals: {
      subtotal,
      discount,
      taxable: round2(items.reduce((s, it) => s + it.taxable, 0)),
      tax,
      cgst: num(invoice?.cgstTotal) || sumOf('cgst'),
      sgst: num(invoice?.sgstTotal) || sumOf('sgst'),
      igst: num(invoice?.igstTotal) || sumOf('igst'),
      cess: num(invoice?.cessTotal) || sumOf('cess'),
      roundOff: num(invoice?.roundOff),
      total: num(invoice?.totalAmount),
      paid: num(invoice?.paidAmount),
      balance: num(invoice?.balanceAmount),
    },
  });
};

/** The made-up invoice the Invoice Layout preview shows. */
export const sampleDoc = ({ businessName = 'Your Business', invoiceNumber = 'INV/2026-27/00042' } = {}) => {
  const lines = [
    { productName: 'Basmati Rice 5kg', hsnCode: '1006', qty: 2, unit: 'PKT', rate: 650, discountAmount: 0, taxableValue: 1300, taxPercent: 5, taxAmount: 65 },
    { productName: 'Sunflower Oil 1L', hsnCode: '1512', qty: 3, unit: 'BTL', rate: 185, discountAmount: 50, taxableValue: 505, taxPercent: 5, taxAmount: 25.25 },
    { productName: 'Home visit — AC service', hsnCode: '9987', qty: 1, unit: 'PCS', rate: 800, discountAmount: 0, taxableValue: 800, taxPercent: 18, taxAmount: 144 },
  ];
  const items = lines.map((l, i) => toItem(l, i, false));
  return finish({
    title: 'TAX INVOICE',
    number: invoiceNumber,
    date: '19 Sep 2026',
    dueDate: 'On Receipt',
    status: 'Unpaid',
    currency: 'INR',
    reverseCharge: false,
    isInter: false,
    placeOfSupply: 'Rajasthan (08)',
    seller: {
      name: businessName,
      address: '45, Shanti Nagar, Alwar, Rajasthan - 301001',
      gstin: '08ABCDE1234F1Z5',
      state: 'Rajasthan',
      stateCode: '08',
      phone: '9876543210',
      email: '',
    },
    buyer: {
      name: 'Rahul Sharma',
      phone: '7895978459',
      gstin: '08PQRSX6789K1Z2',
      state: 'Rajasthan',
      stateCode: '08',
      address: '50 Anupam Vihar, Mansarovar, Jaipur, Rajasthan - 302020',
      shipAddress: '50 Anupam Vihar, Mansarovar, Jaipur, Rajasthan - 302020',
    },
    dispatch: { name: 'Mansarovar Warehouse', code: 'JP-RJ-MNS-001', address: 'Jaipur, Rajasthan - 302020', phone: '' },
    items,
    totals: {
      subtotal: 2655, discount: 50, taxable: 2605, tax: 234.25, cgst: 117.13, sgst: 117.12, igst: 0, cess: 0,
      roundOff: -0.25, total: 2839, paid: 0, balance: 2839,
    },
  });
};

/** Thermal roll themes print on a narrow receipt, not A4. */
export const isThermal = (theme) => theme === 'thermal_58' || theme === 'thermal_80';
