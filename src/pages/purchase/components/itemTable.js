import { num, round2 } from './helpers';

/*
 * Shared look + maths of the purchase item tables (PO, GRN, bill, return):
 * bordered columns, cost price before GST, GST from the product, price incl. GST,
 * profit on SP (or MRP) and an Amount column that can show amounts with or without GST.
 */

export const TH = 'py-2.5 px-2 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] border border-[var(--vs-border)] whitespace-nowrap';
export const TD = 'py-2 px-2 align-top border border-[var(--vs-border)]';
export const CELL_INPUT =
  'h-9 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 text-sm text-gray-900 dark:!text-white outline-none focus:border-indigo-500/60 disabled:opacity-60';

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

/** GST of a saved GRN line (older receipts have no taxAmount: work it out). */
export const grnLineTax = (l) => (l.taxAmount !== undefined && l.taxAmount !== null ? num(l.taxAmount) : round2((num(l.value) * num(l.taxPercent)) / 100));

/** Before GST / GST / with GST of a saved GRN (falls back for receipts saved before GST was kept). */
export const grnTotals = (g) => {
  const excl = num(g.totalValue);
  const gst = g.totalTax !== undefined && g.totalTax !== null ? num(g.totalTax) : round2((g.items || []).reduce((s, l) => s + grnLineTax(l), 0));
  return { excl, gst, incl: g.totalWithTax !== undefined && g.totalWithTax !== null ? num(g.totalWithTax) : round2(excl + gst) };
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
