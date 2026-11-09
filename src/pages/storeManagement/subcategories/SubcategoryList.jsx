import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Table from '@/components/table/Table';
import {
  getSubcategories,
  deleteSubcategory,
  changeSubcategoryStatus,
  clearSubcategoryToast,
} from './services/subcategorySlice';
import DeleteModal from '@/components/modal/DeleteModal';
import { useToasts } from '../products/utils/productUtils';
import { Button, PageHeader, StatusBadge, ToastStack } from '@/components/ui';

export default function SubcategoryList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialCategoryId = searchParams.get('categoryId') || '';

  const { subcategories, pagination, loading, toast: reduxToast } = useSelector((state) => state.subcategory);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, subCategoryId: null });
  const { toasts, showToast } = useToasts(5000);
  const [searchTerm, setSearchTerm] = useState('');

  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    sort: 'createdAt',
    order: 'desc',
    search: '',
    ...(initialCategoryId ? { categoryId: initialCategoryId } : {}),
  });

  useEffect(() => {
    dispatch(getSubcategories(params));
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
      dispatch(clearSubcategoryToast());
    }
  }, [reduxToast, dispatch, showToast]);

  const handleDeleteClick = (item) => {
    setDeleteModal({ isOpen: true, subCategoryId: item._id });
  };

  const handleEditClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    const categoryId = item.categoryId?._id || item.categoryId || '';
    navigate(`/subcategories/edit/${encryptedId}?categoryId=${categoryId}`);
  };

  const handleViewClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/subcategories/view/${encryptedId}`);
  };

  const handleConfirmDelete = () => {
    if (deleteModal.subCategoryId) {
      dispatch(deleteSubcategory(deleteModal.subCategoryId));
      setDeleteModal({ isOpen: false, subCategoryId: null });
    }
  };

  const handleStatusToggle = (item, newVal) => {
    const newStatus = newVal ? 'active' : 'inactive';
    dispatch(changeSubcategoryStatus({ subCategoryId: item._id, status: newStatus }));
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
      label: 'Image',
      key: 'categoryImage',
      type: 'image',
      width: '80px',
      value: 'checked'
    },
    {
      label: 'Name',
      key: 'name',
      width: '20%',
      sortable: true,
      cellClassName: 'font-semibold text-ink',
      value: 'checked'
    },
    {
      label: 'Category',
      key: 'categoryName',
      sortable: true,
      render: (item) => item.categoryId?.name || 'N/A',
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
        title="Subcategories"
        actions={
          <Button startIcon={<Plus />} onClick={() => navigate('/subcategories/create')}>
            Add New Subcategory
          </Button>
        }
      />

      <Table
        headers={headers}
        data={subcategories}
        loading={loading}
        searchPlaceholder="Search subcategories..."
        emptyMessage="No subcategories found. Click 'Add New Subcategory' to create one."
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onView={handleViewClick}
        onToggle={handleStatusToggle}
        toggleField="status"
        currentPage={pagination?.page || params.page || 1}
        pageSize={pagination?.limit || params.limit || 10}
        totalRows={pagination?.total || pagination?.totalItems || subcategories.length}
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
        onClose={() => setDeleteModal({ isOpen: false, subCategoryId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Subcategory"
        message="Are you sure you want to delete this subcategory? This action cannot be undone."
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
