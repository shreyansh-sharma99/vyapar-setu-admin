import { Link } from 'react-router-dom';
import { ExternalLink, X } from 'lucide-react';
import { Alert, Badge, Button } from '@/components/ui';
import { encodeId, formatINR } from '../utils/productUtils';

/** Dismissible "possible duplicate" panel fed by GET /products/similar. */
export default function DuplicateWarning({ items = [], onDismiss }) {
  if (!items.length) return null;

  return (
    <Alert
      tone="warning"
      title={
        <div className="flex items-start justify-between gap-3">
          <span>Possible duplicate product</span>
          <Button variant="ghost" size="icon-sm" onClick={onDismiss} title="Dismiss" aria-label="Dismiss" className="-my-1.5 -mr-1.5">
            <X />
          </Button>
        </div>
      }
    >
      <p className="m-0">These existing products look similar. Check them before saving to avoid duplicates.</p>

      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {items.map((p) => {
          const pct = Math.round(Number(p.similarity || 0) * 100);
          return (
            <li
              key={p._id}
              className="flex flex-col justify-between gap-2 rounded-control bg-surface px-3 py-2 shadow-card sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/products/view/${encodeId(p._id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-ink hover:underline"
                  >
                    {p.name}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </Link>
                  <Badge tone={pct >= 90 ? 'danger' : 'warning'}>{pct}% match</Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-muted">
                  {p.sku && <span>SKU: <span className="font-mono">{p.sku}</span></span>}
                  {p.barcode && <span>Barcode: <span className="font-mono">{p.barcode}</span></span>}
                  {Number(p.mrp) > 0 && <span>MRP: {formatINR(p.mrp)}</span>}
                  <span>Stock: {p.currentStock ?? 0} {p.unit || ''}</span>
                </div>
              </div>
              {Array.isArray(p.reasons) && p.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:justify-end">
                  {p.reasons.map((r) => (
                    <Badge key={r} tone="warning">
                      {r}
                    </Badge>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Alert>
  );
}
