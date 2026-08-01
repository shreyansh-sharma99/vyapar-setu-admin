import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import {
  getSubcategories,
  deleteSubcategory,
  changeSubcategoryStatus,
  clearSubcategoryToast,
} from './services/subcategorySlice';
import Card from '../../../components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';

export default function SubcategoryList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialCategoryId = searchParams.get('categoryId') || '';

  const { subcategories, pagination, loading, toast: reduxToast } = useSelector((state) => state.subcategory);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, subCategoryId: null });
  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    sort: 'createdAt',
    order: 'desc',
    search: '',
    ...(initialCategoryId ? { categoryId: initialCategoryId } : {}),
  });

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    dispatch(getSubcategories(params));
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
      dispatch(clearSubcategoryToast());
    }
  }, [reduxToast, dispatch]);

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
      cellClassName: 'font-semibold text-[var(--vs-text-primary)]',
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
      <Card h1="Subcategories" bodyClassName="p-4">
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
          actions={
            <Button
              className="!h-10"
              startIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => navigate('/subcategories/create')}
            >
              Add New Subcategory
            </Button>
          }
        />
      </Card>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, subCategoryId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Subcategory"
        message="Are you sure you want to delete this subcategory? This action cannot be undone."
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
