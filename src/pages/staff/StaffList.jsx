import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { IdCard, Plus, ShieldCheck } from 'lucide-react';
import { Alert, Avatar, Badge, Button, ConfirmDialog, PageHeader, Select, StatusBadge, ToastStack } from '@/components/ui';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Table from '@/components/table/Table';
import {
  getStaffList,
  changeStaffStatus,
  deleteStaff,
  clearStaffToast,
  getRoleOptions,
  getDesignationOptions,
} from './services/staffSlice';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const refName = (ref, fallback = '') => (ref && typeof ref === 'object' ? (ref.name || fallback) : fallback);

export default function StaffList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { staffList, meta, loading, saving, error, roleOptions, designationOptions } = useSelector((state) => state.staff);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  // Message passed back from the create / edit form.
  const [toasts, setToasts] = useState(() => (
    location.state?.message
      ? [{ id: 'nav', message: location.state.message, color: location.state.color || 'success' }]
      : []
  ));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, staff: null });

  const showToast = (message, color = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const fetchStaff = useCallback((overrides = {}) => {
    const params = { page: currentPage, limit: pageSize, ...overrides };
    if (selectedStatus !== 'all') params.isActive = selectedStatus === 'active';
    if (selectedRole) params.roleId = selectedRole;
    if (selectedDesignation) params.designationId = selectedDesignation;
    const search = overrides.search !== undefined ? overrides.search : searchTerm.trim();
    if (search) params.search = search;
    else delete params.search;
    dispatch(getStaffList(params));
  }, [dispatch, currentPage, pageSize, selectedStatus, selectedRole, selectedDesignation, searchTerm]);

  useEffect(() => {
    fetchStaff();
    // Search runs on the search button / Enter, not on every key press.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, currentPage, pageSize, selectedStatus, selectedRole, selectedDesignation]);

  useEffect(() => {
    dispatch(getRoleOptions());
    dispatch(getDesignationOptions());
  }, [dispatch]);

  useEffect(() => {
    if (!location.state?.message) return undefined;
    window.history.replaceState({}, document.title);
    const timer = setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== 'nav')), 3000);
    return () => clearTimeout(timer);
  }, [location]);

  // Feedback for status / delete comes from the action result (slice toast not needed here).
  const notify = (result) => {
    const message = result.payload?.data?.message || result.payload;
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(clearStaffToast());
      return true;
    }
    showToast(typeof message === 'string' ? message : 'Something went wrong. Please try again.', 'danger');
    dispatch(clearStaffToast());
    return false;
  };

  const handleEdit = (staff) => {
    navigate(`/staff/edit/${encodeURIComponent(encryptData(staff._id))}`);
  };

  const handleToggle = async (staff, isActive) => {
    const result = await dispatch(changeStaffStatus({ staffId: staff._id, isActive }));
    if (notify(result)) {
      showToast(isActive ? `${staff.name} can log in again.` : `${staff.name} has been deactivated and signed out.`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.staff) return;
    const removed = deleteModal.staff;
    const result = await dispatch(deleteStaff(removed._id));
    setDeleteModal({ isOpen: false, staff: null });
    if (notify(result)) {
      showToast(`${removed.name} has been removed.`);
      fetchStaff();
    }
  };

  const headers = [
    {
      label: 'Name',
      key: 'name',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={item.name} size="sm" />
          <span className="font-semibold text-ink">{item.name}</span>
        </div>
      ),
    },
    {
      label: 'Phone',
      key: 'phone',
      render: (item) => <span className="whitespace-nowrap text-sm tabular-nums">{item.phone || '—'}</span>,
    },
    { label: 'Email', key: 'email' },
    {
      label: 'Designation',
      key: 'designationId',
      render: (item) => {
        const name = refName(item.designationId);
        return name
          ? <span className="whitespace-nowrap text-sm text-ink">{name}</span>
          : <span className="text-xs text-ink-subtle">—</span>;
      },
    },
    {
      label: 'Role',
      key: 'roleId',
      render: (item) => {
        const name = refName(item.roleId, item.roleName || '');
        if (!name) return <Badge tone="danger">No role</Badge>;
        return <Badge tone="primary">{name}</Badge>;
      },
    },
    {
      label: 'Status',
      key: 'isActive',
      render: (item) => <StatusBadge status={item.isActive ? 'active' : 'inactive'} />,
    },
    {
      label: 'Last Login',
      key: 'lastLoginAt',
      render: (item) => (
        <span className="whitespace-nowrap text-xs text-ink-muted">
          {item.lastLoginAt ? formatDateWithTiming(item.lastLoginAt) : 'Never'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Staff"
        description="Give your team their own login with only the access they need."
        actions={
          <>
            <Button variant="secondary" startIcon={<ShieldCheck />} onClick={() => navigate('/staff/roles')}>Roles</Button>
            <Button variant="secondary" startIcon={<IdCard />} onClick={() => navigate('/staff/designations')}>Designations</Button>
            <Button startIcon={<Plus />} onClick={() => navigate('/staff/create')}>Add Staff</Button>
          </>
        }
      />

      {error && !loading && typeof error === 'string' && <Alert tone="danger">{error}</Alert>}

      <Table
        headers={headers}
        data={staffList}
        loading={loading}
        showSearch={true}
        searchPlaceholder="Search by name, email, phone or role..."
        searchTerm={searchTerm}
        onSearchTermChange={(val) => setSearchTerm(val)}
        onSearchClick={() => { setCurrentPage(1); fetchStaff({ page: 1 }); }}
        onSearchClear={() => { setSearchTerm(''); setCurrentPage(1); fetchStaff({ page: 1, search: '' }); }}
        emptyMessage="No staff yet. Click 'Add Staff' to give a team member their own login."
        onEdit={handleEdit}
        onDelete={(item) => setDeleteModal({ isOpen: true, staff: item })}
        onToggle={handleToggle}
        toggleField="isActive"
        currentPage={currentPage}
        pageSize={pageSize}
        totalRows={meta?.total || 0}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        actions={
          <>
            <Select
              size="sm"
              aria-label="Filter by role"
              value={selectedRole}
              onChange={(v) => { setSelectedRole(v || ''); setCurrentPage(1); }}
              placeholder="All roles"
              clearable
              options={(roleOptions || []).map((r) => ({ value: r._id, label: r.name }))}
              wrapperClassName="w-40"
            />
            <Select
              size="sm"
              aria-label="Filter by designation"
              value={selectedDesignation}
              onChange={(v) => { setSelectedDesignation(v || ''); setCurrentPage(1); }}
              placeholder="All designations"
              clearable
              options={(designationOptions || []).map((d) => ({ value: d._id, label: d.name }))}
              wrapperClassName="w-44"
            />
            <Select
              size="sm"
              aria-label="Filter by status"
              value={selectedStatus}
              onChange={(v) => { setSelectedStatus(v || 'all'); setCurrentPage(1); }}
              searchable={false}
              options={STATUS_OPTIONS}
              wrapperClassName="w-36"
            />
          </>
        }
      />

      <ConfirmDialog
        open={deleteModal.isOpen}
        loading={saving}
        onClose={() => setDeleteModal({ isOpen: false, staff: null })}
        onConfirm={handleConfirmDelete}
        title="Remove Staff Member"
        message={`Remove ${deleteModal.staff?.name || 'this staff member'}? They will no longer be able to log in. Documents they created are kept.`}
        confirmLabel="Remove"
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
