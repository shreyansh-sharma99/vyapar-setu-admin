import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Edit2, Check, X, Trash2, Calendar, User, Hash, MapPin, Mail, Phone, FileText
} from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import {
  getSalesReturnById,
  clearCurrentReturn,
  updateSalesReturnStatus,
  deleteSalesReturn,
  clearReturnToast,
} from './services/salesReturnSlice';

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:    { label: 'Draft',    cls: 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' },
  rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' },
};

// ─── Animated Modal ─────────────────────────────────────────────────────────────
function AnimatedModal({ isOpen, onClose, children, maxWidth = 'max-w-sm' }) {
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
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`relative w-full ${maxWidth} rounded-2xl shadow-2xl overflow-hidden ${isClosing ? 'modal-content-exit' : 'modal-content-enter'}`}
        style={{ background: 'var(--vs-bg-primary)', border: '1px solid var(--vs-border)' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel, confirmVariant, icon }) {
  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose}>
      <div className="text-[var(--vs-text-primary)]">
        <div className="px-6 py-5 flex flex-col items-center gap-3 text-center">
          {icon && <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--vs-bg-secondary)' }}>{icon}</div>}
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

// ─── Info Row ────────────────────────────────────────────────────────────────────
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

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function SalesReturnDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const { currentReturn: salesReturn, loading, toast: reduxToast } = useSelector((s) => s.salesReturn);
  const [toasts, setToasts] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null });

  const showToast = (message, color = 'success') => {
    const tid = Date.now();
    setToasts((p) => [...p, { id: tid, message, color }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== tid)), 3500);
  };

  useEffect(() => {
    if (id) dispatch(getSalesReturnById(id));
    return () => { dispatch(clearCurrentReturn()); };
  }, [dispatch, id]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearReturnToast());
      if (id) dispatch(getSalesReturnById(id));
    }
  }, [reduxToast, dispatch, id]);

  const openConfirm = (type) => setConfirmModal({ isOpen: true, type });

  const handleConfirmAction = () => {
    const { type } = confirmModal;
    if (!salesReturn) return;
    if (type === 'approve') {
      dispatch(updateSalesReturnStatus({ id: salesReturn._id, status: 'approved' }));
    } else if (type === 'reject') {
      dispatch(updateSalesReturnStatus({ id: salesReturn._id, status: 'rejected' }));
    }
    setConfirmModal({ isOpen: false, type: null });
  };

  const handleConfirmDelete = () => {
    if (salesReturn) {
      dispatch(deleteSalesReturn(salesReturn._id));
      setDeleteModal(false);
      navigate('/sales/return');
    }
  };

  if (loading || !salesReturn) {
    return (
      <Card h1="Sales Return Details" buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">
        <Loader />
      </Card>
    );
  }

  const statusCfg = STATUS_CONFIG[salesReturn.status] || STATUS_CONFIG.draft;

  const confirmConfig = {
    approve: { title: 'Approve Sales Return?', message: 'This will approve the sales return. You cannot edit it after approval.', label: 'Approve', variant: 'primary', icon: <Check className="w-6 h-6 text-emerald-500" /> },
    reject:  { title: 'Reject Sales Return?',  message: 'This will mark the sales return as rejected.',                             label: 'Reject',  variant: 'danger',  icon: <X className="w-6 h-6 text-rose-500" /> },
  };

  const currentConfirm = confirmModal.type ? confirmConfig[confirmModal.type] : null;

  const billingAddr = salesReturn.customerSnapshot?.billingAddress;
  const billingStr = [billingAddr?.street, billingAddr?.city, billingAddr?.state, billingAddr?.pincode, billingAddr?.country]
    .filter(Boolean).join(', ');

  return (
    <div className="flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <Card h1={`Sales Return - ${salesReturn.returnNumber}`} buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">

        {/* ── Top Action Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--vs-border)]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.cls}`}>{statusCfg.label}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Edit (draft only) */}
            {salesReturn.status === 'draft' && (
              <Button type="button" variant="outline" onClick={() => navigate(`/sales/return/edit/${encodeURIComponent(encryptData(salesReturn._id))}`)} startIcon={<Edit2 className="w-3.5 h-3.5" />} className="!h-9 px-3">Edit</Button>
            )}

            {/* Approve (draft only) */}
            {salesReturn.status === 'draft' && (
              <Button type="button" variant="primary" onClick={() => openConfirm('approve')} startIcon={<Check className="w-3.5 h-3.5" />} className="!h-9 px-3">
                Approve
              </Button>
            )}

            {/* Reject (draft and approved only) */}
            {(salesReturn.status === 'draft' || salesReturn.status === 'approved') && (
              <Button type="button" variant="outline" onClick={() => openConfirm('reject')} startIcon={<X className="w-3.5 h-3.5" />} className="!h-9 px-3 border-dashed hover:!border-rose-500 hover:!text-rose-500">
                Reject
              </Button>
            )}

            {/* Delete (draft and rejected only) */}
            {(salesReturn.status === 'draft' || salesReturn.status === 'rejected') && (
              <Button type="button" variant="outline" onClick={() => setDeleteModal(true)} startIcon={<Trash2 className="w-3.5 h-3.5" />} className="!h-9 px-3 !text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 !border-rose-200 dark:!border-rose-500/20">
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* ── Info Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* General Details */}
          <Card title="General Information" bodyClassName="p-5 flex flex-col gap-4">
            <InfoRow icon={<Hash className="w-4 h-4" />} label="Return Number" value={salesReturn.returnNumber} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Return Date" value={salesReturn.returnDate ? new Date(salesReturn.returnDate).toLocaleDateString('en-IN') : '—'} />
            <InfoRow icon={<FileText className="w-4 h-4" />} label="Source Invoice" value={salesReturn.salesInvoiceId?.invoiceNumber || '—'} />
          </Card>

          {/* Customer Snapshot */}
          <Card title="Customer Information" bodyClassName="p-5 flex flex-col gap-4">
            <InfoRow icon={<User className="w-4 h-4" />} label="Customer Name" value={salesReturn.customerSnapshot?.name || 'Walk-in Customer'} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone Number" value={salesReturn.customerSnapshot?.phone} />
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email Address" value={salesReturn.customerSnapshot?.email} />
            <InfoRow icon={<Hash className="w-4 h-4" />} label="GSTIN" value={salesReturn.customerSnapshot?.gstin} />
          </Card>

          {/* Billing Address */}
          <Card title="Address Details" bodyClassName="p-5 flex flex-col gap-4">
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Billing Address" value={billingStr || 'No address specified'} />
          </Card>
        </div>

        {/* ── Returned Items Table ── */}
        <div className="mt-8">
          <h3 className="text-base font-bold mb-4">Returned Line Items</h3>
          <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
            <table className="w-full text-sm border-collapse min-w-[650px]">
              <thead className="bg-gray-50/50 dark:bg-slate-800/50 text-[var(--vs-text-secondary)] font-bold text-xs uppercase tracking-wider">
                <tr className="border-b border-[var(--vs-border)]">
                  <th className="py-3.5 px-4 text-left">Product Name</th>
                  <th className="py-3.5 px-4 text-center">HSN</th>
                  <th className="py-3.5 px-4 text-center">Returned Qty</th>
                  <th className="py-3.5 px-4 text-center">Rate</th>
                  <th className="py-3.5 px-4 text-center">Discount</th>
                  <th className="py-3.5 px-4 text-center">Tax (GST)</th>
                  <th className="py-3.5 px-4 text-left">Return Reason</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {salesReturn.lineItems?.map((item, index) => {
                  const rate = Number(item.rate || 0);
                  const disc = Number(item.discountPercent || 0);
                  const qty = Number(item.qty || 0);
                  const taxable = qty * rate * (1 - disc / 100);
                  const tax = taxable * (Number(item.taxPercent || 0) / 100);
                  const total = taxable + tax;

                  return (
                    <tr key={index} className="border-b border-[var(--vs-border)] hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[var(--vs-text-primary)]">{item.productName}</td>
                      <td className="py-3.5 px-4 text-center font-mono">{item.hsnCode || '—'}</td>
                      <td className="py-3.5 px-4 text-center font-semibold font-mono">{qty}</td>
                      <td className="py-3.5 px-4 text-center font-mono">₹{rate.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-center text-rose-500 font-semibold">{disc > 0 ? `${disc}%` : '—'}</td>
                      <td className="py-3.5 px-4 text-center font-mono">{item.taxPercent || 0}%</td>
                      <td className="py-3.5 px-4 text-left italic text-gray-500 dark:text-white/40">{item.returnReason || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">₹{total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Notes and Pricing Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Notes */}
          <div className="lg:col-span-2">
            {salesReturn.notes && (
              <Card title="Notes" bodyClassName="p-4 bg-slate-50/50 dark:bg-white/[0.01] border-dashed border border-gray-200 dark:border-white/10 rounded-xl h-full">
                <p className="text-sm leading-relaxed text-[var(--vs-text-secondary)] whitespace-pre-wrap">{salesReturn.notes}</p>
              </Card>
            )}
          </div>

          {/* Price Summary */}
          <div>
            <Card title="Pricing Summary" bodyClassName="p-5 flex flex-col gap-3.5 text-sm">
              <div className="flex items-center justify-between text-[var(--vs-text-secondary)]">
                <span>Subtotal</span>
                <span className="font-mono font-medium">₹{(salesReturn.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--vs-text-secondary)]">
                <span>GST Total</span>
                <span className="font-mono font-medium">₹{(salesReturn.taxAmount || 0).toFixed(2)}</span>
              </div>

              {/* GST Splits */}
              {(salesReturn.cgstTotal > 0 || salesReturn.sgstTotal > 0 || salesReturn.igstTotal > 0) && (
                <div className="border-t border-dashed border-gray-200 dark:border-white/10 pt-2 flex flex-col gap-1.5 text-xs text-[var(--vs-text-secondary)]">
                  {salesReturn.cgstTotal > 0 && (
                    <div className="flex justify-between font-mono">
                      <span>CGST:</span>
                      <span>₹{salesReturn.cgstTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {salesReturn.sgstTotal > 0 && (
                    <div className="flex justify-between font-mono">
                      <span>SGST:</span>
                      <span>₹{salesReturn.sgstTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {salesReturn.igstTotal > 0 && (
                    <div className="flex justify-between font-mono">
                      <span>IGST:</span>
                      <span>₹{salesReturn.igstTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {salesReturn.roundOff !== 0 && (
                <div className="flex items-center justify-between text-[var(--vs-text-secondary)]">
                  <span>Round Off</span>
                  <span className="font-mono font-medium text-amber-500">₹{(salesReturn.roundOff || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[var(--vs-border)] pt-3 text-base font-extrabold text-[var(--vs-text-primary)]">
                <span>Grand Total</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{(salesReturn.totalAmount || 0).toFixed(2)}</span>
              </div>
            </Card>
          </div>
        </div>

      </Card>

      {/* ── Delete Modal ── */}
      <DeleteModal
        isOpen={deleteModal}
        isLoading={loading}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Sales Return"
        message="Are you sure you want to delete this sales return? This cannot be undone."
      />

      {/* ── Status Confirm Modal ── */}
      {currentConfirm && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, type: null })}
          onConfirm={handleConfirmAction}
          title={currentConfirm.title}
          message={currentConfirm.message}
          confirmLabel={currentConfirm.label}
          confirmVariant={currentConfirm.variant}
          icon={currentConfirm.icon}
        />
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
