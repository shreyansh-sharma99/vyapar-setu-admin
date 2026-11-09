import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Table from '@/components/table/Table';
import {
  getCategories,
  deleteCategory,
  clearCategoryToast,
  changeCategoryStatus,
} from './services/categorySlice';
import DeleteModal from '@/components/modal/DeleteModal';
import { useToasts } from '../products/utils/productUtils';
import { Button, PageHeader, StatusBadge, ToastStack } from '@/components/ui';

export default function CategoryList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { categories, pagination, loading, toast: reduxToast } = useSelector((state) => state.category);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, categoryId: null });
  const { toasts, showToast } = useToasts(5000);

  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  useEffect(() => {
    dispatch(getCategories({ page: 1, limit: 10, sort, order, search: '' }));
  }, [dispatch]);

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location, showToast]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearCategoryToast());
    }
  }, [reduxToast, dispatch, showToast]);

  const handleDeleteClick = (item) => {
    setDeleteModal({ isOpen: true, categoryId: item._id });
  };

  const handleEditClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/categories/edit/${encryptedId}`);
  };

  const handleConfirmDelete = () => {
    if (deleteModal.categoryId) {
      dispatch(deleteCategory(deleteModal.categoryId));
      setDeleteModal({ isOpen: false, categoryId: null });
    }
  };

  const handleStatusToggle = (item, newVal) => {
    const newStatus = newVal ? 'active' : 'inactive';
    dispatch(changeCategoryStatus({ categoryId: item._id, status: newStatus }));
  };

  const handleViewClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/categories/view/${encryptedId}`);
  };

  const handlePageChange = (page) => {
    dispatch(getCategories({ page, limit: pagination.limit, sort, order, search: searchTerm }));
  };

  const handlePageSizeChange = (limit) => {
    dispatch(getCategories({ page: 1, limit, sort, order, search: searchTerm }));
  };

  const handleSortChange = (sortConfig) => {
    const newSort = sortConfig.key || 'createdAt';
    const newOrder = sortConfig.direction || 'desc';
    setSort(newSort);
    setOrder(newOrder);
    dispatch(getCategories({ page: 1, limit: pagination.limit, sort: newSort, order: newOrder, search: searchTerm }));
  };

  const handleSearchClick = () => {
    dispatch(getCategories({ page: 1, limit: pagination.limit, sort, order, search: searchTerm }));
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    dispatch(getCategories({ page: 1, limit: pagination.limit, sort, order, search: '' }));
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
        title="Categories"
        actions={
          <Button startIcon={<Plus />} onClick={() => navigate('/categories/create')}>
            Add New Category
          </Button>
        }
      />

      <Table
        headers={headers}
        data={categories}
        loading={loading}
        searchPlaceholder="Search categories..."
        emptyMessage="No categories found. Click 'Add New Category' to create one."
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onView={handleViewClick}
        onToggle={handleStatusToggle}
        toggleField="status"
        currentPage={pagination?.currentPage || 1}
        pageSize={pagination?.limit || 10}
        totalRows={pagination?.totalItems || 0}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        sortConfig={{ key: sort, direction: order }}
        onSortChange={handleSortChange}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearchClick={handleSearchClick}
        onSearchClear={handleSearchClear}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, categoryId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
