// Dev-only sample API answers and preview routes for the U6 master pages (/ui-kit/shell/...).
// answer(url, params) returns the response body, or undefined to let the next fixture / default answer.
// routes: [{ path, element }] mounted under /ui-kit/shell (element built with createElement, no JSX here).
//
// Saves (and the POST previews) are refused on /ui-kit, so the preview tables and the history
// components also get routes of their own with sample rows. The "-filled" routes pick products,
// type values and press buttons a moment after the page mounts (AutoFill below), to show the
// batch table, the error states and the confirm dialog without a manual click.
import { createElement, useEffect } from 'react';
import { Section } from '@/components/ui';
import GstRates from '@/pages/masterSettings/GstRates';
import PricesOffers from '@/pages/masterSettings/PricesOffers';
import ChangeHistory from '@/pages/masterSettings/components/ChangeHistory';
import GstHistory from '@/pages/masterSettings/components/GstHistory';
import PriceHistory from '@/pages/masterSettings/components/PriceHistory';
import GstPreviewTable from '@/pages/masterSettings/components/GstPreviewTable';
import PricePreviewTable from '@/pages/masterSettings/components/PricePreviewTable';
import useProductPricing from '@/pages/masterSettings/components/useProductPricing';
import { PreviewChips } from '@/pages/masterSettings/components/formBits';
import { day, listOf } from '../previewApi';

const el = createElement;

/* ── sample data (built inside functions so dates stay fresh) ── */

const products = () => [
  { _id: 'ms-oil', name: 'Fortune Sunflower Oil 1 L', sku: 'OIL-FT1', barcode: '8906007280017', isGstApplicable: true, gstRateOverride: 5, gst: { current: 5 }, mrp: 185, sellingPrice: 172 },
  { _id: 'ms-ghee', name: 'Amul Pure Ghee 1 L', sku: 'GHEE-AM1', barcode: '8901262150019', isGstApplicable: true, gstRateOverride: 12, gst: { current: 12, next: { gstRate: 5, effectiveFrom: day(9) } }, mrp: 650, sellingPrice: 625 },
  { _id: 'ms-parle', name: 'Parle-G Gold Biscuits 1 kg', sku: 'BIS-PG1', barcode: '8901719110016', isGstApplicable: true, gstRateOverride: 18, gst: { current: 18 }, mrp: 160, sellingPrice: 150 },
  { _id: 'ms-atta', name: 'Aashirvaad Whole Wheat Atta 10 kg', sku: 'ATTA-AS10', barcode: '8901725181109', isGstApplicable: true, gstRateOverride: 5, gst: { current: 5 }, mrp: 545, sellingPrice: 510 },
  { _id: 'ms-tea', name: 'Tata Tea Gold 500 g', sku: 'TEA-TG500', barcode: '8901052002519', isGstApplicable: true, gstRateOverride: 5, gst: { current: 5 }, mrp: 330, sellingPrice: 315 },
  { _id: 'ms-dettol', name: 'Dettol Original Soap 4 × 125 g', sku: 'SOAP-DT4', barcode: '8901396393714', isGstApplicable: true, gstRateOverride: 18, gst: { current: 18 }, mrp: 220, sellingPrice: 205 },
];
const byId = (id) => products().find((p) => p._id === id) || products()[0];
const ref = (p) => ({ _id: p._id, name: p.name, sku: p.sku, images: [] });

const BATCHES = {
  'ms-oil': [
    { _id: 'b-oil-1', batchNo: 'FT2409A', receivedAt: day(-40), expiryDate: day(140), qtyRemaining: 36, mrp: 185, sellingPrice: 172 },
    { _id: 'b-oil-2', batchNo: 'FT2410C', receivedAt: day(-8), expiryDate: day(200), qtyRemaining: 48, mrp: 189, sellingPrice: 175 },
  ],
  'ms-ghee': [{ _id: 'b-ghee-1', batchNo: 'AM-G-1187', receivedAt: day(-21), expiryDate: day(160), qtyRemaining: 12, mrp: 650, sellingPrice: 625 }],
  'ms-parle': [],
  'ms-atta': [{ _id: 'b-atta-1', batchNo: 'AS10-0925', receivedAt: day(-15), expiryDate: day(75), qtyRemaining: 9, mrp: 545, sellingPrice: 0 }],
};

const pricingOf = (ids = '') =>
  Object.fromEntries(
    String(ids)
      .split(',')
      .filter((id) => id.startsWith('ms-'))
      .map((id) => {
        const p = byId(id);
        return [
          id,
          {
            sellingPrice: id === 'ms-parle' ? 0 : p.sellingPrice,
            priceIncludesGst: true,
            gstRate: p.gst.current,
            cessRate: 0,
            mrp: p.mrp,
            offer: null,
            batches: (BATCHES[id] || []).map((b) => ({ ...b, priceIncludesGst: true })),
          },
        ];
      })
  );

const gstHistoryRows = () => {
  const [oil, ghee, parle, atta, tea, dettol] = products();
  return [
    { _id: 'gh-1', product: ref(ghee), effectiveFrom: day(9), gstRate: 5, oldGstRate: 12, status: 'upcoming', changedBy: 'Rahul Patil', changedAt: day(-1), canDelete: true, note: 'GST council notification, 22 Sep 2026' },
    { _id: 'gh-2', product: ref(oil), effectiveFrom: day(-30), gstRate: 5, oldGstRate: 12, status: 'current', changedBy: 'Sneha Kulkarni', changedAt: day(-32), canDelete: false, note: '' },
    { _id: 'gh-3', product: ref(parle), effectiveFrom: day(-30), gstRate: 18, oldGstRate: 12, status: 'current', changedBy: 'Sneha Kulkarni', changedAt: day(-32), canDelete: false, note: 'Rate revision', replaced: 1 },
    { _id: 'gh-4', product: ref(atta), effectiveFrom: day(-120), gstRate: 5, oldGstRate: 0, status: 'old', changedBy: 'Owner', changedAt: day(-121), canDelete: false, note: 'Branded atta now taxable' },
    { _id: 'gh-5', product: ref(tea), effectiveFrom: day(-200), gstRate: 5, oldGstRate: null, status: 'current', changedBy: 'Owner', changedAt: day(-200), canDelete: false, note: '' },
    { _id: 'gh-6', product: ref(dettol), effectiveFrom: day(-200), gstRate: 18, oldGstRate: 28, status: 'current', changedBy: 'Owner', changedAt: day(-200), canDelete: false, note: '' },
  ];
};

const priceHistoryRows = () => {
  const [oil, ghee, parle, atta] = products();
  return [
    { _id: 'ph-1', product: ref(oil), effectiveFrom: day(3), sellingPrice: 169, oldPrice: 172, priceIncludesGst: true, status: 'upcoming', source: 'bulk', changedBy: 'Rahul Patil', changedAt: day(0), canDelete: true },
    { _id: 'ph-2', product: ref(ghee), effectiveFrom: day(-6), sellingPrice: 625, oldPrice: 610, priceIncludesGst: true, status: 'current', source: 'purchase', sourceRef: { type: 'PurchaseBill', number: 'PB-2026-0412' }, changedBy: 'Sneha Kulkarni', changedAt: day(-6), canDelete: false },
    { _id: 'ph-3', product: ref(parle), effectiveFrom: day(-20), sellingPrice: 150, oldPrice: 145, priceIncludesGst: true, status: 'current', source: 'manual', changedBy: 'Owner', changedAt: day(-20), canDelete: false },
    { _id: 'ph-4', product: ref(atta), effectiveFrom: day(-45), sellingPrice: 510, oldPrice: 525, priceIncludesGst: false, status: 'old', source: 'opening_stock', changedBy: 'Owner', changedAt: day(-45), canDelete: false },
  ];
};

const offerHistoryRows = () => {
  const [oil, ghee, parle, , tea] = products();
  return [
    { _id: 'oh-1', product: ref(oil), type: 'percent', value: 5, startDate: day(-2), endDate: day(4), status: 'active', changedBy: 'Rahul Patil', changedAt: day(-3), canCancel: true },
    { _id: 'oh-2', product: ref(ghee), type: 'amount', value: 25, startDate: day(5), endDate: day(12), status: 'upcoming', changedBy: 'Owner', changedAt: day(-1), canCancel: true },
    { _id: 'oh-3', product: ref(tea), type: 'fixed', value: 299, startDate: day(-30), endDate: day(-23), status: 'expired', changedBy: 'Owner', changedAt: day(-31), canCancel: false },
    { _id: 'oh-4', product: ref(parle), type: 'percent', value: 10, startDate: day(-15), endDate: day(-10), status: 'cancelled', changedBy: 'Sneha Kulkarni', changedAt: day(-16), canCancel: false },
  ];
};

const taxRatesOf = (id) => {
  const p = byId(id);
  return {
    product: ref(p),
    current: { gstRate: 12, cessRate: 0, effectiveFrom: day(-90), source: 'master' },
    hasMasterRows: true,
    rows: [
      { _id: 'tr-1', effectiveFrom: day(9), gstRate: 5, cessRate: 0, status: 'upcoming', createdByName: 'Rahul Patil', createdAt: day(-1), note: 'GST council notification, 22 Sep 2026' },
      {
        _id: 'tr-2', effectiveFrom: day(-90), gstRate: 12, cessRate: 0, status: 'current', createdByName: 'Sneha Kulkarni', createdAt: day(-92), note: 'Rate revision',
        previous: [{ gstRate: 18, createdByName: 'Owner', replacedAt: day(-92), replacedByName: 'Sneha Kulkarni' }],
      },
      { _id: 'tr-3', effectiveFrom: day(-400), gstRate: 18, cessRate: 0, status: 'old', createdByName: 'Owner', createdAt: day(-400), note: '' },
    ],
  };
};

const pricingHistoryOf = (id) => {
  const p = byId(id);
  return {
    product: ref(p),
    current: { sellingPrice: p.sellingPrice, priceIncludesGst: true },
    activeOffer: null,
    nextChange: null,
    prices: [
      { _id: 'pp-1', effectiveFrom: day(3), sellingPrice: 169, priceIncludesGst: true, status: 'upcoming', source: 'bulk', createdByName: 'Rahul Patil', createdAt: day(0), note: 'Distributor rate cut' },
      {
        _id: 'pp-2', effectiveFrom: day(-8), sellingPrice: 172, priceIncludesGst: true, status: 'current', source: 'purchase', sourceRef: { type: 'GoodsReceipt', number: 'GRN-0187' },
        createdByName: 'Sneha Kulkarni', createdAt: day(-8), note: '', previous: [{ sellingPrice: 170 }],
      },
      { _id: 'pp-3', effectiveFrom: day(-60), sellingPrice: 165, priceIncludesGst: false, status: 'old', source: 'manual', createdByName: 'Owner', createdAt: day(-60), note: 'Opening price' },
    ],
    offers: [
      { _id: 'po-1', type: 'percent', value: 5, startDate: day(-2), endDate: day(4), status: 'active', createdByName: 'Rahul Patil', createdAt: day(-3), note: 'Diwali sale' },
      { _id: 'po-2', type: 'amount', value: 10, startDate: day(10), endDate: day(14), status: 'upcoming', createdByName: 'Owner', createdAt: day(-1), note: '' },
      { _id: 'po-3', type: 'fixed', value: 159, startDate: day(-40), endDate: day(-33), status: 'cancelled', cancelledByName: 'Owner', createdByName: 'Owner', createdAt: day(-41), note: '' },
    ],
  };
};

const SEARCH = [(r) => r.product.name, (r) => r.product.sku, (r) => r.note, (r) => r.changedBy];

export function answer(url, params = {}) {
  let m;
  if (url.startsWith('/lookups/products') && params.withGst) {
    const q = String(params.q || '').toLowerCase();
    return { data: products().filter((p) => !q || [p.name, p.sku, p.barcode].some((f) => f.toLowerCase().includes(q))) };
  }
  if (url.startsWith('/lookups/pricing') && String(params.productIds || '').startsWith('ms-')) {
    return { success: true, data: { canUpdatePrices: true, prices: pricingOf(params.productIds) } };
  }
  if (url === '/products/tax-rates/history') return listOf(gstHistoryRows(), params, SEARCH);
  if (url === '/products/prices/history') return listOf(priceHistoryRows(), params, SEARCH);
  if (url === '/products/offers/history') return listOf(offerHistoryRows(), params, SEARCH);
  if ((m = url.match(/^\/products\/(ms-[^/?]+)\/tax-rates$/))) return { data: taxRatesOf(m[1]) };
  if ((m = url.match(/^\/products\/(ms-[^/?]+)\/prices$/))) return { data: pricingHistoryOf(m[1]) };
  return undefined;
}

/* ── preview pages ── */

const GST_PREVIEW_ROWS = [
  { productId: 'ms-oil', name: 'Fortune Sunflower Oil 1 L', sku: 'OIL-FT1', oldGstRate: 5, newGstRate: 12, sellingPriceIncl: 172, costIncl: 158.76, mrp: 185, profit: 13.24, changed: true },
  { productId: 'ms-ghee', name: 'Amul Pure Ghee 1 L', sku: 'GHEE-AM1', oldGstRate: 12, newGstRate: 12, sellingPriceIncl: 625, costIncl: 588, mrp: 650, profit: 37, changed: false, replaces: true },
  { productId: 'ms-parle', name: 'Parle-G Gold Biscuits 1 kg', sku: 'BIS-PG1', oldGstRate: 18, newGstRate: 12, sellingPriceIncl: 150, costIncl: 150, mrp: 160, profit: 0, changed: true, warning: 'Selling price equals the cost incl. GST' },
  { productId: 'ms-atta', name: 'Aashirvaad Whole Wheat Atta 10 kg', sku: 'ATTA-AS10', oldGstRate: 5, newGstRate: 12, sellingPriceIncl: 571.2, costIncl: 502.32, mrp: 545, profit: 68.88, changed: true, error: 'Selling price incl. GST ₹571.20 is above the MRP ₹545' },
  { productId: 'ms-tea', name: 'Tata Tea Gold 500 g', sku: 'TEA-TG500', oldGstRate: 5, newGstRate: 12, sellingPriceIncl: null, costIncl: null, mrp: 330, profit: null, skip: true, skipReason: 'A GST rate is already set for this day' },
];
const PRICE_PREVIEW_ROWS = [
  { productId: 'ms-oil', name: 'Fortune Sunflower Oil 1 L', sku: 'OIL-FT1', oldPrice: 172, newPrice: 169, priceIncludesGst: true, changed: true },
  { productId: 'ms-ghee', name: 'Amul Pure Ghee 1 L', sku: 'GHEE-AM1', oldPrice: 625, newPrice: 615, priceIncludesGst: true, changed: true, replaces: true },
  { productId: 'ms-parle', name: 'Parle-G Gold Biscuits 1 kg', sku: 'BIS-PG1', oldPrice: 150, newPrice: 150, priceIncludesGst: false, changed: false },
  { productId: 'ms-tea', name: 'Tata Tea Gold 500 g', sku: 'TEA-TG500', oldPrice: 315, newPrice: 315, skip: true, skipReason: 'No selling price set yet' },
];
const OFFER_PREVIEW_ROWS = [
  { productId: 'ms-oil', name: 'Fortune Sunflower Oil 1 L', sku: 'OIL-FT1', price: 172, offerPrice: 163.4 },
  { productId: 'ms-ghee', name: 'Amul Pure Ghee 1 L', sku: 'GHEE-AM1', price: 625, offerPrice: 593.75 },
  { productId: 'ms-tea', name: 'Tata Tea Gold 500 g', sku: 'TEA-TG500', price: 315, offerPrice: 315, skip: true, skipReason: 'Already has an offer on these days' },
];

function Previews() {
  const productsById = Object.fromEntries(products().map((p) => [p._id, p]));
  return el(
    'div',
    { className: 'flex flex-col gap-5' },
    el(
      Section,
      { title: 'GST preview', description: 'GstPreviewTable — bills from 3 Nov 2026' },
      el('div', { className: 'flex flex-col gap-3' }, el(PreviewChips, { chips: [{ label: 'New rate: 3', tone: 'green' }, { label: 'GST changes: 3', tone: 'amber' }, { label: 'Skipped: 1', tone: 'gray' }, { label: 'Above MRP: 1', tone: 'red' }] }), el(GstPreviewTable, { rows: GST_PREVIEW_ROWS, productsById }))
    ),
    el(Section, { title: 'Price preview', description: 'PricePreviewTable' }, el(PricePreviewTable, { rows: PRICE_PREVIEW_ROWS, productsById })),
    el(Section, { title: 'Offer preview', description: 'PricePreviewTable offer' }, el(PricePreviewTable, { rows: OFFER_PREVIEW_ROWS, productsById, offer: true })),
    el(Section, { title: 'Empty preview' }, el(GstPreviewTable, { rows: [] }))
  );
}

function Histories() {
  const pricing = useProductPricing('ms-oil');
  return el(
    'div',
    { className: 'flex flex-col gap-5' },
    el(Section, { title: 'GST History', description: 'GstHistory (with delete)' }, el(GstHistory, { productId: 'ms-ghee', notify: () => {} })),
    el(Section, { title: 'Price & Offers', description: 'PriceHistory (with delete / cancel)' }, el(PriceHistory, { productId: 'ms-oil', data: pricing.data, loading: pricing.loading, error: pricing.error, onChanged: pricing.reload, notify: () => {} })),
    el(Section, { title: 'Price & Offers — error state' }, el(PriceHistory, { productId: 'ms-oil', data: null, loading: false, error: 'Could not load the prices', onChanged: () => {} }))
  );
}

function ChangeHistories() {
  return el(
    'div',
    { className: 'flex flex-col gap-5' },
    el(ChangeHistory, { kind: 'gst' }),
    el(ChangeHistory, { kind: 'price' }),
    el(ChangeHistory, { kind: 'offer' })
  );
}

/* ── AutoFill: scripted clicks / typing for the "-filled" routes ── */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const setValue = (input, value) => {
  if (!input) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const byText = (sel, text) => $$(sel).find((n) => n.textContent.trim().startsWith(text));
const S = {
  focus: (sel) => () => $(sel)?.focus(),
  option: (i) => () => $$('[role="option"]')[i]?.click(),
  closeMenus: () => () => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })),
  click: (sel, text) => () => (text ? byText(sel, text) : $(sel))?.click(),
  mouseDownOption: (text) => () => byText('[role="option"]', text)?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })),
  type: (sel, value, i = 0) => () => setValue($$(sel)[i], value),
};

function AutoFill({ page, steps }) {
  useEffect(() => {
    let at = 0;
    const timers = steps.map(([delay, fn]) => setTimeout(fn, (at += delay)));
    return () => timers.forEach(clearTimeout);
  }, [steps]);
  return el(page);
}

const pickProducts = (inputSel, picks) => [
  [600, S.focus(inputSel)],
  ...picks.map((i) => [700, S.option(i)]),
  [300, S.closeMenus()],
];

const PRICE_FILLED = [
  ...pickProducts('#price-products', [0, 1, 3]),
  [1200, S.type('table input[type="number"]', '169', 0)],
  [200, S.click('table input[type="checkbox"]')],
  [200, S.type('#price-all-value', '5')],
];
// Tick the ghee batch and give it a price above its MRP.
const PRICE_ABOVE_MRP = [...PRICE_FILLED, [300, () => $$('table input[type="checkbox"]')[3]?.click()], [300, S.type('table input[type="number"]', '680', 4)], [300, S.click('button', 'Save')]];
const PRICE_CONFIRM = [...PRICE_FILLED, [300, S.type('table input[type="number"]', '640', 3)], [300, S.click('button', 'Save')]];

const GST_FILLED = [
  ...pickProducts('#gst-products', [0, 2, 4]),
  [400, S.click('#gst-rate')],
  [500, S.mouseDownOption('18%')],
  [200, S.type('#gst-note', 'GST council notification, 22 Sep 2026')],
  [300, S.click('button', 'Preview')],
];
const GST_EMPTY_SUBMIT = [[600, S.click('button', 'Preview')]];

const OFFER_FILLED = [
  [400, S.click('[role="radio"]', 'Add offer')],
  ...pickProducts('#offer-products', [0, 1]),
  [300, S.click('[role="radio"]', '₹ off')],
  [200, S.type('#offer-value', '0.555')],
];
const OFFER_PREVIEW = [...OFFER_FILLED.slice(0, -1), [200, S.type('#offer-value', '10')], [300, S.click('button', 'Preview')]];

const HISTORY_TAB = [[400, S.click('[role="radio"]', 'Price & offer history')], [600, S.click('[role="radio"]', 'Offers')]];

export const routes = [
  { path: 'master/gst-rates', element: el(GstRates) },
  { path: 'master/gst-rates-filled', element: el(AutoFill, { page: GstRates, steps: GST_FILLED }) },
  { path: 'master/gst-rates-errors', element: el(AutoFill, { page: GstRates, steps: GST_EMPTY_SUBMIT }) },
  { path: 'master/prices-offers', element: el(PricesOffers) },
  { path: 'master/price-change-filled', element: el(AutoFill, { page: PricesOffers, steps: PRICE_ABOVE_MRP }) },
  { path: 'master/price-change-confirm', element: el(AutoFill, { page: PricesOffers, steps: PRICE_CONFIRM }) },
  { path: 'master/offer-filled', element: el(AutoFill, { page: PricesOffers, steps: OFFER_FILLED }) },
  { path: 'master/offer-preview', element: el(AutoFill, { page: PricesOffers, steps: OFFER_PREVIEW }) },
  { path: 'master/offer-history', element: el(AutoFill, { page: PricesOffers, steps: HISTORY_TAB }) },
  { path: 'master/previews', element: el(Previews) },
  { path: 'master/histories', element: el(Histories) },
  { path: 'master/change-history', element: el(ChangeHistories) },
];
