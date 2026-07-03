import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import {
  getCustomers,
  deleteCustomer,
  clearCustomerToast,
  updateCustomer,
} from './services/customerSlice';
import Card from '@/components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';

export default function CustomerList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { customers, pagination, loading, toast: reduxToast } = useSelector((state) => state.customer);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, customerId: null });
  const [toasts, setToasts] = useState([]);

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    dispatch(getCustomers({ page: 1, limit: 10 }));
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
      dispatch(clearCustomerToast());
    }
  }, [reduxToast, dispatch]);

  const handleDeleteClick = (item) => {
    setDeleteModal({ isOpen: true, customerId: item._id });
  };

  const handleEditClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/customers/edit/${encryptedId}`);
  };

  const handleViewClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/customers/view/${encryptedId}`);
  };

  const handleConfirmDelete = () => {
    if (deleteModal.customerId) {
      dispatch(deleteCustomer(deleteModal.customerId));
      setDeleteModal({ isOpen: false, customerId: null });
    }
  };

  const handleStatusToggle = (item, newVal) => {
    const newStatus = newVal ? 'active' : 'inactive';
    dispatch(updateCustomer({
      customerId: item._id,
      customerData: { ...item, status: newStatus }
    }));
  };

  const headers = [
    {
      label: 'First Name',
      key: 'firstName',
      sortable: true,
      cellClassName: 'font-semibold text-[var(--vs-text-primary)]',
      value: 'checked'
    },
    {
      label: 'Last Name',
      key: 'lastName',
      sortable: true,
      cellClassName: 'text-[var(--vs-text-primary)]',
      value: 'checked'
    },
    {
      label: 'Email',
      key: 'email',
      sortable: true,
      value: 'checked'
    },
    {
      label: 'Phone',
      key: 'phone',
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
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
      value: 'checked'
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card h1="Customers" bodyClassName="p-4">
        <Table
          headers={headers}
          data={customers}
          loading={loading}
          searchPlaceholder="Search customers..."
          emptyMessage="No customers found. Click 'Add New Customer' to create one."
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onView={handleViewClick}
          onToggle={handleStatusToggle}
          toggleField="status"
          currentPage={pagination.currentPage}
          pageSize={pagination.limit}
          totalRows={pagination.totalItems}
          onPageChange={(page) => dispatch(getCustomers({ page, limit: pagination.limit }))}
          onPageSizeChange={(limit) => dispatch(getCustomers({ page: 1, limit }))}
          actions={
            <Button
              className="!h-10"
              startIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => navigate('/customers/create')}
            >
              Add New Customer
            </Button>
          }
        />
      </Card>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, customerId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
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
