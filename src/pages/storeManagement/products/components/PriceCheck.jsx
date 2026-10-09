import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { computeCustomerPrice, formatINR, toNumberOr } from '../utils/productUtils';

/** Live "customer pays" figure and the MRP / cost checks. */
export default function PriceCheck({ values }) {
  const customerPrice = computeCustomerPrice(values);
  const mrp = toNumberOr(values.mrp, 0);
  const cost = toNumberOr(values.costPrice, 0);
  const base = toNumberOr(values.basePrice, 0);
  const discounted = toNumberOr(values.discountedPrice, 0);
  const aboveMrp = mrp > 0 && customerPrice > mrp + 0.005;
  const discountAboveBase = discounted > 0 && discounted > base;
  const gstOn = values.isGstApplicable === 'true' || values.isGstApplicable === true;
  const gstIncluded = values.isGstIncludedInPrice === 'true' || values.isGstIncludedInPrice === true;
  const belowCost = cost > 0 && customerPrice > 0 && customerPrice < cost;

  const tone = aboveMrp || discountAboveBase
    ? 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-950/30'
    : 'border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]';

  return (
    <div className={`rounded-xl border p-3.5 flex flex-col gap-2 ${tone}`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--vs-text-secondary)]">Customer pays</span>
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatINR(customerPrice)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--vs-text-secondary)]">MRP</span>
          <span className="text-sm font-semibold text-[var(--vs-text-primary)]">{mrp > 0 ? formatINR(mrp) : 'Not set'}</span>
        </div>
        {cost > 0 && customerPrice > 0 && (
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--vs-text-secondary)]">Margin on cost</span>
            <span className={`text-sm font-semibold ${belowCost ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatINR(customerPrice - cost)}
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--vs-text-secondary)] m-0 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          {discounted > 0 ? 'Discounted price' : 'Base price'}
          {gstOn && !gstIncluded ? ` + ${toNumberOr(values.gstRateOverride, 0)}% GST` : gstOn ? ' (GST included)' : ''}.
          The selling price including GST must not be more than the MRP.
        </span>
      </p>
      {discountAboveBase && (
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 m-0 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Discounted price cannot be more than the base price.
        </p>
      )}
      {aboveMrp && (
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 m-0 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Selling price {formatINR(customerPrice)} is above the MRP {formatINR(mrp)}. Lower the price or correct the MRP.
        </p>
      )}
      {!aboveMrp && !discountAboveBase && mrp > 0 && customerPrice > 0 && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 m-0 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Price is within the MRP.
        </p>
      )}
      {belowCost && (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 m-0 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Selling below cost price.
        </p>
      )}
    </div>
  );
}
