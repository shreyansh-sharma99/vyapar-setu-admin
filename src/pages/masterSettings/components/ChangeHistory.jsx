import { useEffect, useState } from 'react';
import { ArrowRight, Ban, Trash2 } from 'lucide-react';
import Table from '@/components/table/Table';
import ConfirmDialog from '@/pages/storeManagement/products/components/ConfirmDialog';
import { getApiErrorMessage } from '@/pages/storeManagement/products/utils/productUtils';
import { deleteTaxRateApi, getGstHistoryApi } from '../services/gstRateService';
import { cancelOfferApi, deletePriceApi, getOfferHistoryApi, getPriceHistoryApi } from '../services/priceMasterService';
import { formatDay } from './gstUtils';
import { describeOffer, describePriceSource, formatMoney } from './priceUtils';
import ProductThumb from './ProductThumb';

const STATUS = {
  current: ['Current', 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'],
  active: ['Running', 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'],
  upcoming: ['Starts later', 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'],
  old: ['Old', 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10'],
  expired: ['Ended', 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10'],
  cancelled: ['Cancelled', 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'],
};
const StatusPill = ({ status }) => {
  const [label, cls] = STATUS[status] || STATUS.old;
  return <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${cls}`}>{label}</span>;
};

const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const pct = (n) => (n === null || n === undefined ? '—' : `${Number(n)}%`);
const filterInput = 'h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none';

const KINDS = {
  gst: { load: getGstHistoryApi, empty: 'No GST changes found.', dateLabel: 'Applicable from' },
  price: { load: getPriceHistoryApi, empty: 'No price changes found.', dateLabel: 'Applicable from' },
  offer: { load: getOfferHistoryApi, empty: 'No offers found.', dateLabel: 'Offer start' },
};

/**
 * Every GST / price / offer change of all products in one list: newest first, server-side
 * pagination, search (product, SKU, changed by, note), a date range (applicable / start date or
 * the day it was changed) and "changed by". A change that has not started yet can be deleted
 * (offers: cancelled while upcoming or running).
 */
export default function ChangeHistory({ kind = 'gst', notify, reloadKey = 0 }) {
  const cfg = KINDS[kind];
  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [changedBy, setChangedBy] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateOn, setDateOn] = useState('effective');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [state, setState] = useState({ key: '', rows: [], total: 0, error: '' });
  const [refresh, setRefresh] = useState(0);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const params = {
    page,
    limit: pageSize,
    dateOn,
    ...(query ? { search: query } : {}),
    ...(changedBy.trim() ? { changedBy: changedBy.trim() } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };
  const key = `${kind}:${JSON.stringify(params)}:${refresh}:${reloadKey}`;

  useEffect(() => {
    let alive = true;
    cfg
      .load(params)
      .then((res) => alive && setState({ key, rows: res?.data || [], total: res?.meta?.total || 0, error: '' }))
      .catch(async (err) => {
        const message = await getApiErrorMessage(err, 'Could not load the history');
        if (alive) setState({ key, rows: [], total: 0, error: message });
      });
    return () => {
      alive = false;
    };
    // params are part of `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const loading = state.key !== key;

  const resetPage = (fn) => (v) => {
    fn(v);
    setPage(1);
  };

  const runAction = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const pid = target.product._id;
      const res = kind === 'gst' ? await deleteTaxRateApi(pid, target._id) : kind === 'price' ? await deletePriceApi(pid, target._id) : await cancelOfferApi(pid, target._id);
      notify?.(res?.message || (kind === 'offer' ? 'Offer cancelled' : 'Deleted'), 'success');
      setRefresh((r) => r + 1);
    } catch (err) {
      notify?.(await getApiErrorMessage(err, 'Could not do that'), 'danger');
    } finally {
      setBusy(false);
      setTarget(null);
    }
  };

  const productCell = (r) => (
    <div className="flex items-center gap-2.5 min-w-0 text-left">
      <ProductThumb product={r.product} size="sm" />
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-[var(--vs-text-primary)] truncate max-w-[220px]">{r.product.name}</span>
        {r.product.sku && <span className="text-[10px] font-mono text-[var(--vs-text-secondary)]">{r.product.sku}</span>}
      </div>
    </div>
  );
  const changeCell = (oldV, newV, fmt) => (
    <span className="inline-flex items-center gap-1.5 font-mono whitespace-nowrap">
      <span className="text-[var(--vs-text-secondary)]">{oldV === null || oldV === undefined ? '—' : fmt(oldV)}</span>
      <ArrowRight className="w-3 h-3 text-gray-400" />
      <span className="font-bold text-[var(--vs-text-primary)]">{fmt(newV)}</span>
    </span>
  );
  const byCell = (r) => (
    <div className="flex flex-col text-xs text-left">
      <span className="font-semibold">{r.changedBy || '—'}</span>
      <span className="text-[var(--vs-text-secondary)]">{fmtWhen(r.changedAt)}</span>
    </div>
  );
  const actionCell = (r) => {
    const can = kind === 'offer' ? r.canCancel : r.canDelete;
    if (!can) return <span className="text-[var(--vs-text-secondary)] text-xs">—</span>;
    const Icon = kind === 'offer' ? Ban : Trash2;
    return (
      <button
        type="button"
        title={kind === 'offer' ? 'Cancel this offer' : 'Delete this change (it has not started yet)'}
        onClick={() => setTarget(r)}
        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  };

  const headers =
    kind === 'gst'
      ? [
          { label: 'Product', key: 'product', render: productCell },
          { label: 'GST (old → new)', key: 'gstRate', render: (r) => changeCell(r.oldGstRate, r.gstRate, pct) },
          { label: 'Applicable from', key: 'effectiveFrom', render: (r) => formatDay(r.effectiveFrom) },
          { label: 'Status', key: 'status', render: (r) => <StatusPill status={r.status} /> },
          { label: 'Changed by', key: 'changedBy', render: byCell },
          { label: 'Note', key: 'note', render: (r) => <span className="text-xs">{r.note || (r.replaced ? `Replaced ${r.replaced} same-day rate(s)` : '—')}</span> },
          { label: 'Delete', key: 'del', render: actionCell },
        ]
      : kind === 'price'
        ? [
            { label: 'Product', key: 'product', render: productCell },
            {
              label: 'Price (old → new)',
              key: 'sellingPrice',
              render: (r) => (
                <div className="flex flex-col items-start">
                  {changeCell(r.oldPrice, r.sellingPrice, formatMoney)}
                  <span className="text-[10px] text-[var(--vs-text-secondary)]">{r.priceIncludesGst ? 'incl. GST' : '+ GST'}</span>
                </div>
              ),
            },
            { label: 'Applicable from', key: 'effectiveFrom', render: (r) => formatDay(r.effectiveFrom) },
            { label: 'Source', key: 'source', render: (r) => <span className="text-xs">{describePriceSource(r)}</span> },
            { label: 'Status', key: 'status', render: (r) => <StatusPill status={r.status} /> },
            { label: 'Changed by', key: 'changedBy', render: byCell },
            { label: 'Delete', key: 'del', render: actionCell },
          ]
        : [
            { label: 'Product', key: 'product', render: productCell },
            { label: 'Offer', key: 'offer', render: (r) => <span className="font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{describeOffer(r)}</span> },
            { label: 'Dates', key: 'dates', render: (r) => <span className="text-xs whitespace-nowrap">{formatDay(r.startDate)} – {formatDay(r.endDate)}</span> },
            { label: 'Status', key: 'status', render: (r) => <StatusPill status={r.status} /> },
            { label: 'Changed by', key: 'changedBy', render: byCell },
            { label: 'Cancel', key: 'del', render: actionCell },
          ];

  return (
    <div className="flex flex-col gap-3">
      {state.error && <div className="text-xs text-rose-600 dark:text-rose-400">{state.error}</div>}
      <Table
        headers={headers}
        data={state.rows}
        loading={loading}
        searchPlaceholder="Search product, SKU, note..."
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearchClick={() => {
          setPage(1);
          setQuery(searchTerm.trim());
        }}
        onSearchClear={() => {
          setPage(1);
          setSearchTerm('');
          setQuery('');
        }}
        emptyMessage={cfg.empty}
        currentPage={page}
        pageSize={pageSize}
        totalRows={state.total}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select value={dateOn} onChange={(e) => resetPage(setDateOn)(e.target.value)} className={`${filterInput} cursor-pointer`} title="Which date the range filters">
              <option value="effective">{cfg.dateLabel}</option>
              <option value="changed">Changed on</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => resetPage(setDateFrom)(e.target.value)} className={filterInput} title="From date" />
            <input type="date" value={dateTo} onChange={(e) => resetPage(setDateTo)(e.target.value)} className={filterInput} title="To date" />
            <input type="text" value={changedBy} onChange={(e) => resetPage(setChangedBy)(e.target.value)} placeholder="Changed by" className={`${filterInput} w-36`} />
          </div>
        }
      />

      <ConfirmDialog
        isOpen={!!target}
        onClose={() => setTarget(null)}
        onConfirm={runAction}
        isLoading={busy}
        title={kind === 'offer' ? 'Cancel offer?' : kind === 'gst' ? 'Delete GST change?' : 'Delete price change?'}
        message={
          target
            ? kind === 'offer'
              ? `Cancel ${describeOffer(target)} on "${target.product.name}"? It stops at once.`
              : `Delete the change of "${target.product.name}" from ${formatDay(target.effectiveFrom)}? It has not started yet, so no bill uses it.`
            : ''
        }
        confirmText={kind === 'offer' ? 'Cancel offer' : 'Delete'}
        loadingText="Working..."
      />
    </div>
  );
}
