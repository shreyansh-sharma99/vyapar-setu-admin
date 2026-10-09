import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRightLeft,
  Plus,
  Eye,
  Edit2,
  Trash2,
  FileText,
  Truck,
  PackageCheck,
  XCircle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import DeleteModal from '@/components/modal/DeleteModal';
import { getStockTransfers, deleteStockTransfer, clearStockTransferStatus } from './services/stockTransferSlice';
import { getStoresLookupApi } from './services/stockTransferService';
import { StatusPill, StatCard, ToastStack } from './components/ui';
import useToasts from './components/useToasts';
import { TRANSFER_STATUS, fmtINR, fmtQty, fmtDate, encId, fieldCls } from './components/utils';

const STATUS_CARDS = [
  { key: 'draft', label: 'Draft', icon: <FileText className="w-4 h-4" />, tone: 'slate' },
  { key: 'in_transit', label: 'In transit', icon: <Truck className="w-4 h-4" />, tone: 'amber' },
  { key: 'received', label: 'Received', icon: <PackageCheck className="w-4 h-4" />, tone: 'emerald' },
  { key: 'cancelled', label: 'Cancelled', icon: <XCircle className="w-4 h-4" />, tone: 'rose' },
];

export default function StockTransferList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { list, meta, stats, listLoading, error, successMessage } = useSelector((s) => s.stockTransfer);
  const { toasts, showToast } = useToasts(location.state);

  const [stores, setStores] = useState([]);
  const [status, setStatus] = useState('');
  const [storeId, setStoreId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });

  useEffect(() => {
    getStoresLookupApi()
      .then((res) => setStores(res.data || []))
      .catch(() => setStores([]));
  }, []);

  const fetchList = useCallback(() => {
    const params = { page: currentPage, limit: pageSize, sort: 'transferDate', order: 'desc' };
    if (status) params.status = status;
    if (storeId) params.storeId = storeId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    dispatch(getStockTransfers(params));
  }, [dispatch, currentPage, pageSize, status, storeId, dateFrom, dateTo, debouncedSearch]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (successMessage) {
      showToast(successMessage, 'success');
      dispatch(clearStockTransferStatus());
      fetchList();
    } else if (error) {
      showToast(error, 'danger');
      dispatch(clearStockTransferStatus());
    }
  }, [successMessage, error, dispatch, fetchList, showToast]);

  const totals = useMemo(() => {
    const all = Object.values(stats || {});
    return {
      count: all.reduce((s, x) => s + (x.count || 0), 0),
      value: all.reduce((s, x) => s + (x.value || 0), 0),
    };
  }, [stats]);

  const hasFilters = status || storeId || dateFrom || dateTo || debouncedSearch;

  const resetFilters = () => {
    setStatus('');
    setStoreId('');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const goView = (item) => navigate(`/inventory/transfers/view/${encId(item._id)}`);

  const headers = [
    {
      label: 'Actions',
      key: 'actions',
      render: (item) => (
        <div className="flex items-center justify-center gap-0.5">
          <button
            type="button"
            onClick={() => goView(item)}
            className="p-1 rounded text-blue-600 hover:text-blue-800 dark:text-blue-400 cursor-pointer"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          {item.status === 'draft' && (
            <button
              type="button"
              onClick={() => navigate(`/inventory/transfers/edit/${encId(item._id)}`)}
              className="p-1 rounded text-blue-600 hover:text-blue-800 dark:text-blue-400 cursor-pointer"
              title="Edit draft"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {['draft', 'cancelled'].includes(item.status) && (
            <button
              type="button"
              onClick={() => setDeleteModal({ isOpen: true, item })}
              className="p-1 rounded text-red-700 hover:text-red-600 cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
    {
      label: 'Transfer #',
      key: 'transferNumber',
      value: 'checked',
      render: (item) => (
        <button
          type="button"
          onClick={() => goView(item)}
          className="font-mono font-semibold text-[var(--vs-active-text)] hover:underline cursor-pointer whitespace-nowrap"
        >
          {item.transferNumber}
        </button>
      ),
    },
    {
      label: 'Date',
      key: 'transferDate',
      value: 'checked',
      render: (item) => <span className="whitespace-nowrap">{fmtDate(item.transferDate)}</span>,
    },
    {
      label: 'From → To',
      key: 'route',
      value: 'checked',
      render: (item) => (
        <div className="flex items-center gap-2 min-w-[220px]">
          <span className="font-medium text-[var(--vs-text-primary)] truncate max-w-[140px]">
            {item.fromStoreId?.name || item.fromStoreSnapshot?.name || '—'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="font-medium text-[var(--vs-text-primary)] truncate max-w-[140px]">
            {item.toStoreId?.name || item.toStoreSnapshot?.name || '—'}
          </span>
        </div>
      ),
    },
    {
      label: 'Items',
      key: 'itemsCount',
      value: 'checked',
      render: (item) => <span className="font-semibold">{item.items?.length ?? 0}</span>,
    },
    {
      label: 'Qty',
      key: 'totalQty',
      value: 'checked',
      render: (item) => <span className="font-semibold">{fmtQty(item.totalQty)}</span>,
    },
    {
      label: 'Value',
      key: 'totalValue',
      value: 'checked',
      render: (item) =>
        item.status === 'draft' && !item.totalValue ? (
          <span className="text-xs text-[var(--vs-text-secondary)]" title="Value is fixed when stock is dispatched">
            On dispatch
          </span>
        ) : (
          <div className="flex flex-col leading-tight">
            <span className="font-semibold whitespace-nowrap">{fmtINR(item.totalValue)}</span>
            {item.shortValue > 0 && (
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                Short {fmtINR(item.shortValue)}
              </span>
            )}
          </div>
        ),
    },
    {
      label: 'Status',
      key: 'status',
      value: 'checked',
      render: (item) => <StatusPill map={TRANSFER_STATUS} status={item.status} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card
        h1="Stock Transfers"
        description="Move stock between your stores and warehouses, and track what arrived."
        bodyClassName="px-4 pb-4 pt-3"
        rightNode={
          <Button onClick={() => navigate('/inventory/transfers/create')} startIcon={<Plus className="w-4 h-4" />}>
            New Transfer
          </Button>
        }
      >
        {/* Status cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
          <StatCard
            label="All transfers"
            value={totals.count.toLocaleString('en-IN')}
            sub={fmtINR(totals.value)}
            icon={<ArrowRightLeft className="w-4 h-4" />}
            tone="indigo"
            active={!status}
            onClick={() => {
              setStatus('');
              setCurrentPage(1);
            }}
          />
          {STATUS_CARDS.map((c) => (
            <StatCard
              key={c.key}
              label={c.label}
              value={(stats?.[c.key]?.count || 0).toLocaleString('en-IN')}
              sub={c.key === 'draft' ? 'Not dispatched yet' : fmtINR(stats?.[c.key]?.value || 0)}
              icon={c.icon}
              tone={c.tone}
              active={status === c.key}
              onClick={() => {
                setStatus(status === c.key ? '' : c.key);
                setCurrentPage(1);
              }}
            />
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
            className={fieldCls}
          >
            <option value="">All statuses</option>
            {Object.entries(TRANSFER_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value);
              setCurrentPage(1);
            }}
            className={fieldCls}
          >
            <option value="">All stores (sent or received)</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
                {s.code ? ` (${s.code})` : ''}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
            className={fieldCls}
            title="From date"
            aria-label="From date"
          />
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
            className={fieldCls}
            title="To date"
            aria-label="To date"
          />
          <Button
            variant="outline"
            onClick={resetFilters}
            disabled={!hasFilters}
            startIcon={<RotateCcw className="w-4 h-4" />}
            className="h-10 disabled:opacity-50"
          >
            Clear filters
          </Button>
        </div>

        <Table
          headers={headers}
          data={list}
          loading={listLoading}
          showSearch={true}
          searchPlaceholder="Search transfer #, product, SKU, notes..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => setSearchTerm(val)}
          onSearchClick={() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
          }}
          onSearchClear={() => {
            setSearchTerm('');
            setDebouncedSearch('');
            setCurrentPage(1);
          }}
          emptyMessage={
            hasFilters
              ? 'No transfers match these filters.'
              : "No stock transfers yet. Click 'New Transfer' to move stock between stores."
          }
          currentPage={currentPage}
          pageSize={pageSize}
          totalRows={meta?.total || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </Card>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={async () => {
          if (deleteModal.item) await dispatch(deleteStockTransfer(deleteModal.item._id));
          setDeleteModal({ isOpen: false, item: null });
        }}
        title="Delete Transfer"
        message={`Delete transfer ${deleteModal.item?.transferNumber || ''}? This cannot be undone.`}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
