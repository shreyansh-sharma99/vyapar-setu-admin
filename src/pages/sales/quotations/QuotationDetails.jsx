import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Edit2, Send, Check, X, Copy, Trash2, FileText, ArrowRightCircle,
  Calendar, User, Hash, MapPin, Mail, Phone, Building2, Receipt,
} from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import {
  getQuotationById,
  clearCurrentQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  convertToProforma,
  convertToInvoice,
  duplicateQuotation,
  deleteQuotation,
  clearQuotationToast,
} from './services/quotationSlice';

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10' },
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' },
  accepted: { label: 'Accepted', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' },
  rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' },
  expired: { label: 'Expired', cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/20' },
  converted: { label: 'Converted', cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border-violet-200 dark:border-violet-500/20' },
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
export default function QuotationDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const { currentQuotation: quotation, loading, toast: reduxToast } = useSelector((s) => s.quotation);
  const [toasts, setToasts] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null });

  const showToast = (message, color = 'success') => {
    const tid = Date.now();
    setToasts((p) => [...p, { id: tid, message, color }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== tid)), 3500);
  };

  useEffect(() => {
    if (id) dispatch(getQuotationById(id));
    return () => { dispatch(clearCurrentQuotation()); };
  }, [dispatch, id]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearQuotationToast());
      if (id) dispatch(getQuotationById(id));
    }
  }, [reduxToast, dispatch, id]);

  const openConfirm = (type) => setConfirmModal({ isOpen: true, type });

  const handleConfirmAction = () => {
    const { type } = confirmModal;
    if (!quotation) return;
    if (type === 'send') dispatch(sendQuotation(quotation._id));
    else if (type === 'accept') dispatch(acceptQuotation(quotation._id));
    else if (type === 'reject') dispatch(rejectQuotation(quotation._id));
    else if (type === 'proforma') dispatch(convertToProforma(quotation._id));
    else if (type === 'invoice') dispatch(convertToInvoice(quotation._id));
    setConfirmModal({ isOpen: false, type: null });
  };

  const handleDuplicate = () => {
    if (!quotation) return;
    dispatch(duplicateQuotation(quotation._id));
    navigate('/sales/quotations');
  };

  const handleConfirmDelete = () => {
    if (quotation) {
      dispatch(deleteQuotation(quotation._id));
      setDeleteModal(false);
      navigate('/sales/quotations');
    }
  };

  if (loading || !quotation) {
    return (
      <Card h1="Quotation Details" buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">
        <Loader />
      </Card>
    );
  }

  const statusCfg = STATUS_CONFIG[quotation.status] || STATUS_CONFIG.draft;
  const isExpired = quotation.validUntil && new Date(quotation.validUntil) < new Date() && quotation.status !== 'accepted';

  const confirmConfig = {
    send: { title: 'Send Quotation?', message: 'This will mark the quotation as sent.', label: 'Send', variant: 'primary', icon: <Send className="w-6 h-6 text-blue-500" /> },
    accept: { title: 'Accept Quotation?', message: 'This will mark the quotation as accepted.', label: 'Accept', variant: 'primary', icon: <Check className="w-6 h-6 text-emerald-500" /> },
    reject: { title: 'Reject Quotation?', message: 'This will mark the quotation as rejected.', label: 'Reject', variant: 'danger', icon: <X className="w-6 h-6 text-rose-500" /> },
    proforma: { title: 'Convert to Proforma?', message: 'A new proforma invoice will be created from this quotation.', label: 'Convert', variant: 'primary', icon: <FileText className="w-6 h-6 text-violet-500" /> },
    invoice: { title: 'Convert to Invoice?', message: 'A new sales invoice will be created from this quotation.', label: 'Convert', variant: 'primary', icon: <Receipt className="w-6 h-6 text-emerald-500" /> },
  };

  const currentConfirm = confirmModal.type ? confirmConfig[confirmModal.type] : null;

  const billingAddr = quotation.customerSnapshot?.billingAddress;
  const billingStr = [billingAddr?.street, billingAddr?.city, billingAddr?.state, billingAddr?.pincode, billingAddr?.country]
    .filter(Boolean).join(', ');

  return (
    <div className="flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <Card h1={`Quotation - ${quotation.quotationNumber}`} buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">

        {/* ── Top Action Bar ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--vs-border)]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.cls}`}>{statusCfg.label}</span>
            {quotation.invoiceType && <span className="text-xs bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md text-[var(--vs-text-secondary)] font-semibold">{quotation.invoiceType}</span>}
            {isExpired && <span className="text-xs bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 px-2.5 py-1 rounded-md font-semibold border border-orange-200 dark:border-orange-500/20">EXPIRED</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Edit (draft only) */}
            {quotation.status === 'draft' && (
              <Button type="button" variant="outline" onClick={() => navigate(`/sales/quotations/edit/${encodeURIComponent(encryptData(quotation._id))}`)} startIcon={<Edit2 className="w-3.5 h-3.5" />} className="!h-9 px-3">Edit</Button>
            )}

            {/* Send */}
            {(quotation.status === 'draft' || quotation.status === 'sent') && (
              <Button type="button" variant="primary" onClick={() => openConfirm('send')} startIcon={<Send className="w-3.5 h-3.5" />} className="!h-9 px-3">
                {quotation.status === 'sent' ? 'Resend' : 'Send'}
              </Button>
            )}

            {/* Accept / Reject (sent) */}
            {quotation.status === 'sent' && (
              <>
                <Button type="button" variant="primary" onClick={() => openConfirm('accept')} startIcon={<Check className="w-3.5 h-3.5" />} className="!h-9 px-3 !bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700">Accept</Button>
                <Button type="button" variant="danger" onClick={() => openConfirm('reject')} startIcon={<X className="w-3.5 h-3.5" />} className="!h-9 px-3">Reject</Button>
              </>
            )}

            {/* Convert actions */}
            {(quotation.status === 'accepted' || quotation.status === 'sent') && (
              <>
                <Button type="button" variant="outline" onClick={() => openConfirm('proforma')} startIcon={<FileText className="w-3.5 h-3.5" />} className="!h-9 px-3">→ Proforma</Button>
                <Button type="button" variant="outline" onClick={() => openConfirm('invoice')} startIcon={<ArrowRightCircle className="w-3.5 h-3.5" />} className="!h-9 px-3">→ Invoice</Button>
              </>
            )}

            {/* Duplicate */}
            <Button type="button" variant="outline" onClick={handleDuplicate} startIcon={<Copy className="w-3.5 h-3.5" />} className="!h-9 px-3">Duplicate</Button>

            {/* Delete (draft only) */}
            {quotation.status === 'draft' && (
              <Button type="button" variant="danger" onClick={() => setDeleteModal(true)} startIcon={<Trash2 className="w-3.5 h-3.5" />} className="!h-9 px-3">Delete</Button>
            )}
          </div>
        </div>

        {/* ── Main Content ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">

          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Customer Info Card */}
            <Card title="Customer Details" bodyClassName="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Name" value={quotation.customerSnapshot?.name || 'Walk-in'} />
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={quotation.customerSnapshot?.phone} />
              <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={quotation.customerSnapshot?.email} />
              <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="GSTIN" value={quotation.customerSnapshot?.gstin} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Billing Address" value={billingStr || '—'} />
              <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="State Code" value={quotation.customerSnapshot?.stateCode} />
            </Card>

            {/* Line Items */}
            <Card title="Product Items" bodyClassName="p-0">
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
                    {quotation.lineItems?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-medium text-[var(--vs-text-primary)] border border-gray-300 dark:border-white/20">
                          <div>{item.productName || '—'}</div>
                          {item.sku && <div className="text-[10px] text-[var(--vs-text-secondary)] mt-0.5">SKU: {item.sku}</div>}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{item.hsnCode || '—'}</td>
                        <td className="py-3 px-4 text-center border border-gray-300 dark:border-white/20">{item.qty} <span className="text-[10px] text-[var(--vs-text-secondary)]">{item.unit || 'pcs'}</span></td>
                        <td className="py-3 px-4 text-center font-mono border border-gray-300 dark:border-white/20">₹{Number(item.rate).toFixed(2)}</td>
                        <td className="py-3 px-4 text-center text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{item.discountPercent ?? 0}%</td>
                        <td className="py-3 px-4 text-center text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{item.taxPercent ?? 0}%</td>
                        <td className="py-3 px-4 text-right font-semibold text-indigo-600 dark:text-indigo-400 font-mono border border-gray-300 dark:border-white/20">₹{Number(item.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Notes & Terms */}
            {(quotation.notes || quotation.terms) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quotation.notes && (
                  <Card title="Notes" titleClassName="!text-blue-600 dark:!text-blue-400" bodyClassName="p-4">
                    <p className="text-sm text-[var(--vs-text-primary)] whitespace-pre-wrap">{quotation.notes}</p>
                  </Card>
                )}
                {quotation.terms && (
                  <Card title="Terms &amp; Conditions" titleClassName="!text-blue-600 dark:!text-blue-400" bodyClassName="p-4">
                    <p className="text-sm text-[var(--vs-text-primary)] whitespace-pre-wrap">{quotation.terms}</p>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar: Summary */}
          <div className="flex flex-col gap-4">
            {/* Quotation Meta */}
            <Card title="Quotation Info" bodyClassName="px-4 py-4 flex flex-col gap-4">
              <div className="flex flex-row justify-between gap-3.5">
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Quotation Date" value={quotation.quotationDate ? new Date(quotation.quotationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Valid Until" value={quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
              </div>
              <div className=" pt-2">
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Place of Supply" value={quotation.placeOfSupply} />
              </div>
            </Card>

            {/* Tax Summary */}
            <Card title="Price Summary" bodyClassName="px-5 py-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                <span>Subtotal</span>
                <span className="font-mono">₹{Number(quotation.subtotal || 0).toFixed(2)}</span>
              </div>
              {quotation.discountAmount > 0 && (
                <div className="flex justify-between items-center text-rose-500">
                  <span>Discount</span>
                  <span className="font-mono">-₹{Number(quotation.discountAmount).toFixed(2)}</span>
                </div>
              )}
              {quotation.igstTotal > 0 && (
                <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                  <span>IGST</span>
                  <span className="font-mono">₹{Number(quotation.igstTotal).toFixed(2)}</span>
                </div>
              )}
              {quotation.cgstTotal > 0 && (
                <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                  <span>CGST</span>
                  <span className="font-mono">₹{Number(quotation.cgstTotal).toFixed(2)}</span>
                </div>
              )}
              {quotation.sgstTotal > 0 && (
                <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                  <span>SGST</span>
                  <span className="font-mono">₹{Number(quotation.sgstTotal).toFixed(2)}</span>
                </div>
              )}
              {quotation.roundOff !== 0 && quotation.roundOff !== undefined && (
                <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                  <span>Round Off</span>
                  <span className="font-mono">{Number(quotation.roundOff) >= 0 ? '+' : ''}₹{Number(quotation.roundOff).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-[var(--vs-border)] font-bold text-base">
                <span className="text-[var(--vs-text-primary)]">Grand Total</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{Number(quotation.totalAmount || 0).toFixed(2)}</span>
              </div>
            </Card>

            {/* GST Breakdown */}
            {quotation.isInterState !== undefined && (
              <Card title="GST Info" titleClassName="!text-blue-600 dark:!text-blue-400" bodyClassName="p-4 flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--vs-text-secondary)]">Inter-State</span>
                  <span className="font-semibold text-[var(--vs-text-primary)]">{quotation.isInterState ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--vs-text-secondary)]">Reverse Charge</span>
                  <span className="font-semibold text-[var(--vs-text-primary)]">{quotation.reverseCharge ? 'Yes' : 'No'}</span>
                </div>
                {quotation.sellerGstin && (
                  <div className="flex justify-between">
                    <span className="text-[var(--vs-text-secondary)]">Seller GSTIN</span>
                    <span className="font-mono font-semibold text-[var(--vs-text-primary)]">{quotation.sellerGstin}</span>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </Card>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <DeleteModal
        isOpen={deleteModal}
        isLoading={loading}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Quotation"
        message="Are you sure you want to delete this draft quotation? This action cannot be undone."
      />

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

      {/* ── Toaster ─────────────────────────────────────────────────────────── */}
      <CToaster className="p-3" style={{ zIndex: 2000, position: 'fixed', bottom: '20px', right: '20px' }}>
        {toasts.map((t) => (
          <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2">
            <div className="d-flex"><CToastBody className="font-semibold">{t.message}</CToastBody></div>
          </CToast>
        ))}
      </CToaster>
    </div>
  );
}
