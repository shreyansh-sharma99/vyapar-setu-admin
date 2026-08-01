import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Search, Eye, Edit2, Send, Check, X, Copy, Trash2, MoreVertical,
  FileText, ArrowRightCircle, FileDown, Clock, CheckCircle2, XCircle, RefreshCw
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
  getProformaInvoices,
  deleteProformaInvoice,
  sendProformaInvoice,
  convertToInvoice,
  duplicateProformaInvoice,
  clearProformaInvoiceToast,
} from './services/proformaInvoiceSlice';
import { downloadProformaPdfApi } from './services/proformaInvoiceService';

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft: { label: 'Draft', textCls: 'text-slate-600 dark:text-slate-400', icon: <FileText className="w-4 h-4 text-slate-500" /> },
  sent: { label: 'Sent', textCls: 'text-blue-600 dark:text-blue-400', icon: <Send className="w-4 h-4 text-blue-500" /> },
  accepted: { label: 'Accepted', textCls: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
  rejected: { label: 'Rejected', textCls: 'text-rose-600 dark:text-rose-400', icon: <XCircle className="w-4 h-4 text-rose-500" /> },
  expired: { label: 'Expired', textCls: 'text-orange-600 dark:text-orange-400', icon: <Clock className="w-4 h-4 text-orange-500" /> },
  converted: { label: 'Converted', textCls: 'text-violet-600 dark:text-violet-400', icon: <RefreshCw className="w-4 h-4 text-violet-500" /> },
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
export default function ProformaInvoiceList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { proformaInvoices, summary, loading, meta, toast: reduxToast } = useSelector((state) => state.proformaInvoice);

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

  const fetchProformaInvoices = () => {
    const params = { page: currentPage, limit: pageSize };
    if (selectedStatus !== 'all') params.status = selectedStatus;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    dispatch(getProformaInvoices(params));
  };

  useEffect(() => { fetchProformaInvoices(); }, [dispatch, currentPage, pageSize, selectedStatus]);

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearProformaInvoiceToast());
      fetchProformaInvoices();
    }
  }, [reduxToast, dispatch]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    const params = { page: 1, limit: pageSize };
    if (selectedStatus !== 'all') params.status = selectedStatus;
    dispatch(getProformaInvoices(params));
  };

  const handleViewClick = (item) => {
    const encId = encodeURIComponent(encryptData(item._id));
    navigate(`/sales/proforma-invoice/view/${encId}`);
  };

  const handleEditClick = (item) => {
    if (item.status !== 'draft') { showToast('Only draft proforma invoices can be edited.', 'warning'); return; }
    const encId = encodeURIComponent(encryptData(item._id));
    navigate(`/sales/proforma-invoice/edit/${encId}`);
  };

  const handleDeleteClick = (item) => {
    if (item.status !== 'draft') { showToast('Only draft proforma invoices can be deleted.', 'warning'); return; }
    setDeleteModal({ isOpen: true, id: item._id });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.id) { dispatch(deleteProformaInvoice(deleteModal.id)); }
    setDeleteModal({ isOpen: false, id: null });
  };

  const openConfirm = (type, id) => { setConfirmModal({ isOpen: true, type, id }); };

  const handleConfirmAction = () => {
    const { type, id } = confirmModal;
    if (type === 'send') dispatch(sendProformaInvoice(id));
    else if (type === 'invoice') dispatch(convertToInvoice(id));
    setConfirmModal({ isOpen: false, type: null, id: null });
  };

  const handleDuplicate = (id) => dispatch(duplicateProformaInvoice(id));

  const handleDownloadPdf = async (item) => {
    try {
      showToast('Downloading proforma PDF...', 'info');
      const blob = await downloadProformaPdfApi(item._id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Proforma-${item.proformaNumber || 'PI'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('PDF downloaded successfully.', 'success');
    } catch {
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

  // ─── Table columns ───
  const headers = [
    {
      label: 'Proforma Invoice #',
      key: 'proformaNumber',
      sortable: true,
      value: 'checked',
      cellClassName: 'font-mono font-semibold text-[var(--vs-text-primary)]',
    },
    {
      label: 'Date',
      key: 'proformaDate',
      sortable: true,
      value: 'checked',
      render: (item) => <span>{formatDateWithTiming(item.proformaDate)}</span>,
    },
    {
      label: 'Valid Until',
      key: 'validUntil',
      sortable: true,
      value: 'checked',
      render: (item) => {
        if (!item.validUntil) return <span className="text-[var(--vs-text-secondary)]">—</span>;
        const isExpired = new Date(item.validUntil) < new Date() && item.status !== 'accepted';
        return (
          <span className={isExpired ? 'text-rose-500 font-semibold' : ''}>
            {formatDateWithTiming(item.validUntil)}
          </span>
        );
      },
    },
    {
      label: 'Customer',
      key: 'customerId',
      sortable: true,
      value: 'checked',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--vs-text-primary)]">
            {item.customerSnapshot?.name || item.customerId?.firstName || 'Walk-in'}
          </span>
          <span className="text-[10px] text-[var(--vs-text-secondary)]">
            ({item.customerSnapshot?.phone || item.customerId?.phone || 'No Phone'})
          </span>
        </div>
      ),
    },
    {
      label: 'Amount',
      key: 'totalAmount',
      sortable: true,
      value: 'checked',
      render: (item) => (
        <span className="font-semibold text-[var(--vs-text-primary)]">
          ₹{item.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
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
              title="View Proforma Details"
              className="p-1 rounded-lg text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>
            {item.status === 'draft' && (
              <button
                onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                title="Edit Proforma"
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
    send: { title: 'Send Proforma Invoice?', message: 'This will mark the proforma invoice as sent to the customer.', label: 'Send', variant: 'primary', icon: <Send className="w-6 h-6 text-blue-500" /> },
    invoice: { title: 'Convert to Sales Invoice?', message: 'A new sales invoice will be created from this proforma and it will be marked converted.', label: 'Convert', variant: 'primary', icon: <ArrowRightCircle className="w-6 h-6 text-emerald-500" /> },
  };

  const currentConfirm = confirmModal.type ? confirmConfig[confirmModal.type] : null;

  return (
    <div>
      {/* ── Main Table Card ── */}
      <Card
        h1="Proforma Invoices"
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
                value: metric.count || proformaInvoices.filter((p) => p.status === key).length,
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
          data={proformaInvoices}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search by proforma # or customer..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => setSearchTerm(val)}
          onSearchClick={() => { setCurrentPage(1); fetchProformaInvoices(); }}
          onSearchClear={handleClearSearch}
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/sales/proforma-invoice/create')}>New Proforma Invoice</Button>
            </div>
          }
          emptyMessage="No proforma invoices found. Click 'New Proforma Invoice' to create one."
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
        title="Delete Draft Proforma Invoice"
        message="Are you sure you want to delete this draft proforma invoice? This cannot be undone."
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
            {/* Send (draft/sent) */}
            {(dropdownItem.status === 'draft' || dropdownItem.status === 'sent') && (
              <button onClick={() => { setActiveDropdownId(null); openConfirm('send', dropdownItem._id); }}
                className="flex items-center w-full px-4 py-2.5 text-left hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer text-blue-600 dark:text-blue-400 font-semibold">
                <Send className="w-4 h-4 mr-2.5" /> Send to Customer
              </button>
            )}

            {/* Convert action */}
            {(dropdownItem.status === 'accepted' || dropdownItem.status === 'sent') && (
              <>
                <div className="mx-3 my-1 border-t border-[var(--vs-border)]" />
                <button onClick={() => { setActiveDropdownId(null); openConfirm('invoice', dropdownItem._id); }}
                  className="flex items-center w-full px-4 py-2.5 text-left hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer text-emerald-600 dark:text-emerald-400">
                  <ArrowRightCircle className="w-4 h-4 mr-2.5" /> → Sales Invoice
                </button>
              </>
            )}

            {/* Download PDF */}
            <button onClick={() => { setActiveDropdownId(null); handleDownloadPdf(dropdownItem); }}
              className="flex items-center w-full px-4 py-2.5 text-left hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer text-indigo-600 dark:text-indigo-400">
              <FileDown className="w-4 h-4 mr-2.5" /> Download PDF
            </button>

            {/* Duplicate */}
            <div className="mx-3 my-1 border-t border-[var(--vs-border)]" />
            <button onClick={() => { setActiveDropdownId(null); handleDuplicate(dropdownItem._id); }}
              className="flex items-center w-full px-4 py-2.5 text-left hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer">
              <Copy className="w-4 h-4 mr-2.5 text-slate-500" /> Duplicate
            </button>

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
