import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Barcode, QrCode } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import {
  getProducts,
  deleteProduct,
  clearProductToast,
  changeProductStatus,
  getProductByBarcode,
} from './services/productSlice';
import Card from '../../../components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import BarcodeScannerModal from '@/components/modal/BarcodeScannerModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';

export default function ProductList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { products, pagination, loading, toast: reduxToast } = useSelector((state) => state.product);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });
  const [toasts, setToasts] = useState([]);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    sort: 'createdAt',
    order: 'desc',
    search: '',
  });

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    dispatch(getProducts(params));
  }, [dispatch, params]);

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearProductToast());
    }
  }, [reduxToast, dispatch]);

  const handleDeleteClick = (item) => {
    setDeleteModal({ isOpen: true, productId: item._id });
  };

  const handleEditClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/products/edit/${encryptedId}`);
  };

  const handleViewClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/products/view/${encryptedId}`);
  };

  const handleConfirmDelete = () => {
    if (deleteModal.productId) {
      dispatch(deleteProduct(deleteModal.productId));
      setDeleteModal({ isOpen: false, productId: null });
    }
  };

  const handleStatusToggle = (item, newVal) => {
    const newStatus = newVal ? 'active' : 'inactive';
    dispatch(changeProductStatus({ productId: item._id, status: newStatus }));
  };

  const handleSearchClick = (searchVal) => {
    const query = typeof searchVal === 'string' ? searchVal : searchTerm;
    setSearchTerm(query);
    setParams((prev) => ({ ...prev, search: query, page: 1 }));
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setParams((prev) => ({ ...prev, search: '', page: 1 }));
  };

  const searchProductByBarcodeValue = async (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    try {
      const actionResult = await dispatch(getProductByBarcode(trimmed));
      if (getProductByBarcode.fulfilled.match(actionResult)) {
        const foundProduct = actionResult.payload.data;
        const targetProduct = Array.isArray(foundProduct) ? foundProduct[0] : foundProduct;
        if (targetProduct && targetProduct._id) {
          const encryptedId = encodeURIComponent(encryptData(targetProduct._id));
          navigate(`/products/view/${encryptedId}`);
        } else {
          showToast('Product data invalid', 'danger');
        }
      }
    } catch (err) {
      showToast('Search failed', 'danger');
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

  const headers = [
    {
      label: 'Image',
      key: 'images',
      type: 'image',
      width: '80px',
      value: 'checked',
      render: (item) => {
        const imageUrl = item.images?.[0]?.path;

        return imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-white/10"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-xs text-gray-400">
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
      value: 'checked'
    },
    {
      label: 'Category',
      key: 'categoryId',
      sortable: true,
      value: 'checked',
      render: (item) => <span>{item.categoryId?.name || 'N/A'}</span>
    },
    {
      label: 'Subcategory',
      key: 'subCategoryId',
      sortable: true,
      value: 'checked',
      render: (item) => <span>{item.subCategoryId?.name || 'N/A'}</span>
    },
    {
      label: 'Brand',
      key: 'brandId',
      sortable: true,
      value: 'checked',
      render: (item) => <span>{item.brandId?.name || 'N/A'}</span>
    },
    {
      label: 'Price',
      key: 'discountedPrice',
      sortable: true,
      value: 'checked',
      render: (item) => (
        <div className="flex flex-col text-xs">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">₹{item.discountedPrice}</span>
          {item.basePrice !== item.discountedPrice && (
            <span className="text-gray-400 line-through">₹{item.basePrice}</span>
          )}
        </div>
      )
    },
    {
      label: 'Stock',
      key: 'initialStock',
      sortable: true,
      value: 'checked',
      render: (item) => {
        const stock = Number(item.initialStock || 0);
        const threshold = Number(item.lowStockAlertThreshold || 0);
        const isLow = stock <= threshold;
        return (
          <div className="flex flex-col text-xs">
            <span className={`font-semibold ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {stock}
            </span>
            {isLow && <span className="text-[10px] text-rose-500 font-medium">Low Stock</span>}
          </div>
        );
      }
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      render: (item) => {
        const isActive = item.status === 'active';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isActive
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
            }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
      value: 'checked'
    },
    {
      label: 'Created By',
      key: 'createdBy',
      sortable: true,
      render: (item) => <span>{item.createdBy?.name || '—'}</span>,
      value: 'checked'
    },
    {
      label: 'Updated By',
      key: 'updatedBy',
      sortable: true,
      render: (item) => <span>{item.updatedBy?.name || '—'}</span>,
      value: 'checked'
    },
    {
      label: 'Date',
      key: 'createdAt',
      sortable: true,
      render: (item) => <span>{formatDateWithTiming(item.createdAt)}</span>,
      value: 'checked'
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card h1="Products" bodyClassName="p-4">
        {/* Top actions/search bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <form onSubmit={handleBarcodeSearch} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Barcode className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Scan or enter barcode..."
                value={barcodeSearch}
                onChange={(e) => setBarcodeSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 pl-9 pr-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 transition-all duration-200 outline-none focus:border-indigo-500/60 focus:bg-indigo-500/[0.04] dark:focus:bg-indigo-500/[0.08]"
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

          <Button
            className="!h-10 self-end md:self-auto"
            startIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => navigate('/products/create')}
          >
            Add New Product
          </Button>
        </div>

        <Table
          headers={headers}
          data={products}
          loading={loading}
          searchPlaceholder="Search products by name or code..."
          emptyMessage="No products found. Click 'Add New Product' to create one."
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onToggle={handleStatusToggle}
          toggleField="status"
          onView={handleViewClick}
          currentPage={pagination?.page || params.page || 1}
          pageSize={pagination?.limit || params.limit || 10}
          totalRows={pagination?.total || pagination?.totalItems || products.length}
          onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
          onPageSizeChange={(limit) => setParams((prev) => ({ ...prev, limit, page: 1 }))}
          onSortChange={({ key, direction }) => setParams((prev) => ({ ...prev, sort: key, order: direction }))}
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
        message="Are you sure you want to delete this product? This action cannot be undone."
      />

      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onSave={handleBarcodeScanned}
        initialValue={barcodeSearch}
      />

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
