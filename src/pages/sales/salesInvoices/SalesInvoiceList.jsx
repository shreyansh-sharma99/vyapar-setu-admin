import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Search, Check, CreditCard, Ban, Mail, Copy, Trash2, Download, MoreVertical, Eye, Edit2, Send, X,
  FileText, Clock, CheckCircle2, XCircle
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
  getSalesInvoices,
  getSalesInvoiceSummary,
  deleteSalesInvoice,
  confirmSalesInvoice,
  markSalesInvoicePaid,
  voidSalesInvoice,
  sendPaymentReminder,
  generatePaymentLink,
  duplicateSalesInvoice,
  clearSalesInvoiceToast,
} from './services/salesInvoiceSlice';
import { downloadSalesInvoicePdfApi } from './services/salesInvoiceService';

function AnimatedModal({ isOpen, onClose, children, maxWidth = 'max-w-md' }) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setIsClosing(false);
    } else if (isMounted) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 200);
      return () => clearTimeout(timer);
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
        style={{
          background: 'var(--vs-bg-primary)',
          border: '1px solid var(--vs-border)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function SalesInvoiceList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { invoices, summary, loading, meta, toast: reduxToast } = useSelector((state) => state.salesInvoice);

  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, invoiceId: null });
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, invoice: null, amount: '', method: 'cash', reference: '', notes: '' });
  const [voidModal, setVoidModal] = useState({ isOpen: false, invoiceId: null, reason: '' });

  // Dropdown states
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [dropdownAnchor, setDropdownAnchor] = useState(null);
  const [dropdownItem, setDropdownItem] = useState(null);

  useEffect(() => {
    if (!activeDropdownId) return;
    const handleScrollOrResize = () => {
      setActiveDropdownId(null);
      setDropdownAnchor(null);
      setDropdownItem(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeDropdownId]);

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    fetchInvoices();
    dispatch(getSalesInvoiceSummary());
  }, [dispatch, currentPage, pageSize, selectedStatus]);

  const fetchInvoices = () => {
    const params = {
      page: currentPage,
      limit: pageSize,
    };
    if (selectedStatus !== 'all') {
      params.status = selectedStatus;
    }
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }
    dispatch(getSalesInvoices(params));
  };

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearSalesInvoiceToast());
      fetchInvoices();
      dispatch(getSalesInvoiceSummary());
    }
  }, [reduxToast, dispatch]);

  const handleCreateClick = () => {
    navigate('/sales/invoices/create');
  };

  const handleViewClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/sales/invoices/view/${encryptedId}`);
  };

  const handleEditClick = (item) => {
    if (item.status !== 'draft') {
      showToast('Only draft invoices can be edited.', 'warning');
      return;
    }
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/sales/invoices/edit/${encryptedId}`);
  };

  const handleDeleteClick = (item) => {
    if (item.status !== 'draft') {
      showToast('Only draft invoices can be deleted.', 'warning');
      return;
    }
    setDeleteModal({ isOpen: true, invoiceId: item._id });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.invoiceId) {
      dispatch(deleteSalesInvoice(deleteModal.invoiceId));
      setDeleteModal({ isOpen: false, invoiceId: null });
    }
  };

  const handleConfirmInvoice = (id) => {
    dispatch(confirmSalesInvoice(id));
  };

  const handleMarkPaidClick = (item) => {
    setPaymentModal({
      isOpen: true,
      invoice: item,
      amount: item.balanceAmount,
      method: 'cash',
      reference: '',
      notes: '',
    });
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!paymentModal.amount || Number(paymentModal.amount) <= 0) {
      showToast('Please enter a valid amount.', 'danger');
      return;
    }
    dispatch(
      markSalesInvoicePaid({
        id: paymentModal.invoice._id,
        payload: {
          amount: Number(paymentModal.amount),
          paymentMethod: paymentModal.method,
          reference: paymentModal.reference,
          notes: paymentModal.notes,
        },
      })
    );
    setPaymentModal({ isOpen: false, invoice: null, amount: '', method: 'cash', reference: '', notes: '' });
  };

  const handleVoidClick = (item) => {
    setVoidModal({ isOpen: true, invoiceId: item._id, reason: '' });
  };

  const handleVoidSubmit = (e) => {
    e.preventDefault();
    if (!voidModal.reason.trim() || voidModal.reason.trim().length < 3) {
      showToast('Reason must be at least 3 characters.', 'danger');
      return;
    }
    dispatch(
      voidSalesInvoice({
        id: voidModal.invoiceId,
        payload: { voidReason: voidModal.reason.trim() },
      })
    );
    setVoidModal({ isOpen: false, invoiceId: null, reason: '' });
  };

  const handleSendReminder = (id) => {
    dispatch(sendPaymentReminder(id));
  };

  const handleGeneratePaymentLink = (id) => {
    dispatch(generatePaymentLink(id));
  };

  const handleDuplicate = (id) => {
    dispatch(duplicateSalesInvoice(id));
  };

  const handleDownloadPdf = async (item) => {
    try {
      showToast('Downloading invoice PDF...', 'info');
      const blob = await downloadSalesInvoicePdfApi(item._id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${item.invoiceNumber || 'INV'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('PDF downloaded successfully.', 'success');
    } catch (err) {
      showToast('Failed to download PDF.', 'danger');
    }
  };

  // Process summary metrics
  const getSummaryMetric = (statusId) => {
    const item = (summary || []).find(
      (s) => s._id === statusId || (statusId === 'voided' && s._id === 'void')
    );
    return {
      count: item?.count || 0,
      amount: item?.totalAmount || 0,
    };
  };

  const draftMetrics = getSummaryMetric('draft');
  const unpaidMetrics = getSummaryMetric('unpaid');
  const paidMetrics = getSummaryMetric('paid');
  const voidMetrics = getSummaryMetric('voided');

  const headers = [
    {
      label: 'Invoice Number',
      key: 'invoiceNumber',
      sortable: true,
      cellClassName: 'font-mono font-semibold text-[var(--vs-text-primary)]',
      value: 'checked',
    },
    {
      label: 'Date',
      key: 'invoiceDate',
      sortable: true,
      value: 'checked',
      render: (item) => <span>{formatDateWithTiming(item.invoiceDate)}</span>,
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
      label: 'Total Amount',
      key: 'totalAmount',
      sortable: true,
      value: 'checked',
      render: (item) => <span className="font-semibold">₹{item.totalAmount?.toFixed(2)}</span>,
    },
    {
      label: 'Paid',
      key: 'paidAmount',
      sortable: true,
      value: 'checked',
      render: (item) => <span className="text-emerald-600 dark:text-emerald-400">₹{item.paidAmount?.toFixed(2)}</span>,
    },
    {
      label: 'Balance',
      key: 'balanceAmount',
      sortable: true,
      value: 'checked',
      render: (item) => (
        <span className={item.balanceAmount > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-gray-400'}>
          ₹{item.balanceAmount?.toFixed(2)}
        </span>
      ),
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      value: 'checked',
      render: (item) => {
        const statusColors = {
          draft: 'text-slate-600 dark:text-slate-400',
          unpaid: 'text-amber-600 dark:text-amber-400',
          paid: 'text-emerald-600 dark:text-emerald-400',
          voided: 'text-rose-600 dark:text-rose-400',
          void: 'text-rose-600 dark:text-rose-400',
          partially_paid: 'text-blue-600 dark:text-blue-400',
        };
        return (
          <span className={`font-semibold text-xs capitalize ${statusColors[item.status] || 'text-gray-600'}`}>
            {item.status?.replace('_', ' ')}
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
              onClick={(e) => {
                e.stopPropagation();
                handleViewClick(item);
              }}
              title="View Invoice Details"
              className="p-1 rounded-lg text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>
            {item.status === 'draft' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(item);
                }}
                title="Edit Invoice"
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

  return (
    <div>
      <Card h1="Sales Invoices" bodyClassName="px-4 pb-4 pt-2" rightNode={<select
        value={selectedStatus}
        onChange={(e) => {
          setSelectedStatus(e.target.value);
          setCurrentPage(1);
        }}
        className="h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none cursor-pointer shadow-sm"
      >
        <option value="all">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="unpaid">Unpaid</option>
        <option value="paid">Paid</option>
        <option value="voided">Voided</option>
      </select>}>
        <div className='pb-2'>  <TableInfoCard
          stats={[
            {
              label: 'Draft',
              value: draftMetrics.count,
              amount: draftMetrics.amount,
              icon: <FileText className="w-4 h-4 text-slate-500" />,
              colorClass: 'text-slate-700 dark:text-slate-200',
              isActive: selectedStatus === 'draft',
              onClick: () => {
                setSelectedStatus(selectedStatus === 'draft' ? 'all' : 'draft');
                setCurrentPage(1);
              },
            },
            {
              label: 'Unpaid',
              value: unpaidMetrics.count,
              amount: unpaidMetrics.amount,
              icon: <Clock className="w-4 h-4 text-amber-500" />,
              colorClass: 'text-amber-600 dark:text-amber-400',
              isActive: selectedStatus === 'unpaid',
              onClick: () => {
                setSelectedStatus(selectedStatus === 'unpaid' ? 'all' : 'unpaid');
                setCurrentPage(1);
              },
            },
            {
              label: 'Paid',
              value: paidMetrics.count,
              amount: paidMetrics.amount,
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
              colorClass: 'text-emerald-600 dark:text-emerald-400',
              isActive: selectedStatus === 'paid',
              onClick: () => {
                setSelectedStatus(selectedStatus === 'paid' ? 'all' : 'paid');
                setCurrentPage(1);
              },
            },
            {
              label: 'Voided',
              value: voidMetrics.count,
              amount: voidMetrics.amount,
              icon: <XCircle className="w-4 h-4 text-rose-500" />,
              colorClass: 'text-rose-600 dark:text-rose-400',
              isActive: selectedStatus === 'voided',
              onClick: () => {
                setSelectedStatus(selectedStatus === 'voided' ? 'all' : 'voided');
                setCurrentPage(1);
              },
            },
          ]}
        /></div>
        <Table
          headers={headers}
          data={invoices}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search by invoice or customer..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => setSearchTerm(val)}
          onSearchClick={() => {
            setCurrentPage(1);
            fetchInvoices();
          }}
          onSearchClear={() => {
            setSearchTerm('');
            setCurrentPage(1);
            const params = { page: 1, limit: pageSize };
            if (selectedStatus !== 'all') params.status = selectedStatus;
            dispatch(getSalesInvoices(params));
          }}
          actions={
            <div className="flex items-center gap-2">

              <Button onClick={handleCreateClick}>Create Invoice</Button>
            </div>
          }
          emptyMessage="No sales invoices found. Click 'Create Invoice' to generate one."
          currentPage={currentPage}
          pageSize={pageSize}
          totalRows={meta?.total || meta?.totalRows || meta?.count || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* Record Payment Modal */}
      <AnimatedModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, invoice: null, amount: '', method: 'cash', reference: '', notes: '' })}
      >
        <div className="text-[var(--vs-text-primary)]">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--vs-border)' }}>
            <h3 className="text-lg font-bold !text-indigo-600 dark:text-indigo-400">Record Payment</h3>
            <p className="text-xs text-[var(--vs-text-secondary)] mt-0.5">
              Invoice {paymentModal.invoice?.invoiceNumber}
            </p>
          </div>
          <form onSubmit={handlePaymentSubmit}>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Payment Method</label>
                <select
                  value={paymentModal.method}
                  onChange={(e) => setPaymentModal({ ...paymentModal, method: e.target.value })}
                  className="w-full rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-3.5 py-2.5 text-sm outline-none"
                >
                  <option value="cash" className="bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)]">Cash</option>
                  <option value="upi" className="bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)]">UPI</option>
                  <option value="card" className="bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)]">Card</option>
                  <option value="bank_transfer" className="bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)]">Bank Transfer</option>
                  <option value="cheque" className="bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)]">Cheque</option>
                  <option value="online" className="bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)]">Online Payment</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Payment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentModal.amount}
                  onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })}
                  className="w-full rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-3.5 py-2.5 text-sm outline-none"
                />
                <span className="text-[10px] text-[var(--vs-text-secondary)]">
                  Outstanding: ₹{paymentModal.invoice?.balanceAmount?.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Reference / Txn ID</label>
                <input
                  type="text"
                  placeholder="Optional transaction reference"
                  value={paymentModal.reference}
                  onChange={(e) => setPaymentModal({ ...paymentModal, reference: e.target.value })}
                  className="w-full rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-3.5 py-2.5 text-sm outline-none placeholder-[var(--vs-text-secondary)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Notes</label>
                <textarea
                  placeholder="Optional notes for this payment receipt"
                  value={paymentModal.notes}
                  onChange={(e) => setPaymentModal({ ...paymentModal, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-3.5 py-2.5 text-sm outline-none resize-none placeholder-[var(--vs-text-secondary)]"
                />
              </div>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-2.5 bg-gray-50 dark:bg-white/5" style={{ borderTop: '1px solid var(--vs-border)' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentModal({ isOpen: false, invoice: null, amount: '', method: 'cash', reference: '', notes: '' })}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Receipt
              </Button>
            </div>
          </form>
        </div>
      </AnimatedModal>

      {/* Void Invoice Modal */}
      <AnimatedModal
        isOpen={voidModal.isOpen}
        onClose={() => setVoidModal({ isOpen: false, invoiceId: null, reason: '' })}
      >
        <div className="text-[var(--vs-text-primary)]">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--vs-border)' }}>
            <h3 className="text-lg font-bold !text-red-600 dark:text-indigo-400">Void Sales Invoice</h3>
            <p className="text-xs text-[var(--vs-text-secondary)] mt-0.5">
              This will cancel the invoice and restock inventory values.
            </p>
          </div>
          <form onSubmit={handleVoidSubmit}>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Reason for Voiding<span className="text-red-500">*</span></label>
                <textarea
                  required
                  placeholder="Enter cancellation reason (min. 3 characters)..."
                  value={voidModal.reason}
                  onChange={(e) => setVoidModal({ ...voidModal, reason: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-3.5 py-2.5 text-sm outline-none resize-none placeholder-[var(--vs-text-secondary)]"
                />
              </div>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-2.5 bg-gray-50 dark:bg-white/5" style={{ borderTop: '1px solid var(--vs-border)' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVoidModal({ isOpen: false, invoiceId: null, reason: '' })}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger">
                Void Invoice
              </Button>
            </div>
          </form>
        </div>
      </AnimatedModal>

      {/* Delete Draft Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, invoiceId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Draft Invoice"
        message="Are you sure you want to delete this draft invoice? This action cannot be undone."
      />

      {/* Portalled dropdown actions menu */}
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
            className="w-48 rounded-xl border border-[var(--vs-drop-border)] bg-[var(--vs-drop-bg)] shadow-2xl py-1 text-sm text-[var(--vs-text-primary)]"
          >
            {dropdownItem.status === 'draft' && (
              <>
                <button
                  onClick={() => {
                    setActiveDropdownId(null);
                    handleConfirmInvoice(dropdownItem._id);
                  }}
                  className="flex items-center w-full px-4 py-2 text-left text-[var(--vs-text-primary)] hover:bg-[var(--vs-drop-hover)] transition-colors font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-2" /> Confirm Invoice
                </button>
              </>
            )}

            {dropdownItem.status === 'unpaid' && (
              <>
                <button
                  onClick={() => {
                    setActiveDropdownId(null);
                    handleMarkPaidClick(dropdownItem);
                  }}
                  className="flex items-center w-full px-4 py-2 text-left text-[var(--vs-text-primary)] hover:bg-[var(--vs-drop-hover)] transition-colors text-emerald-600 dark:text-emerald-400 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 mr-2" /> Record Payment
                </button>
                <button
                  onClick={() => {
                    setActiveDropdownId(null);
                    handleVoidClick(dropdownItem);
                  }}
                  className="flex items-center w-full px-4 py-2 text-left text-[var(--vs-text-primary)] hover:bg-[var(--vs-drop-hover)] transition-colors text-rose-600 dark:text-rose-400 cursor-pointer"
                >
                  <Ban className="w-4 h-4 mr-2" /> Void Invoice
                </button>
                <button
                  onClick={() => {
                    setActiveDropdownId(null);
                    handleSendReminder(dropdownItem._id);
                  }}
                  className="flex items-center w-full px-4 py-2 text-left text-[var(--vs-text-primary)] hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 mr-2 text-orange-500" /> Send Reminder
                </button>
                <button
                  onClick={() => {
                    setActiveDropdownId(null);
                    handleGeneratePaymentLink(dropdownItem._id);
                  }}
                  className="flex items-center w-full px-4 py-2 text-left text-[var(--vs-text-primary)] hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-2 text-teal-500" /> Payment Link
                </button>
              </>
            )}

            <button
              onClick={() => {
                setActiveDropdownId(null);
                handleDownloadPdf(dropdownItem);
              }}
              className="flex items-center w-full px-4 py-2 text-left text-[var(--vs-text-primary)] hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2 text-purple-500" /> Download PDF
            </button>

            <button
              onClick={() => {
                setActiveDropdownId(null);
                handleDuplicate(dropdownItem._id);
              }}
              className="flex items-center w-full px-4 py-2 text-left text-[var(--vs-text-primary)] hover:bg-[var(--vs-drop-hover)] transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4 mr-2 text-slate-500" /> Duplicate
            </button>

            {dropdownItem.status === 'draft' && (
              <button
                onClick={() => {
                  setActiveDropdownId(null);
                  handleDeleteClick(dropdownItem);
                }}
                className="flex items-center w-full px-4 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-medium border-t border-gray-100 dark:border-white/5 mt-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Draft
              </button>
            )}
          </div>
        </>,
        document.body
      )}

      {/* CoreUI Toaster */}
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
