import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2, Wallet, Hourglass, TrendingDown, FileMinus, Truck, Package, IndianRupee, Plus, Undo2 } from 'lucide-react';
import { Button, Card, ConfirmDialog, DataTable, Input, PageHeader, StatCard } from '@/components/ui';
import { cn } from '@/lib/utils';
import PurchaseToaster from '../components/PurchaseToaster';
import RefundReceivedModal from '../components/RefundReceivedModal';
import useApi from '../components/useApi';
import { notify, notifyError } from '../components/toast';
import { PATHS, editPath, errMsg, fmtDate, formatINR, formatQty, num, returnRefundLeft, supplierName, viewPath } from '../components/helpers';
import { fetchPurchaseReturns, deletePurchaseReturn } from './services/purchaseReturnSlice';
import { getPurchaseReturnStatsApi } from './services/purchaseReturnService';

const FILTERS = [
  { value: 'all', label: 'All returns' },
  { value: 'refund_pending', label: 'Money to receive' },
  { value: 'refund_received', label: 'Money received' },
  { value: 'draft', label: 'Not finished' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Rank chip colours: 1st, 2nd, 3rd. */
const RANK_TONE = ['bg-highlight-soft text-highlight', 'bg-fill text-ink-muted', 'bg-warning-soft text-warning'];

/** Top 3 card (store / supplier / product): rank, name, count + value and a bar against the leader. */
function RankCard({ title, icon: Icon, rows, qty = false }) {
  const count = (r) => (qty ? `${formatQty(r.qty)} units` : `${r.returns} ${r.returns === 1 ? 'return' : 'returns'}`);
  const metric = (r) => num(qty ? r.qty : r.returns);
  const top = rows.slice(0, 3);
  const max = Math.max(1, ...top.map(metric));
  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5 text-[13px] font-medium text-ink-muted">
          <span className="grid size-8 place-items-center rounded-[10px] bg-brand-soft text-brand-ink">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          {title}
        </span>
        {rows.length > 3 && <span className="text-xs text-ink-subtle">top 3 of {rows.length}</span>}
      </div>
      {top.length === 0 ? (
        <div className="py-2 text-sm text-ink-subtle">No returns yet</div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {top.map((r, i) => (
            <li key={`${r.id}-${i}`} className="flex min-w-0 items-center gap-2.5">
              <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', RANK_TONE[i])}>{r.rank}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink" title={r.name}>
                    {r.name}
                  </span>
                  <span className="whitespace-nowrap text-xs font-semibold text-ink-subtle">
                    {count(r)}
                    {num(r.value) > 0 && <span className="tabular-nums text-ink"> · {formatINR(r.value)}</span>}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-fill">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(6, (metric(r) / max) * 100)}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function PurchaseReturnList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, meta, listLoading, listError, saving } = useSelector((state) => state.purchaseReturn);

  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refresh, setRefresh] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);

  const { data: statsRes } = useApi(`return-stats:${dateFrom}:${dateTo}:${refresh}`, () =>
    getPurchaseReturnStatsApi({ ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) })
  );
  const stats = statsRes?.data;

  useEffect(() => {
    const params = { page, limit: pageSize, sort: 'returnDate', order: 'desc' };
    if (status === 'refund_pending') params.refundStatus = 'pending';
    else if (status === 'refund_received') params.refundStatus = 'received';
    else if (status !== 'all') params.status = status;
    if (query) params.search = query;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    dispatch(fetchPurchaseReturns(params));
  }, [dispatch, page, pageSize, status, query, dateFrom, dateTo, refresh]);

  useEffect(() => {
    if (listError) notifyError(listError);
  }, [listError]);

  const changeStatus = (v) => {
    setStatus(v);
    setPage(1);
  };

  const handleDelete = async () => {
    try {
      const res = await dispatch(deletePurchaseReturn(deleteTarget._id)).unwrap();
      notify(res?.message || 'Purchase return deleted');
      setRefresh((r) => r + 1);
    } catch (e) {
      notifyError(errMsg(e));
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = [
    { key: 'returnNumber', header: 'Return no', type: 'mono', mobile: 'title' },
    { key: 'returnDate', header: 'Date', render: (r) => fmtDate(r.returnDate) },
    { key: 'supplier', header: 'Supplier', render: (r) => <span className="font-semibold">{supplierName(r)}</span> },
    {
      key: 'bill',
      header: 'Against bill',
      hideBelow: 'xl',
      render: (r) => (r.purchaseBillId ? <span className="font-mono text-[13px]">{r.purchaseBillId.billNumber || '—'}</span> : '—'),
    },
    { key: 'totalAmount', header: 'Goods value (₹)', type: 'money', mobile: 'amount', render: (r) => formatINR(r.totalAmount) },
    {
      key: 'lossAmount',
      header: 'Loss (₹)',
      type: 'money',
      hideBelow: 'xl',
      render: (r) => (num(r.lossAmount) > 0 ? <span className="font-medium text-danger">{formatINR(r.lossAmount)}</span> : <span className="font-normal text-ink-subtle">—</span>),
    },
    {
      key: 'refund',
      header: 'Money back',
      render: (r) => {
        const left = returnRefundLeft(r);
        if (left > 0) {
          return (
            <span className="font-semibold text-danger" title={`${formatINR(left)} still to collect`}>
              Not received
            </span>
          );
        }
        if (r.refundStatus === 'received') return <span className="font-semibold text-success">Received</span>;
        if (r.status === 'confirmed' && num(r.billAdjustedAmount) > 0) return <span className="text-xs text-ink-muted">Cut from bill</span>;
        return <span className="text-ink-subtle">—</span>;
      },
    },
    {
      key: 'refundLeft',
      header: 'To collect (₹)',
      type: 'money',
      render: (r) => {
        const left = returnRefundLeft(r);
        if (left <= 0) return <span className="font-normal text-ink-subtle">—</span>;
        return (
          <span className="inline-flex items-center justify-end gap-2">
            <span className="text-danger">{formatINR(left)}</span>
            <Button variant="soft" size="xs" startIcon={<IndianRupee />} onClick={() => setRefundTarget(r)} title={`Collect ${formatINR(left)} from the supplier`}>
              Collect
            </Button>
          </span>
        );
      },
    },
    { key: 'status', header: 'Status', type: 'status', statusLabel: (r) => (r.status === 'draft' ? 'Not finished' : undefined) },
  ];

  const rowActions = (r) => [
    { label: 'View', icon: Eye, onClick: () => navigate(viewPath('returns', r._id)) },
    r.status === 'draft' && { label: 'Edit', icon: Edit2, onClick: () => navigate(editPath('returns', r._id)) },
    returnRefundLeft(r) > 0 && { label: `Collect ${formatINR(returnRefundLeft(r))}`, icon: IndianRupee, onClick: () => setRefundTarget(r) },
    ['draft', 'cancelled'].includes(r.status) && { divider: true },
    ['draft', 'cancelled'].includes(r.status) && { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteTarget(r) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Purchase Returns"
        actions={<Button startIcon={<Plus />} onClick={() => navigate(`${PATHS.returns}/create`)}>New Return</Button>}
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Received back"
            value={formatINR(stats?.received)}
            icon={Wallet}
            tone="success"
            active={status === 'refund_received'}
            onClick={() => changeStatus(status === 'refund_received' ? 'all' : 'refund_received')}
          />
          <StatCard
            label="To receive"
            value={formatINR(stats?.toReceive)}
            icon={Hourglass}
            tone="danger"
            active={status === 'refund_pending'}
            onClick={() => changeStatus(status === 'refund_pending' ? 'all' : 'refund_pending')}
          />
          <StatCard label="Loss" value={formatINR(stats?.loss)} icon={TrendingDown} tone="warning" />
          <StatCard label="Cut from bills" value={formatINR(stats?.setOff)} icon={FileMinus} tone="primary" />
        </div>
        {(dateFrom || dateTo) && <p className="m-0 text-xs text-ink-subtle">Totals are for the selected return dates.</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RankCard key={`p-${refresh}`} title="Top supplier" icon={Truck} rows={stats?.topSuppliers || []} />
        <RankCard key={`q-${refresh}`} title="Top product" icon={Package} rows={stats?.topProducts || []} qty />
      </div>

      <DataTable
        columns={columns}
        rows={list}
        loading={listLoading}
        tabs={FILTERS}
        tab={status}
        onTabChange={changeStatus}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Search return no, supplier, product...',
          onSubmit: () => {
            setPage(1);
            setQuery(searchTerm.trim());
          },
          onClear: () => {
            setPage(1);
            setQuery('');
          },
        }}
        filters={
          <>
            <Input size="sm" type="date" aria-label="From date" title="From date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} wrapperClassName="w-40" />
            <Input size="sm" type="date" aria-label="To date" title="To date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} wrapperClassName="w-40" />
          </>
        }
        rowActions={rowActions}
        onRowClick={(r) => navigate(viewPath('returns', r._id))}
        empty={{
          icon: Undo2,
          title: 'No purchase returns found.',
          action: <Button startIcon={<Plus />} onClick={() => navigate(`${PATHS.returns}/create`)}>New Return</Button>,
        }}
        pagination={{
          page,
          pageSize,
          total: meta?.total || 0,
          onPageChange: setPage,
          onPageSizeChange: (s) => {
            setPageSize(s);
            setPage(1);
          },
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete purchase return"
        message={`Delete ${deleteTarget?.returnNumber || 'this return'}? This cannot be undone.`}
        confirmLabel="Delete"
        icon={Trash2}
        loading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      {refundTarget && (
        <RefundReceivedModal
          ret={refundTarget}
          onClose={() => setRefundTarget(null)}
          onDone={() => {
            setRefundTarget(null);
            setRefresh((r) => r + 1);
          }}
        />
      )}
      <PurchaseToaster />
    </div>
  );
}
