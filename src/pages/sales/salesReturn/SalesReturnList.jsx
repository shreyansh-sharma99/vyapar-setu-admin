import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Search, Eye, Edit2, Check, X, Trash2, MoreVertical, Receipt, FileText, CheckCircle2, XCircle
} from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import Card from '../../../components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import {
  getSalesReturns,
  deleteSalesReturn,
  updateSalesReturnStatus,
  clearReturnToast,
} from './services/salesReturnSlice';

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft: { label: 'Draft', textCls: 'text-slate-600 dark:text-slate-400', icon: <FileText className="w-4 h-4 text-slate-500" /> },
  approved: { label: 'Approved', textCls: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
  rejected: { label: 'Rejected', textCls: 'text-rose-600 dark:text-rose-400', icon: <XCircle className="w-4 h-4 text-rose-500" /> },
};

// ─── Animated Modal ───────────────────────────────────────────────────────────
function AnimatedModal({ isOpen, onClose, children, maxWidth = 'max-w-md' }) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) { setIsMounted(true); setIsClosing(false); }
    else if (isMounted) {
      setIsClosing(true);
      const t = setTimeout(() => setIsMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen, isMounted]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isMounted && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`relative w-full ${maxWidth} rounded-2xl shadow-2xl overflow-hidden ${isClosing ? 'modal-content-exit' : 'modal-content-enter'}`}
        style={{ background: 'var(--vs-bg-primary)', border: '1px solid var(--vs-border)' }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Confirm Action Modal ─────────────────────────────────────────────────────
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmVariant = 'primary', icon }) {
  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className="text-[var(--vs-text-primary)]">
        <div className="px-6 py-5 flex flex-col items-center gap-3 text-center">
          {icon && <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{ background: 'var(--vs-bg-secondary)' }}>{icon}</div>}
          <h3 className="text-base font-bold">{title}</h3>
          <p className="text-sm text-[var(--vs-text-secondary)]">{message}</p>
        </div>
        <div className="px-6 pb-6 flex items-center justify-center gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="!h-9 min-w-[80px]">Cancel</Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm} className="!h-9 min-w-[100px]">{confirmLabel}</Button>
        </div>
      </div>
    </AnimatedModal>
  );
}

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

  // Dropdown states
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [dropdownAnchor, setDropdownAnchor] = useState(null);
  const [dropdownItem, setDropdownItem] = useState(null);

  useEffect(() => {
    if (!activeDropdownId) return;
    const close = () => { setActiveDropdownId(null); setDropdownAnchor(null); setDropdownItem(null); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [activeDropdownId]);

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

  // ─── Table columns ───
  const headers = [
    {
      label: 'Return #',
      key: 'returnNumber',
      sortable: true,
      value: 'checked',
      cellClassName: 'font-mono font-semibold text-[var(--vs-text-primary)]',
    },
    {
      label: 'Date',
      key: 'returnDate',
      sortable: true,
      value: 'checked',
      render: (item) => <span>{formatDateWithTiming(item.returnDate)}</span>,
    },
    {
      label: 'Customer',
      key: 'customer',
      sortable: true,
      value: 'checked',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--vs-text-primary)]">
            {item.customerSnapshot?.name || 'Walk-in'}
          </span>
          <span className="text-[10px] text-[var(--vs-text-secondary)]">
            ({item.customerSnapshot?.phone || 'No Phone'})
          </span>
        </div>
      ),
    },
    {
      label: 'Invoice',
      key: 'salesInvoiceId',
      sortable: true,
      value: 'checked',
      render: (item) => (
        <span className="font-mono text-sm">
          {item.salesInvoiceId?.invoiceNumber || '—'}
        </span>
      ),
    },
    {
      label: 'Total Amount',
      key: 'totalAmount',
      sortable: true,
      value: 'checked',
      cellClassName: 'font-mono font-semibold text-indigo-600 dark:text-indigo-400',
      render: (item) => <span>₹{(item.totalAmount || 0).toFixed(2)}</span>,
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      value: 'checked',
      render: (item) => {
        const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
        return (
          <span className={`font-semibold text-xs capitalize ${cfg.textCls}`}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (item) => {
        const isOpen = activeDropdownId === item._id;
        return (
          <div className="relative flex justify-end items-center gap-0">
            <button
              onClick={(e) => { e.stopPropagation(); handleViewClick(item); }}
              title="View Return Details"
              className="p-1 rounded-lg text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>
            {item.status === 'draft' && (
              <button
                onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                title="Edit Return"
                className="p-1 rounded-lg text-blue-700 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isOpen) {
                  setActiveDropdownId(null);
                  setDropdownAnchor(null);
                  setDropdownItem(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const openUpwards = spaceBelow < 280;

                  setActiveDropdownId(item._id);
                  setDropdownItem(item);
                  setDropdownAnchor({
                    top: openUpwards ? rect.top + window.scrollY : rect.bottom + window.scrollY,
                    left: rect.right - 192 + window.scrollX,
                    openUpwards,
                  });
                }
              }}
              className="p-1 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const confirmConfig = {
    approve: { title: 'Approve Sales Return?', message: 'This will approve the sales return. You cannot edit it after approval.', label: 'Approve', variant: 'primary', icon: <Check className="w-6 h-6 text-emerald-500" /> },
    reject: { title: 'Reject Sales Return?', message: 'This will mark the sales return as rejected.', label: 'Reject', variant: 'danger', icon: <X className="w-6 h-6 text-rose-500" /> },
  };

  const currentConfirm = confirmModal.type ? confirmConfig[confirmModal.type] : null;

  return (
    <div>
      {/* ── Main Table Card ── */}
      <Card
        h1="Sales Returns"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none cursor-pointer shadow-sm"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        }
      >
        <div className="pb-2">
          <TableInfoCard
            stats={Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const metric = getSummaryMetric(key);
              return {
                label: cfg.label,
                value: metric.count || salesReturns.filter((c) => c.status === key).length,
                amount: metric.amount,
                icon: cfg.icon,
                colorClass: cfg.textCls,
                isActive: selectedStatus === key,
                onClick: () => { setSelectedStatus(selectedStatus === key ? 'all' : key); setCurrentPage(1); },
              };
            })}
          />
        </div>

        <Table
          headers={headers}
          data={salesReturns}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search by return # or customer..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => setSearchTerm(val)}
          onSearchClick={() => { setCurrentPage(1); fetchReturns(); }}
          onSearchClear={handleClearSearch}
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/sales/return/create')}>New Sales Return</Button>
            </div>
          }
          emptyMessage="No sales returns found. Click 'New Sales Return' to create one."
          currentPage={currentPage}
          pageSize={pageSize}
          totalRows={meta?.total || meta?.totalRows || meta?.count || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </Card>

      {/* ── Delete Modal ── */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Draft Return"
        message="Are you sure you want to delete this draft sales return? This cannot be undone."
      />

      {/* ── Generic Confirm Modal ── */}
      {currentConfirm && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, type: null, id: null })}
          onConfirm={handleConfirmAction}
          title={currentConfirm.title}
          message={currentConfirm.message}
          confirmLabel={currentConfirm.label}
          confirmVariant={currentConfirm.variant}
          icon={currentConfirm.icon}
        />
      )}

      {/* ── Dropdown Action Menu (portalled) ── */}
      {activeDropdownId && dropdownAnchor && dropdownItem && createPortal(
        <>
          <div className="fixed inset-0 z-[100000]" onClick={() => { setActiveDropdownId(null); setDropdownAnchor(null); setDropdownItem(null); }} />
          <div
            style={{
              position: 'absolute',
              top: dropdownAnchor.openUpwards ? dropdownAnchor.top - 6 : dropdownAnchor.top + 6,
              left: dropdownAnchor.left,
              transform: dropdownAnchor.openUpwards ? 'translateY(-100%)' : 'none',
              zIndex: 100005,
            }}
            className="w-52 rounded-xl border border-[var(--vs-drop-border)] bg-[var(--vs-drop-bg)] shadow-2xl py-1 text-sm text-[var(--vs-text-primary)]"
          >
            {/* Edit (draft only) */}
            {dropdownItem.status === 'draft' && (
              <button onClick={() => { setActiveDropdownId(null); handleEditClick(dropdownItem); }}
                className="flex items-center w-full px-4 py-2.5 text-left hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer">
                <Edit2 className="w-4 h-4 mr-2.5 text-indigo-500" /> Edit Return
              </button>
            )}

            {/* Approve (draft only) */}
            {dropdownItem.status === 'draft' && (
              <button onClick={() => { setActiveDropdownId(null); openConfirm('approve', dropdownItem._id); }}
                className="flex items-center w-full px-4 py-2.5 text-left hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="w-4 h-4 mr-2.5" /> Approve Return
              </button>
            )}

            {/* Reject (draft only) */}
            {dropdownItem.status === 'draft' && (
              <button onClick={() => { setActiveDropdownId(null); openConfirm('reject', dropdownItem._id); }}
                className="flex items-center w-full px-4 py-2.5 text-left hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer text-rose-600 dark:text-rose-400">
                <X className="w-4 h-4 mr-2.5" /> Reject Return
              </button>
            )}

            {/* Delete (draft only) */}
            {dropdownItem.status === 'draft' && (
              <button onClick={() => { setActiveDropdownId(null); handleDeleteClick(dropdownItem); }}
                className="flex items-center w-full px-4 py-2.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-medium mt-1 cursor-pointer border-t border-gray-100 dark:border-white/5">
                <Trash2 className="w-4 h-4 mr-2.5" /> Delete Draft
              </button>
            )}
          </div>
        </>,
        document.body
      )}

      {/* ── Toaster ── */}
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
