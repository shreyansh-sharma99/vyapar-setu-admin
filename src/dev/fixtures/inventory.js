// Dev-only sample API answers and preview routes for the U5 inventory pages (/ui-kit/shell/...).
// answer(url, params) returns the response body, or undefined to let the next fixture / default answer.
// routes: [{ path, element }] mounted under /ui-kit/shell (element built with createElement, no JSX here).
import { createElement } from 'react';
import { Navigate } from 'react-router-dom';
import { Section } from '@/components/ui';
import { encryptData } from '@/utility/crypto';
import { day, listOf } from '../previewApi';
import Inventory from '@/pages/inventory/inventory/Inventory';
import DamagedStock from '@/pages/inventory/inventory/DamagedStock';
import AdjustStock from '@/pages/inventory/inventory/AdjustStock';
import StockValuation from '@/pages/inventory/inventory/StockValuation';
import StockAuditReport from '@/pages/inventory/inventory/StockAuditReport';
import ProductAuditReport from '@/pages/storeManagement/products/ProductAuditReport';
import StaffList from '@/pages/staff/StaffList';
import RoleList from '@/pages/staff/roles/RoleList';
import DesignationList from '@/pages/staff/designations/DesignationList';
import RolePermissionsView from '@/pages/staff/roles/RolePermissionsView';

/* ─── Sample data (built lazily, only when a preview asks) ──────────────── */

const owner = { name: 'Ramesh Kumar' };
const cashier = { name: 'Sunita Pawar' };

// [id, name, sku, barcode, category, unit, qty, damaged, threshold, avgCost, mrp, sale, status]
const STOCK_ROWS = [
  ['p-rice', 'India Gate Basmati Rice 25 kg', 'RICE-IG25', '8901725121006', 'Rice & Grains', 'bag', 6, 0, 5, 2150, 2600, 2450, 'active'],
  ['p-oil', 'Fortune Sunflower Oil 15 L', 'OIL-FT15', '8906007280016', 'Edible Oil', 'tin', 4, 1, 6, 2280, 2750, 2590, 'active'],
  ['p-maggi', 'Maggi Noodles 12-pack', 'MAG-12', '', 'Packaged Food', 'pack', 5, 0, 10, 150, 180, 168, 'active'],
  ['p-butter', 'Amul Butter 500 g', 'BUT-AM500', '8901262150019', 'Dairy', 'pcs', 60, 2, 12, 245, 285, 275, 'active'],
  ['p-atta', 'Aashirvaad Atta 10 kg', 'ATTA-AS10', '8901725132002', 'Rice & Grains', 'bag', 0, 0, 4, 420, 495, 470, 'active'],
  ['p-tea', 'Tata Tea Gold 1 kg', 'TEA-TG1', '8901052084014', 'Beverages', 'pack', 18, 0, 6, 520, 610, 585, 'active'],
  ['p-sugar', 'Madhur Sugar 5 kg', 'SUG-MD5', '8906009520018', 'Rice & Grains', 'bag', 22, 3, 8, 210, 260, 245, 'active'],
  ['p-soap', 'Lux Soap 4 x 100 g', 'SOAP-LX4', '8901030865123', 'Personal Care', 'pack', 35, 0, 10, 140, 180, 168, 'inactive'],
];

const stockStatusOf = (qty, threshold) => (qty <= 0 ? 'out' : threshold > 0 && qty <= threshold ? 'low' : 'in');

const stockItems = () =>
  STOCK_ROWS.map(([_id, name, sku, barcode, category, unit, qty, damaged, threshold, avgCost, mrp, sale, status], i) => ({
    _id,
    name,
    sku,
    barcode,
    unit,
    qty,
    currentStock: qty,
    damaged,
    threshold,
    avgCost,
    mrp,
    sellingPrice: sale,
    basePrice: sale,
    status,
    stockStatus: stockStatusOf(qty, threshold),
    stockValue: qty * avgCost,
    categoryId: { _id: `cat-${category}`, name: category },
    updatedBy: i % 2 ? cashier : owner,
    updatedAt: day(-i),
    createdBy: owner,
    lowStockAlertThreshold: threshold,
  }));

const pageOf = (rows, q) => {
  const { data, meta } = listOf(rows, q, [(r) => r.name, (r) => r.sku, (r) => r.barcode]);
  return { data, pagination: { ...meta, totalPages: Math.max(1, Math.ceil(meta.total / meta.limit)) } };
};

function inventoryList(q) {
  let rows = stockItems();
  if (q.stockStatus === 'damaged') rows = rows.filter((r) => r.damaged > 0);
  else if (q.stockStatus) rows = rows.filter((r) => r.stockStatus === q.stockStatus);
  if (q.categoryId) rows = rows.filter((r) => r.categoryId._id === q.categoryId);
  const all = stockItems();
  const stats = {
    totalProducts: all.length,
    totalUnits: all.reduce((n, r) => n + r.qty, 0),
    inStock: all.filter((r) => r.stockStatus === 'in').length,
    lowStock: all.filter((r) => r.stockStatus === 'low').length,
    outOfStock: all.filter((r) => r.stockStatus === 'out').length,
    withDamaged: all.filter((r) => r.damaged > 0).length,
    totalDamaged: all.reduce((n, r) => n + r.damaged, 0),
    stockValue: all.reduce((n, r) => n + r.stockValue, 0),
  };
  return { ...pageOf(rows, q), stats };
}

function damagedList(q) {
  const rows = stockItems()
    .filter((r) => r.damaged > 0)
    .map((r) => ({ _id: r._id, name: r.name, sku: r.sku, unit: r.unit, damagedStock: r.damaged, sellableStock: r.qty, value: r.damaged * r.avgCost }));
  return {
    ...pageOf(rows, q),
    stats: { units: rows.reduce((n, r) => n + r.damagedStock, 0), value: rows.reduce((n, r) => n + r.value, 0) },
  };
}

function valuation(q) {
  const products = stockItems()
    .filter((r) => r.qty > 0)
    .map((r) => {
      const qty = r.qty + (q.includeDamaged ? r.damaged : 0);
      const value = qty * r.avgCost;
      const saleValue = qty * r.sellingPrice;
      return {
        key: r._id, name: r.name, sku: r.sku, unit: r.unit, categoryId: r.categoryId, qty,
        avgUnitCost: r.avgCost, value, saleValue, mrpValue: qty * r.mrp, potentialMargin: saleValue - value,
      };
    });
  let rows = products;
  if (q.groupBy === 'category') {
    const groups = {};
    products.forEach((p) => {
      const g = (groups[p.categoryId._id] ||= { key: p.categoryId._id, categoryId: p.categoryId, products: 0, qty: 0, value: 0, saleValue: 0, mrpValue: 0, potentialMargin: 0 });
      g.products += 1;
      ['qty', 'value', 'saleValue', 'mrpValue', 'potentialMargin'].forEach((k) => { g[k] += p[k]; });
    });
    rows = Object.values(groups).map((g) => ({ ...g, avgUnitCost: g.qty ? g.value / g.qty : 0 }));
  }
  const sum = (k) => products.reduce((n, r) => n + r[k], 0);
  return {
    ...pageOf(rows, q),
    totals: { qty: sum('qty'), value: sum('value'), saleValue: sum('saleValue'), mrpValue: sum('mrpValue'), potentialMargin: sum('potentialMargin') },
  };
}

// [productIdx, source, delta, oldStock, unitCost, ref, bucket, actor, reason, action]
const MOVES = [
  [0, 'sales_invoice', -2, 8, 2150, 'INV-2026-0412', 'sellable', cashier, ''],
  [3, 'purchase_receipt', 48, 12, 245, 'BILL-2026-0061', 'sellable', owner, 'Goods received from Annapurna Wholesale'],
  [1, 'damage_mark', -1, 5, 2280, '', 'damaged', owner, 'Tin dented in transit'],
  [6, 'manual_adjust', -3, 25, 210, '', 'sellable', owner, 'Inventory audit correction', 'decrease'],
  [2, 'sales_invoice', -5, 10, 150, 'INV-2026-0410', 'sellable', cashier, ''],
  [4, 'sales_invoice', -4, 4, 420, 'INV-2026-0409', 'sellable', cashier, ''],
  [5, 'sales_return', 1, 17, 520, 'SR-2026-0014', 'sellable', cashier, 'Customer returned sealed pack'],
  [7, 'opening_stock', 35, 0, 140, '', 'sellable', owner, 'Opening stock'],
  [6, 'damage_write_off', -2, 5, 210, '', 'damaged', owner, 'Bag torn, thrown away'],
  [0, 'purchase_return', -1, 9, 2150, 'PR-2026-0007', 'sellable', owner, 'Returned to Krishna Traders'],
  [3, 'stock_count', 2, 58, 245, '', 'sellable', owner, 'Found 2 extra in cold room'],
];

function auditLogs(q) {
  const items = stockItems();
  let rows = MOVES.map(([pi, source, delta, oldStock, unitCost, referenceId, bucket, actor, reason, action], i) => {
    const p = items[pi];
    return {
      _id: `log-${i}`,
      createdAt: new Date(Date.now() - i * 5.5 * 3600000).toISOString(),
      productId: { _id: p._id, name: p.name, sku: p.sku, barcode: p.barcode },
      source, action, delta, oldStock, newStock: oldStock + delta, unitCost, value: delta * unitCost, referenceId, bucket,
      batches: unitCost ? [{ batchNo: `B-${String(925 - pi * 7).padStart(4, '0')}`, receivedAt: day(-20 - pi), mrp: p.mrp, qty: Math.abs(delta) }] : [],
      actorId: { name: actor.name, role: actor === owner ? 'owner' : 'cashier' },
      reason,
    };
  });
  if (q.productId) rows = rows.filter((r) => r.productId._id === q.productId);
  if (q.source) rows = rows.filter((r) => r.source === q.source);
  if (q.bucket) rows = rows.filter((r) => r.bucket === q.bucket);
  const { data, pagination } = pageOf(rows.map((r) => ({ ...r, name: r.productId.name, sku: r.productId.sku })), q);
  const ins = rows.filter((r) => r.delta > 0);
  const outs = rows.filter((r) => r.delta < 0);
  return {
    success: true,
    data,
    pagination,
    stats: {
      totalMovements: rows.length,
      stockIn: ins.reduce((n, r) => n + r.delta, 0),
      stockOut: Math.abs(outs.reduce((n, r) => n + r.delta, 0)),
      valueIn: ins.reduce((n, r) => n + r.value, 0),
      valueOut: outs.reduce((n, r) => n + r.value, 0),
      productsAffected: new Set(rows.map((r) => r.productId._id)).size,
    },
  };
}

const batches = () => ({
  data: {
    batches: [
      { _id: 'b-1', batchNo: 'B-0925', mrp: 2600, qtyRemaining: 4, receivedAt: day(-28) },
      { _id: 'b-2', batchNo: 'B-1012', mrp: 2650, qtyRemaining: 2, receivedAt: day(-9) },
    ],
  },
});

/* ─── Staff ─────────────────────────────────────────────────────────────── */

const ROLES = () => [
  ['Store Manager', 'Runs the shop floor: sales, purchases and stock.', ['sales.view', 'sales.create', 'sales.update', 'purchases.view', 'purchases.create', 'inventory.view', 'inventory.update', 'products.view', 'reports.view'], 2, true],
  ['Cashier', 'Billing counter only.', ['sales.view', 'sales.create', 'customers.view', 'customers.create'], 3, true],
  ['Stock Keeper', 'Receives goods and keeps counts right.', ['inventory.view', 'inventory.update', 'products.view'], 1, true],
  ['Accountant (old)', '', ['reports.view'], 0, false],
].map(([name, description, permissions, staffCount, isActive], i) => ({ _id: `role-${i}`, name, description, permissions, staffCount, isActive }));

const DESIGNATIONS = () => [
  ['Store Manager', 'In charge of the Dadar branch.', 1, true],
  ['Senior Cashier', 'Handles cash closing at end of day.', 2, true],
  ['Cashier', '', 2, true],
  ['Delivery Boy', 'Home delivery within 3 km.', 1, true],
  ['Helper', 'Shelf loading and unloading.', 0, false],
].map(([name, description, staffCount, isActive], i) => ({ _id: `des-${i}`, name, description, staffCount, isActive }));

const STAFF = () => {
  const roles = ROLES();
  const des = DESIGNATIONS();
  return [
    ['Sunita Pawar', '9820011223', 'sunita@sharmastore.in', 1, 1, true, -0.1],
    ['Imran Shaikh', '9819022334', 'imran@sharmastore.in', 0, 0, true, -1],
    ['Pooja Kulkarni', '9867033445', 'pooja@sharmastore.in', 1, 2, true, -2],
    ['Rahul Jadhav', '9702044556', '', 2, 3, true, null],
    ['Meena Iyer', '9833055667', 'meena@sharmastore.in', null, 2, false, -40],
  ].map(([name, phone, email, ri, di, isActive, login], i) => ({
    _id: `staff-${i}`,
    name, phone, email, isActive,
    roleId: ri === null ? null : { _id: roles[ri]._id, name: roles[ri].name },
    designationId: { _id: des[di]._id, name: des[di].name },
    lastLoginAt: login === null ? null : day(login),
  }));
};

const staffPage = (rows, q) => listOf(rows, q, [(r) => r.name, (r) => r.email, (r) => r.phone]);

export function answer(url, q = {}) {
  if (url === '/inventory') return inventoryList(q);
  if (url === '/inventory/damaged') return damagedList(q);
  if (url === '/inventory/valuation') return valuation(q);
  if (url === '/inventory/audit-logs') return auditLogs(q);
  if (url === '/inventory/batches') return batches();
  if (url === '/staff') return staffPage(STAFF(), q);
  if (url === '/staff/roles') return staffPage(ROLES(), q);
  if (url === '/staff/designations') return staffPage(DESIGNATIONS(), q);
  return undefined;
}

/* ─── Preview routes ────────────────────────────────────────────────────── */

const PERMISSION_MODULES = [
  { key: 'sales', label: 'Sales', levels: ['view', 'create', 'update', 'delete'], extras: [{ key: 'change_price', label: 'Change price on a bill' }, { key: 'give_discount', label: 'Give discount' }] },
  { key: 'purchases', label: 'Purchases', levels: ['view', 'create', 'update', 'delete'] },
  { key: 'products', label: 'Products', levels: ['view', 'create', 'update', 'delete'] },
  { key: 'customers', label: 'Customers', levels: ['view', 'create', 'update', 'delete'] },
  { key: 'inventory', label: 'Inventory', levels: ['view', 'update'] },
  { key: 'reports', label: 'Reports', levels: ['view'] },
];

function PermissionsPreview() {
  return createElement(
    Section,
    { title: 'Store Manager can', description: 'Read-only, as shown on the staff form' },
    createElement(RolePermissionsView, {
      permissions: [...ROLES()[0].permissions, 'sales.change_price'],
      modules: PERMISSION_MODULES,
    })
  );
}

/** Opens Product Audit with an encrypted id, as the product list does. */
function ProductAuditRedirect() {
  return createElement(Navigate, { to: `/ui-kit/shell/inventory/product-audit/${encodeURIComponent(encryptData('p-rice'))}`, replace: true });
}

/** Opens Adjust Stock with a product already picked (as the Adjust button on the stock list does). */
function AdjustWithProduct() {
  const product = stockItems()[0];
  return createElement(Navigate, { to: '/ui-kit/shell/inventory/adjust', replace: true, state: { selectedProduct: product } });
}

export const routes = [
  { path: 'inventory/stock', element: createElement(Inventory) },
  { path: 'inventory/damaged', element: createElement(DamagedStock) },
  { path: 'inventory/adjust', element: createElement(AdjustStock) },
  { path: 'inventory/adjust-product', element: createElement(AdjustWithProduct) },
  { path: 'inventory/valuation', element: createElement(StockValuation) },
  { path: 'inventory/stock-audit', element: createElement(StockAuditReport) },
  { path: 'inventory/product-audit', element: createElement(ProductAuditRedirect) },
  { path: 'inventory/product-audit/:id', element: createElement(ProductAuditReport) },
  { path: 'inventory/staff', element: createElement(StaffList) },
  { path: 'inventory/roles', element: createElement(RoleList) },
  { path: 'inventory/designations', element: createElement(DesignationList) },
  { path: 'inventory/role-permissions', element: createElement(PermissionsPreview) },
];
