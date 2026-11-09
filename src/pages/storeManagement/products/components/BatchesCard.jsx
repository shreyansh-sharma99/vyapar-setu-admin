import { Fragment, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Alert, Button, LINE_TD, LINE_TF, LINE_TH, LineItemsTable, LineRow, Section, Spinner } from '@/components/ui';
import { getBatchesApi } from '@/pages/inventory/inventory/services/inventoryService';
import { getBatchSalesApi } from '@/pages/reports/services/pricingReportService';
import { formatINR, formatQty, toNumberOr } from '../utils/productUtils';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const th = LINE_TH;
const td = LINE_TD;
const num = 'text-right tabular-nums';
const SOURCE_LABEL = { stock_in: 'Stock in', batch_edit: 'Changed on this batch', master_apply: 'From Prices & Offers', migration: 'Set at go-live' };

/**
 * Every open batch of a product in one table: batch, received, expiry,
 * MRP, cost, its own selling price and qty left, with each batch's price history.
 * Read-only: batch prices change only in Master Settings → Prices & Offers.
 */
export default function BatchesCard({ productId }) {
  const [state, setState] = useState({ key: '', batches: [], error: '' });
  const [openHistory, setOpenHistory] = useState({});
  // sold / revenue / profit per batch, all time, net of returns (owner only: hidden when not allowed)
  const [sales, setSales] = useState({ key: '', byBatch: new Map() });
  const loadKey = String(productId);

  useEffect(() => {
    if (!productId) return undefined;
    let alive = true;
    getBatchesApi({ productId, onlyOpen: true })
      .then((res) => {
        if (alive) setState({ key: loadKey, batches: res?.data?.batches || [], error: '' });
      })
      .catch(() => {
        if (alive) setState({ key: loadKey, batches: [], error: 'Could not load the batches.' });
      });
    getBatchSalesApi({ productId })
      .then((res) => alive && setSales({ key: loadKey, byBatch: new Map((res?.data?.rows || []).filter((r) => r.batchId).map((r) => [String(r.batchId), r])) }))
      .catch(() => alive && setSales({ key: loadKey, byBatch: new Map() }));
    return () => {
      alive = false;
    };
  }, [productId, loadKey]);
  const showSales = sales.key === loadKey && sales.byBatch.size > 0;
  const saleOf = (b) => sales.byBatch.get(String(b._id));

  const loading = state.key !== loadKey;
  const batches = state.batches;

  // opened from the product list ("3 batches") → /products/view/…#batches
  const boxRef = useRef(null);
  const scrolled = useRef(false);
  useEffect(() => {
    if (loading || scrolled.current || window.location.hash !== '#batches') return;
    scrolled.current = true;
    boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading]);
  const totalQty = batches.reduce((s, b) => s + toNumberOr(b.qtyRemaining, 0), 0);

  return (
    <div id="batches" ref={boxRef} className="scroll-mt-20">
      <Section
        title={`Batches${batches.length ? ` (${batches.length})` : ''}`}
        bodyClassName="flex flex-col gap-4"
      >
        <Alert tone="neutral" icon={Layers}>
          Each batch sells at its own price. Stock is sold oldest first (earliest expiry first for batch-tracked products).
        </Alert>
        {loading && !batches.length ? (
          <Spinner label="Loading batches..." />
        ) : state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : batches.length === 0 ? (
          <p className="m-0 rounded-control border border-dashed border-line p-3 text-sm text-ink-muted">
            No stock in any batch. Stock comes in through a Purchase, or opening stock when creating the product.
          </p>
        ) : (
          <LineItemsTable
            minWidth={960}
            head={
              <tr>
                <th className={th}>Batch</th>
                <th className={th}>Received</th>
                <th className={th}>Expiry</th>
                <th className={`${th} text-right`}>MRP</th>
                <th className={`${th} text-right`}>Cost</th>
                <th className={`${th} text-right`}>SP</th>
                <th className={`${th} text-right`}>Qty left</th>
                {showSales && <th className={`${th} text-right`}>Sold</th>}
                {showSales && <th className={`${th} text-right`}>Revenue</th>}
                {showSales && <th className={`${th} text-right`}>Profit</th>}
                <th className={th} aria-label="Actions" />
              </tr>
            }
            foot={
              <tr>
                <td className={LINE_TF} colSpan={6}>
                  Total
                </td>
                <td className={`${LINE_TF} ${num}`}>{formatQty(totalQty)}</td>
                {showSales && <td className={LINE_TF} colSpan={3} />}
                <td className={LINE_TF} />
              </tr>
            }
          >
            {batches.map((b) => {
              const hasSp = toNumberOr(b.sellingPrice, 0) > 0;
              const history = Array.isArray(b.priceHistory) ? b.priceHistory : [];
              const open = !!openHistory[b._id];
              return (
                <Fragment key={b._id}>
                  <LineRow>
                    <td className={`${td} font-mono`}>{b.batchNo || '—'}</td>
                    <td className={td}>{fmtDay(b.receivedAt)}</td>
                    <td className={td}>{fmtDay(b.expiryDate)}</td>
                    <td className={`${td} ${num}`}>{toNumberOr(b.mrp, 0) > 0 ? formatINR(b.mrp) : '—'}</td>
                    <td className={`${td} ${num}`}>{formatINR(b.unitCost)}</td>
                    <td className={`${td} ${num} whitespace-nowrap`}>
                      {hasSp ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-brand-ink">{formatINR(b.sellingPrice)}</span>
                          <span className="text-xs text-ink-subtle">{b.priceIncludesGst !== false ? 'incl. GST' : '+ GST'}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-muted" title="Sold at the default price">
                          Default price
                        </span>
                      )}
                    </td>
                    <td className={`${td} ${num} font-semibold`}>{formatQty(b.qtyRemaining)}</td>
                    {showSales && <td className={`${td} ${num}`}>{saleOf(b) ? formatQty(saleOf(b).soldQty) : '—'}</td>}
                    {showSales && <td className={`${td} ${num}`}>{saleOf(b) ? formatINR(saleOf(b).revenue) : '—'}</td>}
                    {showSales && (
                      <td className={`${td} ${num} font-semibold ${saleOf(b) && saleOf(b).profit < 0 ? 'text-danger' : 'text-success'}`}>
                        {saleOf(b) ? formatINR(saleOf(b).profit) : '—'}
                      </td>
                    )}
                    <td className={td}>
                      {history.length > 0 && (
                        <Button
                          variant="link"
                          size="xs"
                          className="text-ink-muted"
                          startIcon={open ? <ChevronDown /> : <ChevronRight />}
                          onClick={() => setOpenHistory((h) => ({ ...h, [b._id]: !h[b._id] }))}
                        >
                          Price history ({history.length})
                        </Button>
                      )}
                    </td>
                  </LineRow>
                  {open && (
                    <tr>
                      <td className={`${td} bg-fill-2`} colSpan={showSales ? 11 : 8}>
                        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs">
                          {[...history].reverse().map((h, i) => (
                            <li key={i} className="flex flex-wrap gap-x-3">
                              <span className="font-semibold tabular-nums">{formatINR(h.price)}</span>
                              <span className="text-ink-muted">{h.priceIncludesGst !== false ? 'incl. GST' : '+ GST'}</span>
                              <span>{SOURCE_LABEL[h.source] || h.source}</span>
                              <span className="text-ink-muted">
                                {fmtWhen(h.at)}
                                {h.byName ? ` · ${h.byName}` : ''}
                              </span>
                              {h.reason && <span className="italic">“{h.reason}”</span>}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </LineItemsTable>
        )}
      </Section>
    </div>
  );
}
