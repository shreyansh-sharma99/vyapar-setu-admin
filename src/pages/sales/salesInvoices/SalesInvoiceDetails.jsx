import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  Download,
  CreditCard,
  Ban,
  Mail,
  Edit2,
  Check,
  Send,
  Loader2,
} from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import {
  getSalesInvoiceById,
  clearCurrentSalesInvoice,
  confirmSalesInvoice,
  markSalesInvoicePaid,
  voidSalesInvoice,
  sendPaymentReminder,
  generatePaymentLink,
  clearSalesInvoiceToast,
} from './services/salesInvoiceSlice';
import { InvoiceDocument } from '@/pages/Invoices/invoiceLayout/components/InvoiceTemplates';
import { docFromInvoice, inr } from '@/pages/Invoices/invoiceLayout/components/invoiceDoc';
import { downloadInvoiceLayoutPdf, printWidth } from './invoiceLayoutPdf';

export default function SalesInvoiceDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentInvoice, loading, toast: reduxToast } = useSelector((state) => state.salesInvoice);
  const [toasts, setToasts] = useState([]);

  // Modals
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, amount: 0, method: 'cash', reference: '', notes: '' });
  const [voidModal, setVoidModal] = useState({ isOpen: false, reason: '' });
  const [pdfBusy, setPdfBusy] = useState(false);

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (id) {
      dispatch(getSalesInvoiceById(id));
    }
    return () => {
      dispatch(clearCurrentSalesInvoice());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearSalesInvoiceToast());
      if (id) {
        dispatch(getSalesInvoiceById(id));
      }
    }
  }, [reduxToast, dispatch, id]);

  // PDF in the Invoice Layout design (same picture as the invoice on this page)
  const handleDownloadPdf = async () => {
    if (!currentInvoice || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadInvoiceLayoutPdf({ invoice: currentInvoice });
      showToast('PDF downloaded successfully.', 'success');
    } catch {
      showToast('Failed to download PDF.', 'danger');
    } finally {
      setPdfBusy(false);
    }
  };

  const printDoc = useMemo(() => (currentInvoice ? docFromInvoice(currentInvoice) : null), [currentInvoice]);

  const handleEditClick = () => {
    if (!currentInvoice) return;
    if (currentInvoice.status !== 'draft') {
      showToast('Only draft invoices can be edited.', 'warning');
      return;
    }
    const encId = encodeURIComponent(encryptData(currentInvoice._id));
    navigate(`/sales/invoices/edit/${encId}`);
  };

  const handleConfirmInvoice = () => {
    if (!currentInvoice) return;
    dispatch(confirmSalesInvoice(currentInvoice._id));
  };

  const handleMarkPaidClick = () => {
    if (!currentInvoice) return;
    setPaymentModal({
      isOpen: true,
      amount: currentInvoice.balanceAmount,
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
        id: currentInvoice._id,
        payload: {
          amount: Number(paymentModal.amount),
          paymentMethod: paymentModal.method,
          reference: paymentModal.reference,
          notes: paymentModal.notes,
        },
      })
    );
    setPaymentModal({ isOpen: false, amount: 0, method: 'cash', reference: '', notes: '' });
  };

  const handleVoidClick = () => {
    setVoidModal({ isOpen: true, reason: '' });
  };

  const handleVoidSubmit = (e) => {
    e.preventDefault();
    if (!voidModal.reason.trim() || voidModal.reason.trim().length < 3) {
      showToast('Reason must be at least 3 characters.', 'danger');
      return;
    }
    dispatch(
      voidSalesInvoice({
        id: currentInvoice._id,
        payload: { voidReason: voidModal.reason.trim() },
      })
    );
    setVoidModal({ isOpen: false, reason: '' });
  };

  const handleSendReminderClick = () => {
    if (!currentInvoice) return;
    dispatch(sendPaymentReminder(currentInvoice._id));
  };

  const handleGeneratePaymentLinkClick = () => {
    if (!currentInvoice) return;
    dispatch(generatePaymentLink(currentInvoice._id));
  };

  if (loading || !currentInvoice) {
    return (
      <Card
        h1="Sales Invoice Details"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >
        <Loader className="mb-4" />
      </Card>
    );
  }

  // Set colors for status badge
  const statusColors = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-400 border-gray-200 dark:border-white/10',
    unpaid: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    voided: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
  };

  return (
    <div className="flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <Card
        h1={`Invoice - ${currentInvoice.invoiceNumber}`}
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 -mx-6 px-6 border-b border-gray-200 dark:border-white/10 pb-6 mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[currentInvoice.status] || 'bg-gray-100 text-gray-700'
                }`}
            >
              {currentInvoice.status?.toUpperCase()}
            </span>
            {currentInvoice.invoiceType && (
              <span className="text-xs bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md text-[var(--vs-text-secondary)] font-semibold">
                {currentInvoice.invoiceType}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={pdfBusy}
              startIcon={pdfBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              className="!h-9 px-3"
            >
              {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
            </Button>

            {currentInvoice.status === 'draft' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditClick}
                  startIcon={<Edit2 className="w-3.5 h-3.5" />}
                  className="!h-9 px-3"
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmInvoice}
                  startIcon={<Check className="w-3.5 h-3.5" />}
                  className="!h-9 px-3"
                >
                  Confirm Invoice
                </Button>
              </>
            )}

            {currentInvoice.status === 'unpaid' && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleMarkPaidClick}
                  startIcon={<CreditCard className="w-3.5 h-3.5" />}
                  className="!h-9 px-3"
                >
                  Record Payment
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleVoidClick}
                  startIcon={<Ban className="w-3.5 h-3.5" />}
                  className="!h-9 px-3"
                >
                  Void
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendReminderClick}
                  startIcon={<Mail className="w-3.5 h-3.5" />}
                  className="!h-9 px-3"
                >
                  Send Reminder
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePaymentLinkClick}
                  startIcon={<Send className="w-3.5 h-3.5" />}
                  className="!h-9 px-3"
                >
                  Payment Link
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Payment status */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-4">
          <span className="text-[var(--vs-text-secondary)]">Total <span className="font-bold text-[var(--vs-text-primary)]">{inr(currentInvoice.totalAmount)}</span></span>
          <span className="text-[var(--vs-text-secondary)]">Paid <span className="font-bold text-emerald-600 dark:text-emerald-400">{inr(currentInvoice.paidAmount)}</span></span>
          <span className="text-[var(--vs-text-secondary)]">Balance <span className="font-bold text-rose-600 dark:text-rose-400">{inr(currentInvoice.balanceAmount)}</span></span>
        </div>
        {currentInvoice.voidReason && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs">
            <span className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Void reason: </span>
            <span className="text-[var(--vs-text-primary)]">{currentInvoice.voidReason}</span>
          </div>
        )}

        {/* The invoice, in the design chosen in Sales → Invoice Layout */}
        <div className="overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-950/60 p-3 sm:p-6">
          <div className="mx-auto bg-white shadow-sm" style={{ width: printWidth(currentInvoice.print?.layout?.theme) }}>
            {printDoc && <InvoiceDocument layout={currentInvoice.print?.layout || {}} doc={printDoc} />}
          </div>
        </div>
      </Card>

      {/* Record Payment Modal */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-[10vh]">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-[var(--vs-text-primary)]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-bold">Record Payment</h3>
              <p className="text-xs text-[var(--vs-text-secondary)] mt-0.5">
                Invoice {currentInvoice.invoiceNumber}
              </p>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">Payment Method</label>
                  <select
                    value={paymentModal.method}
                    onChange={(e) => setPaymentModal({ ...paymentModal, method: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-[var(--vs-text-primary)] outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online Payment</option>
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
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-[var(--vs-text-primary)] outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">Reference / Txn ID</label>
                  <input
                    type="text"
                    placeholder="Optional reference number"
                    value={paymentModal.reference}
                    onChange={(e) => setPaymentModal({ ...paymentModal, reference: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-[var(--vs-text-primary)] outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">Notes</label>
                  <textarea
                    placeholder="Notes..."
                    value={paymentModal.notes}
                    onChange={(e) => setPaymentModal({ ...paymentModal, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-[var(--vs-text-primary)] outline-none resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentModal({ isOpen: false, amount: 0, method: 'cash', reference: '', notes: '' })}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Invoice Modal */}
      {voidModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-[10vh]">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-[var(--vs-text-primary)]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-bold">Void Sales Invoice</h3>
              <p className="text-xs text-[var(--vs-text-secondary)] mt-0.5">
                {currentInvoice?.deliveryChallanId
                  ? 'The delivery challan will be reopened — cancel it there to return the stock.'
                  : 'This will void the invoice and inventory changes.'}
              </p>
            </div>
            <form onSubmit={handleVoidSubmit}>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">Reason for Voiding<span className="text-red-500">*</span></label>
                  <textarea
                    required
                    placeholder="Enter reason (min. 3 characters)..."
                    value={voidModal.reason}
                    onChange={(e) => setVoidModal({ ...voidModal, reason: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-[var(--vs-text-primary)] outline-none resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVoidModal({ isOpen: false, reason: '' })}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger">
                  Void Invoice
                </Button>
              </div>
            </form>
          </div>
        </div>
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
