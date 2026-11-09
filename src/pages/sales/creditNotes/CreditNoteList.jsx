import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Eye, Edit2, Check, Trash2, FileText, Download, CheckCircle2, ReceiptText
} from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import {
  Avatar, Badge, Button, ConfirmDialog, DataTable, Field, Input, Modal, PageHeader, Select, StatCard, ToastStack, labelForStatus,
} from '@/components/ui';
import {
  getCreditNotes,
  deleteCreditNote,
  updateCreditNoteStatus,
  applyCreditNote,
  clearCreditNoteToast,
} from './services/creditNoteSlice';
import { downloadCreditNotePdfApi } from './services/creditNoteService';
import { getSalesInvoices } from '../salesInvoices/services/salesInvoiceSlice';

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft: { label: 'Draft', tone: 'neutral', icon: FileText },
  issued: { label: 'Issued', tone: 'success', icon: CheckCircle2 },
};

/** ₹ with two decimals, as this page always showed amounts. */
const rs = (v) => `₹${Number(v || 0).toFixed(2)}`;

// ─── Apply Credit Note Modal ──────────────────────────────────────────────────
function ApplyModal({ isOpen, onClose, onConfirm, creditNote, invoices }) {
  const [salesInvoiceId, setSalesInvoiceId] = useState('');
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (creditNote) {
      setSalesInvoiceId(creditNote.salesInvoiceId?._id || creditNote.salesInvoiceId || '');
      setAmount(creditNote.totalAmount || 0);
    }
  }, [creditNote, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Apply Credit Note to Invoice"
      subtitle={creditNote?.creditNoteNumber}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="cn-apply-form" disabled={!salesInvoiceId || amount <= 0}>
            Apply Credit
          </Button>
        </>
      }
    >
      <form
        id="cn-apply-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!salesInvoiceId || amount <= 0) return;
          onConfirm({ salesInvoiceId, amount: Number(amount) });
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Target sales invoice" required>
          <Select
            value={salesInvoiceId}
            onChange={(v) => setSalesInvoiceId(v)}
            placeholder="Select Invoice..."
            options={(invoices || []).map((inv) => ({
              value: inv._id,
              label: `${inv.invoiceNumber} - ${inv.customerSnapshot?.name || 'Walk-in'} (₹${inv.totalAmount?.toFixed(2)})`,
            }))}
          />
        </Field>

        <Field label="Amount to apply (₹)" required>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
            className="text-right tabular-nums"
          />
        </Field>
      </form>
    </Modal>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreditNoteList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { creditNotes, summary, loading, meta, toast: reduxToast } = useSelector((state) => state.creditNote);
  const { invoices } = useSelector((state) => state.salesInvoice);

  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null });
  const [applyModal, setApplyModal] = useState({ isOpen: false, item: null });


  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, color }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  const fetchCreditNotes = () => {
    const params = { page: currentPage, limit: pageSize };
    if (selectedStatus !== 'all') params.status = selectedStatus;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    dispatch(getCreditNotes(params));
  };

  useEffect(() => {
    fetchCreditNotes();
    dispatch(getSalesInvoices({ limit: 1000 }));
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
      dispatch(clearCreditNoteToast());
      fetchCreditNotes();
    }
  }, [reduxToast, dispatch]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    const params = { page: 1, limit: pageSize };
    if (selectedStatus !== 'all') params.status = selectedStatus;
    dispatch(getCreditNotes(params));
  };

  const handleViewClick = (item) => {
    const encId = encodeURIComponent(encryptData(item._id));
    navigate(`/sales/credit-note/view/${encId}`);
  };

  const handleEditClick = (item) => {
    if (item.status !== 'draft') { showToast('Only draft credit notes can be edited.', 'warning'); return; }
    const encId = encodeURIComponent(encryptData(item._id));
    navigate(`/sales/credit-note/edit/${encId}`);
  };

  const handleDeleteClick = (item) => {
    if (item.status !== 'draft') { showToast('Only draft credit notes can be deleted.', 'warning'); return; }
    setDeleteModal({ isOpen: true, id: item._id });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.id) { dispatch(deleteCreditNote(deleteModal.id)); }
    setDeleteModal({ isOpen: false, id: null });
  };

  const openConfirm = (type, id) => { setConfirmModal({ isOpen: true, type, id }); };

  const handleConfirmAction = () => {
    const { type, id } = confirmModal;
    if (type === 'issue') {
      dispatch(updateCreditNoteStatus({ id, status: 'issued' }));
    }
    setConfirmModal({ isOpen: false, type: null, id: null });
  };

  const handleApplyConfirm = (payload) => {
    if (applyModal.item) {
      dispatch(applyCreditNote({ id: applyModal.item._id, payload }));
      setApplyModal({ isOpen: false, item: null });
    }
  };

  const handleDownloadPdf = async (item) => {
    try {
      showToast('Downloading credit note PDF...', 'info');
      const blob = await downloadCreditNotePdfApi(item._id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CreditNote-${item.creditNoteNumber || 'CN'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('PDF downloaded successfully.', 'success');
    } catch (err) {
      showToast('Failed to download PDF.', 'danger');
    }
  };

  const getSummaryMetric = (statusId) => {
    const item = (summary || []).find((s) => s._id === statusId);
    return {
      count: item?.count || 0,
      amount: item?.totalAmount || 0,
    };
  };

  const changeStatus = (status) => { setSelectedStatus(status); setCurrentPage(1); };
  const customerName = (item) => item.customerSnapshot?.name || item.salesInvoiceId?.customerSnapshot?.name || 'Walk-in';

  // ─── Table columns ───
  const columns = [
    { key: 'creditNoteNumber', header: 'Credit Note #', type: 'mono', sortable: true, mobile: 'title', cellClassName: 'font-semibold' },
    { key: 'creditNoteDate', header: 'Date', sortable: true, render: (item) => formatDateWithTiming(item.creditNoteDate) },
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      render: (item) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={customerName(item)} size="sm" />
          <div className="min-w-0 truncate font-semibold text-ink">{customerName(item)}</div>
        </div>
      ),
    },
    {
      key: 'customerPhone',
      header: 'Phone',
      hideBelow: 'lg',
      render: (item) => (
        <span className="tabular-nums">{item.customerSnapshot?.phone || item.salesInvoiceId?.customerSnapshot?.phone || 'No Phone'}</span>
      ),
    },
    {
      key: 'salesInvoiceId',
      header: 'Invoice #',
      sortable: true,
      hideBelow: 'lg',
      render: (item) => <span className="font-mono text-[13px]">{item.salesInvoiceId?.invoiceNumber || '—'}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      type: 'money',
      sortable: true,
      mobile: 'amount',
      render: (item) => rs(item.totalAmount),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item) => <Badge tone={STATUS_CONFIG[item.status]?.tone ?? 'neutral'}>{labelForStatus(item.status)}</Badge>,
    },
  ];

  const rowActions = (item) => [
    { label: 'View details', icon: Eye, onClick: () => handleViewClick(item) },
    item.status === 'draft' && { label: 'Edit credit note', icon: Edit2, onClick: () => handleEditClick(item) },
    item.status === 'draft' && { label: 'Issue credit note', icon: Check, onClick: () => openConfirm('issue', item._id) },
    // Apply (issued only, check if not already applied)
    item.status === 'issued' && { label: 'Apply to invoice', icon: Check, onClick: () => setApplyModal({ isOpen: true, item }) },
    item.status === 'issued' && { label: 'Download PDF', icon: Download, onClick: () => handleDownloadPdf(item) },
    item.status === 'draft' && { divider: true },
    item.status === 'draft' && { label: 'Delete draft', icon: Trash2, danger: true, onClick: () => handleDeleteClick(item) },
  ];

  const confirmConfig = {
    issue: { title: 'Issue Credit Note?', message: 'This will issue the credit note. You cannot edit it after issuing.', label: 'Issue', tone: 'primary', icon: Check },
  };

  const currentConfirm = confirmModal.type ? confirmConfig[confirmModal.type] : null;

  const stats = Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
    const metric = getSummaryMetric(key);
    return { key, cfg, count: metric.count || creditNotes.filter((c) => c.status === key).length, amount: metric.amount };
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credit Notes"
        actions={<Button startIcon={<Plus />} onClick={() => navigate('/sales/credit-note/create')}>New Credit Note</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2">
        {stats.map(({ key, cfg, count, amount }) => (
          <StatCard
            key={key}
            label={cfg.label}
            value={count}
            chip={rs(amount)}
            icon={cfg.icon}
            tone={cfg.tone}
            active={selectedStatus === key}
            onClick={() => { setSelectedStatus(selectedStatus === key ? 'all' : key); setCurrentPage(1); }}
          />
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={creditNotes}
        loading={loading}
        tabs={[
          { value: 'all', label: 'All' },
          ...stats.map(({ key, cfg, count }) => ({ value: key, label: cfg.label, count })),
        ]}
        tab={selectedStatus}
        onTabChange={changeStatus}
        search={{
          value: searchTerm,
          onChange: (val) => setSearchTerm(val),
          placeholder: 'Search by credit note # or customer...',
          onSubmit: () => { setCurrentPage(1); fetchCreditNotes(); },
          onClear: handleClearSearch,
        }}
        rowActions={rowActions}
        onRowClick={handleViewClick}
        empty={{
          icon: ReceiptText,
          title: 'No credit notes found',
          text: "Click 'New Credit Note' to create one.",
          action: <Button startIcon={<Plus />} onClick={() => navigate('/sales/credit-note/create')}>New Credit Note</Button>,
        }}
        pagination={{
          page: currentPage,
          pageSize,
          total: meta?.total || meta?.totalRows || meta?.count || 0,
          onPageChange: (page) => setCurrentPage(page),
          onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); },
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      {/* ── Delete Modal ── */}
      <ConfirmDialog
        open={deleteModal.isOpen}
        loading={loading}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Draft Credit Note"
        message="Are you sure you want to delete this draft credit note? This cannot be undone."
      />

      {/* ── Generic Confirm Modal ── */}
      {currentConfirm && (
        <ConfirmDialog
          open={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, type: null, id: null })}
          onConfirm={handleConfirmAction}
          title={currentConfirm.title}
          message={currentConfirm.message}
          confirmLabel={currentConfirm.label}
          tone={currentConfirm.tone}
          icon={currentConfirm.icon}
        />
      )}

      {/* ── Apply Modal ── */}
      <ApplyModal
        isOpen={applyModal.isOpen}
        onClose={() => setApplyModal({ isOpen: false, item: null })}
        onConfirm={handleApplyConfirm}
        creditNote={applyModal.item}
        invoices={invoices}
      />

      {/* ── Toaster ── */}
      <ToastStack toasts={toasts} />
    </div>
  );
}
