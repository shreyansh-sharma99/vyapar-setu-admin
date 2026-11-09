import { TotalsInput, TotalsRow, TotalsToggle } from '@/components/ui';
import { formatINR, num } from './helpers';

/*
 * Totals rows for purchase documents. They read well inside the dark <TotalsPanel> and inside a
 * light card (TotalsRow picks its colours from where it sits).
 */

/** GST lines: CGST + SGST for intra-state, IGST for inter-state, one line when not known yet. */
function GstRows({ t }) {
  if (t.isInterState === true) return <TotalsRow label="IGST" value={formatINR(t.igstTotal)} />;
  if (t.isInterState === false)
    return (
      <>
        <TotalsRow label="CGST" value={formatINR(t.cgstTotal)} />
        <TotalsRow label="SGST" value={formatINR(t.sgstTotal)} />
      </>
    );
  return <TotalsRow label="GST (CGST + SGST or IGST)" value={formatINR(t.taxAmount)} />;
}

/**
 * Editable totals for create screens (preview).
 * `showTotal={false}` when the surrounding <TotalsPanel total={…}> already shows the total.
 */
export function TotalsEditor({
  totals,
  overallDiscountPercent,
  onOverallDiscountChange,
  otherCharges,
  onOtherChargesChange,
  roundOff,
  onRoundOffChange,
  showOverallDiscount = true,
  showTotal = true,
}) {
  return (
    <div className="flex flex-col gap-2.5 text-sm">
      <TotalsRow label="Subtotal" value={formatINR(totals.subtotal)} />
      {showOverallDiscount && (
        <TotalsRow label="Overall discount (%)">
          <TotalsInput
            min="0"
            max="100"
            step="0.01"
            value={overallDiscountPercent}
            aria-label="Overall discount percent"
            onChange={(e) => onOverallDiscountChange(e.target.value)}
          />
        </TotalsRow>
      )}
      {totals.discountAmount > 0 && <TotalsRow label="Total discount" value={`- ${formatINR(totals.discountAmount)}`} tone="danger" />}
      <TotalsRow label="Taxable value" value={formatINR(totals.taxableAmount)} />
      <GstRows t={totals} />
      {totals.cessTotal > 0 && <TotalsRow label="Cess" value={formatINR(totals.cessTotal)} />}
      <TotalsRow label="Other charges (freight etc.)">
        <TotalsInput min="0" step="0.01" value={otherCharges} aria-label="Other charges" onChange={(e) => onOtherChargesChange(e.target.value)} />
      </TotalsRow>
      <TotalsToggle label="Round off total" checked={roundOff} onChange={onRoundOffChange} />
      {roundOff && totals.roundOff !== 0 && <TotalsRow label="Round off" value={formatINR(totals.roundOff)} />}
      {showTotal && (
        <div className="mt-1 border-t border-line pt-3">
          <TotalsRow label="Total" value={formatINR(totals.totalAmount)} bold />
        </div>
      )}
      {totals.isInterState === undefined && (
        <p className="m-0 text-[11px] opacity-70">The CGST/SGST or IGST split is worked out from the supplier&apos;s state when you save.</p>
      )}
    </div>
  );
}

/** Read-only totals of a saved document (server figures). */
// `showTotal={false}` when the TotalsPanel already shows the total in big type.
export function DocTotals({ doc, extra = [], showTotal = true }) {
  if (!doc) return null;
  return (
    <div className="flex flex-col gap-2.5 text-sm">
      <TotalsRow label="Subtotal" value={formatINR(doc.subtotal)} />
      {num(doc.discountAmount) > 0 && <TotalsRow label="Discount" value={`- ${formatINR(doc.discountAmount)}`} tone="danger" />}
      <TotalsRow label="Taxable value" value={formatINR(doc.taxableAmount)} />
      <GstRows t={{ ...doc, isInterState: !!doc.isInterState }} />
      {num(doc.cessTotal) > 0 && <TotalsRow label="Cess" value={formatINR(doc.cessTotal)} />}
      {num(doc.otherCharges) > 0 && <TotalsRow label="Other charges" value={formatINR(doc.otherCharges)} />}
      {num(doc.roundOff) !== 0 && <TotalsRow label="Round off" value={formatINR(doc.roundOff)} />}
      {showTotal && (
        <div className="mt-1 border-t border-line pt-3">
          <TotalsRow label="Total" value={formatINR(doc.totalAmount)} bold />
        </div>
      )}
      {extra.map((r) => (
        <TotalsRow key={r.label} label={r.label} value={r.value} bold={r.bold} tone={toneOf(r.tone)} />
      ))}
      <p className="m-0 text-[11px] opacity-70">{doc.isInterState ? 'Inter-state purchase (IGST).' : 'Intra-state purchase (CGST + SGST).'}</p>
    </div>
  );
}

// Older callers pass Tailwind colour classes in `tone`; map the common ones to TotalsRow tones.
const toneOf = (cls = '') => (/rose|red/.test(cls) ? 'danger' : /emerald|green/.test(cls) ? 'success' : /amber/.test(cls) ? 'warning' : undefined);
