// Dev-only sample API answers and preview routes for the U5 catalog pages (/ui-kit/shell/...).
// answer(url, params) returns the response BODY, or undefined to let the next fixture / default answer.
// routes: [{ path, element }] mounted under /ui-kit/shell (element built with createElement, no JSX here).
// Details pages read an encrypted id from the URL: open them with encryptData('<id>') from '@/utility/crypto',
// or use the list pages (View button) — any id not found falls back to the first sample.
import { createElement } from 'react';
import { Navigate } from 'react-router-dom';
import ProductList from '@/pages/storeManagement/products/ProductList';
import ProductDetails from '@/pages/storeManagement/products/ProductDetails';
import BarcodeLabels from '@/pages/storeManagement/products/BarcodeLabels';
import ProductImportExport from '@/pages/storeManagement/products/ProductImportExport';
import DuplicateWarning from '@/pages/storeManagement/products/components/DuplicateWarning';
import BrandList from '@/pages/storeManagement/brands/BrandList';
import BrandDetails from '@/pages/storeManagement/brands/BrandDetails';
import CategoryList from '@/pages/storeManagement/categories/CategoryList';
import CategoryDetails from '@/pages/storeManagement/categories/CategoryDetails';
import SubcategoryList from '@/pages/storeManagement/subcategories/SubcategoryList';
import SubcategoryDetails from '@/pages/storeManagement/subcategories/SubcategoryDetails';
import ManufacturerList from '@/pages/storeManagement/manufacturers/ManufacturerList';
import ManufacturerDetails from '@/pages/storeManagement/manufacturers/ManufacturerDetails';
import { listOf, day } from '../previewApi';

const by = (name) => ({ _id: `u-${name}`, name });
const OWNER = by('Ramesh Kumar');
const STAFF = by('Sunita Patil');
const meta = (i) => ({ status: i === 3 ? 'inactive' : 'active', createdBy: OWNER, updatedBy: i % 2 ? STAFF : OWNER, createdAt: day(-30 - i * 7), updatedAt: day(-i) });

const CATEGORIES = [
  ['Dairy', 'Milk, butter, ghee, paneer and curd from Amul, Gokul and Chitale.'],
  ['Staples', 'Atta, rice, dal, sugar and salt sold loose and packed.'],
  ['Edible Oils', 'Sunflower, groundnut, mustard and soybean oil in pouches and tins.'],
  ['Snacks', 'Namkeen, chips and biscuits.'],
].map(([name, description], i) => ({ _id: `cat-c-${i}`, name, description, categoryImage: '', ...meta(i) }));

const SUBCATEGORIES = [
  ['Ghee', 0], ['Butter', 0], ['Wheat Atta', 1], ['Basmati Rice', 1], ['Sunflower Oil', 2],
].map(([name, c], i) => ({ _id: `cat-s-${i}`, name, description: `${name} packs and loose ${name.toLowerCase()} for daily kitchen use.`, categoryImage: '', categoryId: { _id: CATEGORIES[c]._id, name: CATEGORIES[c].name }, ...meta(i) }));

const BRANDS = [
  ['Amul', 'Gujarat Co-operative Milk Marketing Federation brand for milk, butter, cheese and ghee.'],
  ['Aashirvaad', 'Whole wheat atta and spices from ITC.'],
  ['Fortune', 'Edible oils, rice and atta.'],
  ['Haldiram’s', 'Namkeen and sweets.'],
].map(([name, description], i) => ({ _id: `cat-b-${i}`, name, description, logo: '', ...meta(i) }));

const MANUFACTURERS = [
  ['GCMMF, Anand', 'Amul Dairy, Anand, Gujarat 388001. FSSAI 10014021001010.'],
  ['ITC Limited', 'Foods division, Bengaluru.'],
  ['Adani Wilmar Ltd', 'Fortune brand, Ahmedabad.'],
  ['Haldiram Snacks Pvt Ltd', 'Nagpur, Maharashtra.'],
].map(([name, description], i) => ({ _id: `cat-m-${i}`, name, description, logo: '', ...meta(i) }));

const ref = (row) => ({ _id: row._id, name: row.name });
const PRODUCTS = [
  { name: 'Amul Pure Ghee 1 L', sku: 'GHEE-AM1L', barcode: '8901262150019', hsnSacCode: '0405', unit: 'pcs', mrp: 650, basePrice: 630, finalPrice: 630, lastPurchasePrice: 548, currentStock: 24, damagedStock: 1, lowStockAlertThreshold: 10, gst: 12, c: 0, s: 0, b: 0, m: 0, openBatches: 2 },
  { name: 'Aashirvaad Whole Wheat Atta 10 kg', sku: 'ATTA-AS10', barcode: '8901725181109', hsnSacCode: '1101', unit: 'bag', mrp: 520, basePrice: 485, finalPrice: 485, lastPurchasePrice: 430, currentStock: 6, lowStockAlertThreshold: 8, gst: 5, c: 1, s: 2, b: 1, m: 1, openBatches: 1 },
  { name: 'Fortune Sunlite Sunflower Oil 1 L', sku: 'OIL-FS1L', barcode: '', hsnSacCode: '1512', unit: 'pouch', mrp: 175, basePrice: 158, discountedPrice: 152, finalPrice: 152, lastPurchasePrice: 136, currentStock: 0, lowStockAlertThreshold: 12, gst: 5, c: 2, s: 4, b: 2, m: 2 },
  { name: 'Haldiram’s Aloo Bhujia 400 g', sku: 'NAM-HB400', barcode: '8904004400267', hsnSacCode: '2106', unit: 'pack', mrp: 110, basePrice: 105, finalPrice: 105, lastPurchasePrice: 84, currentStock: 48, lowStockAlertThreshold: 15, gst: 12, c: 3, s: 3, b: 3, m: 3, status: 'inactive' },
  { name: 'Amul Butter 500 g', sku: 'BUT-AM500', barcode: '8901262010047', hsnSacCode: '0405', unit: 'pcs', mrp: 285, basePrice: 275, finalPrice: 275, lastPurchasePrice: 245, currentStock: 60, lowStockAlertThreshold: 20, gst: 12, c: 0, s: 1, b: 0, m: 0, openBatches: 3 },
].map(({ c, s, b, m, gst, status, ...p }, i) => ({
  _id: `cat-p-${i}`,
  ...p,
  status: status || 'active',
  shortDescription: i === 0 ? 'Rich aroma, made from fresh cream. Best before 9 months.' : '',
  fullDescription: i === 0 ? 'Amul Pure Ghee is made from fresh cream and has a rich aroma and granular texture.\nStore in a cool and dry place. Do not refrigerate.' : '',
  images: [],
  tags: i === 0 ? ['dairy', 'festive', 'fast-moving'] : [],
  isGstApplicable: true,
  gstRateOverride: gst,
  isGstIncludedInPrice: true,
  reorderQty: 20,
  minOrderQty: 1,
  categoryId: ref(CATEGORIES[c]),
  subCategoryId: ref(SUBCATEGORIES[s]),
  brandId: ref(BRANDS[b]),
  manufacturerId: ref(MANUFACTURERS[m]),
  preferredSupplierId: { _id: 's-annapurna', name: 'Annapurna Wholesale' },
  lastSupplierId: { _id: 's-annapurna', name: 'Annapurna Wholesale' },
  lastPurchaseDate: day(-4 - i),
  alternateUnits: i === 0 ? [{ unit: 'box', factor: 12, barcode: '18901262150016' }] : [],
  createdBy: OWNER,
  updatedBy: i % 2 ? STAFF : OWNER,
  createdAt: day(-60 + i * 5),
  updatedAt: day(-i),
}));

const batchesOf = (p) =>
  Array.from({ length: p.openBatches || 0 }, (_, k) => ({
    _id: `${p._id}-bt${k}`,
    batchNo: `B${2610 + k}-${p.sku.split('-')[0]}`,
    receivedAt: day(-40 + k * 15),
    expiryDate: day(200 + k * 60),
    mrp: p.mrp,
    unitCost: p.lastPurchasePrice - 6 + k * 6,
    sellingPrice: k === 0 ? 0 : p.finalPrice - 5 + k * 5,
    priceIncludesGst: true,
    qtyRemaining: Math.max(1, Math.round(p.currentStock / (k + 2))),
    priceHistory: k === 0 ? [] : [
      { price: p.finalPrice - 10, priceIncludesGst: true, source: 'stock_in', at: day(-40 + k * 15), byName: 'Ramesh Kumar' },
      { price: p.finalPrice - 5 + k * 5, priceIncludesGst: true, source: 'master_apply', at: day(-3), byName: 'Sunita Patil', reason: 'New MRP from supplier' },
    ],
  }));

const pricesOf = (p) => ({
  current: { sellingPrice: p.finalPrice, priceIncludesGst: true, source: 'master', effectiveFrom: day(-20) },
  activeOffer: p._id === 'cat-p-0' ? { type: 'percent', value: 5, startDate: day(-2), endDate: day(8), status: 'active' } : null,
  nextChange: p._id === 'cat-p-0' ? { effectiveFrom: day(12), sellingPrice: p.finalPrice + 15 } : null,
  prices: [
    { _id: `${p._id}-pr0`, effectiveFrom: day(-90), sellingPrice: p.finalPrice - 20, priceIncludesGst: true, status: 'old', createdByName: 'Ramesh Kumar', createdAt: day(-91), note: 'Opening price' },
    { _id: `${p._id}-pr1`, effectiveFrom: day(-20), sellingPrice: p.finalPrice, priceIncludesGst: true, status: 'current', createdByName: 'Ramesh Kumar', createdAt: day(-21), note: 'Supplier rate change' },
  ],
  offers: [],
});

const taxOf = (p) => ({
  current: { gstRate: p.gstRateOverride, effectiveFrom: day(-120) },
  rows: [
    { _id: `${p._id}-tx0`, effectiveFrom: day(-120), gstRate: p.gstRateOverride, status: 'current', createdByName: 'Ramesh Kumar', createdAt: day(-121), note: 'GST 2.0 rates' },
    { _id: `${p._id}-tx1`, effectiveFrom: day(-400), gstRate: 18, status: 'old', createdByName: 'Ramesh Kumar', createdAt: day(-401), note: '' },
  ],
});

const one = (rows, id) => ({ data: rows.find((r) => r._id === id) || rows[0] });
const nameOf = (r) => r.name;

export function answer(url, params = {}) {
  let m;
  if ((m = url.match(/^\/products\/(cat-[^/?]+)\/prices$/))) return { data: pricesOf(one(PRODUCTS, m[1]).data) };
  if ((m = url.match(/^\/products\/(cat-[^/?]+)\/tax-rates$/))) return { data: taxOf(one(PRODUCTS, m[1]).data) };
  if ((m = url.match(/^\/products\/(cat-[^/?]+)$/))) return one(PRODUCTS, m[1]);
  if (url === '/products') return listOf(PRODUCTS, params, [nameOf, (r) => r.sku, (r) => r.barcode]);
  if (url === '/inventory/batches' && String(params.productId || '').startsWith('cat-')) {
    return { data: { batches: batchesOf(one(PRODUCTS, params.productId).data) } };
  }
  // Barcode labels: batches of the catalog samples only (the sales forms keep the default answer).
  if (url.startsWith('/lookups/pricing') && String(params.productIds || '').startsWith('cat-')) {
    const prices = {};
    String(params.productIds).split(',').forEach((id) => {
      const p = one(PRODUCTS, id).data;
      prices[id] = { gstRate: p.gstRateOverride, batches: batchesOf(p) };
    });
    return { data: { prices } };
  }
  const groups = { brands: BRANDS, categories: CATEGORIES, subcategories: SUBCATEGORIES, manufacturers: MANUFACTURERS };
  if ((m = url.match(/^\/(brands|categories|subcategories|manufacturers)(?:\/([^/?]+))?/))) {
    const rows = groups[m[1]];
    if (m[2]) return one(rows, m[2]);
    return listOf(rows, params, [nameOf]);
  }
  return undefined;
}

const el = (Page, props) => createElement(Page, props);

const SIMILAR = [
  { _id: 'cat-p-0', name: 'Amul Pure Ghee 1 L', sku: 'GHEE-AM1L', barcode: '8901262150019', mrp: 650, currentStock: 24, unit: 'pcs', similarity: 0.94, reasons: ['Same brand', 'Name 94% alike'] },
  { _id: 'cat-p-4', name: 'Amul Ghee Pouch 1 L', sku: 'GHEE-AMP1L', mrp: 640, currentStock: 0, unit: 'pcs', similarity: 0.81, reasons: ['Same MRP range'] },
];

export const routes = [
  { path: 'catalog/products', element: el(ProductList) },
  { path: 'catalog/products/view/:id', element: el(ProductDetails) },
  { path: 'catalog/labels', element: el(BarcodeLabels) },
  { path: 'catalog/labels-demo', element: el(Navigate, { to: '/ui-kit/shell/catalog/labels', replace: true, state: { productIds: ['cat-p-0', 'cat-p-2', 'cat-p-4'] } }) },
  { path: 'catalog/import-export', element: el(ProductImportExport) },
  { path: 'catalog/duplicate-warning', element: el(DuplicateWarning, { items: SIMILAR, onDismiss: () => {} }) },
  { path: 'catalog/brands', element: el(BrandList) },
  { path: 'catalog/brands/view/:id', element: el(BrandDetails) },
  { path: 'catalog/categories', element: el(CategoryList) },
  { path: 'catalog/categories/view/:id', element: el(CategoryDetails) },
  { path: 'catalog/subcategories', element: el(SubcategoryList) },
  { path: 'catalog/subcategories/view/:id', element: el(SubcategoryDetails) },
  { path: 'catalog/manufacturers', element: el(ManufacturerList) },
  { path: 'catalog/manufacturers/view/:id', element: el(ManufacturerDetails) },
];
