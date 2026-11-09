import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Table from '@/components/table/Table';
import {
  getManufacturers,
  deleteManufacturer,
  changeManufacturerStatus,
  clearManufacturerToast,
} from './services/manufacturerSlice';
import DeleteModal from '@/components/modal/DeleteModal';
import { useToasts } from '../products/utils/productUtils';
import { Button, PageHeader, StatusBadge, ToastStack } from '@/components/ui';

export default function ManufacturerList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { manufacturers, pagination, loading, toast: reduxToast } = useSelector((state) => state.manufacturer);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, manufacturerId: null });
  const { toasts, showToast } = useToasts(5000);
  const [searchTerm, setSearchTerm] = useState('');

  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    sort: 'createdAt',
    order: 'desc',
    search: '',
  });

  useEffect(() => {
    dispatch(getManufacturers(params));
  }, [dispatch, params]);

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location, showToast]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearManufacturerToast());
    }
  }, [reduxToast, dispatch, showToast]);

  const handleDeleteClick = (item) => {
    setDeleteModal({ isOpen: true, manufacturerId: item._id });
  };

  const handleEditClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/manufacturers/edit/${encryptedId}`);
  };

  const handleViewClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/manufacturers/view/${encryptedId}`);
  };

  const handleConfirmDelete = () => {
    if (deleteModal.manufacturerId) {
      dispatch(deleteManufacturer(deleteModal.manufacturerId));
      setDeleteModal({ isOpen: false, manufacturerId: null });
    }
  };

  const handleStatusToggle = (item, newVal) => {
    const newStatus = newVal ? 'active' : 'inactive';
    dispatch(changeManufacturerStatus({ manufacturerId: item._id, status: newStatus }));
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
      cellClassName: 'font-semibold text-ink',
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
          <StatusBadge status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} />
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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Manufacturers"
        actions={
          <Button startIcon={<Plus />} onClick={() => navigate('/manufacturers/create')}>
            Add New Manufacturer
          </Button>
        }
      />

      <Table
        headers={headers}
        data={manufacturers}
        loading={loading}
        searchPlaceholder="Search manufacturers..."
        emptyMessage="No manufacturers found. Click 'Add New Manufacturer' to create one."
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onView={handleViewClick}
        onToggle={handleStatusToggle}
        toggleField="status"
        currentPage={pagination?.page || params.page || 1}
        pageSize={pagination?.limit || params.limit || 10}
        totalRows={pagination?.total || pagination?.totalItems || manufacturers.length}
        onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
        onPageSizeChange={(limit) => setParams((prev) => ({ ...prev, limit, page: 1 }))}
        onSortChange={({ key, direction }) => setParams((prev) => ({ ...prev, sort: key, order: direction }))}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearchClick={handleSearchClick}
        onSearchClear={handleSearchClear}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, manufacturerId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Manufacturer"
        message="Are you sure you want to delete this manufacturer? This action cannot be undone."
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
