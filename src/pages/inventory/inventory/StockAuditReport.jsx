import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Download, History, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { Avatar, Button, DataTable, PageHeader, StatCard, ToastStack } from '@/components/ui';
import { getAuditReport } from './services/inventorySlice';
import {
  AuditFilterPanel,
  FilterToggleButton,
  SourceBadge,
  DeltaBadge,
  BucketBadge,
} from './components/AuditReportShared';
import { formatDateTime, buildAuditParams, getActorName, useAuditCsvExport, useStockSources } from './components/auditReportUtils';
import { formatCurrency, formatDate } from './components/inventoryUtils';

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

export default function StockAuditReport() {
  const dispatch = useDispatch();
  const { auditLogs, auditPagination, auditStats, auditLoading } = useSelector((state) => state.inventory);

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
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };
  const { exporting, exportCsv } = useAuditCsvExport((msg) => showToast(msg, 'danger'));

  // Filters shared by list & CSV export
  const filterParams = useMemo(
    () =>
      buildAuditParams({
        source: selectedSource,
        bucket: selectedBucket,
        dateRange,
        search: appliedSearch,
      }),
    [selectedSource, selectedBucket, dateRange, appliedSearch]
  );

  useEffect(() => {
    dispatch(getAuditReport({ ...filterParams, page: currentPage, limit: pageSize }));
  }, [dispatch, filterParams, currentPage, pageSize]);

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

  const columns = [
    {
      key: 'createdAt',
      header: 'Date & time',
      render: (log) => <span className="font-mono text-[11px] text-ink-muted">{formatDateTime(log.createdAt)}</span>,
    },
    {
      key: 'product',
      header: 'Product',
      mobile: 'title',
      render: (log) => <span className="font-semibold text-ink">{log.productId?.name || 'Deleted Product'}</span>,
    },
    {
      key: 'sku',
      header: 'SKU',
      hideBelow: 'lg',
      render: (log) => (log.productId?.sku ? <span className="font-mono text-[11px] text-ink-subtle">{log.productId.sku}</span> : <span className="text-ink-subtle">-</span>),
    },
    {
      key: 'barcode',
      header: 'Barcode',
      hideBelow: '2xl',
      render: (log) => (log.productId?.barcode ? <span className="font-mono text-[11px] text-ink-subtle">{log.productId.barcode}</span> : <span className="text-ink-subtle">-</span>),
    },
    { key: 'source', header: 'Activity', render: (log) => <SourceBadge log={log} /> },
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
      header: 'Total stock',
      type: 'number',
      render: (log) => <span className="font-mono text-xs font-bold tabular-nums text-ink">{log.newStock ?? 0}</span>,
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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Stock Audit & Movement Report"
        description="Every stock change: sales, purchases, returns, adjustments and damage."
        actions={
          <>
            <FilterToggleButton open={showFilters} activeCount={activeFilterCount} onClick={() => setShowFilters((v) => !v)} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportCsv(filterParams, 'Stock_Audit_Report')}
              disabled={exporting || !auditPagination?.total}
              loading={exporting}
              startIcon={<Download />}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Movements" value={auditStats?.totalMovements ?? 0} icon={History} tone="primary" />
        <StatCard
          label="Stock in"
          value={`+${auditStats?.stockIn ?? 0}`}
          chip={auditStats?.valueIn ? formatCurrency(auditStats.valueIn) : undefined}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Stock out"
          value={`-${auditStats?.stockOut ?? 0}`}
          chip={auditStats?.valueOut ? formatCurrency(Math.abs(auditStats.valueOut)) : undefined}
          icon={TrendingDown}
          tone="danger"
        />
        <StatCard label="Products affected" value={auditStats?.productsAffected ?? 0} icon={Package} tone="info" />
      </div>

      <DataTable
        columns={columns}
        rows={auditLogs}
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
          placeholder: 'Product, barcode, invoice #, staff...',
        }}
        empty={{
          icon: History,
          title: hasFilters ? 'No stock movements match these filters.' : 'No stock movement records yet.',
        }}
        pagination={{
          page: currentPage,
          pageSize,
          total: auditPagination?.total || 0,
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
