import { AlertTriangle, ArrowRight, Ban } from 'lucide-react';
import { Badge, LINE_TD, LINE_TH, LineItemsTable, LineRow } from '@/components/ui';
import { formatGst } from './gstUtils';
import ProductThumb from './ProductThumb';

const money = (v) => (v === null || v === undefined ? '—' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const ChangeBadge = ({ row }) => {
  if (row.skip) return <Badge tone="neutral">Skipped</Badge>;
  if (row.error) return <Badge tone="danger">Above MRP</Badge>;
  if (row.warning) return <Badge tone="warning">Profit 0</Badge>;
  if (row.changed) return <Badge tone="warning">Changes</Badge>;
  return <Badge tone="info">Same rate</Badge>;
};

const num = 'text-right tabular-nums whitespace-nowrap';

/**
 * Old → new GST per product from POST /products/tax-rates/bulk/preview, with what the
 * new GST does to each product: selling price incl. GST, cost incl. GST, MRP and profit
 * per piece. Above MRP = cannot be applied; profit 0 = asked before applying.
 */
export default function GstPreviewTable({ rows = [], productsById = {} }) {
  if (rows.length === 0) {
    return <div className="rounded-control bg-fill-2 p-3 text-sm text-ink-subtle">None of the selected products can get this rate.</div>;
  }

  return (
    <LineItemsTable
      minWidth={920}
      head={
        <tr>
          <th className={LINE_TH}>Product</th>
          <th className={`${LINE_TH} text-right`}>Old GST</th>
          <th className={`${LINE_TH} w-8 text-center`} aria-label="to" />
          <th className={LINE_TH}>New GST</th>
          <th className={`${LINE_TH} text-right`}>SP incl. GST</th>
          <th className={`${LINE_TH} text-right`}>Cost incl. GST</th>
          <th className={`${LINE_TH} text-right`}>MRP</th>
          <th className={`${LINE_TH} text-right`}>Profit / pc</th>
          <th className={LINE_TH}>Result</th>
        </tr>
      }
    >
      {rows.map((r) => {
        const spOver = r.error && r.mrp && r.sellingPriceIncl > r.mrp;
        const costOver = r.error && r.mrp && !spOver && r.costIncl > r.mrp;
        return (
          <LineRow key={r.productId} tone={r.skip ? undefined : r.error ? 'danger' : r.warning ? 'warning' : undefined} className={r.skip ? 'opacity-50' : ''}>
            <td className={LINE_TD}>
              <div className="flex min-w-0 items-center gap-2.5">
                <ProductThumb product={productsById[String(r.productId)]} size="sm" />
                <div className="flex min-w-0 flex-col">
                  <span className="break-words font-semibold text-ink">{r.name}</span>
                  {r.sku && <span className="font-mono text-[11px] text-ink-subtle">{r.sku}</span>}
                  {r.skip && r.skipReason && <span className="text-xs italic text-ink-muted">{r.skipReason}</span>}
                  {r.replaces && !r.skip && <span className="text-[11px] text-ink-subtle">Replaces the rate already set for this day</span>}
                  {r.error && (
                    <span className="flex items-center gap-1 text-xs font-medium text-danger">
                      <Ban className="size-3 shrink-0" /> {r.error}
                    </span>
                  )}
                  {r.warning && (
                    <span className="flex items-center gap-1 text-xs font-medium text-warning">
                      <AlertTriangle className="size-3 shrink-0" /> {r.warning}
                    </span>
                  )}
                </div>
              </div>
            </td>
            <td className={`${LINE_TD} ${num} text-ink-muted`}>{formatGst(r.oldGstRate, r.oldCessRate)}</td>
            <td className={`${LINE_TD} text-center`}>
              <ArrowRight className="inline size-3.5 text-ink-subtle" />
            </td>
            <td className={LINE_TD}>
              <Badge tone={r.skip ? 'neutral' : 'primary'} className="tabular-nums">
                {formatGst(r.newGstRate, r.newCessRate)}
              </Badge>
            </td>
            <td className={`${LINE_TD} ${num} ${spOver ? 'font-bold text-danger' : ''}`}>{money(r.sellingPriceIncl)}</td>
            <td className={`${LINE_TD} ${num} ${costOver ? 'font-bold text-danger' : ''}`}>{money(r.costIncl)}</td>
            <td className={`${LINE_TD} ${num} text-ink-muted`}>{money(r.mrp)}</td>
            <td className={`${LINE_TD} ${num} font-semibold ${r.profit === null || r.profit === undefined ? '' : r.profit <= 0 ? 'text-warning' : 'text-success'}`}>
              {money(r.profit)}
            </td>
            <td className={LINE_TD}>
              <ChangeBadge row={r} />
            </td>
          </LineRow>
        );
      })}
    </LineItemsTable>
  );
}
