import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Edit2, Send, Check, X, Trash2, ArrowRightCircle,
  Calendar, User, Hash, MapPin, Mail, Phone, Building2, Truck
} from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import {
  getDeliveryChallanById,
  clearCurrentChallan,
  updateDeliveryChallanStatus,
  convertToInvoice,
  deleteDeliveryChallan,
  clearChallanToast,
} from './services/deliveryChallanSlice';

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10' },
  issued: { label: 'Issued', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' },
  converted: { label: 'Converted', cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border-violet-200 dark:border-violet-500/20' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' },
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
export default function DeliveryChallanDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const { currentChallan: challan, loading, toast: reduxToast } = useSelector((s) => s.deliveryChallan);
  const [toasts, setToasts] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null });

  const showToast = (message, color = 'success') => {
    const tid = Date.now();
    setToasts((p) => [...p, { id: tid, message, color }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== tid)), 3500);
  };

  useEffect(() => {
    if (id) dispatch(getDeliveryChallanById(id));
    return () => { dispatch(clearCurrentChallan()); };
  }, [dispatch, id]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearChallanToast());
      if (id) dispatch(getDeliveryChallanById(id));
    }
  }, [reduxToast, dispatch, id]);

  const openConfirm = (type) => setConfirmModal({ isOpen: true, type });

  const handleConfirmAction = () => {
    const { type } = confirmModal;
    if (!challan) return;
    if (type === 'issue') {
      dispatch(updateDeliveryChallanStatus({ id: challan._id, status: 'issued' }));
    } else if (type === 'deliver') {
      dispatch(updateDeliveryChallanStatus({ id: challan._id, status: 'delivered' }));
    } else if (type === 'cancel') {
      dispatch(updateDeliveryChallanStatus({ id: challan._id, status: 'cancelled' }));
    } else if (type === 'invoice') {
      dispatch(convertToInvoice(challan._id));
    }
    setConfirmModal({ isOpen: false, type: null });
  };

  const handleConfirmDelete = () => {
    if (challan) {
      dispatch(deleteDeliveryChallan(challan._id));
      setDeleteModal(false);
      navigate('/sales/delivery-challan');
    }
  };

  if (loading || !challan) {
    return (
      <Card h1="Delivery Challan Details" buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">
        <Loader />
      </Card>
    );
  }

  const statusCfg = STATUS_CONFIG[challan.status] || STATUS_CONFIG.draft;

  const confirmConfig = {
    issue: { title: 'Issue Delivery Challan?', message: 'This will mark the challan as issued.', label: 'Issue', variant: 'primary', icon: <Send className="w-6 h-6 text-blue-500" /> },
    deliver: { title: 'Deliver Delivery Challan?', message: 'This will mark the challan as delivered. This will deduct product stock.', label: 'Deliver', variant: 'primary', icon: <Check className="w-6 h-6 text-emerald-500" /> },
    cancel: { title: 'Cancel Delivery Challan?', message: 'This will cancel this delivery challan and restore product stock.', label: 'Cancel', variant: 'danger', icon: <X className="w-6 h-6 text-rose-500" /> },
    invoice: { title: 'Convert to Invoice?', message: 'A new sales invoice will be created from this delivery challan.', label: 'Convert', variant: 'primary', icon: <ArrowRightCircle className="w-6 h-6 text-emerald-500" /> },
  };

  const currentConfirm = confirmModal.type ? confirmConfig[confirmModal.type] : null;

  const billingAddr = challan.customerSnapshot?.billingAddress;
  const billingStr = [billingAddr?.street, billingAddr?.city, billingAddr?.state, billingAddr?.pincode, billingAddr?.country]
    .filter(Boolean).join(', ');

  return (
    <div className="flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <Card h1={`Delivery Challan - ${challan.challanNumber}`} buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">

        {/* ── Top Action Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--vs-border)]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.cls}`}>{statusCfg.label}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Edit (draft only) */}
            {challan.status === 'draft' && (
              <Button type="button" variant="outline" onClick={() => navigate(`/sales/delivery-challan/edit/${encodeURIComponent(encryptData(challan._id))}`)} startIcon={<Edit2 className="w-3.5 h-3.5" />} className="!h-9 px-3">Edit</Button>
            )}

            {/* Issue (draft) */}
            {challan.status === 'draft' && (
              <Button type="button" variant="primary" onClick={() => openConfirm('issue')} startIcon={<Send className="w-3.5 h-3.5" />} className="!h-9 px-3">
                Issue
              </Button>
            )}

            {/* Deliver (draft/issued) */}
            {(challan.status === 'draft' || challan.status === 'issued') && (
              <Button type="button" variant="primary" onClick={() => openConfirm('deliver')} startIcon={<Check className="w-3.5 h-3.5" />} className="!h-9 px-3 !bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700">
                Mark Delivered
              </Button>
            )}

            {/* Convert to Invoice (issued / delivered) */}
            {(challan.status === 'issued' || challan.status === 'delivered') && (
              <Button type="button" variant="primary" onClick={() => openConfirm('invoice')} startIcon={<ArrowRightCircle className="w-3.5 h-3.5" />} className="!h-9 px-3">Convert to Invoice</Button>
            )}

            {/* Cancel (issued / delivered) */}
            {(challan.status === 'issued' || challan.status === 'delivered') && (
              <Button type="button" variant="danger" onClick={() => openConfirm('cancel')} startIcon={<X className="w-3.5 h-3.5" />} className="!h-9 px-3">Cancel</Button>
            )}

            {/* Delete (draft only) */}
            {challan.status === 'draft' && (
              <Button type="button" variant="danger" onClick={() => setDeleteModal(true)} startIcon={<Trash2 className="w-3.5 h-3.5" />} className="!h-9 px-3">Delete</Button>
            )}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">

          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Customer Info Card */}
            <Card title="Customer Details" bodyClassName="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Name" value={challan.customerSnapshot?.name || 'Walk-in'} />
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={challan.customerSnapshot?.phone} />
              <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={challan.customerSnapshot?.email} />
              <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="GSTIN" value={challan.customerSnapshot?.gstin} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Billing Address" value={billingStr || '—'} />
              <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="State Code" value={challan.customerSnapshot?.stateCode} />
            </Card>

            {/* Line Items */}
            <Card title="Product Items" bodyClassName="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px] border-collapse border border-gray-300 dark:border-white/20">
                  <thead className="bg-gray-50/80 dark:bg-slate-800/50">
                    <tr className="text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                      <th className="py-3 px-4 text-left text-white bg-blue-400 border border-gray-300 dark:border-white/20 whitespace-nowrap">Product</th>
                      <th className="py-3 px-4 text-center text-white bg-blue-400 border border-gray-300 dark:border-white/20 whitespace-nowrap">HSN</th>
                      <th className="py-3 px-4 text-center text-white bg-blue-400 border border-gray-300 dark:border-white/20 whitespace-nowrap">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challan.lineItems?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-medium text-[var(--vs-text-primary)] border border-gray-300 dark:border-white/20">
                          <div>{item.productName || '—'}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{item.hsnCode || '—'}</td>
                        <td className="py-3 px-4 text-center font-semibold text-indigo-600 dark:text-indigo-400 border border-gray-300 dark:border-white/20">{item.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Sidebar: Challan Info */}
          <div className="flex flex-col gap-4">
            <Card title="Challan Info" bodyClassName="px-4 py-4 flex flex-col gap-4">
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Challan Date" value={challan.challanDate ? new Date(challan.challanDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
              <div className="pt-2 border-t border-[var(--vs-border)]">
                <InfoRow icon={<Truck className="w-3.5 h-3.5" />} label="Vehicle Number" value={challan.vehicleNumber || '—'} />
              </div>
              <div className="pt-2 border-t border-[var(--vs-border)]">
                <InfoRow icon={<Truck className="w-3.5 h-3.5" />} label="Transport Mode" value={challan.transportMode || 'Road'} />
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {/* ── Modals ── */}
      <DeleteModal
        isOpen={deleteModal}
        isLoading={loading}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Delivery Challan"
        message="Are you sure you want to delete this draft delivery challan? This action cannot be undone."
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
