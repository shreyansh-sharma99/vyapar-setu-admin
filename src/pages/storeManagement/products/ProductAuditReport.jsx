import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  Download,
  Loader2,
  Store as StoreIcon,
  Package,
  History,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import Loader from '@/components/loader/Loader';
import { decryptData } from '@/utility/crypto';
import { getProductById } from './services/productSlice';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
import { getAuditReportApi } from '@/pages/inventory/inventory/services/inventoryService';
import {
  AuditFilterPanel,
  FilterToggleButton,
  SourceBadge,
  DeltaBadge,
  StockChange,
  ActorCell,
  BucketBadge,
  ValueCell,
} from '@/pages/inventory/inventory/components/AuditReportShared';
import { formatDateTime, buildAuditParams, useAuditCsvExport, useStockSources } from '@/pages/inventory/inventory/components/auditReportUtils';
import { formatCurrency } from '@/pages/inventory/inventory/components/inventoryUtils';

export default function ProductAuditReport() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentProduct, loading: productLoading } = useSelector((state) => state.product);
  const { stores } = useSelector((state) => state.store);

  // Audit data
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [stats, setStats] = useState({ totalMovements: 0, stockIn: 0, stockOut: 0 });
  const [loadedKey, setLoadedKey] = useState(null); // key of the last completed request
  const latestRequest = useRef(0);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedBucket, setSelectedBucket] = useState(''); // '' | sellable | damaged
  const sourceOptions = useStockSources();
  const [dateRange, setDateRange] = useState(null); // [dayjs, dayjs] | null
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState(''); // only updated on search button click

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [toasts, setToasts] = useState([]);
  const showToast = (message, color = 'success') => {
    const toastId = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id: toastId, message, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 3500);
  };
  const { exporting, exportCsv } = useAuditCsvExport((msg) => showToast(msg, 'danger'));

  useEffect(() => {
    if (id) {
      dispatch(getProductById(id));
      dispatch(getStores({ limit: 100 }));
    }
  }, [id, dispatch]);

  // Filters shared by list & CSV export
  const filterParams = useMemo(
    () =>
      buildAuditParams({
        productId: id,
        storeId: selectedStore,
        source: selectedSource,
        bucket: selectedBucket,
        dateRange,
        search: appliedSearch,
      }),
    [id, selectedStore, selectedSource, selectedBucket, dateRange, appliedSearch]
  );

  const requestKey = JSON.stringify({ ...filterParams, currentPage, pageSize });
  const auditLoading = !!id && loadedKey !== requestKey;

  useEffect(() => {
    if (!id) return;
    const requestId = ++latestRequest.current;
    getAuditReportApi({ ...filterParams, page: currentPage, limit: pageSize })
      .then((response) => {
        if (requestId !== latestRequest.current || !response?.success) return; // ignore stale responses
        setLogs(response.data || []);
        setPagination(response.pagination || { total: 0, page: currentPage, limit: pageSize, totalPages: 1 });
        if (response.stats) setStats(response.stats);
      })
      .catch((err) => {
        console.error('Failed to load product audit report:', err);
        if (requestId === latestRequest.current) showToast('Failed to load audit history.', 'danger');
      })
      .finally(() => {
        if (requestId === latestRequest.current) setLoadedKey(requestKey);
      });
  }, [id, filterParams, currentPage, pageSize, requestKey]);

  const withPageReset = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const activeFilterCount = [selectedStore, selectedSource, selectedBucket, dateRange].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0 || !!appliedSearch;

  const handleResetFilters = () => {
    setSelectedStore('');
    setSelectedSource('');
    setSelectedBucket('');
    setDateRange(null);
    setSearchTerm('');
    setAppliedSearch('');
    setCurrentPage(1);
  };

  const handleExport = () => {
    const prodName = (currentProduct?.name || 'Product').replace(/[^a-zA-Z0-9]/g, '_');
    exportCsv(filterParams, `Audit_Report_${prodName}`);
  };

  // Only stores with stock > 0 for allocation pills
  const availableStoreStocks = (currentProduct?.storeStocks || []).filter((st) => Number(st.stock || 0) > 0);

  const headers = [
    {
      label: 'Date & Time',
      key: 'createdAt',
      render: (log) => (
        <span className="font-mono text-[11px] text-[var(--vs-text-secondary)]">{formatDateTime(log.createdAt)}</span>
      ),
      value: 'checked',
    },
    { label: 'Activity', key: 'source', render: (log) => <SourceBadge log={log} />, value: 'checked' },
    {
      label: 'Store / Warehouse',
      key: 'store',
      render: (log) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          <StoreIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          {log.storeName || log.storeId?.name || 'All / General'}
          {log.storeId?.code && (
            <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 px-1 rounded border border-indigo-200 dark:border-indigo-800">
              {log.storeId.code}
            </span>
          )}
        </span>
      ),
      value: 'checked',
    },
    {
      label: 'Change',
      key: 'delta',
      cellClassName: 'text-center',
      render: (log) => <DeltaBadge delta={log.delta} />,
      value: 'checked',
    },
    {
      label: 'Product Stock',
      key: 'totalStock',
      cellClassName: 'text-center',
      render: (log) => <StockChange before={log.oldStock} after={log.newStock} />,
      value: 'checked',
    },
    {
      label: 'Store Stock',
      key: 'storeStock',
      cellClassName: 'text-center',
      render: (log) => <StockChange before={log.oldStoreStock} after={log.newStoreStock} />,
      value: 'checked',
    },
    {
      label: 'Stock Type',
      key: 'bucket',
      cellClassName: 'text-center',
      render: (log) => <BucketBadge bucket={log.bucket} />,
      value: 'checked',
    },
    {
      label: 'Value',
      key: 'value',
      cellClassName: 'text-right',
      render: (log) => <ValueCell log={log} />,
      value: 'checked',
    },
    {
      label: 'Reference',
      key: 'referenceId',
      render: (log) =>
        log.referenceId ? (
          <span className="font-mono text-[11px] font-bold text-[var(--vs-text-primary)]">{log.referenceId}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
      value: 'checked',
    },
    { label: 'Done By', key: 'actorName', render: (log) => <ActorCell log={log} />, value: 'checked' },
    {
      label: 'Remarks',
      key: 'reason',
      render: (log) => (
        <span className="block max-w-[220px] truncate text-[11px] text-[var(--vs-text-secondary)]" title={log.reason || ''}>
          {log.reason || '-'}
        </span>
      ),
      value: 'checked',
    },
  ];

  if (productLoading && !currentProduct) {
    return (
      <Card
        h1="Product Stock Audit"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-4 flex flex-col gap-4"
      >
        <Loader className="my-6" />
      </Card>
    );
  }

  return (
    <div className="text-[var(--vs-text-primary)]">
      <Card
        h1="Product Stock Audit History"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="danger"
              startIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>
        }
      >
        <AuditFilterPanel
          open={showFilters}
          stores={stores}
          selectedStore={selectedStore}
          onStoreChange={withPageReset(setSelectedStore)}
          selectedSource={selectedSource}
          onSourceChange={withPageReset(setSelectedSource)}
          sourceOptions={sourceOptions}
          selectedBucket={selectedBucket}
          onBucketChange={withPageReset(setSelectedBucket)}
          dateRange={dateRange}
          onDateRangeChange={withPageReset(setDateRange)}
          onReset={handleResetFilters}
          canReset={hasFilters}
        />

        {/* Compact product profile */}
        {currentProduct && (
          <div className="mb-2 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)] px-3 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {currentProduct.images?.[0]?.path ? (
                  <img
                    src={currentProduct.images[0].path}
                    alt={currentProduct.name}
                    className="w-9 h-9 rounded-lg object-cover border border-[var(--vs-border)] shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-[var(--vs-active-bg)] flex items-center justify-center shrink-0 text-[var(--vs-active-text)]">
                    <Package className="w-4 h-4" />
                  </div>
                )}
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[var(--vs-text-primary)]">{currentProduct.name}</span>
                    <span
                      className={`px-1.5 rounded-full text-[10px] font-semibold border ${currentProduct.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        }`}
                    >
                      {currentProduct.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    {currentProduct.categoryId?.name && (
                      <span className="bg-gray-100 dark:bg-white/5 px-1.5 rounded text-[10px] font-medium text-gray-600 dark:text-gray-300">
                        {currentProduct.categoryId.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--vs-text-secondary)] flex-wrap font-mono">
                    {currentProduct.sku && <span>SKU: {currentProduct.sku}</span>}
                    {currentProduct.barcode && <span>Barcode: {currentProduct.barcode}</span>}
                    <span className="font-sans font-semibold text-[var(--vs-active-text)]">
                      ₹{currentProduct.discountedPrice || currentProduct.basePrice || 0}
                    </span>
                  </div>
                </div>
              </div>

              {availableStoreStocks.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-xs sm:justify-end">
                  <StoreIcon className="w-3 h-3 text-indigo-500" />
                  {availableStoreStocks.map((st, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--vs-bg-primary)] border border-[var(--vs-border)]"
                    >
                      {st.storeId?.name || 'Warehouse'}
                      {st.storeId?.code ? ` [${st.storeId.code}]` : ''}:
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{st.stock}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pb-2">
          <TableInfoCard
            stats={[
              {
                label: 'Current Stock',
                value: currentProduct?.currentStock ?? 0,
                subValue: currentProduct?.unit || 'units',
                icon: <Layers className="w-4 h-4 text-indigo-500" />,
                colorClass:
                  (currentProduct?.currentStock || 0) <= (currentProduct?.lowStockAlertThreshold || 0)
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-indigo-600 dark:text-indigo-400',
              },
              {
                label: 'Stock In',
                value: `+${stats?.stockIn ?? 0}`,
                subValue: stats?.valueIn ? `(${formatCurrency(stats.valueIn)})` : undefined,
                icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
                colorClass: 'text-emerald-600 dark:text-emerald-400',
              },
              {
                label: 'Stock Out',
                value: `-${stats?.stockOut ?? 0}`,
                subValue: stats?.valueOut ? `(${formatCurrency(Math.abs(stats.valueOut))})` : undefined,
                icon: <TrendingDown className="w-4 h-4 text-rose-500" />,
                colorClass: 'text-rose-600 dark:text-rose-400',
              },
              {
                label: 'Audit Events',
                value: stats?.totalMovements ?? 0,
                icon: <History className="w-4 h-4 text-blue-500" />,
                colorClass: 'text-blue-600 dark:text-blue-400',
              },
            ]}
          />
        </div>

        <Table
          headers={headers}
          data={logs}
          loading={auditLoading}
          showSearch={true}
          searchPlaceholder="Invoice #, staff, store, remarks..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => setSearchTerm(val)}
          onSearchClick={() => {
            setAppliedSearch(searchTerm);
            setCurrentPage(1);
          }}
          onSearchClear={() => {
            setSearchTerm('');
            setAppliedSearch('');
            setCurrentPage(1);
          }}
          emptyMessage={hasFilters ? 'No stock movements match these filters.' : 'No stock movements recorded for this product yet.'}
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          totalRows={pagination?.total || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          actions={
            <>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting || !pagination?.total}
                startIcon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              >
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <FilterToggleButton
                open={showFilters}
                activeCount={activeFilterCount}
                onClick={() => setShowFilters((v) => !v)}
              />
            </>
          }
        />
      </Card>

      <CToaster className="p-3" style={{ zIndex: 2000, position: 'fixed', bottom: '20px', right: '20px' }}>
        {toasts.map((t) => (
          <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2">
            <div className="d-flex">
              <CToastBody className="font-semibold">{t.message}</CToastBody>
            </div>
          </CToast>
        ))}
      </CToaster>
    </div>
  );
}
