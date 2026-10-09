import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Segmented, Switch } from 'antd';
import { IndianRupee, Tag, BadgePercent, Wallet, Store as StoreIcon, FolderTree } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Table from '@/components/table/Table';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
import { getStockValuation } from './services/inventorySlice';
import {
  AntdThemed,
  FilterBar,
  FilterField,
  StoreSelect,
  ProductCell,
  InventoryNav,
  InventoryToaster,
} from './components/InventoryShared';
import { formatCurrency, formatQty, useDebouncedValue, useToasts, useReportLoader } from './components/inventoryUtils';

const METHOD_OPTIONS = [
  { value: 'fifo', label: 'FIFO' },
  { value: 'average', label: 'Average Cost' },
];

const GROUP_OPTIONS = [
  { value: 'product', label: 'Product' },
  { value: 'category', label: 'Category' },
  { value: 'store', label: 'Store' },
];

const marginPercent = (margin, sale) => (Number(sale) > 0 ? (Number(margin) / Number(sale)) * 100 : 0);

const TotalCard = ({ label, value, sub, icon: Icon, tone }) => (
  <div className="rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-4 py-3 flex items-start gap-3 min-w-0">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-xs font-medium text-[var(--vs-text-secondary)]">{label}</span>
      <span className="text-lg font-bold text-[var(--vs-text-primary)] truncate">{value}</span>
      {sub && <span className="text-[11px] text-[var(--vs-text-secondary)]">{sub}</span>}
    </div>
  </div>
);

export default function StockValuation() {
  const dispatch = useDispatch();
  const { data, totals, pagination, loading } = useSelector((state) => state.inventory.reports.valuation);
  const { stores } = useSelector((state) => state.store);

  const [method, setMethod] = useState('fifo');
  const [groupBy, setGroupBy] = useState('product');
  const [selectedStore, setSelectedStore] = useState('');
  const [includeDamaged, setIncludeDamaged] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { toasts, showToast } = useToasts();

  useEffect(() => {
    dispatch(getStores({ limit: 100 }));
  }, [dispatch]);

  const params = useMemo(
    () => ({
      method,
      groupBy,
      storeId: selectedStore || undefined,
      includeDamaged: includeDamaged ? 'true' : undefined,
      search: debouncedSearch || undefined,
      page: currentPage,
      limit: pageSize,
    }),
    [method, groupBy, selectedStore, includeDamaged, debouncedSearch, currentPage, pageSize]
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

  const headers = useMemo(() => {
    const nameColumn =
      groupBy === 'product'
        ? {
          label: 'Product',
          key: 'name',
          value: 'checked',
          render: (r) => <ProductCell name={r.name} sku={r.sku} />,
        }
        : groupBy === 'category'
          ? {
            label: 'Category',
            key: 'category',
            value: 'checked',
            render: (r) => (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <FolderTree className="w-3.5 h-3.5 text-indigo-500" />
                {r.categoryId?.name || 'Uncategorised'}
              </span>
            ),
          }
          : {
            label: 'Store',
            key: 'store',
            value: 'checked',
            render: (r) => (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <StoreIcon className="w-3.5 h-3.5 text-indigo-500" />
                {r.storeId?.name || 'Store'}
                {r.storeId?.code ? ` [${r.storeId.code}]` : ''}
              </span>
            ),
          };

    return [
      nameColumn,
      ...(groupBy !== 'product'
        ? [
          {
            label: 'Products',
            key: 'products',
            value: 'checked',
            cellClassName: 'text-center',
            render: (r) => <span className="text-xs font-semibold">{r.products}</span>,
          },
        ]
        : []),
      {
        label: 'Qty',
        key: 'qty',
        value: 'checked',
        cellClassName: 'text-center',
        render: (r) => (
          <span className="font-mono text-xs font-bold">
            {formatQty(r.qty)} {groupBy === 'product' ? r.unit || '' : ''}
          </span>
        ),
      },
      {
        label: 'Avg Unit Cost',
        key: 'avgUnitCost',
        value: 'checked',
        cellClassName: 'text-right',
        render: (r) => <span className="text-xs">{formatCurrency(r.avgUnitCost)}</span>,
      },
      {
        label: 'Value at Cost',
        key: 'value',
        value: 'checked',
        cellClassName: 'text-right',
        render: (r) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(r.value)}</span>,
      },
      {
        label: 'At Selling Price',
        key: 'saleValue',
        value: 'checked',
        cellClassName: 'text-right',
        render: (r) => <span className="text-xs font-semibold">{formatCurrency(r.saleValue)}</span>,
      },
      {
        label: 'At MRP',
        key: 'mrpValue',
        value: 'checked',
        cellClassName: 'text-right',
        render: (r) => <span className="text-xs">{formatCurrency(r.mrpValue)}</span>,
      },
      {
        label: 'Potential Margin',
        key: 'potentialMargin',
        value: 'checked',
        cellClassName: 'text-right',
        render: (r) => (
          <div className="flex flex-col items-end leading-tight">
            <span
              className={`font-semibold text-xs ${Number(r.potentialMargin) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
            >
              {formatCurrency(r.potentialMargin)}
            </span>
            <span className="text-[10px] text-[var(--vs-text-secondary)]">
              {marginPercent(r.potentialMargin, r.saleValue).toFixed(1)}%
            </span>
          </div>
        ),
      },
    ];
  }, [groupBy]);

  return (
    <div>
      <Card h1="Stock Valuation" bodyClassName="px-4 pb-4 pt-3">
        <InventoryNav current="valuation" />
        <AntdThemed>
          <FilterBar>
            <FilterField label="Costing Method">
              <Segmented options={METHOD_OPTIONS} value={method} onChange={resetPage(setMethod)} block />
            </FilterField>
            <FilterField label="Group By">
              <Segmented options={GROUP_OPTIONS} value={groupBy} onChange={resetPage(setGroupBy)} block />
            </FilterField>
            <FilterField label="Store / Warehouse">
              <StoreSelect stores={stores} value={selectedStore} onChange={resetPage(setSelectedStore)} />
            </FilterField>
            <FilterField label="Damaged Stock">
              <label className="h-8 inline-flex items-center gap-2 text-xs font-medium text-[var(--vs-text-primary)] cursor-pointer">
                <Switch size="small" checked={includeDamaged} onChange={resetPage(setIncludeDamaged)} />
                Include damaged units
              </label>
            </FilterField>
          </FilterBar>
        </AntdThemed>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pb-3">
          <TotalCard
            label="Stock Value (at cost)"
            value={formatCurrency(t.value)}
            sub={`${formatQty(t.qty)} units · ${method === 'fifo' ? 'FIFO' : 'Average cost'}`}
            icon={Wallet}
            tone="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
          />
          <TotalCard
            label="At Selling Price"
            value={formatCurrency(t.saleValue)}
            icon={IndianRupee}
            tone="bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
          />
          <TotalCard
            label="At MRP"
            value={formatCurrency(t.mrpValue)}
            icon={Tag}
            tone="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
          />
          <TotalCard
            label="Potential Margin"
            value={formatCurrency(t.potentialMargin)}
            sub={`${marginPercent(t.potentialMargin, t.saleValue).toFixed(1)}% of selling value`}
            icon={BadgePercent}
            tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          />
        </div>

        <Table
          headers={headers}
          data={rows}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search products..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
          onSearchClick={() => setCurrentPage(1)}
          onSearchClear={() => {
            setSearchTerm('');
            setCurrentPage(1);
          }}
          emptyMessage="No stock to value for these filters."
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100, 200, 500]}
          totalRows={pagination?.total || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </Card>

      <InventoryToaster toasts={toasts} />
    </div>
  );
}
