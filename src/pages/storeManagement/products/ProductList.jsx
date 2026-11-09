import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Barcode, QrCode, FileSpreadsheet, Printer, ScanBarcode, FilterX, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { formatDateWithTiming } from '@/utility/dateTiming';
import { Badge, Button, Card, Field, Input, PageHeader, Select, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/utils';
import Table from '@/components/table/Table';
import {
  getProducts,
  deleteProduct,
  clearProductToast,
  changeProductStatus,
  getProductByBarcode,
  generateBarcodes,
} from './services/productSlice';
import { getCategoriesApi } from '../categories/services/categoryService';
import { getBrandsApi } from '../brands/services/brandService';
import DeleteModal from '@/components/modal/DeleteModal';
import BarcodeScannerModal from '@/components/modal/BarcodeScannerModal';
import ConfirmDialog from './components/ConfirmDialog';
import ToastStack from './components/ToastStack';
import { encodeId, formatINR, formatQty, getStockState, toNumberOr, useToasts } from './utils/productUtils';

const STOCK_TEXT = { in: 'text-success', low: 'text-warning', out: 'text-danger' };
const Dash = () => <span className="text-ink-subtle">—</span>;

const DEFAULT_SORT = { sort: 'createdAt', order: 'desc' };
const SORTABLE_FIELDS = ['name', 'sku', 'createdAt', 'updatedAt', 'basePrice', 'discountedPrice', 'finalPrice', 'mrp', 'costPrice', 'currentStock', 'status'];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const STOCK_OPTIONS = [
  { value: '', label: 'All stock levels' },
  { value: 'in', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
  { value: 'damaged', label: 'Has damaged stock' },
];

const EMPTY_FILTERS = { categoryId: '', brandId: '', status: '', stockStatus: '' };

export default function ProductList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, showToast } = useToasts(4500);

  const { products, pagination, loading, toast: reduxToast, generatingBarcodes } = useSelector((state) => state.product);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });
  const [barcodeConfirmOpen, setBarcodeConfirmOpen] = useState(false);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ categories: [], brands: [] });
  // Column header sort state; null key = default order (newest first).
  const [sortUi, setSortUi] = useState({ key: null, direction: 'asc' });

  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    ...DEFAULT_SORT,
    search: '',
    ...EMPTY_FILTERS,
  });

  // Only send filters that are set.
  const queryParams = useMemo(() => {
    const q = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) q[k] = v;
    });
    return q;
  }, [params]);

  useEffect(() => {
    dispatch(getProducts(queryParams));
  }, [dispatch, queryParams]);

  // Category / brand options for the filters.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getCategoriesApi({ page: 1, limit: 100 }), getBrandsApi({ page: 1, limit: 100 })]).then(
      ([cats, brands]) => {
        if (cancelled) return;
        setFilterOptions({
          categories: cats.status === 'fulfilled' ? cats.value?.data || [] : [],
          brands: brands.status === 'fulfilled' ? brands.value?.data || [] : [],
        });
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location, showToast]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearProductToast());
    }
  }, [reduxToast, dispatch, showToast]);

  const refresh = () => dispatch(getProducts(queryParams));

  const handleDeleteClick = (item) => setDeleteModal({ isOpen: true, productId: item._id });
  const handleEditClick = (item) => navigate(`/products/edit/${encodeId(item._id)}`);
  const handleViewClick = (item) => navigate(`/products/view/${encodeId(item._id)}`);
  const handleAuditClick = (item) => navigate(`/products/audit/${encodeId(item._id)}`);

  const handleConfirmDelete = async () => {
    if (!deleteModal.productId) return;
    const result = await dispatch(deleteProduct(deleteModal.productId));
    setDeleteModal({ isOpen: false, productId: null });
    // Backend 409 message (stock still left) is shown through the slice toast.
    if (deleteProduct.fulfilled.match(result)) refresh();
  };

  const handleStatusToggle = (item, newVal) => {
    dispatch(changeProductStatus({ productId: item._id, status: newVal ? 'active' : 'inactive' }));
  };

  const handleGenerateBarcodes = async () => {
    const result = await dispatch(generateBarcodes());
    setBarcodeConfirmOpen(false);
    if (generateBarcodes.fulfilled.match(result)) refresh();
  };

  const handleSearchClick = (searchVal) => {
    const query = typeof searchVal === 'string' ? searchVal : searchTerm;
    setSearchTerm(query);
    setParams((prev) => ({ ...prev, search: query.trim(), page: 1 }));
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setParams((prev) => ({ ...prev, search: '', page: 1 }));
  };

  const handleSortChange = ({ key, direction }) => {
    if (!key || !SORTABLE_FIELDS.includes(key)) {
      setSortUi({ key: null, direction: 'asc' });
      setParams((prev) => ({ ...prev, ...DEFAULT_SORT, page: 1 }));
      return;
    }
    const order = direction === 'desc' ? 'desc' : 'asc';
    setSortUi({ key, direction: order });
    setParams((prev) => ({ ...prev, sort: key, order, page: 1 }));
  };

  const setFilter = (key, value) => setParams((prev) => ({ ...prev, [key]: value || '', page: 1 }));
  const hasFilters = Object.keys(EMPTY_FILTERS).some((k) => params[k]);
  const activeFilterCount = Object.keys(EMPTY_FILTERS).filter((k) => params[k]).length;

  const searchProductByBarcodeValue = async (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const actionResult = await dispatch(getProductByBarcode(trimmed));
    if (getProductByBarcode.fulfilled.match(actionResult)) {
      const found = actionResult.payload.data;
      const target = Array.isArray(found) ? found[0] : found;
      if (target?._id) navigate(`/products/view/${encodeId(target._id)}`);
      else showToast('Product data invalid', 'danger');
    }
  };

  const handleBarcodeSearch = async (e) => {
    e.preventDefault();
    await searchProductByBarcodeValue(barcodeSearch);
  };

  const handleBarcodeScanned = async (scannedValue) => {
    setBarcodeSearch(scannedValue);
    await searchProductByBarcodeValue(scannedValue);
  };

  // Column renderers use no component state, so the list is built once (keeps column choices stable).
  const headers = useMemo(() => [
    {
      label: 'Image',
      key: 'images',
      type: 'image',
      width: '80px',
      value: 'checked',
      render: (item) => {
        const first = item.images?.[0];
        const imageUrl = typeof first === 'string' ? first : first?.path || first?.url;
        return imageUrl ? (
          <img src={imageUrl} alt={item.name} className="size-9 rounded-lg border border-line object-cover" />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-lg bg-fill text-center text-[10px] leading-tight text-ink-subtle">
            No Image
          </div>
        );
      },
    },
    {
      label: 'Name',
      key: 'name',
      width: '20%',
      sortable: true,
      cellClassName: 'font-semibold text-ink',
      value: 'checked',
      render: (item) => <span>{item.name}</span>,
    },
    {
      label: 'SKU',
      key: 'sku',
      sortable: true,
      value: 'checked',
      render: (item) => (item.sku ? <span className="font-mono text-xs">{item.sku}</span> : <Dash />),
    },
    {
      label: 'Barcode',
      key: 'barcode',
      value: 'unchecked',
      render: (item) => (item.barcode ? <span className="font-mono text-xs">{item.barcode}</span> : <Dash />),
    },
    {
      label: 'Category',
      key: 'categoryId',
      value: 'checked',
      render: (item) => <span>{item.categoryId?.name || 'N/A'}</span>,
    },
    {
      label: 'Subcategory',
      key: 'subCategoryId',
      value: 'checked',
      render: (item) => <span>{item.subCategoryId?.name || 'N/A'}</span>,
    },
    {
      label: 'Brand',
      key: 'brandId',
      value: 'checked',
      render: (item) => <span>{item.brandId?.name || 'N/A'}</span>,
    },
    {
      label: 'Price',
      key: 'basePrice',
      sortable: true,
      value: 'checked',
      render: (item) => <span className="font-semibold tabular-nums">{formatINR(item.basePrice)}</span>,
    },
    {
      label: 'Discount Price',
      key: 'discountedPrice',
      sortable: true,
      value: 'checked',
      render: (item) =>
        toNumberOr(item.discountedPrice, 0) > 0 ? (
          <span className="font-semibold tabular-nums text-brand-ink">{formatINR(item.discountedPrice)}</span>
        ) : (
          <Dash />
        ),
    },
    {
      label: 'MRP',
      key: 'mrp',
      sortable: true,
      value: 'checked',
      render: (item) => (toNumberOr(item.mrp, 0) > 0 ? <span className="tabular-nums">{formatINR(item.mrp)}</span> : <Dash />),
    },
    {
      label: 'Stock',
      key: 'currentStock',
      sortable: true,
      value: 'checked',
      render: (item) => {
        const stock = toNumberOr(item.currentStock, 0);
        const state = getStockState(stock, item.lowStockAlertThreshold);
        return (
          <span className={cn('font-semibold tabular-nums', STOCK_TEXT[state] || STOCK_TEXT.out)}>
            {formatQty(stock)} {item.unit || ''}
          </span>
        );
      },
    },
    {
      label: 'Stock status',
      key: 'stockState',
      value: 'checked',
      render: (item) => {
        const state = getStockState(toNumberOr(item.currentStock, 0), item.lowStockAlertThreshold);
        if (state === 'low') return <Badge tone="warning">Low stock</Badge>;
        if (state === 'out') return <Badge tone="danger">Out of stock</Badge>;
        return <Badge tone="success">In stock</Badge>;
      },
    },
    {
      label: 'Damaged',
      key: 'damagedStock',
      value: 'checked',
      render: (item) => (toNumberOr(item.damagedStock, 0) > 0
        ? <span className="font-semibold tabular-nums text-danger">{formatQty(item.damagedStock)}</span>
        : <Dash />),
    },
    {
      label: 'Batches',
      key: 'openBatches',
      value: 'checked',
      render: (item) => (toNumberOr(item.openBatches, 0) > 0 ? (
        <Button
          variant="soft"
          size="xs"
          className="h-6 rounded-chip px-2"
          onClick={() => navigate(`/products/view/${encodeId(item._id)}#batches`)}
          title="See the batches and their prices"
        >
          {item.openBatches} batch{item.openBatches === 1 ? '' : 'es'}
        </Button>
      ) : <Dash />),
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      value: 'checked',
      render: (item) => {
        const isActive = item.status === 'active';
        return <StatusBadge status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} />;
      },
    },
    {
      label: 'Created By',
      key: 'createdBy',
      render: (item) => <span>{item.createdBy?.name || '—'}</span>,
      value: 'checked',
    },
    {
      label: 'Updated By',
      key: 'updatedBy',
      render: (item) => <span>{item.updatedBy?.name || '—'}</span>,
      value: 'checked',
    },
    {
      label: 'Date',
      key: 'createdAt',
      sortable: true,
      render: (item) => <span>{formatDateWithTiming(item.createdAt)}</span>,
      value: 'checked',
    },
  ], []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Products"
        actions={
          <>
            <Button variant="secondary" startIcon={<FileSpreadsheet />} onClick={() => navigate('/products/import-export')}>
              Import / Export
            </Button>
            <Button variant="secondary" startIcon={<Printer />} onClick={() => navigate('/products/labels')}>
              Print Labels
            </Button>
            <Button variant="secondary" startIcon={<ScanBarcode />} onClick={() => setBarcodeConfirmOpen(true)}>
              Generate Barcodes
            </Button>
            <Button startIcon={<Plus />} onClick={() => navigate('/products/create')}>
              Add New Product
            </Button>
          </>
        }
      />

      {/* Barcode finder */}
      <Card padding="sm">
        <form onSubmit={handleBarcodeSearch} className="flex w-full max-w-xl items-center gap-2">
          <Input
            startIcon={<Barcode />}
            placeholder="Scan or enter barcode / SKU..."
            aria-label="Barcode or SKU"
            value={barcodeSearch}
            onChange={(e) => setBarcodeSearch(e.target.value)}
          />
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsBarcodeModalOpen(true)}
            title="Scan Barcode"
            aria-label="Scan Barcode"
          >
            <QrCode />
          </Button>
          <Button type="submit" variant="secondary" startIcon={<Search />} className="shrink-0">
            Find
          </Button>
        </form>
      </Card>

      {/* Filters — hidden until the Filters button is clicked; slides open/closed */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out',
          showFilters ? 'grid-rows-[1fr] opacity-100' : '-mt-5 grid-rows-[0fr] opacity-0'
        )}
        aria-hidden={!showFilters}
        inert={!showFilters}
      >
        <div className={showFilters ? 'overflow-visible' : 'overflow-hidden'}>
          <Card padding="sm" className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            <Field label="Category">
              <Select
                options={[{ value: '', label: 'All categories' }, ...filterOptions.categories.map((c) => ({ value: c._id, label: c.name }))]}
                value={params.categoryId}
                onChange={(v) => setFilter('categoryId', v)}
                placeholder="All categories"
              />
            </Field>
            <Field label="Brand">
              <Select
                options={[{ value: '', label: 'All brands' }, ...filterOptions.brands.map((b) => ({ value: b._id, label: b.name }))]}
                value={params.brandId}
                onChange={(v) => setFilter('brandId', v)}
                placeholder="All brands"
              />
            </Field>
            <Field label="Status">
              <Select options={STATUS_OPTIONS} value={params.status} onChange={(v) => setFilter('status', v)} placeholder="All statuses" searchable={false} />
            </Field>
            <Field label="Stock">
              <Select
                options={STOCK_OPTIONS}
                value={params.stockStatus}
                onChange={(v) => setFilter('stockStatus', v)}
                placeholder="All stock levels"
                searchable={false}
              />
            </Field>
            <Button
              variant="secondary"
              className="h-11"
              disabled={!hasFilters}
              startIcon={<FilterX />}
              onClick={() => setParams((prev) => ({ ...prev, ...EMPTY_FILTERS, page: 1 }))}
            >
              Clear
            </Button>
          </Card>
        </div>
      </div>

      <Table
        actions={
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={showFilters}
            startIcon={<SlidersHorizontal />}
            onClick={() => setShowFilters((v) => !v)}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn('transition-transform duration-300', showFilters && 'rotate-180')} />
          </Button>
        }
        headers={headers}
        data={products}
        loading={loading}
        searchPlaceholder="Search by name, SKU, barcode or HSN..."
        emptyMessage={hasFilters || params.search ? 'No products match your filters.' : "No products found. Click 'Add New Product' to create one."}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onToggle={handleStatusToggle}
        toggleField="status"
        onView={handleViewClick}
        onAudit={handleAuditClick}
        pageSizeOptions={[10, 25, 50, 100]}
        currentPage={pagination?.page || params.page || 1}
        pageSize={pagination?.limit || params.limit || 10}
        totalRows={pagination?.total || pagination?.totalItems || products.length}
        onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
        onPageSizeChange={(limit) => setParams((prev) => ({ ...prev, limit: Math.min(100, limit), page: 1 }))}
        sortConfig={sortUi}
        onSortChange={handleSortChange}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearchClick={handleSearchClick}
        onSearchClear={handleSearchClear}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, productId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? Products that still have stock cannot be deleted."
      />

      <ConfirmDialog
        isOpen={barcodeConfirmOpen}
        onClose={() => setBarcodeConfirmOpen(false)}
        onConfirm={handleGenerateBarcodes}
        isLoading={generatingBarcodes}
        title="Generate Barcodes"
        message="Every product without a barcode will get a new in-store EAN-13 barcode (starting with 2). Existing barcodes are not changed."
        confirmText="Generate"
        loadingText="Generating..."
        icon={<ScanBarcode className="w-6 h-6" />}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onSave={handleBarcodeScanned}
        initialValue={barcodeSearch}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
