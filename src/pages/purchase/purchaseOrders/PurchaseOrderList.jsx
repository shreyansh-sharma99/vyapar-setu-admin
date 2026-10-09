import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2, PackageCheck } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import Card from '@/components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import { FilterSelect, StatusBadge } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, editPath, errMsg, fmtDate, formatINR, storeName, supplierName, viewPath } from '../components/helpers';
import { fetchPurchaseOrders, deletePurchaseOrder } from './services/purchaseOrderSlice';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'sent,partially_received', label: 'Open (awaiting goods)' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partially_received', label: 'Partially received' },
  { value: 'received', label: 'Received' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const dateInput = 'h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none';

export default function PurchaseOrderList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, meta, listLoading, listError, saving } = useSelector((state) => state.purchaseOrder);

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
    const params = { page, limit: pageSize, sort: 'poDate', order: 'desc' };
    if (status !== 'all') params.status = status;
    if (query) params.search = query;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    dispatch(fetchPurchaseOrders(params));
  }, [dispatch, page, pageSize, status, query, dateFrom, dateTo, refresh]);

  useEffect(() => {
    if (listError) notifyError(listError);
  }, [listError]);

  const handleDelete = async () => {
    try {
      const res = await dispatch(deletePurchaseOrder(deleteTarget._id)).unwrap();
      notify(res?.message || 'Purchase order deleted');
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
      render: (po) => (
        <div className="flex items-center justify-center gap-0.5">
          <button type="button" title="View" onClick={() => navigate(viewPath('orders', po._id))} className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10`}>
            <Eye className="w-4 h-4" />
          </button>
          {['draft', 'sent'].includes(po.status) && (
            <button type="button" title="Edit" onClick={() => navigate(editPath('orders', po._id))} className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10`}>
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {['sent', 'partially_received'].includes(po.status) && (
            <button
              type="button"
              title="Receive goods"
              onClick={() => navigate(`${PATHS.receipts}/create`, { state: { purchaseOrderId: po._id } })}
              className={`${iconBtn} text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10`}
            >
              <PackageCheck className="w-4 h-4" />
            </button>
          )}
          {['draft', 'cancelled'].includes(po.status) && (
            <button type="button" title="Delete" onClick={() => setDeleteTarget(po)} className={`${iconBtn} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10`}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
    { label: 'PO number', key: 'poNumber', value: 'checked', cellClassName: 'font-mono font-semibold' },
    { label: 'Date', key: 'poDate', value: 'checked', render: (po) => fmtDate(po.poDate) },
    { label: 'Supplier', key: 'supplier', value: 'checked', render: (po) => <span className="font-medium">{supplierName(po)}</span> },
    { label: 'Deliver to', key: 'store', value: 'checked', render: (po) => storeName(po) },
    { label: 'Expected', key: 'expectedDate', value: 'checked', render: (po) => fmtDate(po.expectedDate) },
    { label: 'Items', key: 'items', value: 'checked', render: (po) => po.items?.length ?? '—' },
    { label: 'Total', key: 'totalAmount', value: 'checked', render: (po) => <span className="font-semibold">{formatINR(po.totalAmount)}</span> },
    { label: 'Status', key: 'status', value: 'checked', render: (po) => <StatusBadge status={po.status} /> },
  ];

  return (
    <div>
      <Card
        h1="Purchase Orders"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={dateInput} title="From date" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={dateInput} title="To date" />
            <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} />
          </div>
        }
      >
        <Table
          headers={headers}
          data={list}
          loading={listLoading}
          searchPlaceholder="Search PO number, supplier, product..."
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
          emptyMessage="No purchase orders found. Click 'New Purchase Order' to create one."
          currentPage={page}
          pageSize={pageSize}
          totalRows={meta?.total || 0}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          actions={<Button onClick={() => navigate(`${PATHS.orders}/create`)}>New Purchase Order</Button>}
        />
      </Card>
      <DeleteModal
        isOpen={!!deleteTarget}
        isLoading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete purchase order"
        message={`Delete ${deleteTarget?.poNumber || 'this purchase order'}? This cannot be undone.`}
      />
      <PurchaseToaster />
    </div>
  );
}
