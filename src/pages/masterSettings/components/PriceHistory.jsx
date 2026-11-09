import { useState } from 'react';
import dayjs from 'dayjs';
import { Ban, History, Tag, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, ConfirmDialog, LINE_TD, LINE_TH, LineItemsTable, LineRow, SkeletonRows } from '@/components/ui';
import { getApiErrorMessage } from '@/pages/storeManagement/products/utils/productUtils';
import { cancelOfferApi, deletePriceApi } from '../services/priceMasterService';
import { formatDay } from './gstUtils';
import { describeOffer, describePriceSource, formatMoney, offerDates } from './priceUtils';

const PILL = {
  current: { label: 'Current', tone: 'success' },
  active: { label: 'Active', tone: 'success' },
  upcoming: { label: 'Starts later', tone: 'info' },
  old: { label: 'Old bills only', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

const StatusPill = ({ status }) => {
  const s = PILL[status] || PILL.old;
  return <Badge tone={s.tone}>{s.label}</Badge>;
};

const SetBy = ({ name, at }) => (
  <div className="flex flex-col">
    <span className="font-medium">{name || '—'}</span>
    {at && <span className="text-xs text-ink-subtle">{dayjs(at).format('DD MMM YYYY, hh:mm A')}</span>}
  </div>
);

const SubHeading = ({ icon: Icon, children }) => (
  <h3 className="m-0 flex items-center gap-1.5 !text-[13px] !font-bold text-ink-muted">
    <Icon className="size-4 text-ink-subtle" /> {children}
  </h3>
);

const EmptyNote = ({ children }) => <div className="rounded-control bg-fill-2 p-3 text-sm text-ink-subtle">{children}</div>;

const RowIconButton = ({ icon: Icon, title, onClick }) => (
  <Button variant="ghost" size="icon-sm" onClick={onClick} title={title} aria-label={title} className="hover:bg-danger-soft hover:text-danger">
    <Icon />
  </Button>
);

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
    return <SkeletonRows rows={4} cols={5} />;
  }

  if (error && !loading) {
    return (
      <Alert
        tone="danger"
        action={
          onChanged && (
            <Button size="sm" variant="secondary" onClick={onChanged}>
              Try again
            </Button>
          )
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${loading ? 'opacity-60' : ''}`}>
      <div className="flex flex-col gap-2.5">
        <SubHeading icon={History}>Selling price history</SubHeading>
        {prices.length === 0 ? (
          <EmptyNote>No dated prices yet. Bills use the price on the product card.</EmptyNote>
        ) : (
          <LineItemsTable
            minWidth={720}
            head={
              <tr>
                <th className={LINE_TH}>Applicable from</th>
                <th className={`${LINE_TH} text-right`}>Selling price</th>
                <th className={LINE_TH}>Status</th>
                <th className={LINE_TH}>Set from</th>
                <th className={LINE_TH}>Set by</th>
                <th className={LINE_TH}>Note</th>
                {!readOnly && <th className={`${LINE_TH} w-12 text-center`} aria-label="Actions" />}
              </tr>
            }
          >
            {prices.map((r) => (
              <LineRow key={r._id} className={r.status === 'old' ? 'opacity-70' : ''}>
                <td className={`${LINE_TD} whitespace-nowrap font-semibold`}>{formatDay(r.effectiveFrom)}</td>
                <td className={`${LINE_TD} whitespace-nowrap text-right`}>
                  <span className="font-bold tabular-nums">{formatMoney(r.sellingPrice)}</span>
                  <span className="block text-xs text-ink-subtle">{r.priceIncludesGst !== false ? 'incl. GST' : '+ GST'}</span>
                  {Array.isArray(r.previous) && r.previous.length > 0 && (
                    <span className="block text-xs italic tabular-nums text-ink-subtle" title="Earlier price set for the same day">
                      replaced {r.previous.map((x) => formatMoney(x.sellingPrice)).join(', ')}
                    </span>
                  )}
                </td>
                <td className={LINE_TD}>
                  <StatusPill status={r.status} />
                </td>
                <td className={`${LINE_TD} text-ink-muted`}>{describePriceSource(r)}</td>
                <td className={LINE_TD}>
                  <SetBy name={r.createdByName} at={r.updatedAt || r.createdAt} />
                </td>
                <td className={`${LINE_TD} max-w-[200px] break-words text-ink-muted`}>{r.note || '—'}</td>
                {!readOnly && (
                  <td className={`${LINE_TD} text-center`}>
                    {r.status === 'upcoming' && <RowIconButton icon={Trash2} title="Delete this price" onClick={() => setToDelete(r)} />}
                  </td>
                )}
              </LineRow>
            ))}
          </LineItemsTable>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <SubHeading icon={Tag}>Offers</SubHeading>
        {offers.length === 0 ? (
          <EmptyNote>No offers yet.</EmptyNote>
        ) : (
          <LineItemsTable
            minWidth={680}
            head={
              <tr>
                <th className={LINE_TH}>Offer</th>
                <th className={LINE_TH}>Dates</th>
                <th className={LINE_TH}>Status</th>
                <th className={LINE_TH}>Set by</th>
                <th className={LINE_TH}>Note</th>
                {!readOnly && <th className={`${LINE_TH} w-12 text-center`} aria-label="Actions" />}
              </tr>
            }
          >
            {offers.map((o) => (
              <LineRow key={o._id} className={['expired', 'cancelled'].includes(o.status) ? 'opacity-70' : ''}>
                <td className={`${LINE_TD} whitespace-nowrap font-semibold text-success`}>{describeOffer(o)}</td>
                <td className={`${LINE_TD} whitespace-nowrap tabular-nums`}>{offerDates(o)}</td>
                <td className={LINE_TD}>
                  <StatusPill status={o.status} />
                  {o.status === 'cancelled' && o.cancelledByName && <span className="mt-0.5 block text-xs text-ink-subtle">by {o.cancelledByName}</span>}
                </td>
                <td className={LINE_TD}>
                  <SetBy name={o.createdByName} at={o.createdAt} />
                </td>
                <td className={`${LINE_TD} max-w-[200px] break-words text-ink-muted`}>{o.note || '—'}</td>
                {!readOnly && (
                  <td className={`${LINE_TD} text-center`}>
                    {['active', 'upcoming'].includes(o.status) && <RowIconButton icon={Ban} title="Cancel this offer" onClick={() => setToCancel(o)} />}
                  </td>
                )}
              </LineRow>
            ))}
          </LineItemsTable>
        )}
      </div>

      {!readOnly && (
        <>
          <ConfirmDialog
            open={!!toDelete}
            onClose={() => setToDelete(null)}
            onConfirm={() => run(() => deletePriceApi(productId, toDelete._id), 'Price deleted', 'Could not delete the price', () => setToDelete(null))}
            loading={busy}
            title="Delete price"
            message={toDelete ? `Delete ${formatMoney(toDelete.sellingPrice)} starting ${formatDay(toDelete.effectiveFrom)}? It has not started yet, so no bill uses it.` : ''}
            confirmLabel="Delete"
            loadingLabel="Deleting..."
          />
          <ConfirmDialog
            open={!!toCancel}
            onClose={() => setToCancel(null)}
            onConfirm={() => run(() => cancelOfferApi(productId, toCancel._id), 'Offer cancelled', 'Could not cancel the offer', () => setToCancel(null))}
            loading={busy}
            title="Cancel offer?"
            message={toCancel ? `Cancel "${describeOffer(toCancel)}" (${offerDates(toCancel)})? Bills already saved keep their discount.` : ''}
            confirmLabel="Cancel offer"
            loadingLabel="Cancelling..."
            icon={Ban}
          />
        </>
      )}
    </div>
  );
}
