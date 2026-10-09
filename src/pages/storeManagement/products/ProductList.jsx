import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Barcode, QrCode, FileSpreadsheet, Printer, ScanBarcode, FilterX, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Button from '@/components/inputs/Button';
import Select from '@/components/inputs/Select';
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
import Card from '../../../components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import BarcodeScannerModal from '@/components/modal/BarcodeScannerModal';
import ConfirmDialog from './components/ConfirmDialog';
import ToastStack from './components/ToastStack';
import { encodeId, formatINR, formatQty, getStockState, toNumberOr, useToasts } from './utils/productUtils';

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
          <img src={imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-white/10" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-[10px] text-gray-400">
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
      cellClassName: 'font-semibold text-[var(--vs-text-primary)]',
      value: 'checked',
      render: (item) => (
        <div className="flex flex-col">
          <span>{item.name}</span>
          {Array.isArray(item.variantAttributes) && item.variantAttributes.length > 0 && (
            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
              {item.variantAttributes.map((a) => `${a.name}: ${a.value}`).join(' · ')}
            </span>
          )}
        </div>
      ),
    },
    {
      label: 'SKU',
      key: 'sku',
      sortable: true,
      value: 'checked',
      render: (item) => (item.sku ? <span className="font-mono text-xs">{item.sku}</span> : <span className="text-gray-400">—</span>),
    },
    {
      label: 'Barcode',
      key: 'barcode',
      value: 'unchecked',
      render: (item) => (item.barcode ? <span className="font-mono text-xs">{item.barcode}</span> : <span className="text-gray-400">—</span>),
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
      render: (item) => <span className="font-semibold">{formatINR(item.basePrice)}</span>,
    },
    {
      label: 'Discount Price',
      key: 'discountedPrice',
      sortable: true,
      value: 'checked',
      render: (item) =>
        toNumberOr(item.discountedPrice, 0) > 0 ? (
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatINR(item.discountedPrice)}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      label: 'MRP',
      key: 'mrp',
      sortable: true,
      value: 'checked',
      render: (item) => (toNumberOr(item.mrp, 0) > 0 ? <span>{formatINR(item.mrp)}</span> : <span className="text-gray-400">—</span>),
    },
    {
      label: 'Stock',
      key: 'currentStock',
      sortable: true,
      value: 'checked',
      render: (item) => {
        const stock = toNumberOr(item.currentStock, 0);
        const state = getStockState(stock, item.lowStockAlertThreshold);
        const damaged = toNumberOr(item.damagedStock, 0);
        return (
          <div className="flex flex-col items-start gap-0.5 text-xs">
            <span
              className={`font-semibold ${state === 'in'
                ? 'text-emerald-600 dark:text-emerald-400'
                : state === 'low'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'}`}
            >
              {formatQty(stock)} {item.unit || ''}
            </span>
            {state === 'low' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Low stock
              </span>
            )}
            {state === 'out' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                Out of stock
              </span>
            )}
            {damaged > 0 && <span className="text-[10px] text-[var(--vs-text-secondary)]">{formatQty(damaged)} damaged</span>}
          </div>
        );
      },
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      value: 'checked',
      render: (item) => {
        const isActive = item.status === 'active';
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isActive
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
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
    <div className="flex flex-col gap-6">
      <Card h1="Products" bodyClassName="p-4">
        {/* Top bar: barcode finder + actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
          <form onSubmit={handleBarcodeSearch} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Barcode className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Scan or enter barcode / SKU..."
                value={barcodeSearch}
                onChange={(e) => setBarcodeSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 pl-9 pr-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 transition-all duration-200 outline-none focus:border-indigo-500/60"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBarcodeModalOpen(true)}
              className="!h-9 shrink-0 px-3"
              title="Scan Barcode"
            >
              <QrCode className="w-4 h-4" />
            </Button>
            <Button type="submit" variant="outline" className="!h-9 shrink-0">
              <Search className="w-3.5 h-3.5 mr-1" />
              Find
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Button
              variant="outline"
              className="!h-10"
              startIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              onClick={() => navigate('/products/import-export')}
            >
              Import / Export
            </Button>
            <Button
              variant="outline"
              className="!h-10"
              startIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => navigate('/products/labels')}
            >
              Print Labels
            </Button>
            <Button
              variant="outline"
              className="!h-10"
              startIcon={<ScanBarcode className="w-3.5 h-3.5" />}
              onClick={() => setBarcodeConfirmOpen(true)}
            >
              Generate Barcodes
            </Button>
          </div>
        </div>

        {/* Filters — hidden until the Filters button is clicked; slides open/closed */}
        <div
          className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${showFilters ? 'grid-rows-[1fr] opacity-100 mb-4' : 'grid-rows-[0fr] opacity-0 mb-0'}`}
          aria-hidden={!showFilters}
          inert={!showFilters}
        >
        <div className={showFilters ? 'overflow-visible' : 'overflow-hidden'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] gap-3 items-end p-3 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]/40">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">Category</span>
            <Select
              options={[{ value: '', label: 'All categories' }, ...filterOptions.categories.map((c) => ({ value: c._id, label: c.name }))]}
              value={params.categoryId}
              onChange={(v) => setFilter('categoryId', v)}
              placeholder="All categories"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">Brand</span>
            <Select
              options={[{ value: '', label: 'All brands' }, ...filterOptions.brands.map((b) => ({ value: b._id, label: b.name }))]}
              value={params.brandId}
              onChange={(v) => setFilter('brandId', v)}
              placeholder="All brands"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">Status</span>
            <Select options={STATUS_OPTIONS} value={params.status} onChange={(v) => setFilter('status', v)} placeholder="All statuses" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">Stock</span>
            <Select
              options={STOCK_OPTIONS}
              value={params.stockStatus}
              onChange={(v) => setFilter('stockStatus', v)}
              placeholder="All stock levels"
            />
          </div>
          <Button
            variant="outline"
            className="!h-11"
            disabled={!hasFilters}
            startIcon={<FilterX className="w-3.5 h-3.5" />}
            onClick={() => setParams((prev) => ({ ...prev, ...EMPTY_FILTERS, page: 1 }))}
          >
            Clear
          </Button>
        </div>
        </div>
        </div>

        <Table
          actions={
            <>
              <Button className="!h-10" startIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => navigate('/products/create')}>
                Add New Product
              </Button>
              <Button
                variant="outline"
                className="!h-10"
                aria-expanded={showFilters}
                startIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                onClick={() => setShowFilters((v) => !v)}
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </>
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
      </Card>

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
