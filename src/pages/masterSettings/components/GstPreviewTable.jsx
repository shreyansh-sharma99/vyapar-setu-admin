import { AlertTriangle, ArrowRight, Ban } from 'lucide-react';
import { formatGst } from './gstUtils';
import ProductThumb from './ProductThumb';

const money = (v) => (v === null || v === undefined ? '—' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const ChangeBadge = ({ row }) => {
  const pill = 'inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap';
  if (row.skip) return <span className={`${pill} bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10`}>Skipped</span>;
  if (row.error) return <span className={`${pill} bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800`}>Above MRP</span>;
  if (row.warning) return <span className={`${pill} bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800`}>Profit 0</span>;
  if (row.changed) return <span className={`${pill} bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800`}>Changes</span>;
  return <span className={`${pill} bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800`}>Same rate</span>;
};

/**
 * Old → new GST per product from POST /products/tax-rates/bulk/preview, with what the
 * new GST does to each product: selling price incl. GST, cost incl. GST, MRP and profit
 * per piece. Above MRP = cannot be applied; profit 0 = asked before applying.
 */
export default function GstPreviewTable({ rows = [], productsById = {} }) {
  if (rows.length === 0) {
    return (
      <div className="text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl border border-dashed border-[var(--vs-border)]">
        None of the selected products can get this rate.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded-xl">
      <table className="w-full text-left border-collapse text-xs min-w-[920px]">
        <thead>
          <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-bold">
            <th className="py-2.5 px-3.5">Product</th>
            <th className="py-2.5 px-3.5 text-right">Old GST</th>
            <th className="py-2.5 px-3.5 text-center w-8" aria-label="to" />
            <th className="py-2.5 px-3.5">New GST</th>
            <th className="py-2.5 px-3.5 text-right">SP incl. GST</th>
            <th className="py-2.5 px-3.5 text-right">Cost incl. GST</th>
            <th className="py-2.5 px-3.5 text-right">MRP</th>
            <th className="py-2.5 px-3.5 text-right">Profit / pc</th>
            <th className="py-2.5 px-3.5">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-[var(--vs-text-secondary)]">
          {rows.map((r) => {
            const tone = r.error ? 'bg-rose-50/60 dark:bg-rose-500/5' : r.warning ? 'bg-amber-50/60 dark:bg-amber-500/5' : 'hover:bg-gray-50/50 dark:hover:bg-white/[0.01]';
            const spOver = r.error && r.mrp && r.sellingPriceIncl > r.mrp;
            const costOver = r.error && r.mrp && !spOver && r.costIncl > r.mrp;
            return (
              <tr key={r.productId} className={r.skip ? 'opacity-50' : tone}>
                <td className="py-2.5 px-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ProductThumb product={productsById[String(r.productId)]} size="sm" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[var(--vs-text-primary)] break-words">{r.name}</span>
                      {r.sku && <span className="text-[10px] font-mono">{r.sku}</span>}
                      {r.skip && r.skipReason && <span className="text-[11px] italic">{r.skipReason}</span>}
                      {r.replaces && !r.skip && <span className="text-[10px]">Replaces the rate already set for this day</span>}
                      {r.error && (
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <Ban className="w-3 h-3 shrink-0" /> {r.error}
                        </span>
                      )}
                      {r.warning && (
                        <span className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> {r.warning}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono whitespace-nowrap">{formatGst(r.oldGstRate, r.oldCessRate)}</td>
                <td className="py-2.5 px-3.5 text-center">
                  <ArrowRight className="w-3.5 h-3.5 inline text-gray-400" />
                </td>
                <td className={`py-2.5 px-3.5 font-mono whitespace-nowrap ${r.skip ? '' : 'font-bold text-[var(--vs-text-primary)]'}`}>{formatGst(r.newGstRate, r.newCessRate)}</td>
                <td className={`py-2.5 px-3.5 text-right font-mono whitespace-nowrap ${spOver ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}>{money(r.sellingPriceIncl)}</td>
                <td className={`py-2.5 px-3.5 text-right font-mono whitespace-nowrap ${costOver ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}>{money(r.costIncl)}</td>
                <td className="py-2.5 px-3.5 text-right font-mono whitespace-nowrap">{money(r.mrp)}</td>
                <td
                  className={`py-2.5 px-3.5 text-right font-mono whitespace-nowrap font-semibold ${
                    r.profit === null || r.profit === undefined ? '' : r.profit <= 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {money(r.profit)}
                </td>
                <td className="py-2.5 px-3.5">
                  <ChangeBadge row={r} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
