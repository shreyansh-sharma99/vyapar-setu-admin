import { useState } from 'react';
import dayjs from 'dayjs';
import { AlertCircle, Ban, History, Loader2, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import DeleteModal from '@/components/modal/DeleteModal';
import ConfirmDialog from '@/pages/storeManagement/products/components/ConfirmDialog';
import { getApiErrorMessage } from '@/pages/storeManagement/products/utils/productUtils';
import { cancelOfferApi, deletePriceApi } from '../services/priceMasterService';
import { formatDay } from './gstUtils';
import { describeOffer, describePriceSource, formatMoney, offerDates } from './priceUtils';

const PILL = {
  current: { label: 'Current', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
  upcoming: { label: 'Starts later', cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800' },
  old: { label: 'Old bills only', cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10' },
  expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50' },
};

const StatusPill = ({ status }) => {
  const s = PILL[status] || PILL.old;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>;
};

const SetBy = ({ name, at }) => (
  <div className="flex flex-col">
    <span className="font-medium text-[var(--vs-text-primary)]">{name || '—'}</span>
    {at && <span className="text-[10px]">{dayjs(at).format('DD MMM YYYY, hh:mm A')}</span>}
  </div>
);

const thCls = 'py-2 px-3 border border-[var(--vs-border)]';
const tableWrap = 'overflow-x-auto rounded-xl border border-[var(--vs-border)]';
const headRow = 'bg-[var(--vs-bg-secondary)] text-[11px] uppercase tracking-wider text-[var(--vs-text-secondary)] font-bold';
const iconBtn = 'p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer';

/**
 * Price timeline + offers of one product (data from useProductPricing).
 * readOnly hides delete / cancel (product details page).
 */
export default function PriceHistory({ productId, data, loading, error, onChanged, notify, readOnly = false }) {
  const [toDelete, setToDelete] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const [busy, setBusy] = useState(false);

  const prices = Array.isArray(data?.prices) ? data.prices : [];
  const offers = Array.isArray(data?.offers) ? data.offers : [];

  const run = async (fn, okMessage, failMessage, close) => {
    setBusy(true);
    try {
      const res = await fn();
      notify?.(res?.message || okMessage, 'success');
      close();
      onChanged?.();
    } catch (err) {
      notify?.(await getApiErrorMessage(err, failMessage), 'danger');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--vs-text-secondary)]">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading prices...
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </span>
        {onChanged && (
          <Button size="xs" variant="outline" onClick={onChanged}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${loading ? 'opacity-60' : ''}`}>
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] m-0 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" /> Selling price history
        </h4>
        {prices.length === 0 ? (
          <div className="text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl border border-dashed border-[var(--vs-border)]">
            No dated prices yet. Bills use the price on the product card.
          </div>
        ) : (
          <div className={tableWrap}>
            <table className="w-full text-left border-collapse text-xs min-w-[720px]">
              <thead>
                <tr className={headRow}>
                  <th className={thCls}>Applicable from</th>
                  <th className={`${thCls} text-right`}>Selling price</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Set from</th>
                  <th className={thCls}>Set by</th>
                  <th className={thCls}>Note</th>
                  {!readOnly && <th className={`${thCls} text-center w-12`} aria-label="Actions" />}
                </tr>
              </thead>
              <tbody className="text-[var(--vs-text-secondary)]">
                {prices.map((r) => (
                  <tr key={r._id} className={`align-top hover:bg-gray-50/50 dark:hover:bg-white/[0.01] ${r.status === 'old' ? 'opacity-70' : ''}`}>
                    <td className={`${thCls} font-semibold text-[var(--vs-text-primary)] whitespace-nowrap`}>{formatDay(r.effectiveFrom)}</td>
                    <td className={`${thCls} text-right whitespace-nowrap`}>
                      <span className="font-mono font-bold text-[var(--vs-text-primary)]">{formatMoney(r.sellingPrice)}</span>
                      <span className="block text-[10px]">{r.priceIncludesGst !== false ? 'incl. GST' : '+ GST'}</span>
                      {Array.isArray(r.previous) && r.previous.length > 0 && (
                        <span className="block text-[10px] italic" title="Earlier price set for the same day">
                          replaced {r.previous.map((x) => formatMoney(x.sellingPrice)).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className={thCls}>
                      <StatusPill status={r.status} />
                    </td>
                    <td className={thCls}>{describePriceSource(r)}</td>
                    <td className={thCls}>
                      <SetBy name={r.createdByName} at={r.updatedAt || r.createdAt} />
                    </td>
                    <td className={`${thCls} max-w-[200px] break-words`}>{r.note || '—'}</td>
                    {!readOnly && (
                      <td className={`${thCls} text-center`}>
                        {r.status === 'upcoming' && (
                          <button type="button" onClick={() => setToDelete(r)} className={iconBtn} title="Delete this price">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] m-0">Offers</h4>
        {offers.length === 0 ? (
          <div className="text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl border border-dashed border-[var(--vs-border)]">No offers yet.</div>
        ) : (
          <div className={tableWrap}>
            <table className="w-full text-left border-collapse text-xs min-w-[680px]">
              <thead>
                <tr className={headRow}>
                  <th className={thCls}>Offer</th>
                  <th className={thCls}>Dates</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Set by</th>
                  <th className={thCls}>Note</th>
                  {!readOnly && <th className={`${thCls} text-center w-12`} aria-label="Actions" />}
                </tr>
              </thead>
              <tbody className="text-[var(--vs-text-secondary)]">
                {offers.map((o) => (
                  <tr key={o._id} className={`align-top hover:bg-gray-50/50 dark:hover:bg-white/[0.01] ${['expired', 'cancelled'].includes(o.status) ? 'opacity-70' : ''}`}>
                    <td className={`${thCls} font-semibold text-[var(--vs-text-primary)] whitespace-nowrap`}>{describeOffer(o)}</td>
                    <td className={`${thCls} whitespace-nowrap`}>{offerDates(o)}</td>
                    <td className={thCls}>
                      <StatusPill status={o.status} />
                      {o.status === 'cancelled' && o.cancelledByName && <span className="block text-[10px] mt-0.5">by {o.cancelledByName}</span>}
                    </td>
                    <td className={thCls}>
                      <SetBy name={o.createdByName} at={o.createdAt} />
                    </td>
                    <td className={`${thCls} max-w-[200px] break-words`}>{o.note || '—'}</td>
                    {!readOnly && (
                      <td className={`${thCls} text-center`}>
                        {['active', 'upcoming'].includes(o.status) && (
                          <button type="button" onClick={() => setToCancel(o)} className={iconBtn} title="Cancel this offer">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!readOnly && (
        <>
          <DeleteModal
            isOpen={!!toDelete}
            onClose={() => setToDelete(null)}
            onConfirm={() => run(() => deletePriceApi(productId, toDelete._id), 'Price deleted', 'Could not delete the price', () => setToDelete(null))}
            isLoading={busy}
            title="Delete price"
            message={toDelete ? `Delete ${formatMoney(toDelete.sellingPrice)} starting ${formatDay(toDelete.effectiveFrom)}? It has not started yet, so no bill uses it.` : ''}
          />
          <ConfirmDialog
            isOpen={!!toCancel}
            onClose={() => setToCancel(null)}
            onConfirm={() => run(() => cancelOfferApi(productId, toCancel._id), 'Offer cancelled', 'Could not cancel the offer', () => setToCancel(null))}
            isLoading={busy}
            title="Cancel offer?"
            message={toCancel ? `Cancel "${describeOffer(toCancel)}" (${offerDates(toCancel)})? Bills already saved keep their discount.` : ''}
            confirmText="Cancel offer"
            loadingText="Cancelling..."
          />
        </>
      )}
    </div>
  );
}
