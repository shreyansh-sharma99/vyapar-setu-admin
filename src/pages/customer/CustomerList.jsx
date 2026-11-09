import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Eye, Edit2, Trash2, Users, UserCheck, UserX, History } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { can } from '@/utility/shopPermissions';
import {
  getCustomers,
  deleteCustomer,
  clearCustomerToast,
  updateCustomer,
} from './services/customerSlice';
import {
  Avatar, Button, ConfirmDialog, DataTable, PageHeader, StatCard, Switch, ToastStack,
} from '@/components/ui';

export default function CustomerList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { customers, pagination, loading, toast: reduxToast } = useSelector((state) => state.customer);
  const { user } = useSelector((state) => state.auth || {});
  // The ledger is a sales screen (backend: access('sales')).
  const canSeeLedger = can(user, 'sales', 'view');
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

  const handleLedgerClick = (item) => {
    navigate('/customers/ledger/' + encodeURIComponent(encryptData(item._id)));
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

  const changeStatus = (status) => { setSelectedStatus(status); setCurrentPage(1); };
  const fullName = (item) => `${item.firstName || ''} ${item.lastName || ''}`.trim() || '—';

  const columns = [
    {
      key: 'firstName',
      header: 'Customer',
      sortable: true,
      mobile: 'title',
      render: (item) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={fullName(item)} size="sm" />
          <div className="min-w-0 truncate font-semibold text-ink">{fullName(item)}</div>
        </div>
      ),
    },
    { key: 'lastName', header: 'Last Name', sortable: true, defaultHidden: true },
    { key: 'email', header: 'Email', sortable: true, hideBelow: 'lg', render: (item) => <span className="truncate">{item.email || 'No email'}</span> },
    { key: 'phone', header: 'Phone', sortable: true, render: (item) => <span className="tabular-nums">{item.phone || '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <Switch
            size="sm"
            checked={item.status === 'active'}
            onChange={(val) => handleStatusToggle(item, val)}
          />
          <span className={`text-xs font-semibold ${item.status === 'active' ? 'text-success' : 'text-danger'}`}>
            {item.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
      ),
    },
  ];

  const rowActions = (item) => [
    { label: 'View', icon: Eye, onClick: () => handleViewClick(item) },
    { label: 'Edit', icon: Edit2, onClick: () => handleEditClick(item) },
    canSeeLedger && { label: 'Customer Ledger', icon: History, onClick: () => handleLedgerClick(item) },
    { divider: true },
    { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDeleteClick(item) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Customers"
        actions={<Button startIcon={<Plus />} onClick={() => navigate('/customers/create')}>Add New Customer</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Customers"
          value={pagination?.totalItems || customers.length}
          icon={Users}
          tone="primary"
          active={selectedStatus === 'all'}
          onClick={() => { setSelectedStatus('all'); setCurrentPage(1); }}
        />
        <StatCard
          label="Active"
          value={activeCount}
          icon={UserCheck}
          tone="success"
          active={selectedStatus === 'active'}
          onClick={() => { setSelectedStatus(selectedStatus === 'active' ? 'all' : 'active'); setCurrentPage(1); }}
        />
        <StatCard
          label="Inactive"
          value={inactiveCount}
          icon={UserX}
          tone="danger"
          active={selectedStatus === 'inactive'}
          onClick={() => { setSelectedStatus(selectedStatus === 'inactive' ? 'all' : 'inactive'); setCurrentPage(1); }}
        />
      </div>

      <DataTable
        columns={columns}
        rows={customers}
        loading={loading}
        tabs={[
          { value: 'all', label: 'All Statuses' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ]}
        tab={selectedStatus}
        onTabChange={changeStatus}
        search={{
          value: searchTerm,
          onChange: (val) => setSearchTerm(val),
          placeholder: 'Search customers...',
          onSubmit: () => { setCurrentPage(1); fetchCustomers(); },
          onClear: handleClearSearch,
        }}
        rowActions={rowActions}
        onRowClick={handleViewClick}
        empty={{
          icon: Users,
          title: 'No customers found',
          text: "Click 'Add New Customer' to create one.",
          action: <Button startIcon={<Plus />} onClick={() => navigate('/customers/create')}>Add New Customer</Button>,
        }}
        pagination={{
          page: currentPage,
          pageSize,
          total: pagination?.totalItems || 0,
          onPageChange: (page) => setCurrentPage(page),
          onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); },
          pageSizeOptions: [10, 20, 50, 100, 500],
        }}
      />

      <ConfirmDialog
        open={deleteModal.isOpen}
        loading={loading}
        onClose={() => setDeleteModal({ isOpen: false, customerId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
