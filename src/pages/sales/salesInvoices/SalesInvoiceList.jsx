import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Check, CreditCard, Ban, Mail, Copy, Trash2, Download, Eye, Edit2, Send, Printer,
  FileText, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import DeleteModal from '@/components/modal/DeleteModal';
import {
  Avatar, Button, DataTable, Field, Input, Modal, PageHeader, Select, StatCard, Textarea, ToastStack,
} from '@/components/ui';
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
import { downloadInvoiceLayoutPdf, printInvoiceLayout } from './invoiceLayoutPdf';

const inr = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
    setVoidModal({ isOpen: true, invoiceId: item._id, reason: '', fromChallan: !!item.deliveryChallanId });
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

  const handlePrint = async (item) => {
    try {
      showToast('Preparing the bill to print...', 'info');
      await printInvoiceLayout({ id: item._id });
    } catch {
      showToast('Could not open the print dialog.', 'danger');
    }
  };

  const handleDownloadPdf = async (item) => {
    try {
      showToast('Preparing invoice PDF...', 'info');
      await downloadInvoiceLayoutPdf({ id: item._id });
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

  const changeStatus = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };
  const toggleStatus = (status) => changeStatus(selectedStatus === status ? 'all' : status);
  const invoicesLabel = (n) => `${n} ${n === 1 ? 'invoice' : 'invoices'}`;
  const customerName = (item) => item.customerSnapshot?.name || item.customerId?.firstName || 'Walk-in';
  const closePayment = () => setPaymentModal({ isOpen: false, invoice: null, amount: '', method: 'cash', reference: '', notes: '' });
  const closeVoid = () => setVoidModal({ isOpen: false, invoiceId: null, reason: '' });

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice', type: 'mono', sortable: true, mobile: 'title', cellClassName: 'font-semibold' },
    {
      key: 'customerId',
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
      render: (item) => <span className="tabular-nums">{item.customerSnapshot?.phone || item.customerId?.phone || 'No phone'}</span>,
    },
    { key: 'invoiceDate', header: 'Date', sortable: true, render: (item) => formatDateWithTiming(item.invoiceDate) },
    { key: 'totalAmount', header: 'Amount (₹)', type: 'money', sortable: true, mobile: 'amount' },
    { key: 'paidAmount', header: 'Paid (₹)', type: 'money', sortable: true, hideBelow: 'lg', cellClassName: 'font-medium text-success' },
    {
      key: 'balanceAmount',
      header: 'Balance (₹)',
      type: 'money',
      sortable: true,
      render: (item) => <span className={item.balanceAmount > 0 ? 'text-danger' : 'font-normal text-ink-subtle'}>{inr(item.balanceAmount)}</span>,
    },
    { key: 'status', header: 'Status', type: 'status', sortable: true },
  ];

  const rowActions = (item) => [
    { label: 'View', icon: Eye, onClick: () => handleViewClick(item) },
    item.status === 'draft' && { label: 'Edit', icon: Edit2, onClick: () => handleEditClick(item) },
    item.status === 'draft' && { label: 'Confirm invoice', icon: Check, onClick: () => handleConfirmInvoice(item._id) },
    ['unpaid', 'partially_paid'].includes(item.status) && { label: 'Record payment', icon: CreditCard, onClick: () => handleMarkPaidClick(item) },
    item.status === 'unpaid' && { label: 'Send reminder', icon: Mail, onClick: () => handleSendReminder(item._id) },
    item.status === 'unpaid' && { label: 'Payment link', icon: Send, onClick: () => handleGeneratePaymentLink(item._id) },
    { label: 'Print', icon: Printer, onClick: () => handlePrint(item) },
    { label: 'Download PDF', icon: Download, onClick: () => handleDownloadPdf(item) },
    { label: 'Duplicate', icon: Copy, onClick: () => handleDuplicate(item._id) },
    item.status === 'unpaid' && item.canReturn !== false && { label: 'Void invoice', icon: Ban, danger: true, onClick: () => handleVoidClick(item) },
    item.status === 'draft' && { divider: true },
    item.status === 'draft' && { label: 'Delete draft', icon: Trash2, danger: true, onClick: () => handleDeleteClick(item) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sales Invoices"
        actions={<Button startIcon={<Plus />} onClick={handleCreateClick}>Create Invoice</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Draft" value={inr(draftMetrics.amount)} chip={invoicesLabel(draftMetrics.count)} icon={FileText} tone="neutral" active={selectedStatus === 'draft'} onClick={() => toggleStatus('draft')} />
        <StatCard label="Unpaid" value={inr(unpaidMetrics.amount)} chip={invoicesLabel(unpaidMetrics.count)} icon={Clock} tone="warning" active={selectedStatus === 'unpaid'} onClick={() => toggleStatus('unpaid')} />
        <StatCard label="Paid" value={inr(paidMetrics.amount)} chip={invoicesLabel(paidMetrics.count)} icon={CheckCircle2} tone="success" active={selectedStatus === 'paid'} onClick={() => toggleStatus('paid')} />
        <StatCard label="Voided" value={inr(voidMetrics.amount)} chip={invoicesLabel(voidMetrics.count)} icon={XCircle} tone="danger" active={selectedStatus === 'voided'} onClick={() => toggleStatus('voided')} />
      </div>

      <DataTable
        columns={columns}
        rows={invoices}
        loading={loading}
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'draft', label: 'Draft', count: draftMetrics.count },
          { value: 'unpaid', label: 'Unpaid', count: unpaidMetrics.count },
          { value: 'paid', label: 'Paid', count: paidMetrics.count },
          { value: 'voided', label: 'Voided', count: voidMetrics.count },
        ]}
        tab={selectedStatus}
        onTabChange={changeStatus}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Search by invoice or customer...',
          onSubmit: () => {
            setCurrentPage(1);
            fetchInvoices();
          },
          onClear: () => {
            setSearchTerm('');
            setCurrentPage(1);
            const params = { page: 1, limit: pageSize };
            if (selectedStatus !== 'all') params.status = selectedStatus;
            dispatch(getSalesInvoices(params));
          },
        }}
        rowActions={rowActions}
        onRowClick={handleViewClick}
        empty={{
          icon: FileText,
          title: 'No sales invoices found',
          text: "Click 'Create Invoice' to make one.",
          action: <Button startIcon={<Plus />} onClick={handleCreateClick}>Create Invoice</Button>,
        }}
        pagination={{
          page: currentPage,
          pageSize,
          total: meta?.total || meta?.totalRows || meta?.count || 0,
          onPageChange: setCurrentPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      {/* Record payment */}
      <Modal
        open={paymentModal.isOpen}
        onClose={closePayment}
        title="Record payment"
        subtitle={`Invoice ${paymentModal.invoice?.invoiceNumber || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={closePayment}>Cancel</Button>
            <Button type="submit" form="si-payment-form">Save Receipt</Button>
          </>
        }
      >
        <form id="si-payment-form" onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
          <Field label="Payment method">
            <Select
              searchable={false}
              value={paymentModal.method}
              onChange={(v) => setPaymentModal({ ...paymentModal, method: v })}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'upi', label: 'UPI' },
                { value: 'card', label: 'Card' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'online', label: 'Online Payment' },
              ]}
            />
          </Field>
          <Field label="Payment amount (₹)" required hint={`Outstanding: ${inr(paymentModal.invoice?.balanceAmount)}`}>
            <Input
              type="number"
              step="0.01"
              required
              value={paymentModal.amount}
              onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })}
              className="text-right tabular-nums"
            />
          </Field>
          <Field label="Reference / Txn ID">
            <Input
              placeholder="Optional transaction reference"
              value={paymentModal.reference}
              onChange={(e) => setPaymentModal({ ...paymentModal, reference: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              rows={2}
              placeholder="Optional notes for this payment receipt"
              value={paymentModal.notes}
              onChange={(e) => setPaymentModal({ ...paymentModal, notes: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      {/* Void invoice */}
      <Modal
        open={voidModal.isOpen}
        onClose={closeVoid}
        title="Void sales invoice"
        subtitle={voidModal.fromChallan
          ? 'This invoice was made from a delivery challan. Voiding it puts that stock back.'
          : 'This will cancel the invoice and restock inventory values.'}
        footer={
          <>
            <Button variant="secondary" onClick={closeVoid}>Cancel</Button>
            <Button type="submit" form="si-void-form" variant="danger">Void Invoice</Button>
          </>
        }
      >
        <form id="si-void-form" onSubmit={handleVoidSubmit}>
          <Field label="Reason for voiding" required>
            <Textarea
              required
              rows={3}
              placeholder="Enter cancellation reason (min. 3 characters)..."
              value={voidModal.reason}
              onChange={(e) => setVoidModal({ ...voidModal, reason: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      {/* Delete draft */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, invoiceId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Draft Invoice"
        message="Are you sure you want to delete this draft invoice? This action cannot be undone."
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
