import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { encodeId, formatINR } from '../utils/productUtils';

/** Dismissible "possible duplicate" panel fed by GET /products/similar. */
export default function DuplicateWarning({ items = [], onDismiss }) {
  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 m-0">Possible duplicate product</h4>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 m-0 mt-0.5">
              These existing products look similar. Check them before saving to avoid duplicates.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ul className="flex flex-col gap-2 m-0 p-0 list-none">
        {items.map((p) => {
          const pct = Math.round(Number(p.similarity || 0) * 100);
          return (
            <li
              key={p._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white/80 dark:bg-white/5 border border-amber-200 dark:border-amber-500/20 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/products/view/${encodeId(p._id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:underline inline-flex items-center gap-1"
                  >
                    {p.name}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${pct >= 90
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'}`}
                  >
                    {pct}% match
                  </span>
                </div>
                <div className="text-xs text-[var(--vs-text-secondary)] mt-0.5 flex flex-wrap gap-x-3">
                  {p.sku && <span>SKU: <span className="font-mono">{p.sku}</span></span>}
                  {p.barcode && <span>Barcode: <span className="font-mono">{p.barcode}</span></span>}
                  {Number(p.mrp) > 0 && <span>MRP: {formatINR(p.mrp)}</span>}
                  <span>Stock: {p.currentStock ?? 0} {p.unit || ''}</span>
                </div>
              </div>
              {Array.isArray(p.reasons) && p.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:justify-end">
                  {p.reasons.map((r) => (
                    <span
                      key={r}
                      className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-100/80 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
