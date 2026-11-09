// Dev-only sample API for the /ui-kit/shell previews of the real forms.
// While the address starts with /ui-kit, apiClient answers lookups from the samples below and
// refuses every save, so nothing reaches the backend or the database. Other pages are untouched.
import apiClient from '@/utility/Http';
import { groupAnswer } from './fixtures';

export const PRODUCTS = [
  { _id: 'p-rice', name: 'India Gate Basmati Rice 25 kg', sku: 'RICE-IG25', hsnCode: '1006', unit: 'bag', lastPurchasePrice: 2150, mrp: 2600, sellingPrice: 2450, currentStock: 6, isGstApplicable: true, gst: { current: 5 }, barcode: '8901725121006' },
  { _id: 'p-oil', name: 'Fortune Sunflower Oil 15 L', sku: 'OIL-FT15', hsnCode: '1512', unit: 'tin', lastPurchasePrice: 2280, mrp: 2750, sellingPrice: 2590, currentStock: 4, isGstApplicable: true, gst: { current: 5 } },
  { _id: 'p-maggi', name: 'Maggi Noodles 12-pack', sku: 'MAG-12', hsnCode: '1902', unit: 'pack', lastPurchasePrice: 150, mrp: 180, sellingPrice: 168, currentStock: 5, isGstApplicable: true, gst: { current: 18 } },
  { _id: 'p-butter', name: 'Amul Butter 500 g', sku: 'BUT-AM500', hsnCode: '0405', unit: 'pcs', lastPurchasePrice: 245, mrp: 285, sellingPrice: 275, currentStock: 60, isGstApplicable: true, gst: { current: 12 } },
];
// The sales form reads the price and GST under these names.
PRODUCTS.forEach((p) => Object.assign(p, { basePrice: p.sellingPrice, gstRateOverride: p.gst.current }));

export const SUPPLIERS = [
  { _id: 's-annapurna', name: 'Annapurna Wholesale', phone: '9820041000', gstin: '27AAFCA4410P1Z3', stateCode: '27', paymentTermsDays: 15, payableBalance: 42000, isActive: true },
  { _id: 's-krishna', name: 'Krishna Traders', phone: '9845012000', gstin: '29AAKFK5512M1Z4', stateCode: '29', paymentTermsDays: 0, payableBalance: 0, isActive: true },
];
export const CUSTOMERS = [
  {
    _id: 'c-sharma', firstName: 'Sharma', lastName: 'General Store', phone: '9820155000', email: 'accounts@sharmastore.in', gstin: '27AABCS1429B1Z5',
    addresses: [{ isDefault: true, street: 'Shop 4, Laxmi Market, Dadar W', city: 'Mumbai', state: 'Maharashtra', pincode: '400028' }],
  },
];

// List pages
export const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString();
export const INVOICES = [
  ['Sharma General Store', '9820155000', 18450, 18450, 'paid'],
  ['Gupta Kirana', '9811022000', 6230, 4000, 'partially_paid'],
  ['Walk-in customer', '', 840, 840, 'paid'],
  ['Mehta Electricals', '9876543210', 42900, 0, 'unpaid'],
  ['Priya Patel', '9898989898', 2150, 2150, 'paid'],
  ['Krishna Traders', '9845012000', 105600, 60000, 'partially_paid'],
  ['Amit Sharma', '9700012345', 499, 499, 'paid'],
  ['Fresh Mart', '9123456780', 11780, 0, 'draft'],
  ['Sai Medicals', '9000011111', 23310, 0, 'unpaid'],
  ['Raj Malhotra', '9555511111', 3620, 0, 'voided'],
  ['Annapurna Foods', '9444411111', 7300, 7300, 'paid'],
  ['Hotel Shivam', '9333311111', 15890, 0, 'unpaid'],
].map(([name, phone, total, paid, status], i) => ({
  _id: `inv-${i}`,
  invoiceNumber: `INV-2026-${String(412 - i).padStart(4, '0')}`,
  invoiceDate: day(-Math.floor(i / 2)),
  customerSnapshot: { name, phone },
  totalAmount: total,
  paidAmount: paid,
  balanceAmount: status === 'draft' || status === 'voided' ? 0 : total - paid,
  status,
}));
export const PURCHASES = [
  ['Annapurna Wholesale', 101106, 'received', { status: 'partially_paid', paid: 60000 }],
  ['Krishna Traders', 45600, 'received', { status: 'unpaid', paid: 0 }],
  ['Annapurna Wholesale', 18200, 'draft', null],
  ['Fortune Oils Depot', 62750, 'received', { status: 'paid', paid: 62750 }],
  ['Krishna Traders', 9800, 'cancelled', null],
  ['Metro Cash & Carry', 33400, 'received', { status: 'unpaid', paid: 0, late: true }],
].map(([name, total, status, bill], i) => ({
  _id: `po-${i}`,
  poNumber: `PUR-2026-${String(87 - i).padStart(4, '0')}`,
  poDate: day(-i * 3),
  expectedDate: day(-i * 3 + 5),
  supplierSnapshot: { name },
  items: Array.from({ length: 2 + (i % 4) }),
  totalAmount: total,
  status,
  bill: bill && { _id: `bill-${i}`, billNumber: `BILL-2026-${String(61 - i).padStart(4, '0')}`, status: bill.status, paidAmount: bill.paid, adjustedAmount: 0, balanceAmount: total - bill.paid },
}));
export const BILLS = PURCHASES.filter((p) => p.bill).map((p, i) => ({
  _id: p.bill._id,
  billNumber: p.bill.billNumber,
  supplierBillNo: `SB/${2200 + i}`,
  billDate: p.poDate,
  receivedDate: p.poDate,
  dueDate: day(i === 3 ? -6 : 10 - i * 4),
  supplierSnapshot: p.supplierSnapshot,
  supplierId: 's-annapurna',
  totalAmount: p.totalAmount,
  paidAmount: p.bill.paidAmount,
  adjustedAmount: 0,
  balanceAmount: p.bill.balanceAmount,
  status: p.bill.status,
}));
const PURCHASE_STATS = { bills: 4, purchases: 242656, inputTax: 11555, due: 120000, overdue: 33400 };

const CRUD = ['view', 'create', 'update', 'delete'];
const PERMISSIONS = {
  levels: CRUD,
  modules: [
    { key: 'sales', label: 'Sales', levels: CRUD, extras: [{ key: 'change_price', label: 'Change price on a bill' }, { key: 'give_discount', label: 'Give discount' }] },
    { key: 'purchases', label: 'Purchases', levels: CRUD },
    { key: 'products', label: 'Products', levels: CRUD },
    { key: 'customers', label: 'Customers', levels: CRUD },
    { key: 'inventory', label: 'Inventory', levels: ['view', 'update'] },
    { key: 'reports', label: 'Reports', levels: ['view'] },
    { key: 'staff', label: 'Staff & roles', levels: CRUD },
  ],
};

export function listOf(rows, q, searchFields) {
  let out = rows;
  if (q.status) out = out.filter((r) => String(q.status).split(',').includes(r.status));
  if (q.overdue) out = out.filter((r) => r.balanceAmount > 0 && new Date(r.dueDate) < new Date());
  if (q.search) out = out.filter((r) => searchFields.some((f) => String(f(r) || '').toLowerCase().includes(String(q.search).toLowerCase())));
  const page = Number(q.page) || 1;
  const limit = Number(q.limit) || 10;
  return { data: out.slice((page - 1) * limit, page * limit), meta: { total: out.length, page, limit } };
}

const match = (q, ...fields) => !q || fields.some((f) => String(f || '').toLowerCase().includes(String(q).toLowerCase()));
const pricesFor = (ids = '') =>
  Object.fromEntries(
    String(ids).split(',').filter(Boolean).map((id) => {
      const p = PRODUCTS.find((x) => x._id === id);
      return [id, p ? { sellingPrice: p.sellingPrice, priceIncludesGst: true, gstRate: p.gst.current, cessRate: 0, mrp: p.mrp, offer: null, batches: [] } : {}];
    })
  );

function answer(config) {
  const url = config.url || '';
  const q = config.params || {};
  const fromGroup = groupAnswer(url, q);
  if (fromGroup !== undefined) return fromGroup;
  if (url === '/sales-invoices/summary') {
    const sum = (s) => INVOICES.filter((i) => i.status === s);
    return { data: ['draft', 'unpaid', 'paid', 'voided'].map((s) => ({ _id: s, count: sum(s).length, totalAmount: sum(s).reduce((n, i) => n + i.totalAmount, 0) })) };
  }
  if (url === '/sales-invoices') return listOf(INVOICES, q, [(r) => r.invoiceNumber, (r) => r.customerSnapshot.name]);
  if (url === '/purchase-orders') return { ...listOf(PURCHASES, q, [(r) => r.poNumber, (r) => r.supplierSnapshot.name]), stats: PURCHASE_STATS };
  if (url === '/purchase-bills') return { ...listOf(BILLS, q, [(r) => r.billNumber, (r) => r.supplierSnapshot.name]), stats: PURCHASE_STATS };
  if (url === '/staff/permissions') return { data: PERMISSIONS };
  if (url.startsWith('/lookups/pricing')) return { success: true, canUpdatePrices: true, prices: pricesFor(q.productIds) };
  if (url.startsWith('/lookups/products')) return { data: PRODUCTS.filter((p) => match(q.q, p.name, p.sku, p.barcode)) };
  if (url.startsWith('/lookups/batches')) return { data: { batches: [] } };
  if (url.startsWith('/lookups/customers')) return { data: CUSTOMERS.filter((c) => match(q.q, c.phone, c.firstName, c.lastName)) };
  if (url.startsWith('/lookups/barcode-check')) return { data: { status: 'free' } };
  const product = url.match(/^\/products\/([^/?]+)/);
  if (product) return { data: PRODUCTS.find((p) => p._id === product[1]) || null };
  const supplier = url.match(/^\/suppliers\/([^/?]+)/);
  if (supplier) return { data: SUPPLIERS.find((s) => s._id === supplier[1]) || null };
  if (url.startsWith('/suppliers')) return { data: SUPPLIERS.filter((s) => match(q.search, s.name, s.phone, s.gstin)) };
  return { data: [] };
}

const previewAdapter = async (config) => {
  await new Promise((r) => setTimeout(r, 150));
  if ((config.method || 'get').toLowerCase() !== 'get') {
    const error = new Error('Preview only');
    error.config = config;
    error.response = { status: 400, data: { message: 'Preview only: saving is turned off on /ui-kit. Nothing was saved.' }, headers: {}, config };
    throw error;
  }
  return { data: answer(config), status: 200, statusText: 'OK', headers: {}, config };
};

apiClient.interceptors.request.use((config) => {
  if (window.location.pathname.startsWith('/ui-kit')) config.adapter = previewAdapter;
  return config;
});
