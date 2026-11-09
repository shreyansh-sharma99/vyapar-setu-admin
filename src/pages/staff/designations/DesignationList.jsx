import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  SettingRow,
  StatusBadge,
  Switch,
  Textarea,
  ToastStack,
} from '@/components/ui';
import Table from '@/components/table/Table';
import {
  getDesignations,
  createDesignation,
  updateDesignation,
  changeDesignationStatus,
  deleteDesignation,
} from '../services/staffSlice';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

/* ─── Add / edit modal (mounted with a key so it starts fresh each time) ───── */

function DesignationModal({ designation, onClose, onSaved }) {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.staff);
  const isEdit = !!designation?._id;

  const [name, setName] = useState(designation?.name || '');
  const [description, setDescription] = useState(designation?.description || '');
  const [isActive, setIsActive] = useState(designation ? designation.isActive !== false : true);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const nameError = !name.trim() ? 'Designation name is required' : '';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSubmitted(true);
    setServerError('');
    if (nameError) return;
    const payload = { name: name.trim(), description: description.trim(), isActive };
    const result = isEdit
      ? await dispatch(updateDesignation({ designationId: designation._id, payload }))
      : await dispatch(createDesignation(payload));
    if (result.meta.requestStatus === 'fulfilled') {
      onSaved(isEdit ? `Designation "${payload.name}" updated.` : `Designation "${payload.name}" added.`);
    } else {
      setServerError(typeof result.payload === 'string' ? result.payload : 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      closeOnBackdrop={!saving}
      title={isEdit ? 'Edit Designation' : 'Add Designation'}
      subtitle="A designation is the job title shown for a staff member (e.g. Store Manager, Cashier)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Save Changes' : 'Add Designation'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Name" required error={submitted && nameError ? nameError : undefined}>
          <Input
            id="designation-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Store Manager"
            maxLength={60}
            autoFocus
            error={submitted && !!nameError}
          />
        </Field>
        <Field label="Description">
          <Textarea
            id="designation-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            maxLength={300}
            rows={3}
          />
        </Field>
        <div className="rounded-control bg-fill-2 px-4">
          <SettingRow title="Active" description="Inactive designations cannot be picked for staff.">
            <Switch checked={isActive} onChange={(val) => setIsActive(val)} />
          </SettingRow>
        </div>
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        {/* Lets Enter submit the form. */}
        <Button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

/* ─── Page: /staff/designations ─────────────────────────────────────────────── */

export default function DesignationList() {
  const dispatch = useDispatch();
  const { designations, designationsMeta, designationsLoading, designationError, saving } = useSelector((state) => state.staff);

  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, designation: null });
  // null = closed, {} = add, row = edit
  const [editing, setEditing] = useState(null);
  const [modalKey, setModalKey] = useState(0);

  const showToast = (message, color = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const fetchDesignations = useCallback((overrides = {}) => {
    const params = { page: currentPage, limit: pageSize, ...overrides };
    if (selectedStatus !== 'all') params.isActive = selectedStatus === 'active';
    const search = overrides.search !== undefined ? overrides.search : searchTerm.trim();
    if (search) params.search = search;
    else delete params.search;
    dispatch(getDesignations(params));
  }, [dispatch, currentPage, pageSize, selectedStatus, searchTerm]);

  useEffect(() => {
    fetchDesignations();
    // Search runs on the search button / Enter, not on every key press.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, currentPage, pageSize, selectedStatus]);

  const failed = (result) => {
    if (result.meta.requestStatus === 'fulfilled') return false;
    showToast(typeof result.payload === 'string' ? result.payload : 'Something went wrong. Please try again.', 'danger');
    return true;
  };

  const openModal = (row) => {
    setModalKey((k) => k + 1);
    setEditing(row || {});
  };

  const handleSaved = (message) => {
    setEditing(null);
    showToast(message);
    fetchDesignations();
  };

  const handleToggle = async (row, isActive) => {
    const result = await dispatch(changeDesignationStatus({ designationId: row._id, isActive }));
    if (!failed(result)) {
      showToast(isActive ? `"${row.name}" activated.` : `"${row.name}" deactivated.`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.designation) return;
    const removed = deleteModal.designation;
    const result = await dispatch(deleteDesignation(removed._id));
    setDeleteModal({ isOpen: false, designation: null });
    if (!failed(result)) {
      showToast(`Designation "${removed.name}" deleted.`);
      fetchDesignations();
    }
  };

  const headers = [
    {
      label: 'Designation',
      key: 'name',
      render: (item) => <span className="font-semibold text-ink">{item.name}</span>,
    },
    {
      label: 'Description',
      key: 'description',
      render: (item) => (
        <span className="line-clamp-2 block max-w-[360px] whitespace-normal text-xs text-ink-muted">
          {item.description || '—'}
        </span>
      ),
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
        title="Designations"
        description="Job titles for your team, like Store Manager or Cashier. Access is controlled by roles."
        actions={<Button startIcon={<Plus />} onClick={() => openModal(null)}>Add Designation</Button>}
      />

      {designationError && !designationsLoading && typeof designationError === 'string' && (
        <Alert tone="danger">{designationError}</Alert>
      )}

      <Table
        headers={headers}
        data={designations}
        loading={designationsLoading}
        showSearch={true}
        searchPlaceholder="Search designations..."
        searchTerm={searchTerm}
        onSearchTermChange={(val) => setSearchTerm(val)}
        onSearchClick={() => { setCurrentPage(1); fetchDesignations({ page: 1 }); }}
        onSearchClear={() => { setSearchTerm(''); setCurrentPage(1); fetchDesignations({ page: 1, search: '' }); }}
        emptyMessage="No designations yet. Click 'Add Designation' to create one."
        onEdit={(row) => openModal(row)}
        onDelete={(item) => setDeleteModal({ isOpen: true, designation: item })}
        onToggle={handleToggle}
        toggleField="isActive"
        currentPage={currentPage}
        pageSize={pageSize}
        totalRows={designationsMeta?.total || 0}
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

      {editing && (
        <DesignationModal
          key={modalKey}
          designation={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={deleteModal.isOpen}
        loading={saving}
        onClose={() => setDeleteModal({ isOpen: false, designation: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Designation"
        message={deleteModal.designation?.staffCount
          ? `"${deleteModal.designation.name}" is used by ${deleteModal.designation.staffCount} staff member(s). Change their designation before deleting it.`
          : `Delete the designation "${deleteModal.designation?.name || ''}"? This cannot be undone.`}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
