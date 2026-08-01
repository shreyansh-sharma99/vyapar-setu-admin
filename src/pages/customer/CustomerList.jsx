import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Eye, Edit2, Trash2, Users, UserCheck, UserX } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const fetchCustomers = () => {
    const params = { page: currentPage, limit: pageSize };
    if (selectedStatus !== 'all') params.status = selectedStatus;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    dispatch(getCustomers(params));
  };

  useEffect(() => {
    fetchCustomers();
  }, [dispatch, currentPage, pageSize, selectedStatus]);

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
      fetchCustomers();
    }
  }, [reduxToast, dispatch]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    const params = { page: 1, limit: pageSize };
    if (selectedStatus !== 'all') params.status = selectedStatus;
    dispatch(getCustomers(params));
  };

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

  const activeCount = customers.filter((c) => c.status === 'active').length;
  const inactiveCount = customers.filter((c) => c.status === 'inactive').length;

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
          <span className={`font-semibold text-xs capitalize ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
      value: 'checked'
    }
  ];

  return (
    <div>
      <Card
        h1="Customers"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none cursor-pointer shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        }
      >
        <div className="pb-2">
          <TableInfoCard
            stats={[
              {
                label: 'Total Customers',
                value: pagination?.totalItems || customers.length,
                icon: <Users className="w-4 h-4 text-indigo-500" />,
                colorClass: 'text-indigo-600 dark:text-indigo-400',
                isActive: selectedStatus === 'all',
                onClick: () => { setSelectedStatus('all'); setCurrentPage(1); },
              },
              {
                label: 'Active',
                value: activeCount,
                icon: <UserCheck className="w-4 h-4 text-emerald-500" />,
                colorClass: 'text-emerald-600 dark:text-emerald-400',
                isActive: selectedStatus === 'active',
                onClick: () => { setSelectedStatus(selectedStatus === 'active' ? 'all' : 'active'); setCurrentPage(1); },
              },
              {
                label: 'Inactive',
                value: inactiveCount,
                icon: <UserX className="w-4 h-4 text-rose-500" />,
                colorClass: 'text-rose-600 dark:text-rose-400',
                isActive: selectedStatus === 'inactive',
                onClick: () => { setSelectedStatus(selectedStatus === 'inactive' ? 'all' : 'inactive'); setCurrentPage(1); },
              },
            ]}
          />
        </div>

        <Table
          headers={headers}
          data={customers}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search customers..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => setSearchTerm(val)}
          onSearchClick={() => { setCurrentPage(1); fetchCustomers(); }}
          onSearchClear={handleClearSearch}
          emptyMessage="No customers found. Click 'Add New Customer' to create one."
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onView={handleViewClick}
          onToggle={handleStatusToggle}
          toggleField="status"
          currentPage={currentPage}
          pageSize={pageSize}
          totalRows={pagination?.totalItems || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/customers/create')}>Add New Customer</Button>
            </div>
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
