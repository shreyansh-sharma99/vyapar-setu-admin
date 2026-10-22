import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import DeleteModal from '@/components/modal/DeleteModal';
import { getApiErrorMessage } from '@/pages/storeManagement/products/utils/productUtils';
import { deleteTaxRateApi, getTaxRatesApi } from '../services/gstRateService';
import { formatDay, formatGst } from './gstUtils';

const STATUS_PILL = {
  current: {
    label: 'Current',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  upcoming: {
    label: 'Starts later',
    cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
  },
  old: {
    label: 'Old bills only',
    cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10',
  },
};

const StatusPill = ({ status }) => {
  const s = STATUS_PILL[status] || STATUS_PILL.old;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${s.cls}`}>
      {s.label}
    </span>
  );
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
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--vs-text-secondary)]">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading GST history...
      </div>
    );
  }

  if (state.error && !loading) {
    return (
      <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.error}
        </span>
        <Button size="xs" variant="outline" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${loading ? 'opacity-60' : ''}`}>
      {current && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--vs-text-secondary)]">
          <span>
            Current GST: <span className="font-bold text-[var(--vs-text-primary)]">{formatGst(current.gstRate, current.cessRate)}</span>
          </span>
          <span>
            {current.source === 'product' || !current.effectiveFrom ? 'from product card' : `from ${formatDay(current.effectiveFrom)}`}
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl border border-dashed border-[var(--vs-border)]">
          No dated GST rates yet. Bills use the GST on the product card. Use “Change GST rate” above when the GST changes from a date.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
          <table className="w-full text-left border-collapse text-xs min-w-[680px]">
            <thead>
              <tr className="bg-[var(--vs-bg-secondary)] text-[11px] uppercase tracking-wider text-[var(--vs-text-secondary)] font-bold">
                <th className="py-2 px-3 border border-[var(--vs-border)]">Applicable from</th>
                <th className="py-2 px-3 border border-[var(--vs-border)] text-right">GST %</th>
                <th className="py-2 px-3 border border-[var(--vs-border)]">Status</th>
                <th className="py-2 px-3 border border-[var(--vs-border)]">Set by</th>
                <th className="py-2 px-3 border border-[var(--vs-border)]">Note</th>
                {!readOnly && <th className="py-2 px-3 border border-[var(--vs-border)] text-center w-12" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody className="text-[var(--vs-text-secondary)]">
              {rows.map((r) => (
                <tr key={r._id} className={`hover:bg-gray-50/50 dark:hover:bg-white/[0.01] ${r.status === 'old' ? 'opacity-70' : ''}`}>
                  <td className="py-2 px-3 border border-[var(--vs-border)] font-semibold text-[var(--vs-text-primary)] whitespace-nowrap">{formatDay(r.effectiveFrom)}</td>
                  <td className="py-2 px-3 border border-[var(--vs-border)] text-right font-mono font-bold text-[var(--vs-text-primary)]">{Number(r.gstRate) || 0}%</td>
                  <td className="py-2 px-3 border border-[var(--vs-border)]">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="py-2 px-3 border border-[var(--vs-border)]">
                    <div className="flex flex-col">
                      <span className="font-medium text-[var(--vs-text-primary)]">{r.createdByName || '—'}</span>
                      {r.createdAt && <span className="text-[10px]">{dayjs(r.createdAt).format('DD MMM YYYY, hh:mm A')}</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3 border border-[var(--vs-border)] max-w-[260px] break-words">
                    {r.note || '—'}
                    {(r.previous || []).map((pv, i) => (
                      <div key={i} className="text-[10px] mt-0.5">
                        Replaced {Number(pv.gstRate) || 0}% set by {pv.createdByName || '—'}
                        {pv.replacedAt ? ` (changed ${dayjs(pv.replacedAt).format('DD MMM, hh:mm A')}${pv.replacedByName ? ` by ${pv.replacedByName}` : ''})` : ''}
                      </div>
                    ))}
                  </td>
                  {!readOnly && (
                  <td className="py-2 px-3 border border-[var(--vs-border)] text-center">
                    {r.status === 'upcoming' && (
                      <button
                        type="button"
                        onClick={() => setToDelete(r)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                        title="Delete this rate"
                      >
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

      <DeleteModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={deleting}
        title="Delete GST rate"
        message={
          toDelete
            ? `Delete GST ${formatGst(toDelete.gstRate, toDelete.cessRate)} starting ${formatDay(toDelete.effectiveFrom)}? It has not started yet, so no bill uses it.`
            : ''
        }
      />
    </div>
  );
}
