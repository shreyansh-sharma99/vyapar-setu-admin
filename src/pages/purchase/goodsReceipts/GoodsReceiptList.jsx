import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2, FileText } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import Card from '@/components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import { FilterSelect, StatusBadge } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, editPath, errMsg, fmtDate, formatINR, refId, storeName, supplierName, viewPath } from '../components/helpers';
import { fetchGoodsReceipts, deleteGoodsReceipt } from './services/goodsReceiptSlice';

const FILTERS = [
  { value: 'all', label: 'All receipts' },
  { value: 'unbilled', label: 'Received, not billed' },
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted (in stock)' },
  { value: 'cancelled', label: 'Cancelled' },
];

const dateInput = 'h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none';

export default function GoodsReceiptList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, meta, listLoading, listError, saving } = useSelector((state) => state.goodsReceipt);

  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refresh, setRefresh] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const params = { page, limit: pageSize, sort: 'grnDate', order: 'desc' };
    if (filter === 'unbilled') params.unbilled = true;
    else if (filter !== 'all') params.status = filter;
    if (query) params.search = query;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    dispatch(fetchGoodsReceipts(params));
  }, [dispatch, page, pageSize, filter, query, dateFrom, dateTo, refresh]);

  useEffect(() => {
    if (listError) notifyError(listError);
  }, [listError]);

  const handleDelete = async () => {
    try {
      const res = await dispatch(deleteGoodsReceipt(deleteTarget._id)).unwrap();
      notify(res?.message || 'Goods receipt deleted');
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
      render: (g) => (
        <div className="flex items-center justify-center gap-0.5">
          <button type="button" title="View" onClick={() => navigate(viewPath('receipts', g._id))} className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10`}>
            <Eye className="w-4 h-4" />
          </button>
          {g.status === 'draft' && (
            <button type="button" title="Edit" onClick={() => navigate(editPath('receipts', g._id))} className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10`}>
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {g.status === 'posted' && !g.purchaseBillId && (
            <button
              type="button"
              title="Create bill"
              onClick={() => navigate(`${PATHS.bills}/create`, { state: { supplierId: refId(g.supplierId), storeId: refId(g.storeId), grnIds: [g._id] } })}
              className={`${iconBtn} text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10`}
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
          {['draft', 'cancelled'].includes(g.status) && (
            <button type="button" title="Delete" onClick={() => setDeleteTarget(g)} className={`${iconBtn} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10`}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
    { label: 'GRN number', key: 'grnNumber', value: 'checked', cellClassName: 'font-mono font-semibold' },
    { label: 'Date', key: 'grnDate', value: 'checked', render: (g) => fmtDate(g.grnDate) },
    { label: 'Supplier', key: 'supplier', value: 'checked', render: (g) => <span className="font-medium">{supplierName(g)}</span> },
    { label: 'PO', key: 'poNumber', value: 'checked', render: (g) => <span className="font-mono text-xs">{g.poNumber || g.purchaseOrderId?.poNumber || '—'}</span> },
    { label: 'Supplier invoice', key: 'supplierInvoiceNo', value: 'checked', render: (g) => g.supplierInvoiceNo || '—' },
    { label: 'Store', key: 'store', value: 'checked', render: (g) => storeName(g) },
    { label: 'Value', key: 'totalValue', value: 'checked', render: (g) => <span className="font-semibold">{formatINR(g.totalValue)}</span> },
    { label: 'Status', key: 'status', value: 'checked', render: (g) => <StatusBadge status={g.status} /> },
    {
      label: 'Bill',
      key: 'bill',
      value: 'checked',
      render: (g) =>
        g.purchaseBillId ? (
          <button type="button" onClick={() => navigate(viewPath('bills', refId(g.purchaseBillId)))} className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
            {g.purchaseBillId?.billNumber || 'View bill'}
          </button>
        ) : g.status === 'posted' ? (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Not billed</span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div>
      <Card
        h1="Goods Receipts (GRN)"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={dateInput} title="From date" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={dateInput} title="To date" />
            <FilterSelect value={filter} onChange={(v) => { setFilter(v); setPage(1); }} options={FILTERS} />
          </div>
        }
      >
        <Table
          headers={headers}
          data={list}
          loading={listLoading}
          searchPlaceholder="Search GRN, PO, supplier invoice, product..."
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
          emptyMessage="No goods receipts found."
          currentPage={page}
          pageSize={pageSize}
          totalRows={meta?.total || 0}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          actions={<Button onClick={() => navigate(`${PATHS.receipts}/create`)}>Receive Goods</Button>}
        />
      </Card>
      <DeleteModal
        isOpen={!!deleteTarget}
        isLoading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete goods receipt"
        message={`Delete ${deleteTarget?.grnNumber || 'this goods receipt'}? This cannot be undone.`}
      />
      <PurchaseToaster />
    </div>
  );
}
