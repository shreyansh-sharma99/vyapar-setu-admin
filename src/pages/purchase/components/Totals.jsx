import { formatINR, num } from './helpers';

const Row = ({ label, value, tone = '', bold = false }) => (
  <div className={`flex items-center justify-between gap-3 ${bold ? 'text-base font-bold text-[var(--vs-text-primary)]' : 'text-sm text-[var(--vs-text-secondary)]'}`}>
    <span>{label}</span>
    <span className={`font-mono ${tone}`}>{value}</span>
  </div>
);

const smallInput =
  'h-8 w-24 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 text-right text-sm text-gray-900 dark:!text-white outline-none focus:border-indigo-500/60';

/** GST lines: CGST + SGST for intra-state, IGST for inter-state, one line when not known yet. */
function GstRows({ t }) {
  if (t.isInterState === true) return <Row label="IGST" value={formatINR(t.igstTotal)} />;
  if (t.isInterState === false)
    return (
      <>
        <Row label="CGST" value={formatINR(t.cgstTotal)} />
        <Row label="SGST" value={formatINR(t.sgstTotal)} />
      </>
    );
  return <Row label="GST (CGST + SGST or IGST)" value={formatINR(t.taxAmount)} />;
}

/** Editable totals for create screens (preview). */
export function TotalsEditor({ totals, overallDiscountPercent, onOverallDiscountChange, otherCharges, onOtherChargesChange, roundOff, onRoundOffChange, showOverallDiscount = true }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Row label="Subtotal" value={formatINR(totals.subtotal)} />
      {showOverallDiscount && (
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--vs-text-secondary)]">
          <span>Overall discount (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={overallDiscountPercent}
            onChange={(e) => onOverallDiscountChange(e.target.value)}
            className={smallInput}
          />
        </div>
      )}
      {totals.discountAmount > 0 && <Row label="Total discount" value={`- ${formatINR(totals.discountAmount)}`} tone="text-rose-500" />}
      <Row label="Taxable value" value={formatINR(totals.taxableAmount)} />
      <GstRows t={totals} />
      {totals.cessTotal > 0 && <Row label="Cess" value={formatINR(totals.cessTotal)} />}
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--vs-text-secondary)]">
        <span>Other charges (freight etc.)</span>
        <input type="number" min="0" step="0.01" value={otherCharges} onChange={(e) => onOtherChargesChange(e.target.value)} className={smallInput} />
      </div>
      <label className="flex items-center justify-between gap-3 text-sm text-[var(--vs-text-secondary)] cursor-pointer">
        <span>Round off total</span>
        <input type="checkbox" checked={roundOff} onChange={(e) => onRoundOffChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer" />
      </label>
      {roundOff && totals.roundOff !== 0 && <Row label="Round off" value={formatINR(totals.roundOff)} />}
      <div className="border-t border-[var(--vs-border)] pt-3">
        <Row label="Total" value={formatINR(totals.totalAmount)} tone="text-indigo-600 dark:text-indigo-400" bold />
      </div>
      {totals.isInterState === undefined && (
        <p className="text-[11px] text-[var(--vs-text-secondary)]">
          The CGST/SGST or IGST split is worked out from the supplier&apos;s state when you save.
        </p>
      )}
    </div>
  );
}

/** Read-only totals of a saved document (server figures). */
export function DocTotals({ doc, extra = [] }) {
  if (!doc) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <Row label="Subtotal" value={formatINR(doc.subtotal)} />
      {num(doc.discountAmount) > 0 && <Row label="Discount" value={`- ${formatINR(doc.discountAmount)}`} tone="text-rose-500" />}
      <Row label="Taxable value" value={formatINR(doc.taxableAmount)} />
      <GstRows t={{ ...doc, isInterState: !!doc.isInterState }} />
      {num(doc.cessTotal) > 0 && <Row label="Cess" value={formatINR(doc.cessTotal)} />}
      {num(doc.otherCharges) > 0 && <Row label="Other charges" value={formatINR(doc.otherCharges)} />}
      {num(doc.roundOff) !== 0 && <Row label="Round off" value={formatINR(doc.roundOff)} />}
      <div className="border-t border-[var(--vs-border)] pt-3">
        <Row label="Total" value={formatINR(doc.totalAmount)} tone="text-indigo-600 dark:text-indigo-400" bold />
      </div>
      {extra.map((r) => (
        <Row key={r.label} label={r.label} value={r.value} tone={r.tone} bold={r.bold} />
      ))}
      <p className="text-[11px] text-[var(--vs-text-secondary)]">{doc.isInterState ? 'Inter-state purchase (IGST).' : 'Intra-state purchase (CGST + SGST).'}</p>
    </div>
  );
}
