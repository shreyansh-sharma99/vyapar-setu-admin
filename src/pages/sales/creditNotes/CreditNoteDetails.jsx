import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Edit2, Check, Trash2, Calendar, User, Hash, MapPin, Mail, Phone, FileText, Download, Send
} from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import {
  getCreditNoteById,
  clearCurrentCreditNote,
  updateCreditNoteStatus,
  applyCreditNote,
  deleteCreditNote,
  clearCreditNoteToast,
} from './services/creditNoteSlice';
import { downloadCreditNotePdfApi } from './services/creditNoteService';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import { getSalesInvoices } from '../salesInvoices/services/salesInvoiceSlice';

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10' },
  issued: { label: 'Issued', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' },
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

// ─── Apply Credit Note Modal ──────────────────────────────────────────────────
function ApplyModal({ isOpen, onClose, onConfirm, creditNote, invoices }) {
  const [salesInvoiceId, setSalesInvoiceId] = useState('');
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (creditNote) {
      setSalesInvoiceId(creditNote.salesInvoiceId?._id || creditNote.salesInvoiceId || '');
      setAmount(creditNote.totalAmount || 0);
    }
  }, [creditNote, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="text-[var(--vs-text-primary)] p-6">
        <h3 className="text-base font-bold mb-4">Apply Credit Note to Invoice</h3>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (!salesInvoiceId || amount <= 0) return;
          onConfirm({ salesInvoiceId, amount: Number(amount) });
        }} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1">
            <Label>Target Sales Invoice <span className="text-red-500">*</span></Label>
            <select
              value={salesInvoiceId}
              onChange={(e) => setSalesInvoiceId(e.target.value)}
              className="rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-3 py-2 text-sm text-[var(--vs-text-primary)] outline-none cursor-pointer w-full"
              required
            >
              <option value="">Select Invoice...</option>
              {invoices.map((inv) => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} - {inv.customerSnapshot?.name || 'Walk-in'} (₹{inv.totalAmount?.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Amount to Apply (₹) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={onClose} className="!h-9">Cancel</Button>
            <Button type="submit" variant="primary" className="!h-9" disabled={!salesInvoiceId || amount <= 0}>
              Apply Credit
            </Button>
          </div>
        </form>
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
export default function CreditNoteDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const { currentCreditNote: creditNote, loading, toast: reduxToast } = useSelector((s) => s.creditNote);
  const { invoices } = useSelector((s) => s.salesInvoice);
  const [toasts, setToasts] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null });
  const [applyModal, setApplyModal] = useState(false);

  const showToast = (message, color = 'success') => {
    const tid = Date.now();
    setToasts((p) => [...p, { id: tid, message, color }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== tid)), 3500);
  };

  useEffect(() => {
    if (id) dispatch(getCreditNoteById(id));
    dispatch(getSalesInvoices({ limit: 1000 }));
    return () => { dispatch(clearCurrentCreditNote()); };
  }, [dispatch, id]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearCreditNoteToast());
      if (id) dispatch(getCreditNoteById(id));
    }
  }, [reduxToast, dispatch, id]);

  const openConfirm = (type) => setConfirmModal({ isOpen: true, type });

  const handleConfirmAction = () => {
    const { type } = confirmModal;
    if (!creditNote) return;
    if (type === 'issue') {
      dispatch(updateCreditNoteStatus({ id: creditNote._id, status: 'issued' }));
    }
    setConfirmModal({ isOpen: false, type: null });
  };

  const handleApplyConfirm = (payload) => {
    if (creditNote) {
      dispatch(applyCreditNote({ id: creditNote._id, payload }));
      setApplyModal(false);
    }
  };

  const handleConfirmDelete = () => {
    if (creditNote) {
      dispatch(deleteCreditNote(creditNote._id));
      setDeleteModal(false);
      navigate('/sales/credit-note');
    }
  };

  const handleDownloadPdf = async () => {
    if (!creditNote) return;
    try {
      showToast('Downloading credit note PDF...', 'info');
      const blob = await downloadCreditNotePdfApi(creditNote._id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CreditNote-${creditNote.creditNoteNumber || 'CN'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('PDF downloaded successfully.', 'success');
    } catch (err) {
      showToast('Failed to download PDF.', 'danger');
    }
  };

  if (loading || !creditNote) {
    return (
      <Card h1="Credit Note Details" buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">
        <Loader />
      </Card>
    );
  }

  const statusCfg = STATUS_CONFIG[creditNote.status] || STATUS_CONFIG.draft;

  const confirmConfig = {
    issue: { title: 'Issue Credit Note?', message: 'This will issue the credit note. You cannot edit it after issuing.', label: 'Issue', variant: 'primary', icon: <Check className="w-6 h-6 text-emerald-500" /> },
  };

  const currentConfirm = confirmModal.type ? confirmConfig[confirmModal.type] : null;

  const billingAddr = creditNote.customerSnapshot?.billingAddress || creditNote.salesInvoiceId?.customerSnapshot?.billingAddress;
  const billingStr = billingAddr
    ? [billingAddr.street, billingAddr.city, billingAddr.state, billingAddr.pincode, billingAddr.country].filter(Boolean).join(', ')
    : '';

  return (
    <div className="flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <Card h1={`Credit Note - ${creditNote.creditNoteNumber}`} buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">

        {/* ── Top Action Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 -mx-6 px-6 border-b border-[var(--vs-border)]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.cls}`}>{statusCfg.label}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Edit (draft only) */}
            {creditNote.status === 'draft' && (
              <Button type="button" variant="outline" onClick={() => navigate(`/sales/credit-note/edit/${encodeURIComponent(encryptData(creditNote._id))}`)} startIcon={<Edit2 className="w-3.5 h-3.5" />} className="!h-9 px-3">Edit</Button>
            )}

            {/* Issue (draft only) */}
            {creditNote.status === 'draft' && (
              <Button type="button" variant="primary" onClick={() => openConfirm('issue')} startIcon={<Check className="w-3.5 h-3.5" />} className="!h-9 px-3">
                Issue Note
              </Button>
            )}

            {/* Apply (issued only) */}
            {creditNote.status === 'issued' && (
              <Button type="button" variant="primary" onClick={() => setApplyModal(true)} startIcon={<Check className="w-3.5 h-3.5" />} className="!h-9 px-3">
                Apply to Invoice
              </Button>
            )}

            {/* Download PDF (issued only) */}
            {creditNote.status === 'issued' && (
              <Button type="button" variant="outline" onClick={handleDownloadPdf} startIcon={<Download className="w-3.5 h-3.5" />} className="!h-9 px-3">
                Download PDF
              </Button>
            )}

            {/* Delete (draft only) */}
            {creditNote.status === 'draft' && (
              <Button type="button" variant="outline" onClick={() => setDeleteModal(true)} startIcon={<Trash2 className="w-3.5 h-3.5" />} className="!h-9 px-3 !text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 !border-rose-200 dark:!border-rose-500/20">
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* ── Info Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* General Details */}
          <Card title="General Information" bodyClassName="p-3.5 flex flex-col gap-3">
            <InfoRow icon={<Hash className="w-4 h-4" />} label="Credit Note Number" value={creditNote.creditNoteNumber} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Credit Note Date" value={creditNote.creditNoteDate ? new Date(creditNote.creditNoteDate).toLocaleDateString('en-IN') : '—'} />
            <InfoRow icon={<FileText className="w-4 h-4" />} label="Associated Invoice" value={creditNote.salesInvoiceId?.invoiceNumber || '—'} />
          </Card>

          {/* Customer Snapshot */}
          <Card title="Customer Information" bodyClassName="p-3.5 flex flex-col gap-3">
            <InfoRow icon={<User className="w-4 h-4" />} label="Customer Name" value={creditNote.customerSnapshot?.name || creditNote.salesInvoiceId?.customerSnapshot?.name || 'Walk-in Customer'} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone Number" value={creditNote.customerSnapshot?.phone || creditNote.salesInvoiceId?.customerSnapshot?.phone} />
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email Address" value={creditNote.customerSnapshot?.email || creditNote.salesInvoiceId?.customerSnapshot?.email} />
            <InfoRow icon={<Hash className="w-4 h-4" />} label="GSTIN" value={creditNote.customerSnapshot?.gstin || creditNote.salesInvoiceId?.customerSnapshot?.gstin} />
          </Card>

          {/* Billing Address */}
          <Card title="Address Details" bodyClassName="p-3.5 flex flex-col gap-3">
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Billing Address" value={billingStr || 'No address specified'} />
          </Card>
        </div>

        {/* ── Returned Items Table ── */}
        <div className="mt-8">
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
                  {creditNote.lineItems?.map((item, index) => {
                    const rate = Number(item.rate || 0);
                    const disc = Number(item.discountPercent || 0);
                    const qty = Number(item.qty || 0);
                    const taxable = qty * rate * (1 - disc / 100);
                    const tax = taxable * (Number(item.taxPercent || 0) / 100);
                    const total = taxable + tax;

                    return (
                      <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-medium text-[var(--vs-text-primary)] border border-gray-300 dark:border-white/20">
                          <div>{item.productName || '—'}</div>
                          {item.sku && <div className="text-[10px] text-[var(--vs-text-secondary)] mt-0.5">SKU: {item.sku}</div>}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{item.hsnCode || '—'}</td>
                        <td className="py-3 px-4 text-center border border-gray-300 dark:border-white/20">{qty} <span className="text-[10px] text-[var(--vs-text-secondary)]">{item.unit || 'pcs'}</span></td>
                        <td className="py-3 px-4 text-center font-mono border border-gray-300 dark:border-white/20">₹{rate.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{disc}%</td>
                        <td className="py-3 px-4 text-center text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{item.taxPercent ?? 0}%</td>
                        <td className="py-3 px-4 text-right font-semibold text-indigo-600 dark:text-indigo-400 font-mono border border-gray-300 dark:border-white/20">₹{total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── Notes and Pricing Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Notes */}
          <div className="lg:col-span-2">
            {creditNote.notes && (
              <Card title="Notes">
                <p className="text-sm leading-relaxed text-[var(--vs-text-secondary)] whitespace-pre-wrap">{creditNote.notes}</p>
              </Card>
            )}
          </div>

          {/* Price Summary */}
          <div>
            <Card title="Pricing Summary" bodyClassName="p-5 flex flex-col gap-3.5 text-sm">
              <div className="flex items-center justify-between text-[var(--vs-text-secondary)]">
                <span>Subtotal</span>
                <span className="font-mono font-medium">₹{(creditNote.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--vs-text-secondary)]">
                <span>GST Total</span>
                <span className="font-mono font-medium">₹{(creditNote.taxAmount || 0).toFixed(2)}</span>
              </div>

              {/* GST Splits */}
              {(creditNote.cgstTotal > 0 || creditNote.sgstTotal > 0 || creditNote.igstTotal > 0) && (
                <div className="border-t border-dashed border-gray-200 dark:border-white/10 pt-2 flex flex-col gap-1.5 text-xs text-[var(--vs-text-secondary)]">
                  {creditNote.cgstTotal > 0 && (
                    <div className="flex justify-between">
                      <span>CGST</span>
                      <span className="font-mono">₹{creditNote.cgstTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {creditNote.sgstTotal > 0 && (
                    <div className="flex justify-between">
                      <span>SGST</span>
                      <span className="font-mono">₹{creditNote.sgstTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {creditNote.igstTotal > 0 && (
                    <div className="flex justify-between">
                      <span>IGST</span>
                      <span className="font-mono">₹{creditNote.igstTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-white/10 pt-3 flex items-center justify-between text-base font-bold text-[var(--vs-text-primary)]">
                <span>Total Credit</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{(creditNote.totalAmount || 0).toFixed(2)}</span>
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
        title="Delete Draft Credit Note"
        message="Are you sure you want to delete this draft credit note? This cannot be undone."
      />

      {/* ── Generic Confirm Modal ── */}
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

      {/* ── Apply Modal ── */}
      <ApplyModal
        isOpen={applyModal}
        onClose={() => setApplyModal(false)}
        onConfirm={handleApplyConfirm}
        creditNote={creditNote}
        invoices={invoices}
      />

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
