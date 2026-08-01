import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Trash2, Calendar, User, Hash, Info, Check, Plus, ExternalLink } from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import {
  getPaymentInById,
  clearCurrentPayment,
  allocateAdvance,
  deletePaymentIn,
  clearPaymentInToast,
} from './services/paymentInSlice';
import { getSalesInvoices } from '../salesInvoices/services/salesInvoiceSlice';

// ─── Animated Modal ─────────────────────────────────────────────────────────────
function AnimatedModal({ isOpen, onClose, children, maxWidth = 'max-w-md' }) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setIsClosing(false);
    } else if (isMounted) {
      setIsClosing(true);
      const timer = setTimeout(() => setIsMounted(false), 200);
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
        style={{ background: 'var(--vs-bg-primary)', border: '1px solid var(--vs-border)' }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Allocate Advance Modal ───────────────────────────────────────────────────
function AllocateAdvanceModal({ isOpen, onClose, onConfirm, payment, invoices }) {
  const [allocations, setAllocations] = useState({});
  const [errorText, setErrorText] = useState('');

  const advanceBalance = payment?.unallocatedAmount || 0;
  const customerId = payment?.customerId?._id || payment?.customerId;

  // Filter outstanding invoices for this customer
  const outstandingInvoices = invoices.filter((inv) => {
    const invCustId = inv.customerId?._id || inv.customerId;
    return (
      invCustId === customerId &&
      inv.balanceAmount > 0 &&
      inv.status !== 'voided' &&
      inv.status !== 'draft'
    );
  });

  useEffect(() => {
    setAllocations({});
    setErrorText('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleValChange = (invoiceId, val, maxVal) => {
    const num = Number(val);
    if (isNaN(num) || num < 0) return;
    if (num > maxVal) {
      setErrorText(`Allocation cannot exceed outstanding balance of ₹${maxVal.toFixed(2)}`);
      return;
    }

    const otherSum = Object.entries(allocations).reduce((sum, [id, amt]) => {
      if (id === invoiceId) return sum;
      return sum + (Number(amt) || 0);
    }, 0);

    if (otherSum + num > advanceBalance) {
      setErrorText(`Total allocations cannot exceed advance balance of ₹${advanceBalance.toFixed(2)}`);
      return;
    }

    setErrorText('');
    setAllocations((p) => ({ ...p, [invoiceId]: val }));
  };

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (totalAllocated <= 0) {
      setErrorText('Please allocate at least some amount to invoices.');
      return;
    }

    const payload = {
      allocations: Object.entries(allocations)
        .map(([invoiceId, amtStr]) => ({
          salesInvoiceId: invoiceId,
          amount: Number(amtStr) || 0,
        }))
        .filter((a) => a.amount > 0),
    };

    onConfirm(payload);
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="text-[var(--vs-text-primary)] p-6">
        <h3 className="text-base font-bold mb-1">Allocate Advance Balance</h3>
        <p className="text-xs text-[var(--vs-text-secondary)] mb-4">
          Distribute the available advance balance of <span className="font-bold text-slate-900 dark:text-white">₹{advanceBalance.toFixed(2)}</span> across outstanding invoices.
        </p>

        {errorText && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400">
            {errorText}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {outstandingInvoices.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500 border border-[var(--vs-border)] rounded-xl bg-gray-50 dark:bg-white/[0.01]">
              No outstanding invoices found for this customer.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto border border-[var(--vs-border)] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--vs-bg-secondary)] border-b border-[var(--vs-border)] font-bold text-[var(--vs-text-secondary)]">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3 text-right">Outstanding</th>
                    <th className="p-3 text-right w-36">Allocation (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--vs-border)]">
                  {outstandingInvoices.map((inv) => {
                    const outstanding = inv.balanceAmount || 0;
                    const allocatedVal = allocations[inv._id] || '';
                    return (
                      <tr key={inv._id} className="hover:bg-white/[0.01]">
                        <td className="p-3 font-mono font-semibold">{inv.invoiceNumber}</td>
                        <td className="p-3 text-right text-rose-500 font-medium">₹{outstanding.toFixed(2)}</td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            min="0"
                            max={outstanding}
                            step="0.01"
                            placeholder="0.00"
                            className="!h-8 text-right text-xs"
                            value={allocatedVal}
                            onChange={(e) => handleValChange(inv._id, e.target.value, outstanding)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between items-center bg-[var(--vs-bg-secondary)]/50 p-3 rounded-xl border border-[var(--vs-border)] text-xs font-semibold">
            <div>
              <span className="text-[var(--vs-text-secondary)] font-bold uppercase tracking-widest block text-[10px]">Total Allocated</span>
              <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">₹{totalAllocated.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[var(--vs-text-secondary)] font-bold uppercase tracking-widest block text-[10px]">Remaining Advance</span>
              <span className="text-sm font-extrabold text-amber-500">₹{(advanceBalance - totalAllocated).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={onClose} className="!h-9 text-xs">Cancel</Button>
            <Button type="submit" variant="primary" className="!h-9 text-xs" disabled={totalAllocated <= 0 || outstandingInvoices.length === 0}>
              Apply Allocations
            </Button>
          </div>
        </form>
      </div>
    </AnimatedModal>
  );
}

// ─── Info Row Helper ────────────────────────────────────────────────────────────
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

export default function PaymentInDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentPayment: payment, loading, toast: reduxToast } = useSelector((s) => s.paymentIn);
  const { invoices } = useSelector((s) => s.salesInvoice);

  const [toasts, setToasts] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [allocateModal, setAllocateModal] = useState(false);

  const showToast = (message, color = 'success') => {
    const tid = Date.now();
    setToasts((p) => [...p, { id: tid, message, color }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== tid)), 3500);
  };

  useEffect(() => {
    if (id) dispatch(getPaymentInById(id));
    dispatch(getSalesInvoices({ limit: 1000 }));
    return () => {
      dispatch(clearCurrentPayment());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearPaymentInToast());
      if (id) dispatch(getPaymentInById(id));
    }
  }, [reduxToast, dispatch, id]);

  const handleConfirmDelete = () => {
    if (payment) {
      dispatch(deletePaymentIn(payment._id));
      setDeleteModal(false);
      navigate('/sales/payment-in');
    }
  };

  const handleAllocateConfirm = (payload) => {
    if (payment) {
      dispatch(allocateAdvance({ id: payment._id, payload }));
      setAllocateModal(false);
    }
  };

  if (loading || !payment) {
    return (
      <Card h1="Payment Details" buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">
        <Loader />
      </Card>
    );
  }

  // Customer billing string
  const customer = payment.customerId || payment.customerSnapshot;
  const billingAddr = payment.customerSnapshot?.billingAddress || customer?.billingAddress;
  const billingStr = billingAddr
    ? [billingAddr.street, billingAddr.city, billingAddr.state, billingAddr.pincode, billingAddr.country].filter(Boolean).join(', ')
    : '';

  return (
    <div className="flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <CToaster className="p-3" placement="top-end">
        {toasts.map((t) => (
          <CToast key={t.id} visible={true} color={t.color} className="text-white">
            <CToastBody className="font-medium">{t.message}</CToastBody>
          </CToast>
        ))}
      </CToaster>

      <Card
        h1={`Payment Receipt - ${payment.reference || 'UTR'}`}
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6 flex flex-col gap-6"
      >
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--vs-border)]">
          <div className="flex items-center gap-3">
            {payment.unallocatedAmount > 0 ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20">
                Advance Balance Available
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">
                Fully Allocated
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {payment.unallocatedAmount > 0 && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setAllocateModal(true)}
                startIcon={<Plus className="w-3.5 h-3.5" />}
                className="!h-9 px-3"
              >
                Allocate Advance
              </Button>
            )}

            <Button
              type="button"
              variant="danger"
              onClick={() => setDeleteModal(true)}
              startIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="!h-9 px-3"
            >
              Delete Record
            </Button>
          </div>
        </div>

        {/* Info Grid */}
        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: General Info */}
          <Card
            title="General Info"
            bodyClassName="p-3"
          >
            <div className="grid grid-cols-1 gap-3.5">
              <InfoRow label="Reference / UTR" value={payment.reference || 'N/A'} />
              <InfoRow label="Payment Date" value={payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN') : '—'} />
              <InfoRow label="Payment Method" value={payment.paymentMethod?.toUpperCase()} />
              <InfoRow label="Razorpay Payment ID" value={payment.razorpayPaymentId} />
              <InfoRow label="Notes / Remarks" value={payment.notes} />
            </div>
          </Card>

          {/* Column 2: Customer Info */}
          <Card
            title="Customer Details"
            bodyClassName="p-3"
          >
            <div className="grid grid-cols-1 gap-3.5">
              <InfoRow label="Customer Name" value={payment.customerSnapshot?.name || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Walk-in'} />
              <InfoRow label="Phone Number" value={payment.customerSnapshot?.phone || customer?.phone} />
              <InfoRow label="Email Address" value={payment.customerSnapshot?.email || customer?.email} />
              <InfoRow label="Billing Address" value={billingStr} />
            </div>
          </Card>

          {/* Column 3: Ledger Summary */}
          <Card
            title="Amount Summary"
            bodyClassName="p-3 h-full"
          >
            <div className="flex flex-col gap-4 mt-2  h-full">
              <div className="flex justify-between items-center border-b border-[var(--vs-border)] pb-2">
                <span className="text-xs text-[var(--vs-text-secondary)] font-semibold uppercase tracking-wider">Total Amount Received</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">₹{payment.amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[var(--vs-border)] pb-2">
                <span className="text-xs text-[var(--vs-text-secondary)] font-semibold uppercase tracking-wider">Total Allocated</span>
                <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                  ₹{((payment.amount || 0) - (payment.unallocatedAmount || 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--vs-text-secondary)] font-semibold uppercase tracking-wider">Unallocated (Advance Balance)</span>
                <span className="text-base font-extrabold text-amber-500">₹{payment.unallocatedAmount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Allocation Details Section */}
        <div className="flex flex-col gap-4 mt-2">
          <h3 className="text-lg font-bold !text-blue-600 dark:text-blue-400">Invoice Allocations</h3>

          {!payment.allocations || payment.allocations.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-gray-50 dark:bg-white/[0.01] border border-[var(--vs-border)] text-gray-500 text-sm">
              This payment has no invoice allocations yet. The entire amount is held as an advance balance.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
              <table className="w-full border-collapse text-left text-sm text-[var(--vs-text-primary)]">
                <thead>
                  <tr className="bg-[var(--vs-bg-secondary)] border-b border-[var(--vs-border)]">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-[var(--vs-text-secondary)]">Invoice Number</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-[var(--vs-text-secondary)] text-right">Allocated Amount</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-[var(--vs-text-secondary)] text-right w-24">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--vs-border)]">
                  {payment.allocations.map((alloc) => {
                    const invId = alloc.salesInvoiceId?._id || alloc.salesInvoiceId;
                    const invNum = alloc.salesInvoiceId?.invoiceNumber || 'Sales Invoice';
                    return (
                      <tr key={alloc._id || invId} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold">{invNum}</td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">₹{alloc.amount?.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">
                          {invId ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/sales/invoices/view/${encodeURIComponent(encryptData(invId))}`)}
                              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer transition-colors"
                              title="Go to Invoice Details"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal}
        isLoading={loading}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Payment Record"
        message="Are you sure you want to delete this payment record? Doing so will reverse the allocations, restoring the outstanding balance on any linked invoices. This action cannot be undone."
      />

      {/* Allocate Advance Modal */}
      <AllocateAdvanceModal
        isOpen={allocateModal}
        onClose={() => setAllocateModal(false)}
        onConfirm={handleAllocateConfirm}
        payment={payment}
        invoices={invoices}
      />
    </div>
  );
}
