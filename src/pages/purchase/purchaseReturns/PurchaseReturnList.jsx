import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import Card from '@/components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import { FilterSelect, StatusBadge } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, editPath, errMsg, fmtDate, formatINR, storeName, supplierName, viewPath } from '../components/helpers';
import { fetchPurchaseReturns, deletePurchaseReturn } from './services/purchaseReturnSlice';

const FILTERS = [
  { value: 'all', label: 'All returns' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const dateInput = 'h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none';

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

  useEffect(() => {
    const params = { page, limit: pageSize, sort: 'returnDate', order: 'desc' };
    if (status !== 'all') params.status = status;
    if (query) params.search = query;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    dispatch(fetchPurchaseReturns(params));
  }, [dispatch, page, pageSize, status, query, dateFrom, dateTo, refresh]);

  useEffect(() => {
    if (listError) notifyError(listError);
  }, [listError]);

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
    { label: 'Total', key: 'totalAmount', value: 'checked', render: (r) => <span className="font-semibold">{formatINR(r.totalAmount)}</span> },
    { label: 'Status', key: 'status', value: 'checked', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <Card
        h1="Purchase Returns"
        description="Goods sent back to suppliers (debit notes)"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={dateInput} title="From date" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={dateInput} title="To date" />
            <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={FILTERS} />
          </div>
        }
      >
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
      <PurchaseToaster />
    </div>
  );
}
