import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Trash2 } from 'lucide-react';
import { Alert, Badge, Button, ConfirmDialog, LINE_TD, LINE_TH, LineItemsTable, LineRow, SkeletonRows } from '@/components/ui';
import { getApiErrorMessage } from '@/pages/storeManagement/products/utils/productUtils';
import { deleteTaxRateApi, getTaxRatesApi } from '../services/gstRateService';
import { formatDay, formatGst } from './gstUtils';

const STATUS_PILL = {
  current: { label: 'Current', tone: 'success' },
  upcoming: { label: 'Starts later', tone: 'info' },
  old: { label: 'Old bills only', tone: 'neutral' },
};

const StatusPill = ({ status }) => {
  const s = STATUS_PILL[status] || STATUS_PILL.old;
  return <Badge tone={s.tone}>{s.label}</Badge>;
};

/**
 * Dated GST timeline for one product, with delete for rates that have not started yet.
 * Bump `reloadKey` from the parent to reload (e.g. after a bulk change touched this product).
 */
/** readOnly: audit view (product page) — no delete. Same-day rates a row replaced are listed under it. */
export default function GstHistory({ productId, reloadKey = 0, notify, readOnly = false }) {
  const [localKey, setLocalKey] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: '' });
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadKey = `${productId}:${reloadKey}:${localKey}`;

  useEffect(() => {
    if (!productId) return undefined;
    let cancelled = false;
    getTaxRatesApi(productId)
      .then((res) => {
        if (!cancelled) setState({ key: loadKey, data: res?.data || null, error: '' });
      })
      .catch(async (err) => {
        const message = await getApiErrorMessage(err, 'Could not load the GST history');
        if (!cancelled) setState({ key: loadKey, data: null, error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [productId, loadKey]);

  const reload = () => setLocalKey((k) => k + 1);
  const loading = state.key !== loadKey;
  // The parent remounts this per product (key), so older data here always belongs to this product.
  const data = state.data;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const current = data?.current || null;

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await deleteTaxRateApi(productId, toDelete._id);
      notify?.(res?.message || 'GST rate deleted', 'success');
      setToDelete(null);
      reload();
    } catch (err) {
      notify?.(await getApiErrorMessage(err, 'Could not delete the GST rate'), 'danger');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !data) {
    return <SkeletonRows rows={3} cols={4} />;
  }

  if (state.error && !loading) {
    return (
      <Alert
        tone="danger"
        action={
          <Button size="sm" variant="secondary" onClick={reload}>
            Try again
          </Button>
        }
      >
        {state.error}
      </Alert>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${loading ? 'opacity-60' : ''}`}>
      {current && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span className="font-semibold text-ink">Current GST</span>
          <Badge tone="primary" size="md" className="tabular-nums">
            {formatGst(current.gstRate, current.cessRate)}
          </Badge>
          <span className="text-ink-subtle">
            {current.source === 'product' || !current.effectiveFrom ? 'from product card' : `from ${formatDay(current.effectiveFrom)}`}
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-control bg-fill-2 p-3 text-sm text-ink-subtle">
          No dated GST rates yet. Bills use the GST on the product card. Use “Change GST rate” above when the GST changes from a date.
        </div>
      ) : (
        <LineItemsTable
          minWidth={680}
          head={
            <tr>
              <th className={LINE_TH}>Applicable from</th>
              <th className={`${LINE_TH} text-right`}>GST %</th>
              <th className={LINE_TH}>Status</th>
              <th className={LINE_TH}>Set by</th>
              <th className={LINE_TH}>Note</th>
              {!readOnly && <th className={`${LINE_TH} w-12 text-center`} aria-label="Actions" />}
            </tr>
          }
        >
          {rows.map((r) => (
            <LineRow key={r._id} className={r.status === 'old' ? 'opacity-70' : ''}>
              <td className={`${LINE_TD} whitespace-nowrap font-semibold`}>{formatDay(r.effectiveFrom)}</td>
              <td className={`${LINE_TD} text-right font-bold tabular-nums`}>{Number(r.gstRate) || 0}%</td>
              <td className={LINE_TD}>
                <StatusPill status={r.status} />
              </td>
              <td className={LINE_TD}>
                <div className="flex flex-col">
                  <span className="font-medium">{r.createdByName || '—'}</span>
                  {r.createdAt && <span className="text-xs text-ink-subtle">{dayjs(r.createdAt).format('DD MMM YYYY, hh:mm A')}</span>}
                </div>
              </td>
              <td className={`${LINE_TD} max-w-[260px] break-words text-ink-muted`}>
                {r.note || '—'}
                {(r.previous || []).map((pv, i) => (
                  <div key={i} className="mt-0.5 text-xs text-ink-subtle">
                    Replaced {Number(pv.gstRate) || 0}% set by {pv.createdByName || '—'}
                    {pv.replacedAt ? ` (changed ${dayjs(pv.replacedAt).format('DD MMM, hh:mm A')}${pv.replacedByName ? ` by ${pv.replacedByName}` : ''})` : ''}
                  </div>
                ))}
              </td>
              {!readOnly && (
                <td className={`${LINE_TD} text-center`}>
                  {r.status === 'upcoming' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setToDelete(r)}
                      title="Delete this rate"
                      aria-label="Delete this rate"
                      className="hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </td>
              )}
            </LineRow>
          ))}
        </LineItemsTable>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete GST rate"
        message={
          toDelete
            ? `Delete GST ${formatGst(toDelete.gstRate, toDelete.cessRate)} starting ${formatDay(toDelete.effectiveFrom)}? It has not started yet, so no bill uses it.`
            : ''
        }
        confirmLabel="Delete"
        loadingLabel="Deleting..."
      />
    </div>
  );
}
