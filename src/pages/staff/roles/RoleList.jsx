import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Alert, Badge, Button, ConfirmDialog, PageHeader, Select, StatusBadge, ToastStack } from '@/components/ui';
import { encryptData } from '@/utility/crypto';
import Table from '@/components/table/Table';
import { getRoles, changeRoleStatus, deleteRole } from '../services/staffSlice';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

/** Distinct module keys a role has any permission on. */
const moduleSummary = (permissions = []) => [
  ...new Set((permissions || []).map((p) => String(p).split('.')[0]).filter(Boolean)),
];

const prettyModule = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function RoleList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { roles, rolesMeta, rolesLoading, roleError, saving } = useSelector((state) => state.staff);
  const [toasts, setToasts] = useState(() => (
    location.state?.message
      ? [{ id: 'nav', message: location.state.message, color: location.state.color || 'success' }]
      : []
  ));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, role: null });

  const showToast = (message, color = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const fetchRoles = useCallback((overrides = {}) => {
    const params = { page: currentPage, limit: pageSize, ...overrides };
    if (selectedStatus !== 'all') params.isActive = selectedStatus === 'active';
    const search = overrides.search !== undefined ? overrides.search : searchTerm.trim();
    if (search) params.search = search;
    else delete params.search;
    dispatch(getRoles(params));
  }, [dispatch, currentPage, pageSize, selectedStatus, searchTerm]);

  useEffect(() => {
    fetchRoles();
    // Search runs on the search button / Enter, not on every key press.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, currentPage, pageSize, selectedStatus]);

  useEffect(() => {
    if (!location.state?.message) return undefined;
    window.history.replaceState({}, document.title);
    const timer = setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== 'nav')), 3500);
    return () => clearTimeout(timer);
  }, [location]);

  const failed = (result) => {
    if (result.meta.requestStatus === 'fulfilled') return false;
    showToast(typeof result.payload === 'string' ? result.payload : 'Something went wrong. Please try again.', 'danger');
    return true;
  };

  const handleEdit = (role) => {
    navigate(`/staff/roles/edit/${encodeURIComponent(encryptData(role._id))}`);
  };

  const handleToggle = async (role, isActive) => {
    const result = await dispatch(changeRoleStatus({ roleId: role._id, isActive }));
    if (!failed(result)) {
      showToast(isActive ? `Role "${role.name}" activated.` : `Role "${role.name}" deactivated.`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.role) return;
    const removed = deleteModal.role;
    const result = await dispatch(deleteRole(removed._id));
    setDeleteModal({ isOpen: false, role: null });
    if (!failed(result)) {
      showToast(`Role "${removed.name}" deleted.`);
      fetchRoles();
    }
  };

  const headers = [
    {
      label: 'Role',
      key: 'name',
      render: (item) => <span className="font-semibold text-ink">{item.name}</span>,
    },
    {
      label: 'Description',
      key: 'description',
      render: (item) => (
        <span className="line-clamp-2 block max-w-[320px] whitespace-normal text-xs text-ink-subtle">
          {item.description || '—'}
        </span>
      ),
    },
    {
      label: 'Access',
      key: 'permissions',
      render: (item) => {
        const mods = moduleSummary(item.permissions);
        if (!mods.length) return <span className="text-xs text-ink-subtle">No access</span>;
        const shown = mods.slice(0, 3);
        return (
          <div className="flex max-w-[280px] flex-wrap gap-1">
            {shown.map((m) => (
              <Badge key={m} tone="neutral">{prettyModule(m)}</Badge>
            ))}
            {mods.length > shown.length && (
              <span className="px-1.5 py-0.5 text-[11px] text-ink-subtle">+{mods.length - shown.length} more</span>
            )}
          </div>
        );
      },
    },
    {
      label: 'Staff',
      key: 'staffCount',
      render: (item) => <Badge tone="primary">{item.staffCount || 0} staff</Badge>,
    },
    {
      label: 'Status',
      key: 'isActive',
      render: (item) => <StatusBadge status={item.isActive ? 'active' : 'inactive'} />,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Roles & Permissions"
        description="Create roles like Cashier or Store Manager and choose what each can view, create, edit and delete."
        actions={<Button startIcon={<Plus />} onClick={() => navigate('/staff/roles/create')}>Add Role</Button>}
      />

      {roleError && !rolesLoading && typeof roleError === 'string' && <Alert tone="danger">{roleError}</Alert>}

      <Table
        headers={headers}
        data={roles}
        loading={rolesLoading}
        showSearch={true}
        searchPlaceholder="Search roles..."
        searchTerm={searchTerm}
        onSearchTermChange={(val) => setSearchTerm(val)}
        onSearchClick={() => { setCurrentPage(1); fetchRoles({ page: 1 }); }}
        onSearchClear={() => { setSearchTerm(''); setCurrentPage(1); fetchRoles({ page: 1, search: '' }); }}
        emptyMessage="No roles yet. Click 'Add Role' to create one, then assign it to your staff."
        onEdit={handleEdit}
        onDelete={(item) => setDeleteModal({ isOpen: true, role: item })}
        onToggle={handleToggle}
        toggleField="isActive"
        currentPage={currentPage}
        pageSize={pageSize}
        totalRows={rolesMeta?.total || 0}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        actions={
          <Select
            size="sm"
            aria-label="Filter by status"
            value={selectedStatus}
            onChange={(v) => { setSelectedStatus(v || 'all'); setCurrentPage(1); }}
            searchable={false}
            options={STATUS_OPTIONS}
            wrapperClassName="w-36"
          />
        }
      />

      <ConfirmDialog
        open={deleteModal.isOpen}
        loading={saving}
        onClose={() => setDeleteModal({ isOpen: false, role: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Role"
        message={deleteModal.role?.staffCount
          ? `"${deleteModal.role.name}" is used by ${deleteModal.role.staffCount} staff member(s). Move them to another role before deleting it.`
          : `Delete the role "${deleteModal.role?.name || ''}"? This cannot be undone.`}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
