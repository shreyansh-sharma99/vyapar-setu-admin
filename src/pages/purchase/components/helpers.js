import { encryptData, decryptData } from '@/utility/crypto';

/* ─── Routes ──────────────────────────────────────────────────────────────── */

export const PATHS = {
  suppliers: '/purchase/suppliers',
  orders: '/purchase/orders',
  receipts: '/purchase/receipts',
  bills: '/purchase/bills',
  returns: '/purchase/returns',
  payments: '/purchase/payments',
  ageing: '/purchase/payables-ageing',
};

/** URL-safe encrypted id, same scheme as the sales pages. */
export const encId = (id) => encodeURIComponent(encryptData(String(id || '')));

export const decId = (param) => {
  if (!param) return null;
  try {
    return decryptData(decodeURIComponent(param)) || null;
  } catch {
    return null;
  }
};

export const viewPath = (kind, id) => `${PATHS[kind]}/view/${encId(id)}`;
export const editPath = (kind, id) => `${PATHS[kind]}/edit/${encId(id)}`;

/** Id from a populated ref or a raw id. */
export const refId = (v) => (v && typeof v === 'object' ? v._id || '' : v || '');

/* ─── Numbers & money ─────────────────────────────────────────────────────── */

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n) => Math.round(num(n) * 100) / 100;

export const formatINR = (n) =>
  `₹${num(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatQty = (n) => num(n).toLocaleString('en-IN', { maximumFractionDigits: 4 });

/* ─── Dates ───────────────────────────────────────────────────────────────── */

const pad = (n) => String(n).padStart(2, '0');

/** yyyy-mm-dd in local time (for <input type="date">). */
export const toInputDate = (d) => {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const todayISO = () => toInputDate(new Date());

export const addDaysISO = (iso, days) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const x = new Date(y, m - 1, d);
  x.setDate(x.getDate() + (Number(days) || 0));
  return toInputDate(x);
};

export const fmtDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** True when a due date is before today and money is still due. */
export const isOverdue = (dueDate, balance) => {
  if (!dueDate || num(balance) <= 0) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return new Date(dueDate) < start;
};

export const daysPast = (date) => {
  if (!date) return 0;
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

/* ─── Errors ──────────────────────────────────────────────────────────────── */

export const errMsg = (e, fallback = 'Something went wrong. Please try again.') => {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  const data = e.response?.data || e;
  const errors = Array.isArray(data.errors) ? data.errors.filter(Boolean) : [];
  if (errors.length) return `${data.message || 'Validation failed'}: ${errors.join('; ')}`;
  return data.message || e.message || fallback;
};

/* ─── GST / India ─────────────────────────────────────────────────────────── */

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const STATE_CODES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman and Diu', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh',
  '38': 'Ladakh', '97': 'Other Territory',
};

export const stateName = (code) => (code ? STATE_CODES[code] || '' : '');

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

export const methodLabel = (m) => PAYMENT_METHODS.find((x) => x.value === m)?.label || m || '—';

export const LEDGER_TYPES = {
  opening_balance: 'Opening balance',
  purchase_bill: 'Purchase bill',
  payment: 'Payment',
  purchase_return: 'Purchase return',
  adjustment: 'Adjustment',
};

/* ─── Purchase lines ──────────────────────────────────────────────────────── */

let keySeq = 0;
export const newKey = () => {
  keySeq += 1;
  return `ln${keySeq}`;
};

export const emptyLine = () => ({
  key: newKey(),
  productId: '',
  productName: '',
  sku: '',
  hsnCode: '',
  unit: '',
  units: [],
  qty: 1,
  rate: 0,
  discountPercent: 0,
  taxPercent: '',
  cessPercent: 0,
  fromBucket: 'sellable',
  reason: '',
});

/** [{ unit, factor }] — base unit first, then pack units. */
export const unitsOf = (p) => {
  if (!p) return [];
  const base = (p.unit || 'pcs').toLowerCase();
  const list = [{ unit: base, factor: 1 }];
  (p.alternateUnits || []).forEach((a) => {
    const u = String(a.unit || '').toLowerCase();
    if (u && !list.some((x) => x.unit === u)) list.push({ unit: u, factor: num(a.factor) || 1 });
  });
  return list;
};

export const productTax = (p) => (p?.isGstApplicable ? num(p.gstRateOverride) : 0);

/** Fills a line from a product row (lookup or product details). */
export const applyProduct = (line, p, { keepQtyRate = false } = {}) => ({
  ...line,
  productId: p._id,
  productName: p.name || line.productName,
  sku: p.sku || '',
  hsnCode: p.hsnCode || p.hsnSacCode || '',
  unit: (p.unit || 'pcs').toLowerCase(),
  units: unitsOf(p),
  rate: keepQtyRate ? line.rate : round2(num(p.lastPurchasePrice) || num(p.costPrice)),
  taxPercent: productTax(p),
});

/** Turns a saved document line into an editable line. */
export const lineFromDoc = (item) => {
  const p = item.productId && typeof item.productId === 'object' ? item.productId : null;
  const unit = (item.unit || p?.unit || 'pcs').toLowerCase();
  let units = p ? unitsOf(p) : [];
  if (!units.some((u) => u.unit === unit)) units = [...units, { unit, factor: num(item.unitFactor) || 1 }];
  return {
    ...emptyLine(),
    productId: refId(item.productId),
    productName: item.productName || p?.name || '',
    sku: item.sku || p?.sku || '',
    hsnCode: item.hsnCode || '',
    unit,
    units,
    qty: num(item.qty),
    rate: num(item.rate),
    discountPercent: num(item.discountPercent),
    taxPercent: item.taxPercent ?? '',
    cessPercent: num(item.cessPercent),
    fromBucket: item.fromBucket || 'sellable',
    reason: item.reason || '',
  };
};

export const lineAmounts = (l, overallFactor = 1) => {
  const gross = num(l.qty) * num(l.rate);
  const disc = (gross * num(l.discountPercent)) / 100;
  const taxable = Math.max(0, gross - disc) * overallFactor;
  const tax = (taxable * num(l.taxPercent)) / 100;
  const cess = (taxable * num(l.cessPercent)) / 100;
  return { gross, disc, taxable, tax, cess, total: taxable + tax + cess };
};

/**
 * Client-side preview of document totals. The server recalculates everything;
 * its numbers are what get saved.
 */
export const computeTotals = (lines, { overallDiscountPercent = 0, otherCharges = 0, roundOff = false, isInterState } = {}) => {
  const factor = 1 - Math.min(100, Math.max(0, num(overallDiscountPercent))) / 100;
  let subtotal = 0;
  let lineDiscount = 0;
  let taxableBefore = 0;
  let taxableAmount = 0;
  let taxAmount = 0;
  let cessTotal = 0;
  lines.forEach((l) => {
    if (!l.productId) return;
    const a = lineAmounts(l, factor);
    const b = lineAmounts(l);
    subtotal += a.gross;
    lineDiscount += a.disc;
    taxableBefore += b.taxable;
    taxableAmount += a.taxable;
    taxAmount += a.tax;
    cessTotal += a.cess;
  });
  const overallDiscount = taxableBefore - taxableAmount;
  const extra = Math.max(0, num(otherCharges));
  const gross = round2(taxableAmount + taxAmount + cessTotal + extra);
  const totalAmount = roundOff ? Math.round(gross) : gross;
  return {
    subtotal: round2(subtotal),
    discountAmount: round2(lineDiscount + overallDiscount),
    taxableAmount: round2(taxableAmount),
    taxAmount: round2(taxAmount),
    cgstTotal: isInterState === false ? round2(taxAmount / 2) : 0,
    sgstTotal: isInterState === false ? round2(taxAmount / 2) : 0,
    igstTotal: isInterState === true ? round2(taxAmount) : 0,
    cessTotal: round2(cessTotal),
    otherCharges: round2(extra),
    roundOff: round2(totalAmount - gross),
    totalAmount,
    isInterState,
  };
};

/** Validates editable priced lines. Returns an error message or ''. */
export const validateLines = (lines) => {
  const used = lines.filter((l) => l.productId);
  if (!used.length) return 'Add at least one product.';
  for (const l of used) {
    if (num(l.qty) <= 0) return `Enter a quantity for "${l.productName}".`;
    if (num(l.rate) < 0) return `Rate for "${l.productName}" cannot be negative.`;
    if (num(l.discountPercent) < 0 || num(l.discountPercent) > 100) return `Discount for "${l.productName}" must be between 0 and 100%.`;
  }
  return '';
};

/** Payload lines for PO / bill / return. */
export const linesToPayload = (lines, { bucket = false } = {}) =>
  lines
    .filter((l) => l.productId)
    .map((l) => {
      const out = {
        productId: l.productId,
        productName: l.productName,
        unit: l.unit || undefined,
        qty: num(l.qty),
        rate: num(l.rate),
        discountPercent: num(l.discountPercent),
        cessPercent: num(l.cessPercent),
      };
      if (l.hsnCode) out.hsnCode = String(l.hsnCode).slice(0, 10);
      if (l.taxPercent !== '' && l.taxPercent !== null && l.taxPercent !== undefined) out.taxPercent = num(l.taxPercent);
      if (bucket) {
        out.fromBucket = l.fromBucket || 'sellable';
        out.reason = l.reason || '';
      }
      return out;
    });

export const docPricing = ({ overallDiscountPercent, otherCharges, roundOff }) => ({
  overallDiscountPercent: Math.min(100, Math.max(0, num(overallDiscountPercent))),
  otherCharges: Math.max(0, num(otherCharges)),
  roundOff: !!roundOff,
});

/** Display name for a supplier ref / snapshot. */
export const supplierName = (doc) =>
  doc?.supplierSnapshot?.name || (typeof doc?.supplierId === 'object' ? doc.supplierId?.name : '') || doc?.supplierName || '—';

export const storeName = (doc) =>
  (typeof doc?.storeId === 'object' ? doc.storeId?.name : '') || doc?.storeSnapshot?.name || '—';

/** Overall discount % of a saved document, worked back from its totals. */
export const inferOverallDiscount = (doc) => {
  if (!doc?.items?.length) return 0;
  const base = doc.items.reduce((s, i) => s + num(i.qty) * num(i.rate) * (1 - num(i.discountPercent) / 100), 0);
  if (base <= 0) return 0;
  const pct = (1 - num(doc.taxableAmount) / base) * 100;
  return pct > 0.009 ? round2(pct) : 0;
};
