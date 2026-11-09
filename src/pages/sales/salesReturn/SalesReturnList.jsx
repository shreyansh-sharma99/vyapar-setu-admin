import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Eye, Edit2, Check, X, Trash2, Undo2, FileText, CheckCircle2, XCircle
} from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import {
  Avatar, Button, ConfirmDialog, DataTable, PageHeader, StatCard, ToastStack,
} from '@/components/ui';
import {
  getSalesReturns,
  deleteSalesReturn,
  updateSalesReturnStatus,
  clearReturnToast,
} from './services/salesReturnSlice';

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft: { label: 'Draft', tone: 'neutral', icon: FileText },
  approved: { label: 'Approved', tone: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rejected', tone: 'danger', icon: XCircle },
};

/** ₹ with two decimals, as this page always showed amounts. */
const rs = (v) => `₹${Number(v || 0).toFixed(2)}`;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SalesReturnList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { salesReturns, summary, loading, meta, toast: reduxToast } = useSelector((state) => state.salesReturn);

  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null });


  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, color }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  const fetchReturns = () => {
    const params = { page: currentPage, limit: pageSize };
    if (selectedStatus !== 'all') params.status = selectedStatus;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    dispatch(getSalesReturns(params));
  };

  useEffect(() => { fetchReturns(); }, [dispatch, currentPage, pageSize, selectedStatus]);

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearReturnToast());
      fetchReturns();
    }
  }, [reduxToast, dispatch]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    const params = { page: 1, limit: pageSize };
    if (selectedStatus !== 'all') params.status = selectedStatus;
    dispatch(getSalesReturns(params));
  };

  const handleViewClick = (item) => {
    const encId = encodeURIComponent(encryptData(item._id));
    navigate(`/sales/return/view/${encId}`);
  };

  const handleEditClick = (item) => {
    if (item.status !== 'draft') { showToast('Only draft sales returns can be edited.', 'warning'); return; }
    const encId = encodeURIComponent(encryptData(item._id));
    navigate(`/sales/return/edit/${encId}`);
  };

  const handleDeleteClick = (item) => {
    if (item.status !== 'draft') { showToast('Only draft sales returns can be deleted.', 'warning'); return; }
    setDeleteModal({ isOpen: true, id: item._id });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.id) { dispatch(deleteSalesReturn(deleteModal.id)); }
    setDeleteModal({ isOpen: false, id: null });
  };

  const openConfirm = (type, id) => { setConfirmModal({ isOpen: true, type, id }); };

  const handleConfirmAction = () => {
    const { type, id } = confirmModal;
    if (type === 'approve') {
      dispatch(updateSalesReturnStatus({ id, status: 'approved' }));
    } else if (type === 'reject') {
      dispatch(updateSalesReturnStatus({ id, status: 'rejected' }));
    }
    setConfirmModal({ isOpen: false, type: null, id: null });
  };

  const getSummaryMetric = (statusId) => {
    const item = (summary || []).find((s) => s._id === statusId);
    return {
      count: item?.count || 0,
      amount: item?.totalAmount || 0,
    };
  };

  const changeStatus = (status) => { setSelectedStatus(status); setCurrentPage(1); };
  const customerName = (item) => item.customerSnapshot?.name || 'Walk-in';

  // ─── Table columns ───
  const columns = [
    { key: 'returnNumber', header: 'Return #', type: 'mono', sortable: true, mobile: 'title', cellClassName: 'font-semibold' },
    { key: 'returnDate', header: 'Date', sortable: true, render: (item) => formatDateWithTiming(item.returnDate) },
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
      render: (item) => <span className="tabular-nums">{item.customerSnapshot?.phone || 'No Phone'}</span>,
    },
    {
      key: 'salesInvoiceId',
      header: 'Invoice',
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
    { key: 'status', header: 'Status', type: 'status', sortable: true },
  ];

  const rowActions = (item) => [
    { label: 'View details', icon: Eye, onClick: () => handleViewClick(item) },
    item.status === 'draft' && { label: 'Edit return', icon: Edit2, onClick: () => handleEditClick(item) },
    item.status === 'draft' && { label: 'Approve return', icon: Check, onClick: () => openConfirm('approve', item._id) },
    item.status === 'draft' && { label: 'Reject return', icon: X, danger: true, onClick: () => openConfirm('reject', item._id) },
    item.status === 'draft' && { divider: true },
    item.status === 'draft' && { label: 'Delete draft', icon: Trash2, danger: true, onClick: () => handleDeleteClick(item) },
  ];

  const confirmConfig = {
    approve: { title: 'Approve Sales Return?', message: 'This will approve the sales return. You cannot edit it after approval.', label: 'Approve', tone: 'primary', icon: Check },
    reject: { title: 'Reject Sales Return?', message: 'This will mark the sales return as rejected.', label: 'Reject', tone: 'danger', icon: X },
  };

  const currentConfirm = confirmModal.type ? confirmConfig[confirmModal.type] : null;

  const stats = Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
    const metric = getSummaryMetric(key);
    return { key, cfg, count: metric.count || salesReturns.filter((c) => c.status === key).length, amount: metric.amount };
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sales Returns"
        actions={<Button startIcon={<Plus />} onClick={() => navigate('/sales/return/create')}>New Sales Return</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
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
        rows={salesReturns}
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
          placeholder: 'Search by return # or customer...',
          onSubmit: () => { setCurrentPage(1); fetchReturns(); },
          onClear: handleClearSearch,
        }}
        rowActions={rowActions}
        onRowClick={handleViewClick}
        empty={{
          icon: Undo2,
          title: 'No sales returns found',
          text: "Click 'New Sales Return' to create one.",
          action: <Button startIcon={<Plus />} onClick={() => navigate('/sales/return/create')}>New Sales Return</Button>,
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
        title="Delete Draft Return"
        message="Are you sure you want to delete this draft sales return? This cannot be undone."
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

      {/* ── Toaster ── */}
      <ToastStack toasts={toasts} />
    </div>
  );
}
