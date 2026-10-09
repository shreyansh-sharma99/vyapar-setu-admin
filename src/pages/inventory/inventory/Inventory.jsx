import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Select as AntSelect } from 'antd';
import {
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Package,
  XCircle,
  AlertOctagon,
  IndianRupee,
  Store as StoreIcon,
} from 'lucide-react';
import { FaHistory } from 'react-icons/fa';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import Card from '@/components/breadCrumbs/Card';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
import { getInventory } from './services/inventorySlice';
import { getCategoryOptionsApi, getBrandOptionsApi } from './services/inventoryService';
import {
  AntdThemed,
  FilterBar,
  FilterField,
  StoreSelect,
  StockStatusPill,
  ProductCell,
  InventoryNav,
  InventoryToaster,
} from './components/InventoryShared';
import {
  formatCurrency,
  formatQty,
  formatDate,
  useDebouncedValue,
  useToasts,
  useReportLoader,
  adjustStockPath,
  productAuditPath,
} from './components/inventoryUtils';

export default function Inventory() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { inventoryList, inventoryStats, inventoryPagination, loading } = useSelector((state) => state.inventory);
  const { stores } = useSelector((state) => state.store);

  // Filters
  const [stockStatus, setStockStatus] = useState(''); // '' | in | low | out | damaged
  const [selectedStore, setSelectedStore] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [productStatus, setProductStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 400);

  // Pagination / sort
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Message passed from Adjust Stock
  const { toasts, showToast } = useToasts(location.state);
  useEffect(() => {
    if (location.state?.message) window.history.replaceState({}, document.title);
  }, [location.state]);

  useEffect(() => {
    dispatch(getStores({ limit: 100 }));
    getCategoryOptionsApi()
      .then((res) => setCategories(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setCategories([]));
    getBrandOptionsApi()
      .then((res) => setBrands(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setBrands([]));
  }, [dispatch]);

  const params = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch || undefined,
      storeId: selectedStore || undefined,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      status: productStatus || undefined,
      stockStatus: stockStatus || undefined,
      sort: sortConfig.key || 'name',
      order: sortConfig.key ? sortConfig.direction : 'asc',
    }),
    [currentPage, pageSize, debouncedSearch, selectedStore, categoryId, brandId, productStatus, stockStatus, sortConfig]
  );

  useReportLoader(dispatch, getInventory, params, (msg) => showToast(msg, 'danger'));

  const withPageReset = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const toggleStatus = (status) => {
    setStockStatus((prev) => (prev === status ? '' : status));
    setCurrentPage(1);
  };

  const headers = useMemo(
    () => [
      {
        label: 'Actions',
        key: 'actions',
        width: '1%',
        render: (item) => (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() =>
                navigate(adjustStockPath(item._id, selectedStore), {
                  state: { selectedProduct: item, storeId: selectedStore || undefined },
                })
              }
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg border border-indigo-200 dark:border-indigo-500/30 transition-all cursor-pointer"
              title="Adjust stock"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Adjust
            </button>
            <button
              type="button"
              onClick={() => navigate(productAuditPath(item._id))}
              className="p-1.5 rounded text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
              title="Stock history"
            >
              <FaHistory className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
      {
        label: 'Product',
        key: 'name',
        sortable: true,
        value: 'checked',
        render: (item) => <ProductCell name={item.name} sku={item.sku} sub={item.categoryId?.name} />,
      },
      {
        label: selectedStore ? 'Store Qty' : 'Stock (All Stores)',
        key: 'qty',
        sortable: true,
        value: 'checked',
        render: (item) => {
          const rows = (item.storeStocks || []).filter((s) => Number(s.stock) > 0);
          return (
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-[var(--vs-text-primary)]">
                {formatQty(item.qty)} <span className="text-[11px] font-medium text-[var(--vs-text-secondary)]">{item.unit || 'units'}</span>
              </span>
              {!selectedStore && rows.length > 0 && (
                <div className="flex flex-wrap gap-1 max-w-[280px]">
                  {rows.slice(0, 3).map((s, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-1.5 rounded text-[10px] font-semibold bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)] text-[var(--vs-text-secondary)]"
                    >
                      <StoreIcon className="w-2.5 h-2.5" />
                      {s.storeId?.code || s.storeId?.name || 'Store'}:
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatQty(s.stock)}</span>
                    </span>
                  ))}
                  {rows.length > 3 && (
                    <span className="text-[10px] text-[var(--vs-text-secondary)]">+{rows.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        label: 'Damaged',
        key: 'damaged',
        sortable: true,
        value: 'checked',
        cellClassName: 'text-center',
        render: (item) =>
          Number(item.damaged) > 0 ? (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              {formatQty(item.damaged)}
            </span>
          ) : (
            <span className="text-[var(--vs-text-secondary)]">-</span>
          ),
      },
      {
        label: 'Low At',
        key: 'threshold',
        value: 'checked',
        cellClassName: 'text-center',
        render: (item) => <span className="text-xs font-medium">{formatQty(item.threshold)}</span>,
      },
      {
        label: 'Status',
        key: 'stockStatus',
        value: 'checked',
        render: (item) => (
          <div className="flex flex-col items-start gap-1">
            <StockStatusPill status={item.stockStatus} />
            {item.status === 'inactive' && (
              <span className="text-[10px] font-semibold text-[var(--vs-text-secondary)]">Product inactive</span>
            )}
          </div>
        ),
      },
      {
        label: 'Stock Value',
        key: 'stockValue',
        sortable: true,
        value: 'checked',
        cellClassName: 'text-right',
        render: (item) => (
          <div className="flex flex-col items-end leading-tight">
            <span className="font-semibold text-sm">{formatCurrency(item.stockValue)}</span>
            <span className="text-[10px] text-[var(--vs-text-secondary)]">@ {formatCurrency(item.avgCost)} avg</span>
          </div>
        ),
      },
      {
        label: 'Last Updated',
        key: 'updatedAt',
        sortable: true,
        value: 'checked',
        render: (item) => (
          <div className="flex flex-col leading-tight text-xs">
            <span className="font-medium text-[var(--vs-text-primary)]">{item.updatedBy?.name || '-'}</span>
            <span className="text-[10px] text-[var(--vs-text-secondary)]">{formatDate(item.updatedAt)}</span>
          </div>
        ),
      },
      {
        label: 'Created By',
        key: 'createdBy',
        value: 'checked',
        render: (item) => <span className="text-xs">{item.createdBy?.name || '-'}</span>,
      },
    ],
    [navigate, selectedStore]
  );

  const stats = inventoryStats || {};
  const hasFilters = !!(stockStatus || selectedStore || categoryId || brandId || productStatus || debouncedSearch);

  return (
    <div>
      <Card h1="Inventory" bodyClassName="px-4 pb-4 pt-3">
        <InventoryNav current="list" />
        <AntdThemed>
          <FilterBar>
            <FilterField label="Store / Warehouse">
              <StoreSelect stores={stores} value={selectedStore} onChange={withPageReset(setSelectedStore)} />
            </FilterField>
            <FilterField label="Category">
              <AntSelect
                value={categoryId || undefined}
                onChange={(v) => withPageReset(setCategoryId)(v || '')}
                placeholder="All Categories"
                allowClear
                showSearch={{ optionFilterProp: 'label' }}
                options={categories.map((c) => ({ value: c._id, label: c.name }))}
                className="w-full"
              />
            </FilterField>
            <FilterField label="Brand">
              <AntSelect
                value={brandId || undefined}
                onChange={(v) => withPageReset(setBrandId)(v || '')}
                placeholder="All Brands"
                allowClear
                showSearch={{ optionFilterProp: 'label' }}
                options={brands.map((b) => ({ value: b._id, label: b.name }))}
                className="w-full"
              />
            </FilterField>
            <FilterField label="Product Status">
              <AntSelect
                value={productStatus || undefined}
                onChange={(v) => withPageReset(setProductStatus)(v || '')}
                placeholder="All"
                allowClear
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                className="w-full"
              />
            </FilterField>
          </FilterBar>
        </AntdThemed>

        <div className="pb-2">
          <TableInfoCard
            stats={[
              {
                label: 'All Products',
                value: stats.totalProducts ?? 0,
                subValue: `(${formatQty(stats.totalUnits)} units)`,
                icon: <Package className="w-4 h-4 text-slate-500" />,
                colorClass: 'text-slate-700 dark:text-slate-200',
                isActive: !stockStatus,
                onClick: () => withPageReset(setStockStatus)(''),
              },
              {
                label: 'In Stock',
                value: stats.inStock ?? 0,
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                colorClass: 'text-emerald-600 dark:text-emerald-400',
                isActive: stockStatus === 'in',
                onClick: () => toggleStatus('in'),
              },
              {
                label: 'Low Stock',
                value: stats.lowStock ?? 0,
                icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
                colorClass: 'text-amber-600 dark:text-amber-400',
                isActive: stockStatus === 'low',
                onClick: () => toggleStatus('low'),
              },
              {
                label: 'Out of Stock',
                value: stats.outOfStock ?? 0,
                icon: <XCircle className="w-4 h-4 text-rose-500" />,
                colorClass: 'text-rose-600 dark:text-rose-400',
                isActive: stockStatus === 'out',
                onClick: () => toggleStatus('out'),
              },
              {
                label: 'Damaged',
                value: stats.withDamaged ?? 0,
                subValue: `(${formatQty(stats.totalDamaged)} units)`,
                icon: <AlertOctagon className="w-4 h-4 text-rose-500" />,
                colorClass: 'text-rose-600 dark:text-rose-400',
                isActive: stockStatus === 'damaged',
                onClick: () => toggleStatus('damaged'),
              },
              {
                label: 'Stock Value',
                value: formatCurrency(stats.stockValue),
                subValue: '(at cost)',
                icon: <IndianRupee className="w-4 h-4 text-indigo-500" />,
                colorClass: 'text-indigo-600 dark:text-indigo-400',
              },
            ]}
          />
        </div>

        <Table
          headers={headers}
          data={inventoryList}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search name, SKU, barcode, HSN..."
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
          emptyMessage={hasFilters ? 'No products match these filters.' : 'No products in inventory yet.'}
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          totalRows={inventoryPagination?.total || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          sortConfig={sortConfig}
          onSortChange={({ key, direction }) => {
            setSortConfig({ key, direction });
            setCurrentPage(1);
          }}
        />
      </Card>

      <InventoryToaster toasts={toasts} />
    </div>
  );
}
