import { num, round2 } from './helpers';

/*
 * Shared look + maths of the purchase item tables (PO, bill, return):
 * bordered columns, cost price before GST, GST from the product, price incl. GST,
 * profit on SP (or MRP) and an Amount column that can show amounts with or without GST.
 */

import { CELL_INPUT as UI_CELL_INPUT, LINE_TD, LINE_TH } from '@/components/ui/styles';

// Soft UI table look (shared with every document form).
export const TH = LINE_TH;
export const TD = LINE_TD;
export const CELL_INPUT = UI_CELL_INPUT;

/** Unit price with GST, after a line discount %. */
export const priceInclGst = (rate, taxPercent, discountPercent = 0) =>
  round2(num(rate) * (1 - num(discountPercent) / 100) * (1 + num(taxPercent) / 100));

/**
 * Profit per piece: SP − cost incl. GST, or MRP − cost incl. GST when no SP is given.
 * @returns {{ basis: 'SP'|'MRP', perUnit: number } | null}
 */
export const profitPerPiece = (sp, mrp, costInclPerPiece) => {
  if (num(sp) > 0) return { basis: 'SP', perUnit: round2(num(sp) - num(costInclPerPiece)) };
  if (num(mrp) > 0) return { basis: 'MRP', perUnit: round2(num(mrp) - num(costInclPerPiece)) };
  return null;
};

/** Line amounts before / with GST (after a line discount %). */
export const lineValue = (qty, rate, taxPercent, discountPercent = 0) => {
  const excl = round2(num(qty) * num(rate) * (1 - num(discountPercent) / 100));
  const gst = round2((excl * num(taxPercent)) / 100);
  return { excl, gst, incl: round2(excl + gst) };
};

/** Sum of { excl, gst, incl, profit, qty } rows. */
export const sumRows = (rows) =>
  rows.reduce(
    (t, r) => ({
      qty: round2(t.qty + num(r.qty)),
      excl: round2(t.excl + num(r.excl)),
      gst: round2(t.gst + num(r.gst)),
      incl: round2(t.incl + num(r.incl)),
      profit: round2(t.profit + num(r.profit)),
      hasProfit: t.hasProfit || r.profit !== null,
    }),
    { qty: 0, excl: 0, gst: 0, incl: 0, profit: 0, hasProfit: false }
  );
