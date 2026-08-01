import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  Download,
  Edit2,
  Check,
  Send,
  Calendar,
  User,
  FileText,
  Building2,
  Hash,
  MapPin,
  Phone,
  Mail,
  Copy,
  Trash2,
  ArrowRightCircle,
} from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import {
  getProformaInvoiceById,
  clearCurrentProformaInvoice,
  sendProformaInvoice,
  convertToInvoice,
  duplicateProformaInvoice,
  deleteProformaInvoice,
  clearProformaInvoiceToast,
} from './services/proformaInvoiceSlice';
import { downloadProformaPdfApi } from './services/proformaInvoiceService';

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

export default function ProformaInvoiceDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentProformaInvoice: proforma, loading, toast: reduxToast } = useSelector((state) => state.proformaInvoice);
  const [toasts, setToasts] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (id) {
      dispatch(getProformaInvoiceById(id));
    }
    return () => {
      dispatch(clearCurrentProformaInvoice());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearProformaInvoiceToast());
      if (id) {
        dispatch(getProformaInvoiceById(id));
      }
    }
  }, [reduxToast, dispatch, id]);

  const handleDownloadPdf = async () => {
    if (!proforma) return;
    try {
      showToast('Downloading proforma PDF...', 'info');
      const blob = await downloadProformaPdfApi(proforma._id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Proforma-${proforma.proformaNumber || 'PI'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('PDF downloaded successfully.', 'success');
    } catch (err) {
      showToast('Failed to download PDF.', 'danger');
    }
  };

  const handleEditClick = () => {
    if (!proforma) return;
    if (proforma.status !== 'draft') {
      showToast('Only draft proforma invoices can be edited.', 'warning');
      return;
    }
    const encId = encodeURIComponent(encryptData(proforma._id));
    navigate(`/sales/proforma-invoice/edit/${encId}`);
  };

  const handleSendProforma = () => {
    if (!proforma) return;
    dispatch(sendProformaInvoice(proforma._id));
  };

  const handleConvertToInvoice = () => {
    if (!proforma) return;
    dispatch(convertToInvoice(proforma._id));
  };

  const handleDuplicate = () => {
    if (!proforma) return;
    dispatch(duplicateProformaInvoice(proforma._id));
    navigate('/sales/proforma-invoice');
  };

  const handleConfirmDelete = () => {
    if (proforma) {
      dispatch(deleteProformaInvoice(proforma._id));
      setDeleteModal(false);
      navigate('/sales/proforma-invoice');
    }
  };

  if (loading || !proforma) {
    return (
      <Card
        h1="Proforma Invoice Details"
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
    sent: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
    expired: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
    converted: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
  };

  return (
    <div className="flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <Card
        h1={`Proforma Invoice - ${proforma.proformaNumber}`}
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-6 mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[proforma.status] || 'bg-gray-100 text-gray-700'
                }`}
            >
              {proforma.status?.toUpperCase()}
            </span>
            {proforma.invoiceType && (
              <span className="text-xs bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md text-[var(--vs-text-secondary)] font-semibold">
                {proforma.invoiceType}
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

            {proforma.status === 'draft' && (
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
                  onClick={handleSendProforma}
                  startIcon={<Send className="w-3.5 h-3.5" />}
                  className="!h-9 px-3"
                >
                  Send to Customer
                </Button>
              </>
            )}

            {(proforma.status === 'sent' || proforma.status === 'accepted') && (
              <Button
                type="button"
                variant="primary"
                onClick={handleConvertToInvoice}
                startIcon={<ArrowRightCircle className="w-3.5 h-3.5" />}
                className="!h-9 px-3 !bg-emerald-600 hover:!bg-emerald-700 border-emerald-600"
              >
                Convert to Invoice
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleDuplicate}
              startIcon={<Copy className="w-3.5 h-3.5" />}
              className="!h-9 px-3"
            >
              Duplicate
            </Button>

            {proforma.status === 'draft' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteModal(true)}
                startIcon={<Trash2 className="w-3.5 h-3.5" />}
                className="!h-9 px-3 !text-rose-500 !border-rose-200 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* ── Main Content ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">

          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Customer Info Card */}
            <Card title="Customer Details" bodyClassName="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Name" value={proforma.customerSnapshot?.name || 'Walk-in'} />
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={proforma.customerSnapshot?.phone || proforma.customerId?.phone} />
              <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={proforma.customerSnapshot?.email || proforma.customerId?.email} />
              <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="GSTIN" value={proforma.customerSnapshot?.gstin} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Billing Address" value={
                proforma.customerSnapshot?.billingAddress
                  ? `${proforma.customerSnapshot.billingAddress.street}, ${proforma.customerSnapshot.billingAddress.city}, ${proforma.customerSnapshot.billingAddress.state} - ${proforma.customerSnapshot.billingAddress.pincode}`
                  : '—'
              } />
              <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="State Code" value={proforma.customerSnapshot?.stateCode} />
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
                    {proforma.lineItems?.map((item, idx) => {
                      const qty = Number(item.qty || 0);
                      const rate = Number(item.rate || 0);
                      const disc = Number(item.discountPercent || 0);
                      const gst = Number(item.taxPercent || 0);
                      const taxable = qty * rate * (1 - disc / 100);
                      const total = taxable * (1 + gst / 100);

                      return (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-medium text-[var(--vs-text-primary)] border border-gray-300 dark:border-white/20">
                            <div>{item.productName || '—'}</div>
                            {item.sku && <div className="text-[10px] text-[var(--vs-text-secondary)] mt-0.5">SKU: {item.sku}</div>}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-xs text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{item.hsnCode || '—'}</td>
                          <td className="py-3 px-4 text-center border border-gray-300 dark:border-white/20">{qty} <span className="text-[10px] text-[var(--vs-text-secondary)]">{item.unit || 'pcs'}</span></td>
                          <td className="py-3 px-4 text-center font-mono border border-gray-300 dark:border-white/20">₹{rate.toFixed(2)}</td>
                          <td className="py-3 px-4 text-center text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{disc}%</td>
                          <td className="py-3 px-4 text-center text-[var(--vs-text-secondary)] border border-gray-300 dark:border-white/20">{gst}%</td>
                          <td className="py-3 px-4 text-right font-semibold text-indigo-600 dark:text-indigo-400 font-mono border border-gray-300 dark:border-white/20">₹{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Notes & Terms */}
            {(proforma.notes || proforma.terms) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {proforma.notes && (
                  <Card title="Notes" titleClassName="!text-blue-600 dark:!text-blue-400" bodyClassName="p-4">
                    <p className="text-sm text-[var(--vs-text-primary)] whitespace-pre-wrap">{proforma.notes}</p>
                  </Card>
                )}
                {proforma.terms && (
                  <Card title="Terms &amp; Conditions" titleClassName="!text-blue-600 dark:!text-blue-400" bodyClassName="p-4">
                    <p className="text-sm text-[var(--vs-text-primary)] whitespace-pre-wrap">{proforma.terms}</p>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar: Summary */}
          <div className="flex flex-col gap-4">
            {/* Invoice Meta */}
            <Card title="Proforma Info" bodyClassName="px-4 py-4 flex flex-col gap-4">
              <div className="flex flex-row justify-between gap-3.5">
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Proforma Date" value={proforma.proformaDate ? new Date(proforma.proformaDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Valid Until" value={proforma.validUntil ? new Date(proforma.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
              </div>
              <div className=" pt-2">
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Place of Supply" value={proforma.placeOfSupply} />
              </div>
            </Card>

            {/* Price Summary */}
            <Card title="Price Summary" bodyClassName="px-5 py-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                <span>Subtotal</span>
                <span className="font-mono">₹{Number(proforma.subtotalAmount || proforma.subtotal || 0).toFixed(2)}</span>
              </div>
              {proforma.discountAmount > 0 && (
                <div className="flex justify-between items-center text-rose-500">
                  <span>Discount</span>
                  <span className="font-mono">-₹{Number(proforma.discountAmount).toFixed(2)}</span>
                </div>
              )}
              {proforma.taxAmount > 0 && (
                <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                  <span>GST Tax</span>
                  <span className="font-mono">₹{Number(proforma.taxAmount).toFixed(2)}</span>
                </div>
              )}
              {proforma.roundOffAmount !== 0 && proforma.roundOffAmount !== undefined && (
                <div className="flex justify-between items-center text-[var(--vs-text-secondary)]">
                  <span>Round Off</span>
                  <span className="font-mono">{Number(proforma.roundOffAmount) >= 0 ? '+' : ''}₹{Number(proforma.roundOffAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-[var(--vs-border)] font-bold text-base">
                <span className="text-[var(--vs-text-primary)]">Grand Total</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{Number(proforma.totalAmount || 0).toFixed(2)}</span>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal}
        isLoading={loading}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Draft Proforma Invoice"
        message="Are you sure you want to delete this draft proforma invoice? This action is irreversible."
      />

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
