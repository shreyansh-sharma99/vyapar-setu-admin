import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Ban, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, ConfirmDialog, DataTable, DatePicker, Input, Select } from '@/components/ui';
import { getApiErrorMessage } from '@/pages/storeManagement/products/utils/productUtils';
import { deleteTaxRateApi, getGstHistoryApi } from '../services/gstRateService';
import { cancelOfferApi, deletePriceApi, getOfferHistoryApi, getPriceHistoryApi } from '../services/priceMasterService';
import { formatDay } from './gstUtils';
import { describeOffer, describePriceSource, formatMoney } from './priceUtils';
import ProductThumb from './ProductThumb';

const STATUS = {
  current: ['Current', 'success'],
  active: ['Running', 'success'],
  upcoming: ['Starts later', 'info'],
  old: ['Old', 'neutral'],
  expired: ['Ended', 'neutral'],
  cancelled: ['Cancelled', 'danger'],
};
const StatusPill = ({ status }) => {
  const [label, tone] = STATUS[status] || STATUS.old;
  return <Badge tone={tone}>{label}</Badge>;
};

const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const pct = (n) => (n === null || n === undefined ? '—' : `${Number(n)}%`);
/** 'YYYY-MM-DD' filter state <-> the DatePicker's dayjs value. */
const toDay = (v) => (v ? dayjs(v) : null);
const fromDay = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '');

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
    <div className="flex min-w-0 items-center gap-2.5 text-left">
      <ProductThumb product={r.product} size="sm" />
      <span className="max-w-[220px] truncate font-semibold text-ink">{r.product.name}</span>
    </div>
  );
  const skuCell = (r) => (r.product.sku ? <span className="font-mono text-[11px] text-ink-subtle">{r.product.sku}</span> : <span className="text-ink-subtle">—</span>);
  const oldCell = (oldV, fmt) => <span className="whitespace-nowrap tabular-nums text-ink-subtle">{oldV === null || oldV === undefined ? '—' : fmt(oldV)}</span>;
  const newCell = (newV, fmt) => (
    <Badge tone="primary" className="tabular-nums">
      {fmt(newV)}
    </Badge>
  );
  const byCell = (r) => <span className="text-xs font-semibold text-ink">{r.changedBy || '—'}</span>;
  const whenCell = (r) => <span className="whitespace-nowrap text-xs text-ink-subtle">{fmtWhen(r.changedAt)}</span>;
  const actionCell = (r) => {
    const can = kind === 'offer' ? r.canCancel : r.canDelete;
    if (!can) return <span className="text-xs text-ink-subtle">—</span>;
    const Icon = kind === 'offer' ? Ban : Trash2;
    const title = kind === 'offer' ? 'Cancel this offer' : 'Delete this change (it has not started yet)';
    return (
      <Button variant="ghost" size="icon-sm" title={title} aria-label={title} onClick={() => setTarget(r)} className="hover:bg-danger-soft hover:text-danger">
        <Icon />
      </Button>
    );
  };

  const columns =
    kind === 'gst'
      ? [
          { header: 'Product', key: 'product', render: productCell, mobile: 'title' },
          { header: 'SKU', key: 'sku', render: skuCell, hideBelow: 'lg' },
          { header: 'Old GST', key: 'oldGstRate', render: (r) => oldCell(r.oldGstRate, pct) },
          { header: 'New GST', key: 'gstRate', render: (r) => newCell(r.gstRate, pct) },
          { header: 'Applicable from', key: 'effectiveFrom', render: (r) => formatDay(r.effectiveFrom) },
          { header: 'Status', key: 'status', render: (r) => <StatusPill status={r.status} /> },
          { header: 'Changed by', key: 'changedBy', render: byCell },
          { header: 'Changed on', key: 'changedAt', render: whenCell, hideBelow: 'xl' },
          { header: 'Note', key: 'note', render: (r) => <span className="text-xs text-ink-muted">{r.note || (r.replaced ? `Replaced ${r.replaced} same-day rate(s)` : '—')}</span> },
          { header: 'Delete', key: 'del', render: actionCell, align: 'center' },
        ]
      : kind === 'price'
        ? [
            { header: 'Product', key: 'product', render: productCell, mobile: 'title' },
            { header: 'SKU', key: 'sku', render: skuCell, hideBelow: 'lg' },
            { header: 'Old price', key: 'oldPrice', render: (r) => oldCell(r.oldPrice, formatMoney) },
            { header: 'New price', key: 'sellingPrice', render: (r) => newCell(r.sellingPrice, formatMoney) },
            { header: 'GST in price', key: 'priceIncludesGst', hideBelow: 'xl', render: (r) => <span className="text-[11px] text-ink-subtle">{r.priceIncludesGst ? 'incl. GST' : '+ GST'}</span> },
            { header: 'Applicable from', key: 'effectiveFrom', render: (r) => formatDay(r.effectiveFrom) },
            { header: 'Source', key: 'source', render: (r) => <span className="text-xs text-ink-muted">{describePriceSource(r)}</span> },
            { header: 'Status', key: 'status', render: (r) => <StatusPill status={r.status} /> },
            { header: 'Changed by', key: 'changedBy', render: byCell },
            { header: 'Changed on', key: 'changedAt', render: whenCell, hideBelow: 'xl' },
            { header: 'Delete', key: 'del', render: actionCell, align: 'center' },
          ]
        : [
            { header: 'Product', key: 'product', render: productCell, mobile: 'title' },
            { header: 'SKU', key: 'sku', render: skuCell, hideBelow: 'lg' },
            { header: 'Offer', key: 'offer', render: (r) => <span className="whitespace-nowrap font-semibold text-success">{describeOffer(r)}</span> },
            { header: 'Starts', key: 'dates', render: (r) => <span className="whitespace-nowrap text-xs tabular-nums">{formatDay(r.startDate)}</span> },
            { header: 'Ends', key: 'endDate', render: (r) => <span className="whitespace-nowrap text-xs tabular-nums">{formatDay(r.endDate)}</span> },
            { header: 'Status', key: 'status', render: (r) => <StatusPill status={r.status} /> },
            { header: 'Changed by', key: 'changedBy', render: byCell },
            { header: 'Changed on', key: 'changedAt', render: whenCell, hideBelow: 'xl' },
            { header: 'Cancel', key: 'del', render: actionCell, align: 'center' },
          ];

  const submitSearch = () => {
    setPage(1);
    setQuery(searchTerm.trim());
  };

  return (
    <div className="flex flex-col gap-3">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <DataTable
        columns={columns}
        rows={state.rows}
        loading={loading}
        columnPicker={false}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          onSubmit: submitSearch,
          onClear: () => {
            setPage(1);
            setSearchTerm('');
            setQuery('');
          },
          placeholder: 'Search product, SKU, note...',
        }}
        filters={
          <>
            <Select
              size="sm"
              searchable={false}
              wrapperClassName="w-40"
              aria-label="Which date the range filters"
              options={[
                { value: 'effective', label: cfg.dateLabel },
                { value: 'changed', label: 'Changed on' },
              ]}
              value={dateOn}
              onChange={(v) => resetPage(setDateOn)(v)}
            />
            <DatePicker size="sm" className="!w-36" placeholder="From date" aria-label="From date" value={toDay(dateFrom)} onChange={(d) => resetPage(setDateFrom)(fromDay(d))} />
            <DatePicker size="sm" className="!w-36" placeholder="To date" aria-label="To date" value={toDay(dateTo)} onChange={(d) => resetPage(setDateTo)(fromDay(d))} />
            <Input size="sm" wrapperClassName="w-36" value={changedBy} onChange={(e) => resetPage(setChangedBy)(e.target.value)} placeholder="Changed by" aria-label="Changed by" />
          </>
        }
        empty={cfg.empty}
        pagination={{
          page,
          pageSize,
          total: state.total,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
      />

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={runAction}
        loading={busy}
        title={kind === 'offer' ? 'Cancel offer?' : kind === 'gst' ? 'Delete GST change?' : 'Delete price change?'}
        message={
          target
            ? kind === 'offer'
              ? `Cancel ${describeOffer(target)} on "${target.product.name}"? It stops at once.`
              : `Delete the change of "${target.product.name}" from ${formatDay(target.effectiveFrom)}? It has not started yet, so no bill uses it.`
            : ''
        }
        confirmLabel={kind === 'offer' ? 'Cancel offer' : 'Delete'}
        loadingLabel="Working..."
        icon={kind === 'offer' ? Ban : Trash2}
      />
    </div>
  );
}
