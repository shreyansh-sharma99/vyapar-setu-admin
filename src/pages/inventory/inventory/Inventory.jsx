import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Package,
  XCircle,
  AlertOctagon,
  IndianRupee,
} from 'lucide-react';
import { FaHistory } from 'react-icons/fa';
import { Badge, Button, DataTable, PageHeader, Select, StatCard } from '@/components/ui';
import { getInventory } from './services/inventorySlice';
import { getCategoryOptionsApi, getBrandOptionsApi } from './services/inventoryService';
import { StockStatusPill, InventoryToaster } from './components/InventoryShared';
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

  // Filters
  const [stockStatus, setStockStatus] = useState(''); // '' | in | low | out | damaged
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
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      status: productStatus || undefined,
      stockStatus: stockStatus || undefined,
      sort: sortConfig.key || 'name',
      order: sortConfig.key ? sortConfig.direction : 'asc',
    }),
    [currentPage, pageSize, debouncedSearch, categoryId, brandId, productStatus, stockStatus, sortConfig]
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

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Product',
        sortable: true,
        mobile: 'title',
        render: (item) => <span className="font-semibold text-ink">{item.name}</span>,
      },
      {
        key: 'sku',
        header: 'SKU',
        render: (item) => (item.sku ? <span className="font-mono text-xs">{item.sku}</span> : <span className="text-ink-subtle">—</span>),
      },
      {
        key: 'category',
        header: 'Category',
        hideBelow: 'lg',
        render: (item) => item.categoryId?.name || <span className="text-ink-subtle">—</span>,
      },
      {
        key: 'barcode',
        header: 'Barcode',
        hideBelow: 'lg',
        render: (item) => {
          if (item.barcode) return <span className="font-mono text-xs">{item.barcode}</span>;
          return Number(item.qty) + Number(item.damaged || 0) > 0
            ? <span title="No barcode — set it on the next purchase"><Badge tone="warning" size="xs" className="px-2">No barcode</Badge></span>
            : <span className="text-ink-subtle">—</span>;
        },
      },
      {
        key: 'qty',
        header: 'Stock',
        type: 'number',
        sortable: true,
        mobile: 'amount',
        render: (item) => (
          <span className="text-sm font-bold tabular-nums text-ink">
            {formatQty(item.qty)} <span className="text-[11px] font-medium text-ink-subtle">{item.unit || 'units'}</span>
          </span>
        ),
      },
      {
        key: 'damaged',
        header: 'Damaged',
        type: 'number',
        sortable: true,
        render: (item) =>
          Number(item.damaged) > 0 ? (
            <Badge tone="danger" className="tabular-nums">{formatQty(item.damaged)}</Badge>
          ) : (
            <span className="text-ink-subtle">-</span>
          ),
      },
      {
        key: 'threshold',
        header: 'Low at',
        type: 'number',
        hideBelow: 'lg',
        // 0 = no alert set yet for this product (set on the purchase or in Edit product)
        render: (item) => (Number(item.threshold) > 0
          ? <span className="text-xs font-medium tabular-nums">{formatQty(item.threshold)}</span>
          : <span className="text-xs text-ink-subtle" title="No low-stock alert set">—</span>),
      },
      {
        key: 'stockStatus',
        header: 'Status',
        render: (item) => <StockStatusPill status={item.stockStatus} />,
      },
      {
        key: 'productStatus',
        header: 'Product',
        hideBelow: 'lg',
        render: (item) => (item.status === 'inactive'
          ? <Badge tone="neutral" size="xs" className="px-2">Inactive</Badge>
          : <Badge tone="success" size="xs" className="px-2">Active</Badge>),
      },
      {
        key: 'stockValue',
        header: 'Stock value (₹)',
        type: 'money',
        sortable: true,
        render: (item) => <span className="text-sm font-semibold">{formatCurrency(item.stockValue)}</span>,
      },
      {
        key: 'avgCost',
        header: 'Avg cost (₹)',
        type: 'money',
        hideBelow: 'lg',
        render: (item) => <span className="tabular-nums text-ink-muted">{formatCurrency(item.avgCost)}</span>,
      },
      {
        key: 'updatedAt',
        header: 'Last updated',
        sortable: true,
        hideBelow: 'xl',
        render: (item) => <span className="text-xs">{formatDate(item.updatedAt)}</span>,
      },
      {
        key: 'updatedBy',
        header: 'Updated by',
        hideBelow: 'xl',
        render: (item) => <span className="text-xs">{item.updatedBy?.name || '-'}</span>,
      },
      {
        key: 'createdBy',
        header: 'Created by',
        hideBelow: '2xl',
        render: (item) => <span className="text-xs">{item.createdBy?.name || '-'}</span>,
      },
      {
        key: 'actions',
        header: '',
        type: 'actions',
        render: (item) => (
          <div className="inline-flex items-center justify-end gap-1">
            <Button
              variant="soft"
              size="xs"
              startIcon={<SlidersHorizontal />}
              title="Adjust stock"
              onClick={() =>
                navigate(adjustStockPath(item._id), {
                  state: { selectedProduct: item },
                })
              }
            >
              Adjust
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Stock history"
              aria-label="Stock history"
              className="text-info hover:bg-info-soft hover:text-info"
              onClick={() => navigate(productAuditPath(item._id))}
            >
              <FaHistory />
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  const stats = inventoryStats || {};
  const hasFilters = !!(stockStatus || categoryId || brandId || productStatus || debouncedSearch);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Inventory"
        description="Stock on hand for every product. Values are at cost."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="All products"
          value={stats.totalProducts ?? 0}
          chip={`${formatQty(stats.totalUnits)} units`}
          icon={Package}
          tone="neutral"
          active={!stockStatus}
          onClick={() => withPageReset(setStockStatus)('')}
        />
        <StatCard label="In stock" value={stats.inStock ?? 0} icon={CheckCircle2} tone="success" active={stockStatus === 'in'} onClick={() => toggleStatus('in')} />
        <StatCard label="Low stock" value={stats.lowStock ?? 0} icon={AlertTriangle} tone="warning" active={stockStatus === 'low'} onClick={() => toggleStatus('low')} />
        <StatCard label="Out of stock" value={stats.outOfStock ?? 0} icon={XCircle} tone="danger" active={stockStatus === 'out'} onClick={() => toggleStatus('out')} />
        <StatCard
          label="Damaged"
          value={stats.withDamaged ?? 0}
          chip={`${formatQty(stats.totalDamaged)} units`}
          icon={AlertOctagon}
          tone="danger"
          active={stockStatus === 'damaged'}
          onClick={() => toggleStatus('damaged')}
        />
        <StatCard label="Stock value" value={formatCurrency(stats.stockValue)} chip="at cost" icon={IndianRupee} tone="primary" />
      </div>

      <DataTable
        columns={columns}
        rows={inventoryList}
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
          placeholder: 'Search name, SKU, barcode, HSN...',
        }}
        filters={
          <>
            <Select
              size="sm"
              aria-label="Category"
              value={categoryId}
              onChange={(v) => withPageReset(setCategoryId)(v || '')}
              placeholder="All categories"
              clearable
              options={categories.map((c) => ({ value: c._id, label: c.name }))}
              wrapperClassName="w-44"
            />
            <Select
              size="sm"
              aria-label="Brand"
              value={brandId}
              onChange={(v) => withPageReset(setBrandId)(v || '')}
              placeholder="All brands"
              clearable
              options={brands.map((b) => ({ value: b._id, label: b.name }))}
              wrapperClassName="w-44"
            />
            <Select
              size="sm"
              aria-label="Product status"
              value={productStatus}
              onChange={(v) => withPageReset(setProductStatus)(v || '')}
              placeholder="Any status"
              clearable
              searchable={false}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              wrapperClassName="w-36"
            />
          </>
        }
        empty={{ icon: Package, title: hasFilters ? 'No products match these filters.' : 'No products in inventory yet.' }}
        pagination={{
          page: currentPage,
          pageSize,
          total: inventoryPagination?.total || 0,
          onPageChange: (page) => setCurrentPage(page),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
          pageSizeOptions: [10, 20, 50, 100],
        }}
        sort={sortConfig}
        onSortChange={({ key, direction }) => {
          setSortConfig({ key, direction });
          setCurrentPage(1);
        }}
      />

      <InventoryToaster toasts={toasts} />
    </div>
  );
}
