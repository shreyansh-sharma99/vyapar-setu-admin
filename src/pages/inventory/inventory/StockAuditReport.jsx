import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Download, Loader2, Store as StoreIcon, History, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import { getAuditReport } from './services/inventorySlice';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
import {
  AuditFilterPanel,
  FilterToggleButton,
  SourceBadge,
  DeltaBadge,
  StockChange,
  ActorCell,
  BucketBadge,
  ValueCell,
} from './components/AuditReportShared';
import { formatDateTime, buildAuditParams, useAuditCsvExport, useStockSources } from './components/auditReportUtils';
import { formatCurrency } from './components/inventoryUtils';
import { InventoryNav } from './components/InventoryShared';

export default function StockAuditReport() {
  const dispatch = useDispatch();
  const { auditLogs, auditPagination, auditStats, auditLoading } = useSelector((state) => state.inventory);
  const { stores } = useSelector((state) => state.store);

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
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };
  const { exporting, exportCsv } = useAuditCsvExport((msg) => showToast(msg, 'danger'));

  useEffect(() => {
    dispatch(getStores({ limit: 100 }));
  }, [dispatch]);

  // Filters shared by list & CSV export
  const filterParams = useMemo(
    () =>
      buildAuditParams({
        storeId: selectedStore,
        source: selectedSource,
        bucket: selectedBucket,
        dateRange,
        search: appliedSearch,
      }),
    [selectedStore, selectedSource, selectedBucket, dateRange, appliedSearch]
  );

  useEffect(() => {
    dispatch(getAuditReport({ ...filterParams, page: currentPage, limit: pageSize }));
  }, [dispatch, filterParams, currentPage, pageSize]);

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

  const headers = [
    {
      label: 'Date & Time',
      key: 'createdAt',
      render: (log) => (
        <span className="font-mono text-[11px] text-[var(--vs-text-secondary)]">{formatDateTime(log.createdAt)}</span>
      ),
      value: 'checked',
    },
    {
      label: 'Product',
      key: 'product',
      render: (log) => (
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-[var(--vs-text-primary)]">{log.productId?.name || 'Deleted Product'}</span>
          {(log.productId?.sku || log.productId?.barcode) && (
            <span className="text-[10px] font-mono text-[var(--vs-text-secondary)]">
              {[log.productId.sku, log.productId.barcode].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      ),
      value: 'checked',
    },
    {
      label: 'Store / Godown',
      key: 'store',
      render: (log) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          <StoreIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          {log.storeName || log.storeId?.name || 'Main / General'}
        </span>
      ),
      value: 'checked',
    },
    { label: 'Activity', key: 'source', render: (log) => <SourceBadge log={log} />, value: 'checked' },
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
    {
      label: 'Change',
      key: 'delta',
      cellClassName: 'text-center',
      render: (log) => <DeltaBadge delta={log.delta} />,
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
      label: 'Total Stock',
      key: 'totalStock',
      cellClassName: 'text-center',
      render: (log) => <StockChange before={log.oldStock} after={log.newStock} />,
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

  return (
    <div>
      <Card
        h1="Stock Audit & Movement Report"
        bodyClassName="px-4 pb-4 pt-3"
      >
        <InventoryNav current="audit" />

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

        <div className="pb-2">
          <TableInfoCard
            stats={[
              {
                label: 'Movements',
                value: auditStats?.totalMovements ?? 0,
                icon: <History className="w-4 h-4 text-indigo-500" />,
                colorClass: 'text-indigo-600 dark:text-indigo-400',
              },
              {
                label: 'Stock In',
                value: `+${auditStats?.stockIn ?? 0}`,
                subValue: auditStats?.valueIn ? `(${formatCurrency(auditStats.valueIn)})` : undefined,
                icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
                colorClass: 'text-emerald-600 dark:text-emerald-400',
              },
              {
                label: 'Stock Out',
                value: `-${auditStats?.stockOut ?? 0}`,
                subValue: auditStats?.valueOut ? `(${formatCurrency(Math.abs(auditStats.valueOut))})` : undefined,
                icon: <TrendingDown className="w-4 h-4 text-rose-500" />,
                colorClass: 'text-rose-600 dark:text-rose-400',
              },
              {
                label: 'Products Affected',
                value: auditStats?.productsAffected ?? 0,
                icon: <Package className="w-4 h-4 text-blue-500" />,
                colorClass: 'text-blue-600 dark:text-blue-400',
              },
            ]}
          />
        </div>

        <Table
          headers={headers}
          data={auditLogs}
          loading={auditLoading}
          showSearch={true}
          searchPlaceholder="Product, barcode, invoice #, staff..."
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
          emptyMessage={hasFilters ? 'No stock movements match these filters.' : 'No stock movement records yet.'}
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          totalRows={auditPagination?.total || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => exportCsv(filterParams, 'Stock_Audit_Report')}
                disabled={exporting || !auditPagination?.total}
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
