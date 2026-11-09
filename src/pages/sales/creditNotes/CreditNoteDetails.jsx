import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Edit2, Check, Trash2, Download } from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import {
  Button, Card, ConfirmDialog, DetailList, DocumentLayout, labelForStatus, Field, Input, LineItemsTable, LineRow, Modal, PageHeader, PartyCard,
  Badge, Section, Select, SkeletonRows, ToastStack, TotalsPanel, TotalsRow, LINE_TD, LINE_TH,
} from '@/components/ui';
import {
  getCreditNoteById,
  clearCurrentCreditNote,
  updateCreditNoteStatus,
  applyCreditNote,
  deleteCreditNote,
  clearCreditNoteToast,
} from './services/creditNoteSlice';
import { downloadCreditNotePdfApi } from './services/creditNoteService';
import { getSalesInvoices } from '../salesInvoices/services/salesInvoiceSlice';
import { firstAddress, customerAddress } from '../components/address';

/** ₹ with two decimals, as this page always showed amounts. */
const rs = (v) => `₹${Number(v || 0).toFixed(2)}`;
/** Credit note status → badge tone ("issued" is not in the shared status map). */
const CN_TONE = { issued: 'success', draft: 'neutral' };

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
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Apply Credit Note to Invoice"
      subtitle={creditNote?.creditNoteNumber}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="cn-apply-form" disabled={!salesInvoiceId || amount <= 0}>
            Apply Credit
          </Button>
        </>
      }
    >
      <form
        id="cn-apply-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!salesInvoiceId || amount <= 0) return;
          onConfirm({ salesInvoiceId, amount: Number(amount) });
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Target sales invoice" required>
          <Select
            value={salesInvoiceId}
            onChange={(v) => setSalesInvoiceId(v)}
            placeholder="Select Invoice..."
            options={(invoices || []).map((inv) => ({
              value: inv._id,
              label: `${inv.invoiceNumber} - ${inv.customerSnapshot?.name || 'Walk-in'} (₹${inv.totalAmount?.toFixed(2)})`,
            }))}
          />
        </Field>

        <Field label="Amount to apply (₹)" required>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
            className="text-right tabular-nums"
          />
        </Field>
      </form>
    </Modal>
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
      <div className="flex flex-col gap-5">
        <PageHeader title="Credit note" />
        <Card>
          <SkeletonRows rows={6} cols={4} />
        </Card>
      </div>
    );
  }

  const confirmConfig = {
    issue: { title: 'Issue Credit Note?', message: 'This will issue the credit note. You cannot edit it after issuing.', label: 'Issue', tone: 'primary', icon: Check },
  };

  const currentConfirm = confirmModal.type ? confirmConfig[confirmModal.type] : null;

  const billingStr = firstAddress(
    creditNote.customerSnapshot?.billingAddress,
    creditNote.salesInvoiceId?.customerSnapshot?.billingAddress,
    creditNote.salesReturnId?.customerSnapshot?.billingAddress,
    customerAddress(creditNote.customerId),
  );

  const snap = creditNote.customerSnapshot || {};
  const invSnap = creditNote.salesInvoiceId?.customerSnapshot || {};
  const customerName = snap.name || invSnap.name || 'Walk-in Customer';
  const customerPhone = snap.phone || invSnap.phone;
  const customerEmail = snap.email || invSnap.email;
  const customerGstin = snap.gstin || invSnap.gstin;

  return (
    <>
      <DocumentLayout
        header={{
          title: 'Credit note',
          docNo: creditNote.creditNoteNumber,
          actions: (
            <>
              <Badge tone={CN_TONE[creditNote.status] ?? 'neutral'} size="md">{labelForStatus(creditNote.status)}</Badge>
              {/* Delete (draft only) */}
              {creditNote.status === 'draft' && (
                <Button variant="danger-soft" onClick={() => setDeleteModal(true)} startIcon={<Trash2 />}>Delete</Button>
              )}
              {/* Edit (draft only) */}
              {creditNote.status === 'draft' && (
                <Button variant="secondary" onClick={() => navigate(`/sales/credit-note/edit/${encodeURIComponent(encryptData(creditNote._id))}`)} startIcon={<Edit2 />}>Edit</Button>
              )}
              {/* Issue (draft only) */}
              {creditNote.status === 'draft' && (
                <Button onClick={() => openConfirm('issue')} startIcon={<Check />}>Issue Note</Button>
              )}
              {/* Download PDF (issued only) */}
              {creditNote.status === 'issued' && (
                <Button variant="secondary" onClick={handleDownloadPdf} startIcon={<Download />}>Download PDF</Button>
              )}
              {/* Apply (issued only) */}
              {creditNote.status === 'issued' && (
                <Button onClick={() => setApplyModal(true)} startIcon={<Check />}>Apply to Invoice</Button>
              )}
            </>
          ),
        }}
        summary={
          <TotalsPanel title="Pricing summary" totalLabel="Total credit" total={rs(creditNote.totalAmount)}>
            <TotalsRow label="Subtotal" value={rs(creditNote.subtotal)} />
            <TotalsRow label="GST total" value={rs(creditNote.taxAmount)} />
            {creditNote.cgstTotal > 0 && <TotalsRow label="CGST" value={rs(creditNote.cgstTotal)} />}
            {creditNote.sgstTotal > 0 && <TotalsRow label="SGST" value={rs(creditNote.sgstTotal)} />}
            {creditNote.igstTotal > 0 && <TotalsRow label="IGST" value={rs(creditNote.igstTotal)} />}
          </TotalsPanel>
        }
      >
        <Section title="Credit note details">
          <div className="flex flex-col gap-5">
            <DetailList
              cols={3}
              items={[
                { label: 'Credit note number', value: creditNote.creditNoteNumber, mono: true },
                { label: 'Credit note date', value: creditNote.creditNoteDate ? new Date(creditNote.creditNoteDate).toLocaleDateString('en-IN') : '—' },
                { label: 'Associated invoice', value: creditNote.salesInvoiceId?.invoiceNumber || '—', mono: true },
              ]}
            />
            <PartyCard name={customerName} sub={[customerPhone, customerEmail].filter(Boolean).join(' · ')}>
              <DetailList
                cols={2}
                className="border-t border-line pt-3"
                items={[
                  { label: 'GSTIN', value: customerGstin, mono: true },
                  { label: 'Billing address', value: billingStr || 'No address specified' },
                ]}
              />
            </PartyCard>
          </div>
        </Section>

        {/* ── Product Items ── */}
        <Section title="Product items" description={`${creditNote.lineItems?.length || 0} lines`}>
          <LineItemsTable
            minWidth={640}
            head={
              <tr>
                <th className={LINE_TH}>Product</th>
                <th className={LINE_TH}>HSN</th>
                <th className={`${LINE_TH} text-right`}>Qty</th>
                <th className={`${LINE_TH} text-right`}>Rate</th>
                <th className={`${LINE_TH} text-right`}>Disc %</th>
                <th className={`${LINE_TH} text-right`}>GST %</th>
                <th className={`${LINE_TH} text-right`}>Total</th>
              </tr>
            }
          >
            {creditNote.lineItems?.map((item, index) => {
              const rate = Number(item.rate || 0);
              const disc = Number(item.discountPercent || 0);
              const qty = Number(item.qty || 0);
              const taxable = qty * rate * (1 - disc / 100);
              const tax = taxable * (Number(item.taxPercent || 0) / 100);
              const total = taxable + tax;

              return (
                <LineRow key={index}>
                  <td className={LINE_TD}>
                    <div className="font-semibold">{item.productName || '—'}</div>
                    {item.sku && <div className="mt-0.5 text-xs text-ink-subtle">SKU: {item.sku}</div>}
                  </td>
                  <td className={`${LINE_TD} font-mono text-xs text-ink-muted`}>{item.hsnCode || '—'}</td>
                  <td className={`${LINE_TD} text-right tabular-nums`}>{qty} <span className="text-xs text-ink-subtle">{item.unit || 'pcs'}</span></td>
                  <td className={`${LINE_TD} text-right tabular-nums`}>₹{rate.toFixed(2)}</td>
                  <td className={`${LINE_TD} text-right tabular-nums text-ink-muted`}>{disc}%</td>
                  <td className={`${LINE_TD} text-right tabular-nums text-ink-muted`}>{item.taxPercent ?? 0}%</td>
                  <td className={`${LINE_TD} text-right font-semibold tabular-nums`}>₹{total.toFixed(2)}</td>
                </LineRow>
              );
            })}
          </LineItemsTable>
        </Section>

        {creditNote.notes && (
          <Section title="Notes">
            <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{creditNote.notes}</p>
          </Section>
        )}
      </DocumentLayout>

      {/* ── Delete Modal ── */}
      <ConfirmDialog
        open={deleteModal}
        loading={loading}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Draft Credit Note"
        message="Are you sure you want to delete this draft credit note? This cannot be undone."
      />

      {/* ── Generic Confirm Modal ── */}
      {currentConfirm && (
        <ConfirmDialog
          open={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, type: null })}
          onConfirm={handleConfirmAction}
          title={currentConfirm.title}
          message={currentConfirm.message}
          confirmLabel={currentConfirm.label}
          tone={currentConfirm.tone}
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
      <ToastStack toasts={toasts} />
    </>
  );
}
