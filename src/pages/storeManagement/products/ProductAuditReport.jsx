import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  Download,
  Package,
  History,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { Avatar, Badge, Button, Card, DataTable, PageHeader, SkeletonRows, StatCard, StatusBadge, ToastStack } from '@/components/ui';
import { decryptData } from '@/utility/crypto';
import { getProductById } from './services/productSlice';
import { getAuditReportApi } from '@/pages/inventory/inventory/services/inventoryService';
import {
  AuditFilterPanel,
  FilterToggleButton,
  SourceBadge,
  DeltaBadge,
  BucketBadge,
} from '@/pages/inventory/inventory/components/AuditReportShared';
import { formatDateTime, buildAuditParams, getActorName, useAuditCsvExport, useStockSources } from '@/pages/inventory/inventory/components/auditReportUtils';
import { formatCurrency, formatDate } from '@/pages/inventory/inventory/components/inventoryUtils';

/** Batches a movement touched (only ones with a batch no or MRP), one line per batch. */
const batchLines = (log, line) => {
  const batches = (log.batches || []).filter((b) => b.batchNo || Number(b.mrp) > 0);
  if (!batches.length) return <span className="text-ink-subtle">-</span>;
  return (
    <div className="flex flex-col gap-0.5 whitespace-nowrap text-[11px] leading-tight">
      {batches.map((b, i) => (
        <span key={`${b.batchId || 'b'}-${i}`}>{line(b)}</span>
      ))}
    </div>
  );
};

export default function ProductAuditReport() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentProduct, loading: productLoading } = useSelector((state) => state.product);

  // Audit data
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [stats, setStats] = useState({ totalMovements: 0, stockIn: 0, stockOut: 0 });
  const [loadedKey, setLoadedKey] = useState(null); // key of the last completed request
  const latestRequest = useRef(0);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
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
    }
  }, [id, dispatch]);

  // Filters shared by list & CSV export
  const filterParams = useMemo(
    () =>
      buildAuditParams({
        productId: id,
        source: selectedSource,
        bucket: selectedBucket,
        dateRange,
        search: appliedSearch,
      }),
    [id, selectedSource, selectedBucket, dateRange, appliedSearch]
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

  const activeFilterCount = [selectedSource, selectedBucket, dateRange].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0 || !!appliedSearch;

  const handleResetFilters = () => {
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

  const columns = [
    {
      key: 'createdAt',
      header: 'Date & time',
      mobile: 'title',
      render: (log) => <span className="font-mono text-[11px] text-ink-muted">{formatDateTime(log.createdAt)}</span>,
    },
    { key: 'source', header: 'Activity', render: (log) => <SourceBadge log={log} /> },
    { key: 'delta', header: 'Change', type: 'number', mobile: 'amount', render: (log) => <DeltaBadge delta={log.delta} /> },
    {
      key: 'oldStock',
      header: 'Previous stock',
      type: 'number',
      hideBelow: 'xl',
      render: (log) => <span className="font-mono text-xs tabular-nums text-ink-subtle">{log.oldStock ?? 0}</span>,
    },
    {
      key: 'totalStock',
      header: 'Product stock',
      type: 'number',
      render: (log) => <span className="font-mono text-xs font-bold tabular-nums text-ink">{log.newStock ?? 0}</span>,
    },
    { key: 'bucket', header: 'Stock type', hideBelow: 'xl', render: (log) => <BucketBadge bucket={log.bucket} /> },
    {
      key: 'value',
      header: 'Value (₹)',
      type: 'number',
      render: (log) =>
        log.value ? (
          <span className={`font-mono text-xs font-bold tabular-nums ${Number(log.value) >= 0 ? 'text-success' : 'text-danger'}`}>
            {Number(log.value) >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(Number(log.value)))}
          </span>
        ) : (
          <span className="text-ink-subtle">-</span>
        ),
    },
    {
      key: 'unitCost',
      header: 'Unit cost (₹)',
      type: 'number',
      hideBelow: 'xl',
      render: (log) =>
        log.unitCost ? <span className="text-[11px] tabular-nums text-ink-subtle">{formatCurrency(log.unitCost)}</span> : <span className="text-ink-subtle">-</span>,
    },
    {
      key: 'referenceId',
      header: 'Reference',
      hideBelow: 'lg',
      render: (log) =>
        log.referenceId ? (
          <span className="font-mono text-[11px] font-bold text-ink">{log.referenceId}</span>
        ) : (
          <span className="text-ink-subtle">-</span>
        ),
    },
    {
      key: 'batches',
      header: 'Batch',
      hideBelow: '2xl',
      render: (log) => batchLines(log, (b) => <span className="font-mono font-semibold text-ink">{b.batchNo || 'No batch no'}</span>),
    },
    {
      key: 'batchDate',
      header: 'Batch date',
      hideBelow: '2xl',
      render: (log) => batchLines(log, (b) => <span className="text-ink-subtle">{b.receivedAt ? formatDate(b.receivedAt) : '-'}</span>),
    },
    {
      key: 'batchMrp',
      header: 'Batch MRP (₹)',
      hideBelow: '2xl',
      render: (log) => batchLines(log, (b) => <span className="text-ink-subtle">{Number(b.mrp) > 0 ? `₹${Number(b.mrp)}` : '-'}</span>),
    },
    {
      key: 'batchQty',
      header: 'Batch qty',
      type: 'number',
      hideBelow: '2xl',
      render: (log) => batchLines(log, (b) => <span className="tabular-nums text-ink-subtle">{Number(b.qty)}</span>),
    },
    {
      key: 'actorName',
      header: 'Done by',
      hideBelow: 'lg',
      render: (log) => (
        <div className="flex items-center gap-2">
          <Avatar name={getActorName(log)} size="sm" />
          <span className="text-xs font-semibold text-ink">{getActorName(log)}</span>
        </div>
      ),
    },
    {
      key: 'actorRole',
      header: 'Role',
      hideBelow: 'xl',
      render: (log) => <span className="text-[11px] capitalize text-ink-subtle">{log.actorRole || log.actorId?.role || 'Staff'}</span>,
    },
    {
      key: 'reason',
      header: 'Remarks',
      hideBelow: '2xl',
      render: (log) => (
        <span className="block max-w-[220px] truncate text-[11px] text-ink-muted" title={log.reason || ''}>
          {log.reason || '-'}
        </span>
      ),
    },
  ];

  const runSearch = () => {
    setAppliedSearch(searchTerm);
    setCurrentPage(1);
  };

  const backButton = (
    <Button variant="secondary" size="sm" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
      Back
    </Button>
  );

  if (productLoading && !currentProduct) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Product Stock Audit" actions={backButton} />
        <Card>
          <SkeletonRows rows={6} cols={5} />
        </Card>
      </div>
    );
  }

  const lowStock = (currentProduct?.currentStock || 0) <= (currentProduct?.lowStockAlertThreshold || 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Product Stock Audit History"
        description="Every stock change for this product."
        actions={
          <>
            <FilterToggleButton open={showFilters} activeCount={activeFilterCount} onClick={() => setShowFilters((v) => !v)} />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={exporting || !pagination?.total}
              loading={exporting}
              startIcon={<Download />}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            {backButton}
          </>
        }
      />

      <AuditFilterPanel
        open={showFilters}
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
        <Card padding="sm" className="flex items-center gap-3">
          {currentProduct.images?.[0]?.path ? (
            <img
              src={currentProduct.images[0].path}
              alt={currentProduct.name}
              className="size-12 shrink-0 rounded-control border border-line object-cover"
            />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-control bg-brand-soft text-brand-ink">
              <Package className="size-5" />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-extrabold text-ink">{currentProduct.name}</span>
              <StatusBadge status={currentProduct.status === 'active' ? 'active' : 'inactive'} />
              {currentProduct.categoryId?.name && <Badge tone="neutral">{currentProduct.categoryId.name}</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-ink-subtle">
              {currentProduct.sku && <span>SKU: {currentProduct.sku}</span>}
              {currentProduct.barcode && <span>Barcode: {currentProduct.barcode}</span>}
              <span className="font-sans font-semibold text-brand-ink tabular-nums">
                ₹{currentProduct.discountedPrice || currentProduct.basePrice || 0}
              </span>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current stock"
          value={currentProduct?.currentStock ?? 0}
          chip={currentProduct?.unit || 'units'}
          icon={Layers}
          tone={lowStock ? 'danger' : 'primary'}
        />
        <StatCard
          label="Stock in"
          value={`+${stats?.stockIn ?? 0}`}
          chip={stats?.valueIn ? formatCurrency(stats.valueIn) : undefined}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Stock out"
          value={`-${stats?.stockOut ?? 0}`}
          chip={stats?.valueOut ? formatCurrency(Math.abs(stats.valueOut)) : undefined}
          icon={TrendingDown}
          tone="danger"
        />
        <StatCard label="Audit events" value={stats?.totalMovements ?? 0} icon={History} tone="info" />
      </div>

      <DataTable
        columns={columns}
        rows={logs}
        loading={auditLoading}
        search={{
          value: searchTerm,
          onChange: (val) => setSearchTerm(val),
          onSubmit: runSearch,
          onClear: () => {
            setSearchTerm('');
            setAppliedSearch('');
            setCurrentPage(1);
          },
          placeholder: 'Invoice #, staff, remarks...',
        }}
        empty={{
          icon: History,
          title: hasFilters ? 'No stock movements match these filters.' : 'No stock movements recorded for this product yet.',
        }}
        pagination={{
          page: currentPage,
          pageSize,
          total: pagination?.total || 0,
          onPageChange: (page) => setCurrentPage(page),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
