import { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IndianRupee, Tag, BadgePercent, Wallet, FolderTree } from 'lucide-react';
import { DataTable, PageHeader, Segmented, StatCard, Switch } from '@/components/ui';
import { getStockValuation } from './services/inventorySlice';
import { InventoryToaster } from './components/InventoryShared';
import { formatCurrency, formatQty, useDebouncedValue, useToasts, useReportLoader } from './components/inventoryUtils';

const METHOD_OPTIONS = [
  { value: 'fifo', label: 'FIFO' },
  { value: 'average', label: 'Average Cost' },
];

const GROUP_OPTIONS = [
  { value: 'product', label: 'Product' },
  { value: 'category', label: 'Category' },
];

const marginPercent = (margin, sale) => (Number(sale) > 0 ? (Number(margin) / Number(sale)) * 100 : 0);

export default function StockValuation() {
  const dispatch = useDispatch();
  const { data, totals, pagination, loading } = useSelector((state) => state.inventory.reports.valuation);

  const [method, setMethod] = useState('fifo');
  const [groupBy, setGroupBy] = useState('product');
  const [includeDamaged, setIncludeDamaged] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { toasts, showToast } = useToasts();

  const params = useMemo(
    () => ({
      method,
      groupBy,
      includeDamaged: includeDamaged ? 'true' : undefined,
      search: debouncedSearch || undefined,
      page: currentPage,
      limit: pageSize,
    }),
    [method, groupBy, includeDamaged, debouncedSearch, currentPage, pageSize]
  );
  useReportLoader(dispatch, getStockValuation, params, (msg) => showToast(msg, 'danger'));

  const resetPage = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const rows = useMemo(
    () => (Array.isArray(data) ? data : []).map((r, i) => ({ ...r, _id: r.key || String(i) })),
    [data]
  );
  const t = totals || { qty: 0, value: 0, saleValue: 0, mrpValue: 0, potentialMargin: 0 };

  const columns = useMemo(() => {
    const nameColumn =
      groupBy === 'product'
        ? {
          key: 'name',
          header: 'Product',
          mobile: 'title',
          render: (r) => <span className="text-sm font-semibold text-ink">{r.name || 'Deleted Product'}</span>,
        }
        : {
          key: 'category',
          header: 'Category',
          mobile: 'title',
          render: (r) => (
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <FolderTree className="size-3.5 text-brand-ink" />
              {r.categoryId?.name || 'Uncategorised'}
            </span>
          ),
        };

    return [
      nameColumn,
      ...(groupBy === 'product'
        ? [
          {
            key: 'sku',
            header: 'SKU',
            hideBelow: 'lg',
            render: (r) => (r.sku ? <span className="font-mono text-xs">{r.sku}</span> : <span className="text-ink-subtle">—</span>),
          },
        ]
        : []),
      ...(groupBy !== 'product'
        ? [
          {
            key: 'products',
            header: 'Products',
            type: 'number',
            render: (r) => <span className="text-xs font-semibold tabular-nums">{r.products}</span>,
          },
        ]
        : []),
      {
        key: 'qty',
        header: 'Qty',
        type: 'number',
        render: (r) => (
          <span className="font-mono text-xs font-bold tabular-nums">
            {formatQty(r.qty)} {groupBy === 'product' ? r.unit || '' : ''}
          </span>
        ),
      },
      {
        key: 'avgUnitCost',
        header: 'Avg unit cost (₹)',
        type: 'money',
        hideBelow: 'lg',
        render: (r) => <span className="text-xs font-normal">{formatCurrency(r.avgUnitCost)}</span>,
      },
      {
        key: 'value',
        header: 'Value at cost (₹)',
        type: 'money',
        mobile: 'amount',
        render: (r) => <span className="font-bold text-brand-ink">{formatCurrency(r.value)}</span>,
      },
      {
        key: 'saleValue',
        header: 'At selling price (₹)',
        type: 'money',
        render: (r) => <span className="text-xs font-semibold">{formatCurrency(r.saleValue)}</span>,
      },
      {
        key: 'mrpValue',
        header: 'At MRP (₹)',
        type: 'money',
        hideBelow: 'xl',
        render: (r) => <span className="text-xs font-normal">{formatCurrency(r.mrpValue)}</span>,
      },
      {
        key: 'potentialMargin',
        header: 'Potential margin (₹)',
        type: 'money',
        render: (r) => (
          <span className={`text-xs font-semibold ${Number(r.potentialMargin) < 0 ? 'text-danger' : 'text-success'}`}>
            {formatCurrency(r.potentialMargin)}
          </span>
        ),
      },
      {
        key: 'marginPercent',
        header: 'Margin %',
        type: 'number',
        hideBelow: 'xl',
        render: (r) => <span className="text-xs font-normal text-ink-subtle">{marginPercent(r.potentialMargin, r.saleValue).toFixed(1)}%</span>,
      },
    ];
  }, [groupBy]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Stock Valuation"
        description="What your stock is worth at cost, at selling price and at MRP."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Stock value (at cost)"
          value={formatCurrency(t.value)}
          chip={`${formatQty(t.qty)} units · ${method === 'fifo' ? 'FIFO' : 'Average cost'}`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard label="At selling price" value={formatCurrency(t.saleValue)} icon={IndianRupee} tone="info" />
        <StatCard label="At MRP" value={formatCurrency(t.mrpValue)} icon={Tag} tone="warning" />
        <StatCard
          label="Potential margin"
          value={formatCurrency(t.potentialMargin)}
          chip={`${marginPercent(t.potentialMargin, t.saleValue).toFixed(1)}% of selling value`}
          icon={BadgePercent}
          tone="success"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        search={{
          value: searchTerm,
          onChange: (val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          },
          onSubmit: () => setCurrentPage(1),
          onClear: () => {
            setSearchTerm('');
            setCurrentPage(1);
          },
          placeholder: 'Search products...',
        }}
        filters={
          <>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-subtle">
              Costing
              <Segmented size="sm" aria-label="Costing method" options={METHOD_OPTIONS} value={method} onChange={resetPage(setMethod)} />
            </span>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-subtle">
              Group by
              <Segmented size="sm" aria-label="Group by" options={GROUP_OPTIONS} value={groupBy} onChange={resetPage(setGroupBy)} />
            </span>
            <Switch size="sm" checked={includeDamaged} onChange={resetPage(setIncludeDamaged)} label="Include damaged units" />
          </>
        }
        empty={{ icon: Wallet, title: 'No stock to value for these filters.' }}
        pagination={{
          page: currentPage,
          pageSize,
          total: pagination?.total || 0,
          onPageChange: (page) => setCurrentPage(page),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
          pageSizeOptions: [10, 20, 50, 100, 200, 500],
        }}
      />

      <InventoryToaster toasts={toasts} />
    </div>
  );
}
