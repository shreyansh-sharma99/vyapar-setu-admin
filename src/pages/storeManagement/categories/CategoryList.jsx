import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import {
  getCategories,
  deleteCategory,
  clearCategoryToast,
  changeCategoryStatus,
} from './services/categorySlice';
import Card from '../../../components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';

export default function CategoryList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { categories, pagination, loading, toast: reduxToast } = useSelector((state) => state.category);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, categoryId: null });
  const [toasts, setToasts] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    dispatch(getCategories({ page: 1, limit: 10, sort, order, search: '' }));
  }, [dispatch]);

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearCategoryToast());
    }
  }, [reduxToast, dispatch]);

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
      <Card h1="Categories" bodyClassName="p-4">
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
          actions={
            <Button
              className="!h-10"
              startIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => navigate('/categories/create')}
            >
              Add New Category
            </Button>
          }
        />
      </Card>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, categoryId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
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
