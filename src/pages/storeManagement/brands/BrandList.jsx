import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import {
  getBrands,
  deleteBrand,
  changeBrandStatus,
  clearBrandToast,
} from './services/brandSlice';
import Card from '../../../components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';

export default function BrandList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { brands, pagination, loading, toast: reduxToast } = useSelector((state) => state.brand);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, brandId: null });
  const [toasts, setToasts] = useState([]);
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
    dispatch(getBrands(params));
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
      dispatch(clearBrandToast());
    }
  }, [reduxToast, dispatch]);

  const handleDeleteClick = (item) => {
    setDeleteModal({ isOpen: true, brandId: item._id });
  };

  const handleEditClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/brands/edit/${encryptedId}`);
  };

  const handleViewClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/brands/view/${encryptedId}`);
  };

  const handleConfirmDelete = () => {
    if (deleteModal.brandId) {
      dispatch(deleteBrand(deleteModal.brandId));
      setDeleteModal({ isOpen: false, brandId: null });
    }
  };

  const handleStatusToggle = (item, newVal) => {
    const newStatus = newVal ? 'active' : 'inactive';
    dispatch(changeBrandStatus({ brandId: item._id, status: newStatus }));
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

  const headers = [
    {
      label: 'Logo',
      key: 'logo',
      type: 'image',
      width: '80px',
      value: 'checked'
    },
    {
      label: 'Name',
      key: 'name',
      width: '25%',
      sortable: true,
      cellClassName: 'font-semibold text-[var(--vs-text-primary)]',
      value: 'checked'
    },
    {
      label: 'Description',
      key: 'description',
      sortable: true,
      value: 'checked'
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
      <Card h1="Brands" bodyClassName="p-4">
        <Table
          headers={headers}
          data={brands}
          loading={loading}
          searchPlaceholder="Search brands..."
          emptyMessage="No brands found. Click 'Add New Brand' to create one."
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onView={handleViewClick}
          onToggle={handleStatusToggle}
          toggleField="status"
          currentPage={pagination?.page || params.page || 1}
          pageSize={pagination?.limit || params.limit || 10}
          totalRows={pagination?.total || pagination?.totalItems || brands.length}
          onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
          onPageSizeChange={(limit) => setParams((prev) => ({ ...prev, limit, page: 1 }))}
          onSortChange={({ key, direction }) => setParams((prev) => ({ ...prev, sort: key, order: direction }))}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSearchClick={handleSearchClick}
          onSearchClear={handleSearchClear}
          actions={
            <Button
              className="!h-10"
              startIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => navigate('/brands/create')}
            >
              Add New Brand
            </Button>
          }
        />
      </Card>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, brandId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Brand"
        message="Are you sure you want to delete this brand? This action cannot be undone."
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
