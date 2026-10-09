import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import { Loader2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Switch from '@/components/inputs/Switch';
import Table from '@/components/table/Table';
import Card from '@/components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import { Modal } from '@/pages/purchase/components/ui';
import {
  getDesignations,
  createDesignation,
  updateDesignation,
  changeDesignationStatus,
  deleteDesignation,
} from '../services/staffSlice';

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
      title={isEdit ? 'Edit Designation' : 'Add Designation'}
      subtitle="A designation is the job title shown for a staff member (e.g. Store Manager, Cashier)."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={saving}
            startIcon={saving && <Loader2 className="w-4 h-4 animate-spin" />}
          >
            {isEdit ? 'Save Changes' : 'Add Designation'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="designation-name">Name<span className="text-red-500">*</span></Label>
          <Input
            id="designation-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Store Manager"
            maxLength={60}
            autoFocus
            error={submitted && !!nameError}
          />
          {submitted && nameError && <span className="text-xs text-red-500 mt-1 block">{nameError}</span>}
        </div>
        <div>
          <Label htmlFor="designation-description">Description</Label>
          <textarea
            id="designation-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            maxLength={300}
            rows={3}
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:!text-white placeholder:text-gray-400 dark:placeholder:text-white/25 outline-none focus:border-indigo-500/60 resize-y"
          />
        </div>
        <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]">
          <div>
            <p className="text-sm font-semibold text-[var(--vs-text-primary)] m-0">Active</p>
            <p className="text-xs text-[var(--vs-text-secondary)] m-0">Inactive designations cannot be picked for staff.</p>
          </div>
          <Switch checked={isActive} onChange={(val) => setIsActive(val)} />
        </div>
        {serverError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {serverError}
          </div>
        )}
        {/* Lets Enter submit the form. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
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
      render: (item) => <span className="font-semibold text-[var(--vs-text-primary)]">{item.name}</span>,
    },
    {
      label: 'Description',
      key: 'description',
      render: (item) => (
        <span className="text-xs text-[var(--vs-text-secondary)] line-clamp-2 max-w-[360px]">
          {item.description || '—'}
        </span>
      ),
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
        h1="Designations"
        description="Job titles for your team, like Store Manager or Cashier. Access is controlled by roles."
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
        {designationError && !designationsLoading && typeof designationError === 'string' && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {designationError}
          </div>
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
            <div className="flex items-center gap-2">
              <Button onClick={() => openModal(null)}>Add Designation</Button>
            </div>
          }
        />
      </Card>

      {editing && (
        <DesignationModal
          key={modalKey}
          designation={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={saving}
        onClose={() => setDeleteModal({ isOpen: false, designation: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Designation"
        message={deleteModal.designation?.staffCount
          ? `"${deleteModal.designation.name}" is used by ${deleteModal.designation.staffCount} staff member(s). Change their designation before deleting it.`
          : `Delete the designation "${deleteModal.designation?.name || ''}"? This cannot be undone.`}
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
