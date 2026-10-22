import { Fragment, useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, ExternalLink, Layers, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '@/components/breadCrumbs/Card';
import { getBatchesApi } from '@/pages/inventory/inventory/services/inventoryService';
import { formatINR, formatQty, toNumberOr } from '../utils/productUtils';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const th = 'py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] whitespace-nowrap border border-[var(--vs-border)]';
const td = 'py-2 px-3 align-top border border-[var(--vs-border)]';
const SOURCE_LABEL = { stock_in: 'Stock in', batch_edit: 'Changed on this batch', master_apply: 'From Prices & Offers', migration: 'Set at go-live' };

/**
 * Every open batch of a product, all stores in one table: batch, store, received, expiry,
 * MRP, cost, its own selling price and qty left, with each batch's price history.
 * Read-only: batch prices change only in Master Settings → Prices & Offers.
 */
export default function BatchesCard({ productId }) {
  const [state, setState] = useState({ key: '', batches: [], error: '' });
  const [openHistory, setOpenHistory] = useState({});
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
    return () => {
      alive = false;
    };
  }, [productId, loadKey]);

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
      <Card
        h1={`Batches${batches.length ? ` (${batches.length})` : ''}`}
        rightNode={
          <Link to="/master/prices" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Change prices in Prices &amp; Offers <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        }
        bodyClassName="p-4 sm:p-5 flex flex-col gap-4"
      >
        <p className="text-xs text-[var(--vs-text-secondary)] m-0 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Each batch sells at its own price. Stock is sold oldest first (earliest expiry first for batch-tracked products).
        </p>
        {loading && !batches.length ? (
          <div className="flex items-center gap-2 text-xs text-[var(--vs-text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading batches...
          </div>
        ) : state.error ? (
          <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {state.error}
          </div>
        ) : batches.length === 0 ? (
          <div className="text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl border border-dashed border-[var(--vs-border)]">
            No stock in any batch. Stock comes in through Purchase (GRN) or Opening Stock.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
            <table className="w-full text-sm border-collapse min-w-[960px]">
              <thead className="bg-[var(--vs-bg-secondary)]">
                <tr>
                  <th className={th}>Batch</th>
                  <th className={th}>Store</th>
                  <th className={th}>Received</th>
                  <th className={th}>Expiry</th>
                  <th className={`${th} text-right`}>MRP</th>
                  <th className={`${th} text-right`}>Cost</th>
                  <th className={`${th} text-right`}>SP</th>
                  <th className={`${th} text-right`}>Qty left</th>
                  <th className={th} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const hasSp = toNumberOr(b.sellingPrice, 0) > 0;
                  const history = Array.isArray(b.priceHistory) ? b.priceHistory : [];
                  const open = !!openHistory[b._id];
                  return (
                    <Fragment key={b._id}>
                      <tr className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                        <td className={`${td} font-mono`}>{b.batchNo || '—'}</td>
                        <td className={td}>{b.storeName || '—'}</td>
                        <td className={td}>{fmtDay(b.receivedAt)}</td>
                        <td className={td}>{fmtDay(b.expiryDate)}</td>
                        <td className={`${td} text-right`}>{toNumberOr(b.mrp, 0) > 0 ? formatINR(b.mrp) : '—'}</td>
                        <td className={`${td} text-right`}>{formatINR(b.unitCost)}</td>
                        <td className={`${td} text-right whitespace-nowrap`}>
                          {hasSp ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatINR(b.sellingPrice)}</span>
                              <span className="text-[10px] text-[var(--vs-text-secondary)]">{b.priceIncludesGst !== false ? 'incl. GST' : '+ GST'}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--vs-text-secondary)]" title="Sold at the default price">
                              Default price
                            </span>
                          )}
                        </td>
                        <td className={`${td} text-right font-semibold`}>{formatQty(b.qtyRemaining)}</td>
                        <td className={td}>
                          <div className="flex items-center gap-3 whitespace-nowrap">
                            {history.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setOpenHistory((h) => ({ ...h, [b._id]: !h[b._id] }))}
                                className="text-xs font-semibold text-[var(--vs-text-secondary)] hover:underline cursor-pointer inline-flex items-center gap-0.5"
                              >
                                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} Price history ({history.length})
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td className={`${td} bg-[var(--vs-bg-secondary)]`} colSpan={9}>
                            <ul className="m-0 p-0 list-none flex flex-col gap-1 text-xs">
                              {[...history].reverse().map((h, i) => (
                                <li key={i} className="flex flex-wrap gap-x-3">
                                  <span className="font-semibold">{formatINR(h.price)}</span>
                                  <span className="text-[var(--vs-text-secondary)]">{h.priceIncludesGst !== false ? 'incl. GST' : '+ GST'}</span>
                                  <span>{SOURCE_LABEL[h.source] || h.source}</span>
                                  <span className="text-[var(--vs-text-secondary)]">
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
              </tbody>
              <tfoot className="bg-[var(--vs-bg-secondary)]">
                <tr>
                  <td className={`${td} text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]`} colSpan={7}>
                    Total
                  </td>
                  <td className={`${td} text-right font-bold`}>{formatQty(totalQty)}</td>
                  <td className={td} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
