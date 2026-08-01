import { useState, useEffect } from 'react';
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
  Calendar,
  User,
  FileText,
  DollarSign,
  Tag,
  Building2,
  Hash,
  MapPin,
  Phone,
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
import { downloadSalesInvoicePdfApi } from './services/salesInvoiceService';

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-[var(--vs-text-secondary)] flex-shrink-0">{icon}</div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--vs-text-secondary)]">{label}</span>
        <span className="text-sm font-medium text-[var(--vs-text-primary)]">{value}</span>
      </div>
    </div>
  );
}

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

  const handleDownloadPdf = async () => {
    if (!currentInvoice) return;
    try {
      showToast('Downloading invoice PDF...', 'info');
      const blob = await downloadSalesInvoicePdfApi(currentInvoice._id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${currentInvoice.invoiceNumber || 'INV'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('PDF downloaded successfully.', 'success');
    } catch (err) {
      showToast('Failed to download PDF.', 'danger');
    }
  };

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
              startIcon={<Download className="w-3.5 h-3.5" />}
              className="!h-9 px-3"
            >
              PDF
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

        {/* ── Main Content ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Customer Info Card */}
            <Card title="Customer Details" bodyClassName="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Name" value={currentInvoice.customerSnapshot?.name || 'Walk-in'} />
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={currentInvoice.customerSnapshot?.phone || currentInvoice.customerId?.phone} />
              <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={currentInvoice.customerSnapshot?.email || currentInvoice.customerId?.email} />
              <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="GSTIN" value={currentInvoice.customerSnapshot?.gstin} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Billing Address" value={
                currentInvoice.customerSnapshot?.billingAddress
                  ? `${currentInvoice.customerSnapshot.billingAddress.street}, ${currentInvoice.customerSnapshot.billingAddress.city}, ${currentInvoice.customerSnapshot.billingAddress.state} - ${currentInvoice.customerSnapshot.billingAddress.pincode}`
                  : '—'
              } />
              <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="State Code" value={currentInvoice.customerSnapshot?.stateCode} />
            </Card>

            {/* Line Items */}
            <Card title="Product Items" bodyClassName="p-0" className="!rounded-b-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px] border-collapse border border-gray-300 dark:border-white/20">
                  <thead className="bg-gray-50/80 dark:bg-slate-800/50">
                    <tr className="text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                      <th className="py-3 px-4 text-left text-white bg-blue-400 border border-gray-300 dark:border-white/20 whitespace-nowrap">Product</th>
                      <th className="py-3 px-4 text-center text-white bg-blue-400 border border-gray-300 dark:border-white/20 whitespace-nowrap">HSN</th>
                      <th className="py-3 px-4 text-center text-white bg-blue-400 border border-gray-300 dark:border-white/20 whitespace-nowrap">Qty</th>
                      <th className="py-3 px-4 text-center text-white bg-blue-400 border border-gray-300 dark:border-white/20 whitespace-nowrap">Rate</th>
                      <th className="py-3 px-4 text-center text-white bg-blue-400 border border-gray-300 dark:border-white/20 whitespace-nowrap">Disc %</th>
                      <th className="py-3 px-4 text-center text-white bg-blue-400 border border-gray-300 dark:border-white/20 whitespace-nowrap">GST %</th>
                      <th className="py-3 px-4 text-right text-white bg-blue-400 border border-gray-300 dark:border-white/20 whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentInvoice.lineItems?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-medium text-[var(--vs-text-primary)] border border-gray-300 dark:border-white/20">
                          <div>{item.productName || '—'}</div>
                          {item.sku && <div className="text-[10px] text-[var(--vs-text-secondary)] mt-0.5">SKU: {item.sku}</div>}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{item.hsnCode || '—'}</td>
                        <td className="py-3 px-4 text-center border border-gray-300 dark:border-white/20">{item.qty} <span className="text-[10px] text-[var(--vs-text-secondary)]">{item.unit || 'pcs'}</span></td>
                        <td className="py-3 px-4 text-center font-mono border border-gray-300 dark:border-white/20">₹{Number(item.rate || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-center text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{item.discountPercent ?? 0}%</td>
                        <td className="py-3 px-4 text-center text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{item.taxPercent ?? 0}%</td>
                        <td className="py-3 px-4 text-right font-semibold text-indigo-600 dark:text-indigo-400 font-mono border border-gray-300 dark:border-white/20">₹{Number(item.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Notes & Terms */}
            {(currentInvoice.notes || currentInvoice.terms || currentInvoice.voidReason) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentInvoice.notes && (
                  <Card title="Notes" titleClassName="!text-blue-600 dark:!text-blue-400" bodyClassName="p-4">
                    <p className="text-sm text-[var(--vs-text-primary)] whitespace-pre-wrap">{currentInvoice.notes}</p>
                  </Card>
                )}
                {currentInvoice.terms && (
                  <Card title="Terms &amp; Conditions" titleClassName="!text-blue-600 dark:!text-blue-400" bodyClassName="p-4">
                    <p className="text-sm text-[var(--vs-text-primary)] whitespace-pre-wrap">{currentInvoice.terms}</p>
                  </Card>
                )}
                {currentInvoice.voidReason && (
                  <div className="col-span-1 sm:col-span-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs">
                    <h4 className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
                      Void Reason
                    </h4>
                    <p className="text-[var(--vs-text-primary)]">{currentInvoice.voidReason}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar: Summary */}
          <div className="flex flex-col gap-4">
            {/* Invoice Meta */}
            <Card title="Invoice Info" bodyClassName="px-4 py-4 flex flex-col gap-4">
              <div className="flex flex-row justify-between gap-3.5">
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Invoice Date" value={currentInvoice.invoiceDate ? new Date(currentInvoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Due Date" value={currentInvoice.dueDate ? new Date(currentInvoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Immediate'} />
              </div>
              <div className=" pt-2">
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Place of Supply" value={currentInvoice.placeOfSupply} />
              </div>
            </Card>

            {/* Tax Summary */}
            <Card title="Price Summary" bodyClassName="px-5 py-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                <span>Subtotal</span>
                <span className="font-mono">₹{Number(currentInvoice.subtotal || 0).toFixed(2)}</span>
              </div>
              {currentInvoice.discountAmount > 0 && (
                <div className="flex justify-between items-center text-rose-500">
                  <span>Discount</span>
                  <span className="font-mono">-₹{Number(currentInvoice.discountAmount).toFixed(2)}</span>
                </div>
              )}
              {currentInvoice.igstTotal > 0 && (
                <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                  <span>IGST</span>
                  <span className="font-mono">₹{Number(currentInvoice.igstTotal).toFixed(2)}</span>
                </div>
              )}
              {currentInvoice.cgstTotal > 0 && (
                <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                  <span>CGST</span>
                  <span className="font-mono">₹{Number(currentInvoice.cgstTotal).toFixed(2)}</span>
                </div>
              )}
              {currentInvoice.sgstTotal > 0 && (
                <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                  <span>SGST</span>
                  <span className="font-mono">₹{Number(currentInvoice.sgstTotal).toFixed(2)}</span>
                </div>
              )}
              {currentInvoice.roundOff !== 0 && currentInvoice.roundOff !== undefined && (
                <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                  <span>Round Off</span>
                  <span className="font-mono">{Number(currentInvoice.roundOff) >= 0 ? '+' : ''}₹{Number(currentInvoice.roundOff).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-[var(--vs-border)] font-bold text-base">
                <span className="text-[var(--vs-text-primary)]">Grand Total</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{Number(currentInvoice.totalAmount || 0).toFixed(2)}</span>
              </div>

              <div className="border-t border-[var(--vs-border)] pt-3 flex flex-col gap-1.5 text-xs text-[var(--vs-text-secondary)]">
                <div className="flex justify-between font-semibold">
                  <span>Paid Amount</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{Number(currentInvoice.paidAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Outstanding Balance</span>
                  <span className="text-rose-600 dark:text-rose-400 font-mono">
                    ₹{Number(currentInvoice.balanceAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* GST Breakdown */}
            {currentInvoice.isInterState !== undefined && (
              <Card title="GST Info" titleClassName="!text-blue-600 dark:!text-blue-400" bodyClassName="p-4 flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--vs-text-secondary)]">Inter-State</span>
                  <span className="font-semibold text-[var(--vs-text-primary)]">{currentInvoice.isInterState ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--vs-text-secondary)]">Reverse Charge</span>
                  <span className="font-semibold text-[var(--vs-text-primary)]">{currentInvoice.reverseCharge ? 'Yes' : 'No'}</span>
                </div>
                {currentInvoice.sellerGstin && (
                  <div className="flex justify-between">
                    <span className="text-[var(--vs-text-secondary)]">Seller GSTIN</span>
                    <span className="font-mono font-semibold text-[var(--vs-text-primary)]">{currentInvoice.sellerGstin}</span>
                  </div>
                )}
              </Card>
            )}
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
                This will void the invoice and inventory changes.
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
