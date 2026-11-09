import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/utility/Http';

/*
 * Price & GST masters + batches on the sales screens.
 * The server always sets the final price (the SP of the batch the goods come from — else the
 * Price master — + offer + GST master for the document date, capped at that batch's MRP);
 * this file only shows the same figures on screen:
 *  - pricing lookup (GET /lookups/pricing, with the open batches) and a copy of the
 *    server's resolveLinePrice,
 *  - batch list for the "Which batch?" picker (GET /lookups/batches),
 *  - helpers for a typed (manual) price, which needs sales.change_price + a reason.
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round((num(n) + Number.EPSILON) * 100) / 100;
const floor2 = (n) => Math.floor((num(n) + Number.EPSILON) * 100) / 100;

/** GET /lookups/pricing?productIds&date → { prices: { [id]: { sellingPrice, priceIncludesGst, offer, gstRate, cessRate, taxRateId, mrp, batches } } } */
export const getSalesPricingApi = async (productIds = [], date) => {
  const params = { productIds: productIds.join(',') };
  if (date) params.date = date;
  const response = await apiClient.get('/lookups/pricing', { params });
  return response.data;
};

/** GET /lookups/batches?productId → open batches in the order they are sold */
export const getSaleBatchesApi = async (productId) => {
  const response = await apiClient.get('/lookups/batches', { params: { productId } });
  return response.data?.data?.batches || [];
};

/** Base units in one `unit` of the product (1 box = 24 pcs). */
export const unitFactor = (product, unit) => {
  const u = String(unit || '').toLowerCase();
  if (!product || !u || u === String(product.unit || 'pcs').toLowerCase()) return 1;
  const alt = (product.alternateUnits || []).find((a) => String(a.unit).toLowerCase() === u);
  return alt ? num(alt.factor) || 1 : 1;
};

/** Same rule as the server (priceService.resolveLinePrice); the offer passed in is already the one running on the date. */
export const resolveLinePrice = ({ masterPrice, priceIncludesGst = true, batchPrice = null, batchPriceIncludesGst = true, offer = null, clearancePrice = null, mrp = 0, gstRate = 0, qty = 1 }) => {
  const factor = 1 + num(gstRate) / 100;
  const q = num(qty) > 0 ? num(qty) : 1;
  const toExcl = (inclusive, v) => (inclusive ? v / factor : v);
  let priceSource = 'master';
  let listPrice = num(masterPrice);
  let inclusive = priceIncludesGst !== false;
  let discountPercent = 0;
  let discountAmount = 0;
  let offerUsed = null;
  // the batch's own SP replaces the master price; an offer still applies on top
  if (batchPrice !== null && batchPrice !== undefined && num(batchPrice) > 0) {
    priceSource = 'batch';
    listPrice = num(batchPrice);
    inclusive = batchPriceIncludesGst !== false;
  }
  // no selling price (batch or master): sell at the MRP, which includes GST (same as the server)
  if (!(listPrice > 0) && num(mrp) > 0) {
    priceSource = 'mrp';
    listPrice = num(mrp);
    inclusive = true;
  }
  if (clearancePrice !== null && clearancePrice !== undefined && num(clearancePrice) > 0) {
    priceSource = 'clearance';
    listPrice = num(clearancePrice);
    inclusive = true;
  } else if (offer) {
    priceSource = 'offer';
    offerUsed = offer;
    const v = num(offer.value);
    if (offer.type === 'percent') discountPercent = Math.min(100, Math.max(0, v));
    else {
      const perUnitOff = offer.type === 'amount' ? Math.min(v, listPrice) : Math.max(0, listPrice - v);
      discountAmount = round2(toExcl(inclusive, perUnitOff) * q);
    }
  }
  let rateExclGst = round2(toExcl(inclusive, listPrice));
  const gross = rateExclGst * q;
  const discount = discountPercent > 0 ? (gross * discountPercent) / 100 : discountAmount;
  let finalUnitPrice = ((gross - discount) / q) * factor;
  let capped = false;
  if (num(mrp) > 0 && finalUnitPrice > num(mrp) + 0.01) {
    rateExclGst = floor2(num(mrp) / factor);
    discountPercent = 0;
    discountAmount = 0;
    finalUnitPrice = rateExclGst * factor;
    capped = true;
  }
  return { rateExclGst, discountPercent, discountAmount, listPrice, priceSource, capped, offer: offerUsed, finalUnitPrice: round2(finalUnitPrice) };
};

/** Same SP, GST basis, clearance and MRP → the customer pays the same. */
const sameBatchPrice = (a, b) =>
  num(a.sellingPrice) === num(b.sellingPrice) && (a.priceIncludesGst !== false) === (b.priceIncludesGst !== false)
  && num(a.clearancePrice) === num(b.clearancePrice) && num(a.mrp) === num(b.mrp);

/** Do the open batches differ in SP or MRP (→ ask "Which batch?")? */
export const batchesDiffer = (batches = []) => batches.some((b) => !sameBatchPrice(b, batches[0]));

/**
 * The line as the server will price it: rate, discount %, GST and where the price
 * came from — from the picked batch, else the oldest open batch (`useBatches`), else
 * the Price master. A line with a typed price (`priceOverride`) keeps its own rate / discount.
 * `splitHint`: the qty is more than the oldest batch holds and the next batch has another
 * price — the server will split the line by batch.
 */
export const pricedLine = (line, info, product, { useBatches = true } = {}) => {
  if (!line.productId || !info) return line;
  const gst = num(info.gstRate);
  const withTax = { ...line, taxPercent: gst, cessPercent: num(info.cessRate), isGstApplicable: gst > 0 };
  if (line.priceOverride) return { ...withTax, priceSource: 'manual' };
  const factor = unitFactor(product, line.unit);
  const qty = num(line.qty) > 0 ? num(line.qty) : 1;
  const open = useBatches && Array.isArray(info.batches) ? info.batches : [];
  const picked = line.batchId ? open.find((b) => String(b._id) === String(line.batchId)) || null : null;
  const batch = line.batchId ? picked || { sellingPrice: line.batchSp, priceIncludesGst: line.batchSpIncl, mrp: line.batchMrp, clearancePrice: line.batchClearance } : open[0] || null;
  const splitHint = !line.batchId && open.length > 1 && qty * factor > num(open[0].qtyRemaining) + 0.0001 && !sameBatchPrice(open[0], open[1]);
  const r = resolveLinePrice({
    masterPrice: info.sellingPrice,
    priceIncludesGst: info.priceIncludesGst,
    batchPrice: batch && num(batch.sellingPrice) > 0 ? num(batch.sellingPrice) : null,
    batchPriceIncludesGst: batch ? batch.priceIncludesGst !== false : true,
    offer: info.offer,
    clearancePrice: batch?.clearancePrice ?? null,
    mrp: batch && num(batch.mrp) > 0 ? num(batch.mrp) : num(info.mrp),
    gstRate: gst,
    qty: qty * factor,
  });
  const rate = round2(r.rateExclGst * factor);
  // ₹-off / offer-price offers are an amount; shown here as the same % of this line.
  const discountPercent = r.discountPercent > 0 ? r.discountPercent : r.discountAmount > 0 && rate > 0 ? round2((r.discountAmount / (rate * qty)) * 100) : 0;
  return {
    ...withTax,
    rate,
    discountPercent,
    priceSource: r.priceSource,
    mrpCapped: r.capped,
    offer: r.offer,
    listPrice: round2(r.listPrice * factor),
    // the batch the line is priced from (picked, or the oldest one the server will take)
    ...(batch && !line.batchId && open[0] ? { autoBatchLabel: batchLabel(open[0]) } : {}),
    splitHint,
  };
};

/** "Batch B-1013 · SP ₹600 · MRP ₹650 · 11 left" label for a batch. */
export const batchLabel = (b) =>
  [b.batchNo ? `Batch ${b.batchNo}` : 'Batch', num(b.sellingPrice) > 0 ? `SP ₹${num(b.sellingPrice)}` : '', num(b.mrp) > 0 ? `MRP ₹${num(b.mrp)}` : '', `${num(b.qtyRemaining)} left`, num(b.clearancePrice) > 0 ? `clearance ₹${num(b.clearancePrice)}` : '']
    .filter(Boolean)
    .join(' · ');

/** Line fields for a picked batch. */
export const batchFields = (b) => ({
  batchId: b._id,
  batchNo: b.batchNo || '',
  batchMrp: num(b.mrp),
  batchSp: num(b.sellingPrice) > 0 ? num(b.sellingPrice) : null,
  batchSpIncl: b.priceIncludesGst !== false,
  batchClearance: b.clearancePrice ?? null,
  batchLabel: batchLabel(b),
  batchSplit: false,
});

export const NO_BATCH = { batchId: '', batchNo: '', batchMrp: 0, batchSp: null, batchSpIncl: true, batchClearance: null, batchLabel: '' };

/**
 * Everything a sales screen needs for dated pricing.
 *
 * @param {Object} p
 * @param {Array}    p.lineItems       - the screen's line state
 * @param {Function} p.setLineItems
 * @param {string}   p.date            - document date (YYYY-MM-DD)
 * @param {Object}   p.productCache    - productId → product (units, for the unit factor)
 * @param {boolean}  [p.withPrices=true]  - price / offer / GST (not for challans)
 * @param {boolean}  [p.withBatches=true] - "Which MRP?" picker (invoices, challans)
 */
export const useDatedSalesLines = ({ lineItems, setLineItems, date, productCache = {}, withPrices = true, withBatches = true }) => {
  const ids = [...new Set(lineItems.map((l) => l.productId).filter(Boolean).map(String))].sort().join(',');
  // the open batches come with the prices (batch SP / MRP)
  const key = `${ids}|${date || ''}`;
  const [state, setState] = useState({ key: null, data: null });
  const [picker, setPicker] = useState(null); // { index, product, batches }

  useEffect(() => {
    let alive = true;
    const [idList, day] = key.split('|');
    getSalesPricingApi(idList ? idList.split(',') : [], day || undefined)
      .then((res) => {
        if (alive) setState({ key, data: res?.data || null });
      })
      .catch(() => {
        if (alive) setState({ key, data: null });
      });
    return () => {
      alive = false;
    };
  }, [key]);

  const prices = state.data?.prices || {};

  const viewLines = withPrices
    ? lineItems.map((l) => pricedLine(l, prices[String(l.productId)], productCache[String(l.productId)], { useBatches: withBatches }))
    : lineItems;

  /** After a product is put on line `index`: open "Which batch?" when its open batches differ in SP or MRP. */
  const afterProductPicked = useCallback(async (index, product) => {
    if (!withBatches || !product?._id) return;
    try {
      const batches = await getSaleBatchesApi(product._id);
      if (batchesDiffer(batches)) setPicker({ index, product, batches });
    } catch {
      // no picker: the server takes the oldest batch
    }
  }, [withBatches]);

  const pickBatch = (batch) => {
    if (!picker) return;
    const { index } = picker;
    setLineItems((prev) => prev.map((l, i) => (i === index ? { ...l, ...batchFields(batch) } : l)));
    setPicker(null);
  };

  /** Open the picker again for a line (change the batch). */
  const changeBatch = async (index) => {
    const line = lineItems[index];
    if (!line?.productId) return;
    try {
      const batches = await getSaleBatchesApi(line.productId);
      setPicker({ index, product: { _id: line.productId, name: line.productName }, batches });
    } catch {
      // ignore
    }
  };

  /** A rate / discount typed on line `index` (only offered to users with sales.change_price). */
  const editPrice = (index, field, value) => {
    const view = viewLines[index] || {};
    setLineItems((prev) => prev.map((l, i) => (i === index
      ? { ...l, rate: view.rate ?? l.rate, discountPercent: view.discountPercent ?? l.discountPercent, priceOverride: true, [field]: value }
      : l)));
  };

  const setReason = (index, reason) => setLineItems((prev) => prev.map((l, i) => (i === index ? { ...l, priceOverrideReason: reason } : l)));
  const resetPrice = (index) => setLineItems((prev) => prev.map((l, i) => (i === index ? { ...l, priceOverride: false, priceOverrideReason: '' } : l)));
  /** First problem with typed prices (missing reason), or ''. */
  const priceProblem = () => {
    if (!withPrices) return '';
    const bad = lineItems.find((l) => l.productId && l.priceOverride && !String(l.priceOverrideReason || '').trim());
    return bad ? `Give a reason for changing the price of "${bad.productName}".` : '';
  };

  /** Extra payload fields for a line (picked batch, typed price + reason). */
  const payloadExtras = (line) => {
    const out = {};
    if (withBatches && line.batchId) out.batchId = line.batchId;
    if (withPrices && line.priceOverride) {
      out.priceOverride = true;
      out.priceOverrideReason = String(line.priceOverrideReason || '').trim();
    }
    return out;
  };

  return {
    ready: state.key === key,
    viewLines,
    picker,
    closePicker: () => setPicker(null),
    pickBatch,
    afterProductPicked,
    changeBatch,
    editPrice,
    setReason,
    resetPrice,
    priceProblem,
    payloadExtras,
  };
};

/**
 * Line fields kept from a saved document line (edit a draft).
 * A batch the user picked stays picked; a batch the server planned (`batchAuto`) is planned
 * again on save. `batchSplit`: this line is one part of a qty split by batch.
 */
export const datedFieldsFromSaved = (item) => {
  const took = Array.isArray(item.batches) && item.batches[0] ? item.batches[0] : null;
  const picked = item.batchId && !item.batchAuto;
  return {
    priceOverride: item.priceSource === 'manual',
    priceOverrideReason: item.priceOverrideReason || '',
    batchSplit: !!item.batchSplit,
    ...(picked
      ? {
          batchId: item.batchId?._id || item.batchId,
          batchNo: took?.batchNo || '',
          batchLabel: took ? batchLabel({ ...took, qtyRemaining: took.qty }).replace(/ · [\d.]+ left$/, '') : 'Picked batch',
          batchMrp: num(took?.mrp),
          batchSp: took && num(took.sellingPrice) > 0 ? num(took.sellingPrice) : null,
          batchSpIncl: took ? took.priceIncludesGst !== false : true,
          batchClearance: null,
        }
      : NO_BATCH),
  };
};
