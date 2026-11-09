import { useEffect, useState } from 'react';
import apiClient from '@/utility/Http';
import { num, round2, toInputDate } from './helpers';
import { BLOCKING } from './barcodeCheck';

/*
 * New-batch fields on stock-in lines (GRN, direct purchase bill, opening stock),
 * used only while the shop's dated pricing switch is on:
 *   expiry (batch-tracked products) · MRP (required) · SP + margin % · barcode (the batch no is automatic).
 * MRP and SP are per BASE unit (per pc), like the product MRP and the Price master.
 * SP is sent only when the user changed it; the server then makes it the price
 * from today (after the user confirms the change).
 */

/** GET /lookups/pricing?productIds=a,b → { canUpdatePrices, prices } (any staff). */
export const getStockInPricingApi = async (productIds = []) => {
  const response = await apiClient.get('/lookups/pricing', { params: { productIds: productIds.join(',') } });
  return response.data;
};

/**
 * Pricing facts for the products on a stock-in form.
 * @returns {{ canUpdatePrices, prices: Object<string, Object>, ready }}
 */
export const useStockInPricing = (productIds = []) => {
  const key = [...new Set(productIds.filter(Boolean).map(String))].sort().join(',');
  const [state, setState] = useState({ key: null, data: null });

  useEffect(() => {
    let cancelled = false;
    getStockInPricingApi(key ? key.split(',') : [])
      .then((res) => {
        if (!cancelled) setState({ key, data: res?.data || null });
      })
      .catch(() => {
        if (!cancelled) setState({ key, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const data = state.data;
  return {
    canUpdatePrices: !!data?.canUpdatePrices,
    prices: data?.prices || {},
    ready: state.key !== null,
  };
};

/** Empty new-batch fields for a line of product `p` (a lookup row). */
export const stockInFields = (p) => ({
  expiryDate: '',
  mrp: '',
  mrpTouched: false,
  sellingPrice: '',
  spTouched: false,
  setAsDefault: false, // "Also make default price"
  trackBatch: !!p?.trackBatch,
  defaultMrp: num(p?.mrp),
  // barcode: the product's; locked while it has stock under it (one barcode per product)
  barcode: p?.barcode || '',
  barcodeLocked: !!p?.hasLiveStock && !!p?.barcode,
  barcodeCheck: null, // { code, status, tone, text } from barcodeCheck.runBarcodeCheck
});

/** New-batch fields from a saved line (draft being edited). */
export const stockInFromSaved = (item) => {
  const p = item.productId && typeof item.productId === 'object' ? item.productId : null;
  return {
    expiryDate: toInputDate(item.expiryDate),
    mrp: num(item.mrp) > 0 ? num(item.mrp) : '',
    mrpTouched: num(item.mrp) > 0,
    sellingPrice: num(item.sellingPrice) > 0 ? num(item.sellingPrice) : '',
    spTouched: num(item.sellingPrice) > 0,
    setAsDefault: !!item.setAsDefault,
    trackBatch: !!p?.trackBatch,
    defaultMrp: num(p?.mrp),
    barcode: item.barcode || '',
    barcodeLocked: false,
    barcodeCheck: null,
  };
};

/**
 * Barcode problems of a stock-in document: { [line.key]: message }. A line's live check
 * (in use / on hold / locked), one product with two codes, one code on two products.
 */
export const barcodeProblems = (lines) => {
  const out = {};
  const used = lines.filter((l) => l.productId);
  const codeOf = (l) => String(l.barcode || '').trim();
  used.forEach((l) => {
    const c = codeOf(l);
    if (c && l.barcodeCheck && l.barcodeCheck.code === c && BLOCKING.includes(l.barcodeCheck.status)) out[l.key] = `Barcode ${c}: ${l.barcodeCheck.text}`;
  });
  used.forEach((l) => {
    const c = codeOf(l);
    if (!c) return;
    const sameProduct = used.find((o) => o.key !== l.key && o.productId === l.productId && codeOf(o) && codeOf(o) !== c);
    if (sameProduct) out[l.key] = out[l.key] || `"${l.productName}" has two barcodes here — one product keeps one barcode`;
    const otherProduct = used.find((o) => o.productId !== l.productId && codeOf(o) === c);
    if (otherProduct) out[l.key] = out[l.key] || `Barcode ${c} is also on "${otherProduct.productName}"`;
  });
  return out;
};

/** First barcode problem (blocks Save & Receive / Save bill; drafts may still be saved). */
export const firstBarcodeProblem = (lines) => Object.values(barcodeProblems(lines))[0] || '';

/** MRP shown in the cell: typed, else the last batch MRP, else the product's default MRP. */
export const shownMrp = (line, info) => {
  if (line.mrpTouched) return line.mrp;
  const fallback = num(info?.lastBatchMrp) || num(line.defaultMrp) || num(info?.mrp);
  return fallback > 0 ? fallback : '';
};

/** SP shown in the cell: typed, else today's Price master price. */
export const shownSp = (line, info) => (line.spTouched ? line.sellingPrice : info ? num(info.sellingPrice) : '');

/** Did the user change the SP away from today's price? */
export const spChanged = (line, info) =>
  !!info && line.spTouched && num(line.sellingPrice) > 0 && Math.abs(num(line.sellingPrice) - num(info.sellingPrice)) >= 0.005;

const spWithGst = (sp, info) => (info?.priceIncludesGst !== false ? sp : sp * (1 + num(info?.gstRate) / 100));

/** Margin % = (SP excl. GST − cost) / SP excl. GST, or null when unknown. */
export const marginPercent = (sp, info, costPerBase) => {
  const s = num(sp);
  if (!(s > 0) || !info) return null;
  const excl = info.priceIncludesGst !== false ? s / (1 + num(info.gstRate) / 100) : s;
  if (!(excl > 0)) return null;
  return round2(((excl - num(costPerBase)) / excl) * 100);
};

/**
 * Figures shown next to SP / MRP on a stock-in line (per pc):
 * GST from the product (GST master), SP with / without GST, discount the
 * customer gets off the MRP, and profit over the cost.
 * @returns {{ gstRate, spIncl, spExcl, gstAmount, discountAmount, discountPercent, profit, profitPercent } | null}
 */
export const priceCheck = (line, info, costPerBase) => {
  if (!line.productId) return null;
  const gstRate = num(info?.gstRate);
  const sp = num(shownSp(line, info));
  const mrp = num(shownMrp(line, info));
  const inclusive = info?.priceIncludesGst !== false;
  const spIncl = sp > 0 ? round2(inclusive ? sp : sp * (1 + gstRate / 100)) : 0;
  const spExcl = sp > 0 ? round2(inclusive ? sp / (1 + gstRate / 100) : sp) : 0;
  const discountAmount = mrp > 0 && spIncl > 0 ? round2(mrp - spIncl) : null;
  const profit = spExcl > 0 ? round2(spExcl - num(costPerBase)) : null;
  return {
    gstRate,
    inclusive,
    spIncl,
    spExcl,
    gstAmount: round2(spIncl - spExcl),
    discountAmount,
    discountPercent: discountAmount !== null && mrp > 0 ? round2((discountAmount / mrp) * 100) : null,
    profit,
    profitPercent: profit !== null && spExcl > 0 ? round2((profit / spExcl) * 100) : null,
  };
};

/**
 * Checks for one stock-in line.
 * @returns {{ error: string, warning: string, hint: string }}
 */
export const stockInCheck = (line, info, costPerBase) => {
  const out = { error: '', warning: '', hint: '' };
  if (!line.productId) return out;
  const mrp = num(shownMrp(line, info));
  const sp = num(shownSp(line, info));
  if (!(mrp > 0)) out.error = `Enter the MRP for "${line.productName}".`;
  else if (sp > 0 && spWithGst(sp, info) > mrp + 0.005) out.error = `Selling price of "${line.productName}" is above its MRP ₹${mrp}.`;
  if (mrp > 0 && num(costPerBase) > mrp) out.warning = 'Cost is above MRP';
  if (num(info?.lastBatchMrp) > 0 && mrp > num(info.lastBatchMrp) + 0.005) out.hint = `MRP went up from ₹${num(info.lastBatchMrp)} — update SP?`;
  return out;
};

/** Payload fields for one stock-in line (barcode, expiry, MRP, changed SP; the batch no is automatic). */
export const stockInPayload = (line, info) => ({
  barcode: String(line.barcode || '').trim(),
  expiryDate: line.expiryDate || null,
  mrp: num(shownMrp(line, info)),
  // SP of this new batch; with the tick it also becomes the default price from today
  ...(spChanged(line, info) ? { sellingPrice: num(line.sellingPrice), ...(line.setAsDefault ? { setAsDefault: true } : {}) } : {}),
});

/** Lines whose SP also becomes the default price (tick on): [{ key, name, oldPrice, newPrice }] for the confirm list. */
export const priceChangesOf = (lines, prices) =>
  lines
    .filter((l) => l.productId && l.setAsDefault && spChanged(l, prices[String(l.productId)]))
    .map((l) => ({ key: l.key, name: l.productName, oldPrice: num(prices[String(l.productId)].sellingPrice), newPrice: num(l.sellingPrice) }));
