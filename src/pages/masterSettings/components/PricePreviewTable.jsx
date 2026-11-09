import { ArrowRight } from 'lucide-react';
import { Badge, LINE_TD, LINE_TH, LineItemsTable, LineRow } from '@/components/ui';
import ProductThumb from './ProductThumb';
import { formatMoney } from './priceUtils';

const BADGE = {
  skip: ['Skipped', 'neutral'],
  replace: ['Replaces same-day price', 'primary'],
  change: ['Changes', 'warning'],
  same: ['Same price', 'info'],
};

const KindBadge = ({ kind }) => <Badge tone={BADGE[kind][1]}>{BADGE[kind][0]}</Badge>;

const kindOf = (r) => (r.skip ? 'skip' : r.replaces ? 'replace' : r.changed ? 'change' : 'same');

/** Old → new price per product (POST /products/prices/bulk/preview), or offer price per product (offer preview). */
export default function PricePreviewTable({ rows = [], productsById = {}, offer = false }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-control bg-fill-2 p-3 text-sm text-ink-subtle">None of the selected products can get this {offer ? 'offer' : 'price'}.</div>
    );
  }

  return (
    <LineItemsTable
      minWidth={640}
      head={
        <tr>
          <th className={LINE_TH}>Product</th>
          <th className={LINE_TH}>SKU</th>
          <th className={`${LINE_TH} text-right`}>{offer ? 'Price' : 'Old price'}</th>
          <th className={`${LINE_TH} w-8 text-center`} aria-label="to" />
          <th className={LINE_TH}>{offer ? 'Customer pays' : 'New price'}</th>
          {!offer && <th className={LINE_TH}>Change</th>}
        </tr>
      }
    >
      {rows.map((r) => (
        <LineRow key={r.productId} className={r.skip ? 'opacity-50' : ''}>
          <td className={LINE_TD}>
            <div className="flex min-w-0 items-center gap-2.5">
              <ProductThumb product={productsById[String(r.productId)]} size="sm" />
              <div className="flex min-w-0 flex-col">
                <span className="break-words font-semibold text-ink">{r.name}</span>
                {r.skip && r.skipReason && <span className="text-xs italic text-ink-muted">{r.skipReason}</span>}
              </div>
            </div>
          </td>
          <td className={`${LINE_TD} font-mono text-[13px] text-ink-muted`}>{r.sku || '—'}</td>
          <td className={`${LINE_TD} whitespace-nowrap text-right tabular-nums text-ink-muted`}>{formatMoney(offer ? r.price : r.oldPrice)}</td>
          <td className={`${LINE_TD} text-center`}>
            <ArrowRight className="inline size-3.5 text-ink-subtle" />
          </td>
          <td className={`${LINE_TD} whitespace-nowrap`}>
            <Badge tone={r.skip ? 'neutral' : offer ? 'success' : 'primary'} className="tabular-nums">
              {formatMoney(offer ? r.offerPrice : r.newPrice)}
            </Badge>
            {!offer && <span className="mt-0.5 block text-[11px] text-ink-subtle">{r.priceIncludesGst !== false ? 'incl. GST' : '+ GST'}</span>}
          </td>
          {!offer && (
            <td className={LINE_TD}>
              <KindBadge kind={kindOf(r)} />
            </td>
          )}
        </LineRow>
      ))}
    </LineItemsTable>
  );
}
