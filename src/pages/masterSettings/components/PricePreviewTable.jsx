import { ArrowRight } from 'lucide-react';
import ProductThumb from './ProductThumb';
import { formatMoney } from './priceUtils';

const BADGE = {
  skip: ['Skipped', 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10'],
  replace: ['Replaces same-day price', 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800'],
  change: ['Changes', 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'],
  same: ['Same price', 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800'],
};

const Badge = ({ kind }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${BADGE[kind][1]}`}>{BADGE[kind][0]}</span>
);

const kindOf = (r) => (r.skip ? 'skip' : r.replaces ? 'replace' : r.changed ? 'change' : 'same');

/** Old → new price per product (POST /products/prices/bulk/preview), or offer price per product (offer preview). */
export default function PricePreviewTable({ rows = [], productsById = {}, offer = false }) {
  if (rows.length === 0) {
    return (
      <div className="text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl border border-dashed border-[var(--vs-border)]">
        None of the selected products can get this {offer ? 'offer' : 'price'}.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded-xl">
      <table className="w-full text-left border-collapse text-xs min-w-[640px]">
        <thead>
          <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-bold">
            <th className="py-2.5 px-3.5">Product</th>
            <th className="py-2.5 px-3.5">SKU</th>
            <th className="py-2.5 px-3.5 text-right">{offer ? 'Price' : 'Old price'}</th>
            <th className="py-2.5 px-3.5 text-center w-8" aria-label="to" />
            <th className="py-2.5 px-3.5">{offer ? 'Customer pays' : 'New price'}</th>
            {!offer && <th className="py-2.5 px-3.5">Change</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-[var(--vs-text-secondary)]">
          {rows.map((r) => (
            <tr key={r.productId} className={r.skip ? 'opacity-50' : 'hover:bg-gray-50/50 dark:hover:bg-white/[0.01]'}>
              <td className="py-2.5 px-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ProductThumb product={productsById[String(r.productId)]} size="sm" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-[var(--vs-text-primary)] break-words">{r.name}</span>
                    {r.skip && r.skipReason && <span className="text-[11px] italic">{r.skipReason}</span>}
                  </div>
                </div>
              </td>
              <td className="py-2.5 px-3.5 font-mono">{r.sku || '—'}</td>
              <td className="py-2.5 px-3.5 text-right font-mono whitespace-nowrap">{formatMoney(offer ? r.price : r.oldPrice)}</td>
              <td className="py-2.5 px-3.5 text-center">
                <ArrowRight className="w-3.5 h-3.5 inline text-gray-400" />
              </td>
              <td className={`py-2.5 px-3.5 font-mono whitespace-nowrap ${r.skip ? '' : 'font-bold text-[var(--vs-text-primary)]'}`}>
                {formatMoney(offer ? r.offerPrice : r.newPrice)}
                {!offer && <span className="block text-[10px] font-normal font-sans">{r.priceIncludesGst !== false ? 'incl. GST' : '+ GST'}</span>}
              </td>
              {!offer && (
                <td className="py-2.5 px-3.5">
                  <Badge kind={kindOf(r)} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
