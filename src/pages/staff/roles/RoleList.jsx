import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import { encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import Card from '@/components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import { getRoles, changeRoleStatus, deleteRole } from '../services/staffSlice';

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
      render: (item) => (
        <div className="flex flex-col max-w-[320px]">
          <span className="font-semibold text-[var(--vs-text-primary)]">{item.name}</span>
          {item.description && (
            <span className="text-[11px] text-[var(--vs-text-secondary)] line-clamp-2">{item.description}</span>
          )}
        </div>
      ),
    },
    {
      label: 'Access',
      key: 'permissions',
      render: (item) => {
        const mods = moduleSummary(item.permissions);
        if (!mods.length) return <span className="text-xs text-[var(--vs-text-secondary)]">No access</span>;
        const shown = mods.slice(0, 3);
        return (
          <div className="flex flex-wrap gap-1 max-w-[260px]">
            {shown.map((m) => (
              <span key={m} className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)] text-[var(--vs-text-primary)]">
                {prettyModule(m)}
              </span>
            ))}
            {mods.length > shown.length && (
              <span className="px-1.5 py-0.5 text-[11px] text-[var(--vs-text-secondary)]">+{mods.length - shown.length} more</span>
            )}
          </div>
        );
      },
    },
    {
      label: 'Staff',
      key: 'staffCount',
      render: (item) => (
        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20">
          {item.staffCount || 0} staff
        </span>
      ),
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
  ];

  return (
    <div>
      <Card
        h1="Roles & Permissions"
        description="Create roles like Cashier or Store Manager and choose what each can view, create, edit and delete."
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
        {roleError && !rolesLoading && typeof roleError === 'string' && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {roleError}
          </div>
        )}
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
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/staff/roles/create')}>Add Role</Button>
            </div>
          }
        />
      </Card>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={saving}
        onClose={() => setDeleteModal({ isOpen: false, role: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Role"
        message={deleteModal.role?.staffCount
          ? `"${deleteModal.role.name}" is used by ${deleteModal.role.staffCount} staff member(s). Move them to another role before deleting it.`
          : `Delete the role "${deleteModal.role?.name || ''}"? This cannot be undone.`}
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
