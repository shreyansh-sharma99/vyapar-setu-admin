import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import Card from '@/components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import {
  getStaffList,
  changeStaffStatus,
  deleteStaff,
  clearStaffToast,
  getRoleOptions,
  getDesignationOptions,
} from './services/staffSlice';

const filterSelectCls = 'h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none cursor-pointer shadow-sm max-w-[180px]';

const refName = (ref, fallback = '') => (ref && typeof ref === 'object' ? (ref.name || fallback) : fallback);

const storeNames = (staff) => {
  const stores = Array.isArray(staff.storeIds) ? staff.storeIds : [];
  if (stores.length === 0) return null;
  return stores.map((s) => (typeof s === 'object' ? (s.name || s.code || 'Store') : 'Store'));
};

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
      cellClassName: 'font-semibold text-[var(--vs-text-primary)]',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--vs-text-primary)]">{item.name}</span>
          {item.phone && <span className="text-[11px] text-[var(--vs-text-secondary)]">{item.phone}</span>}
        </div>
      ),
    },
    { label: 'Email', key: 'email' },
    {
      label: 'Designation',
      key: 'designationId',
      render: (item) => {
        const name = refName(item.designationId);
        return name
          ? <span className="text-sm text-[var(--vs-text-primary)] whitespace-nowrap">{name}</span>
          : <span className="text-xs text-[var(--vs-text-secondary)]">—</span>;
      },
    },
    {
      label: 'Role',
      key: 'roleId',
      render: (item) => {
        const name = refName(item.roleId, item.roleName || '');
        if (!name) return <span className="text-xs text-rose-600 dark:text-rose-400">No role</span>;
        return (
          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20 whitespace-nowrap">
            {name}
          </span>
        );
      },
    },
    {
      label: 'Stores',
      key: 'storeIds',
      render: (item) => {
        const names = storeNames(item);
        if (!names) return <span className="text-xs text-[var(--vs-text-secondary)]">All stores</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[240px]">
            {names.map((n, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)] text-[var(--vs-text-primary)]">
                {n}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      label: 'Status',
      key: 'isActive',
      render: (item) => (
        <span className={`font-semibold text-xs ${item.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      label: 'Last Login',
      key: 'lastLoginAt',
      render: (item) => (
        <span className="text-xs text-[var(--vs-text-secondary)] whitespace-nowrap">
          {item.lastLoginAt ? formatDateWithTiming(item.lastLoginAt) : 'Never'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <Card
        h1="Staff"
        description="Give your team their own login with only the access they need."
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by role"
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
              className={filterSelectCls}
            >
              <option value="">All Roles</option>
              {(roleOptions || []).map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </select>
            <select
              aria-label="Filter by designation"
              value={selectedDesignation}
              onChange={(e) => { setSelectedDesignation(e.target.value); setCurrentPage(1); }}
              className={filterSelectCls}
            >
              <option value="">All Designations</option>
              {(designationOptions || []).map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className={filterSelectCls}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        }
      >
        {error && !loading && typeof error === 'string' && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
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
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/staff/roles')}>Roles</Button>
              <Button variant="outline" onClick={() => navigate('/staff/designations')}>Designations</Button>
              <Button onClick={() => navigate('/staff/create')}>Add Staff</Button>
            </div>
          }
        />
      </Card>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={saving}
        onClose={() => setDeleteModal({ isOpen: false, staff: null })}
        onConfirm={handleConfirmDelete}
        title="Remove Staff Member"
        message={`Remove ${deleteModal.staff?.name || 'this staff member'}? They will no longer be able to log in. Documents they created are kept.`}
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
