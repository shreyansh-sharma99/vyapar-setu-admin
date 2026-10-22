import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2, Wallet, Hourglass, TrendingDown, FileMinus, Store, Truck, Package, IndianRupee } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import Card from '@/components/breadCrumbs/Card';
import TableInfoCard from '@/components/table/TableInfoCard';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import RefundReceivedModal from '../components/RefundReceivedModal';
import { FilterSelect, StatusBadge } from '../components/ui';
import useApi from '../components/useApi';
import { notify, notifyError } from '../components/toast';
import { PATHS, editPath, errMsg, fmtDate, formatINR, formatQty, num, returnRefundLeft, storeName, supplierName, viewPath } from '../components/helpers';
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

const dateInput = 'h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none';

/** One-line "most returns" picker: the dropdown lists 1, 2, 3 … */
const RANK_TONE = [
  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
];

/** Top 3 card (store / supplier / product): rank, name, count + value and a bar against the leader. */
function RankCard({ title, icon, rows, qty = false }) {
  const count = (r) => (qty ? `${formatQty(r.qty)} units` : `${r.returns} ${r.returns === 1 ? 'return' : 'returns'}`);
  const metric = (r) => num(qty ? r.qty : r.returns);
  const top = rows.slice(0, 3);
  const max = Math.max(1, ...top.map(metric));
  return (
    <div className="rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] p-3 flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
          <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">{icon}</span>
          {title}
        </span>
        {rows.length > 3 && <span className="text-[10px] text-[var(--vs-text-secondary)]">top 3 of {rows.length}</span>}
      </div>
      {top.length === 0 ? (
        <div className="text-sm text-[var(--vs-text-secondary)] py-2">No returns yet</div>
      ) : (
        <ul className="flex flex-col gap-2 m-0 p-0 list-none">
          {top.map((r, i) => (
            <li key={`${r.id}-${i}`} className="flex items-center gap-2.5 min-w-0">
              <span className={`w-6 h-6 shrink-0 rounded-full text-[11px] font-bold flex items-center justify-center ${RANK_TONE[i]}`}>{r.rank}</span>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 min-w-0">
                  <span className="text-sm font-semibold text-[var(--vs-text-primary)] truncate" title={r.name}>
                    {r.name}
                  </span>
                  <span className="text-xs font-semibold text-[var(--vs-text-secondary)] whitespace-nowrap">
                    {count(r)}
                    {num(r.value) > 0 && <span className="font-mono text-[var(--vs-text-primary)]"> · {formatINR(r.value)}</span>}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${Math.max(6, (metric(r) / max) * 100)}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
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

  const iconBtn = 'p-1 rounded-lg transition-colors cursor-pointer';

  const headers = [
    {
      label: 'Actions',
      key: 'actions',
      render: (r) => (
        <div className="flex items-center justify-center gap-0.5">
          <button type="button" title="View" onClick={() => navigate(viewPath('returns', r._id))} className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10`}>
            <Eye className="w-4 h-4" />
          </button>
          {r.status === 'draft' && (
            <button type="button" title="Edit" onClick={() => navigate(editPath('returns', r._id))} className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10`}>
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {returnRefundLeft(r) > 0 && (
            <button
              type="button"
              title={`Collect ${formatINR(returnRefundLeft(r))} from the supplier`}
              onClick={() => setRefundTarget(r)}
              className={`${iconBtn} text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10`}
            >
              <IndianRupee className="w-4 h-4" />
            </button>
          )}
          {['draft', 'cancelled'].includes(r.status) && (
            <button type="button" title="Delete" onClick={() => setDeleteTarget(r)} className={`${iconBtn} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10`}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
    { label: 'Return no', key: 'returnNumber', value: 'checked', cellClassName: 'font-mono font-semibold' },
    { label: 'Date', key: 'returnDate', value: 'checked', render: (r) => fmtDate(r.returnDate) },
    { label: 'Supplier', key: 'supplier', value: 'checked', render: (r) => <span className="font-medium">{supplierName(r)}</span> },
    {
      label: 'Against bill',
      key: 'bill',
      value: 'checked',
      render: (r) => (r.purchaseBillId ? <span className="font-mono text-xs">{r.purchaseBillId.billNumber || '—'}</span> : '—'),
    },
    { label: 'Store', key: 'store', value: 'checked', render: (r) => storeName(r) },
    {
      label: 'Goods value',
      key: 'totalAmount',
      value: 'checked',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-semibold">{formatINR(r.totalAmount)}</span>
          {num(r.lossAmount) > 0 && <span className="text-[11px] text-rose-600 dark:text-rose-400">Loss {formatINR(r.lossAmount)}</span>}
        </div>
      ),
    },
    {
      label: 'Money back',
      key: 'refund',
      value: 'checked',
      render: (r) => {
        const left = returnRefundLeft(r);
        if (left > 0) {
          return (
            <span className="font-semibold text-rose-600 dark:text-rose-400" title={`${formatINR(left)} still to collect`}>
              Not received <span className="font-normal text-[11px]">({formatINR(left)})</span>
            </span>
          );
        }
        if (r.refundStatus === 'received') return <span className="font-semibold text-emerald-600 dark:text-emerald-400">Received</span>;
        if (r.status === 'confirmed' && num(r.billAdjustedAmount) > 0) return <span className="text-xs text-[var(--vs-text-secondary)]">Cut from bill</span>;
        return <span className="text-[var(--vs-text-secondary)]">—</span>;
      },
    },
    { label: 'Status', key: 'status', value: 'checked', render: (r) => <StatusBadge status={r.status} label={r.status === 'draft' ? 'Not finished' : undefined} /> },
  ];

  return (
    <div>
      <Card
        h1="Purchase Returns"
        bodyClassName="px-4 pb-4 pt-2 flex flex-col gap-2"
        rightNode={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={dateInput} title="From date" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={dateInput} title="To date" />
            <FilterSelect value={status} onChange={changeStatus} options={FILTERS} />
          </div>
        }
      >
        <TableInfoCard
          stats={[
            {
              label: 'Received back',
              value: formatINR(stats?.received),
              icon: <Wallet className="w-4 h-4 text-emerald-500" />,
              colorClass: 'text-emerald-600 dark:text-emerald-400',
              isActive: status === 'refund_received',
              onClick: () => changeStatus(status === 'refund_received' ? 'all' : 'refund_received'),
            },
            {
              label: 'To receive',
              value: formatINR(stats?.toReceive),
              icon: <Hourglass className="w-4 h-4 text-rose-500" />,
              colorClass: 'text-rose-600 dark:text-rose-400',
              isActive: status === 'refund_pending',
              onClick: () => changeStatus(status === 'refund_pending' ? 'all' : 'refund_pending'),
            },
            { label: 'Loss', value: formatINR(stats?.loss), icon: <TrendingDown className="w-4 h-4 text-amber-500" />, colorClass: 'text-amber-600 dark:text-amber-400' },
            { label: 'Cut from bills', value: formatINR(stats?.setOff), icon: <FileMinus className="w-4 h-4 text-indigo-500" />, colorClass: 'text-indigo-600 dark:text-indigo-400' },
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RankCard key={`s-${refresh}`} title="Top store" icon={<Store className="w-3.5 h-3.5" />} rows={stats?.topStores || []} />
          <RankCard key={`p-${refresh}`} title="Top supplier" icon={<Truck className="w-3.5 h-3.5" />} rows={stats?.topSuppliers || []} />
          <RankCard key={`q-${refresh}`} title="Top product" icon={<Package className="w-3.5 h-3.5" />} rows={stats?.topProducts || []} qty />
        </div>

        <Table
          headers={headers}
          data={list}
          loading={listLoading}
          searchPlaceholder="Search return no, supplier, product..."
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSearchClick={() => {
            setPage(1);
            setQuery(searchTerm.trim());
          }}
          onSearchClear={() => {
            setPage(1);
            setQuery('');
          }}
          emptyMessage="No purchase returns found."
          currentPage={page}
          pageSize={pageSize}
          totalRows={meta?.total || 0}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          actions={<Button onClick={() => navigate(`${PATHS.returns}/create`)}>New Return</Button>}
        />
      </Card>
      <DeleteModal
        isOpen={!!deleteTarget}
        isLoading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete purchase return"
        message={`Delete ${deleteTarget?.returnNumber || 'this return'}? This cannot be undone.`}
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
