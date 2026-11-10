import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Download,
  CreditCard,
  Ban,
  Mail,
  Edit2,
  Check,
  Send,
  MoreHorizontal,
  Printer,
  Trash2,
  Undo2,
} from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import { can } from '@/utility/shopPermissions';
import { formatDate } from '@/utility/dateTiming';
import {
  Alert, Badge, Button, Card, ConfirmDialog, DocumentLayout, DropdownMenu, Field, Input, LineItemsTable, LineRow, Modal,
  PageHeader, Section, Select, SkeletonRows, StatusBadge, Textarea, ToastStack, TotalsPanel, TotalsRow, LINE_TD, LINE_TH,
} from '@/components/ui';
import {
  getSalesInvoiceById,
  clearCurrentSalesInvoice,
  confirmSalesInvoice,
  markSalesInvoicePaid,
  voidSalesInvoice,
  sendPaymentReminder,
  generatePaymentLink,
  clearSalesInvoiceToast,
  deletePaymentIn,
} from './services/salesInvoiceSlice';
import { InvoiceDocument } from '@/pages/Invoices/invoiceLayout/components/InvoiceTemplates';
import { docFromInvoice, inr } from '@/pages/Invoices/invoiceLayout/components/invoiceDoc';
import { downloadInvoiceLayoutPdf, printInvoiceLayout, printWidth } from './invoiceLayoutPdf';
import { downloadReceiptPdf } from './receiptPdf';
import { PAYMENT_METHOD_LABELS } from './paymentMethods';
import ServiceProductsPanel from './ServiceProductsPanel';

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }));

/** Today as YYYY-MM-DD in the user's time zone (default receipt date). */
const todayISO = () => new Date().toLocaleDateString('en-CA');
const EMPTY_PAYMENT = { isOpen: false, amount: 0, paymentDate: '', method: 'cash', reference: '', notes: '' };

export default function SalesInvoiceDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentInvoice, loading, toast: reduxToast } = useSelector((state) => state.salesInvoice);
  const { user } = useSelector((state) => state.auth || {});
  const [toasts, setToasts] = useState([]);

  // Modals
  const [paymentModal, setPaymentModal] = useState(EMPTY_PAYMENT);
  const [voidModal, setVoidModal] = useState({ isOpen: false, reason: '' });
  const [deleteReceipt, setDeleteReceipt] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(null);

  // The receipt API is a PATCH on the invoice (server checks sales.update); delete is DELETE /payments-in.
  const canTakeReceipt = can(user, 'sales', 'update');
  const canDeleteReceipt = can(user, 'sales', 'delete');
  const canReturn = can(user, 'sales', 'create');
  const canEditDraft = can(user, 'sales', 'update');

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

  // Print the bill: the same pages as Download PDF, straight to the print dialog
  const [printBusy, setPrintBusy] = useState(false);
  const handlePrint = async () => {
    if (!currentInvoice || printBusy) return;
    setPrintBusy(true);
    try {
      await printInvoiceLayout({ invoice: currentInvoice });
    } catch {
      showToast('Could not open the print dialog.', 'danger');
    } finally {
      setPrintBusy(false);
    }
  };

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
      paymentDate: todayISO(),
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
    if (Number(paymentModal.amount) > Number(currentInvoice.balanceAmount) + 0.001) {
      showToast(`Amount cannot be more than the balance (${inr(currentInvoice.balanceAmount)}).`, 'danger');
      return;
    }
    dispatch(
      markSalesInvoicePaid({
        id: currentInvoice._id,
        payload: {
          amount: Number(paymentModal.amount),
          paymentDate: paymentModal.paymentDate || todayISO(),
          paymentMethod: paymentModal.method,
          reference: paymentModal.reference,
          notes: paymentModal.notes,
        },
      })
    );
    setPaymentModal(EMPTY_PAYMENT);
  };

  const handlePrintReceipt = async (receipt) => {
    if (receiptBusy) return;
    setReceiptBusy(receipt._id);
    try {
      await downloadReceiptPdf({ invoice: currentInvoice, receipt });
    } catch {
      showToast('Failed to download the receipt.', 'danger');
    } finally {
      setReceiptBusy(null);
    }
  };

  const handleConfirmDeleteReceipt = () => {
    if (!deleteReceipt) return;
    dispatch(deletePaymentIn(deleteReceipt._id));
    setDeleteReceipt(null);
  };

  const handleReturnClick = () => {
    if (!currentInvoice) return;
    navigate('/sales/return/create', { state: { invoiceId: currentInvoice._id } });
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
    dispatch(sendPaymentReminder({ id: currentInvoice._id, invoice: currentInvoice }));
  };

  const handleGeneratePaymentLinkClick = () => {
    if (!currentInvoice) return;
    dispatch(generatePaymentLink(currentInvoice._id));
  };

  if (loading || !currentInvoice) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Sales invoice" />
        <Card>
          <SkeletonRows rows={6} cols={4} />
        </Card>
      </div>
    );
  }

  const canPay = ['unpaid', 'partially_paid'].includes(currentInvoice.status);
  // Settings → Sales return days: after the window there is no return and no void.
  const windowOpen = currentInvoice.canReturn !== false;
  // A return already made against this invoice: no second Return, show "Product returned" instead
  const invoiceReturns = currentInvoice.returns || [];
  const canStartReturn = windowOpen && invoiceReturns.length === 0 && ['unpaid', 'partially_paid', 'paid'].includes(currentInvoice.status);
  const receipts = currentInvoice.paymentHistory || [];

  const moreItems = [
    currentInvoice.status === 'unpaid' && { label: 'Send reminder', icon: Mail, onClick: handleSendReminderClick },
    currentInvoice.status === 'unpaid' && { label: 'Payment link', icon: Send, onClick: handleGeneratePaymentLinkClick },
    currentInvoice.status === 'unpaid' && windowOpen && { divider: true },
    currentInvoice.status === 'unpaid' && windowOpen && { label: 'Void invoice', icon: Ban, danger: true, onClick: handleVoidClick },
  ].filter(Boolean);

  return (
    <>
      <DocumentLayout
        header={{
          title: 'Sales invoice',
          docNo: currentInvoice.invoiceNumber,
          actions: (
            <>
              <StatusBadge status={currentInvoice.status} size="md" />
              {currentInvoice.invoiceType && <Badge tone="neutral" size="md">{currentInvoice.invoiceType}</Badge>}
              <Button variant="secondary" onClick={handlePrint} loading={printBusy} startIcon={<Printer />}>
                {printBusy ? 'Preparing…' : 'Print'}
              </Button>
              <Button variant="secondary" onClick={handleDownloadPdf} loading={pdfBusy} startIcon={<Download />}>
                {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
              </Button>
              {currentInvoice.status === 'draft' && (
                <>
                  <Button variant="secondary" onClick={handleEditClick} startIcon={<Edit2 />}>Edit</Button>
                  <Button onClick={handleConfirmInvoice} startIcon={<Check />}>Confirm Invoice</Button>
                </>
              )}
              {canStartReturn && canReturn && (
                <Button variant="secondary" onClick={handleReturnClick} startIcon={<Undo2 />}>Return</Button>
              )}
              {canPay && canTakeReceipt && (
                <Button onClick={handleMarkPaidClick} startIcon={<CreditCard />}>Receipt</Button>
              )}
              {moreItems.length > 0 && (
                <DropdownMenu
                  items={moreItems}
                  trigger={<Button variant="secondary" size="icon" aria-label="More actions"><MoreHorizontal /></Button>}
                />
              )}
            </>
          ),
        }}
        summary={
          <TotalsPanel title="Payment" totalLabel="Balance" total={inr(currentInvoice.balanceAmount)}>
            <TotalsRow label="Invoice total" value={inr(currentInvoice.totalAmount)} />
            <TotalsRow label="Paid" value={inr(currentInvoice.paidAmount)} />
            {receipts.length > 0 && <TotalsRow label="Receipts" value={receipts.length} />}
          </TotalsPanel>
        }
      >
        {!windowOpen && ['unpaid', 'partially_paid', 'paid'].includes(currentInvoice.status) && currentInvoice.returnWindowEndsAt && (
          <Alert tone="neutral">
            Return window closed on {formatDate(currentInvoice.returnWindowEndsAt)}. Issue a credit note for any correction.
          </Alert>
        )}

        {(currentInvoice.customFields || []).length > 0 && (
          <Alert tone="neutral" title="Bill details">
            {currentInvoice.customFields.map((f) => <div key={f.key}><b>{f.label}:</b> {f.value}</div>)}
          </Alert>
        )}

        {(currentInvoice.lineItems || []).some((l) => l.consumedItems?.length > 0) && (
          <Alert tone="neutral" title="Goods used in services (not on the bill)">
            {currentInvoice.lineItems.filter((l) => l.consumedItems?.length > 0).map((l, i) => (
              <div key={i}>
                <b>{l.productName}:</b>{' '}
                {l.consumedItems.map((e) => `${e.productName} ${e.qty} ${e.unit}${e.shortQty > 0 ? ` (${e.shortQty} short)` : ''}`).join(', ')}
              </div>
            ))}
          </Alert>
        )}

        {currentInvoice.voidReason && (
          <Alert tone="danger" title="Void reason">{currentInvoice.voidReason}</Alert>
        )}

        {invoiceReturns.length > 0 && (
          <Alert tone="warning" title="Product returned">
            {invoiceReturns.map((r) => (
              <div key={r._id}>
                <Button
                  variant="link"
                  className="font-mono"
                  onClick={() => navigate(`/sales/return/view/${encodeURIComponent(encryptData(r._id))}`)}
                >
                  {r.returnNumber}
                </Button>
                {' '}· {formatDate(r.returnDate)} · {r.status === 'draft' ? 'Draft' : 'Approved'} · {inr(r.totalAmount)}
                {' — '}
                {(r.lineItems || []).map((l) => `${l.productName} × ${l.qty}`).join(', ')}
              </div>
            ))}
          </Alert>
        )}

        {/* Receipts taken against this invoice */}
        {receipts.length > 0 && (
          <Section title="Receipts" description={`${receipts.length} taken against this invoice`}>
            <LineItemsTable
              minWidth={620}
              head={
                <tr>
                  <th className={LINE_TH}>Receipt No</th>
                  <th className={LINE_TH}>Date</th>
                  <th className={LINE_TH}>Mode</th>
                  <th className={LINE_TH}>Reference</th>
                  <th className={`${LINE_TH} text-right`}>Amount</th>
                  <th className={`${LINE_TH} text-right`}>Actions</th>
                </tr>
              }
            >
              {receipts.map((r) => (
                <LineRow key={r._id}>
                  <td className={`${LINE_TD} font-mono font-semibold`}>{r.receiptNumber}</td>
                  <td className={LINE_TD}>{formatDate(r.paymentDate)}</td>
                  <td className={LINE_TD}>{PAYMENT_METHOD_LABELS[r.paymentMethod] || r.paymentMethod}</td>
                  <td className={`${LINE_TD} text-ink-muted`}>{r.reference || '—'}</td>
                  <td className={`${LINE_TD} text-right font-semibold tabular-nums`}>{inr(r.amount)}</td>
                  <td className={`${LINE_TD} py-2`}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Print receipt"
                        aria-label="Print receipt"
                        onClick={() => handlePrintReceipt(r)}
                        loading={receiptBusy === r._id}
                      >
                        <Printer />
                      </Button>
                      {canDeleteReceipt && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete receipt"
                          aria-label="Delete receipt"
                          className="text-danger hover:text-danger"
                          onClick={() => setDeleteReceipt(r)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </td>
                </LineRow>
              ))}
            </LineItemsTable>
          </Section>
        )}

        <ServiceProductsPanel
          invoice={currentInvoice}
          canEdit={canEditDraft}
          canReturn={canStartReturn && canReturn}
          onReturn={(line) => navigate('/sales/return/create', { state: { invoiceId: currentInvoice._id, lineIndex: currentInvoice.lineItems.indexOf(line) } })}
          onSaved={(message) => {
            showToast(message);
            dispatch(getSalesInvoiceById(id));
          }}
          onError={(message) => showToast(message, 'danger')}
        />

        {/* The invoice, in the design chosen in Sales → Invoice Layout */}
        <Section title="Invoice" description="As your customer sees it">
          <div className="overflow-x-auto rounded-control bg-fill p-3 sm:p-6">
            <div className="mx-auto bg-white shadow-card" style={{ width: printWidth(currentInvoice.print?.layout?.theme) }}>
              {printDoc && <InvoiceDocument layout={currentInvoice.print?.layout || {}} doc={printDoc} />}
            </div>
          </div>
        </Section>
      </DocumentLayout>

      {/* Receipt */}
      <Modal
        open={paymentModal.isOpen}
        onClose={() => setPaymentModal(EMPTY_PAYMENT)}
        title="Receipt"
        subtitle={`Invoice ${currentInvoice.invoiceNumber} · Balance ${inr(currentInvoice.balanceAmount)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentModal(EMPTY_PAYMENT)}>Cancel</Button>
            <Button type="submit" form="si-receipt-form">Save Receipt</Button>
          </>
        }
      >
        <form id="si-receipt-form" onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
          <Field label="Receipt date" required>
            <Input
              type="date"
              required
              max={todayISO()}
              value={paymentModal.paymentDate}
              onChange={(e) => setPaymentModal({ ...paymentModal, paymentDate: e.target.value })}
            />
          </Field>
          <Field label="Payment method">
            <Select
              searchable={false}
              value={paymentModal.method}
              onChange={(v) => setPaymentModal({ ...paymentModal, method: v })}
              options={PAYMENT_OPTIONS}
            />
          </Field>
          <Field label="Payment amount (₹)" required>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={currentInvoice.balanceAmount}
              required
              value={paymentModal.amount}
              onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })}
              className="text-right tabular-nums"
            />
          </Field>
          <Field label="Reference / Txn ID">
            <Input
              placeholder="Optional reference number"
              value={paymentModal.reference}
              onChange={(e) => setPaymentModal({ ...paymentModal, reference: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              rows={2}
              placeholder="Notes..."
              value={paymentModal.notes}
              onChange={(e) => setPaymentModal({ ...paymentModal, notes: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      {/* Void invoice */}
      <Modal
        open={voidModal.isOpen}
        onClose={() => setVoidModal({ isOpen: false, reason: '' })}
        title="Void sales invoice"
        subtitle={currentInvoice?.deliveryChallanId
          ? 'This invoice was made from a delivery challan. Voiding it puts that stock back.'
          : 'This will void the invoice and inventory changes.'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVoidModal({ isOpen: false, reason: '' })}>Cancel</Button>
            <Button type="submit" form="si-void-form" variant="danger">Void Invoice</Button>
          </>
        }
      >
        <form id="si-void-form" onSubmit={handleVoidSubmit}>
          <Field label="Reason for voiding" required>
            <Textarea
              required
              rows={3}
              placeholder="Enter reason (min. 3 characters)..."
              value={voidModal.reason}
              onChange={(e) => setVoidModal({ ...voidModal, reason: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteReceipt}
        onClose={() => setDeleteReceipt(null)}
        onConfirm={handleConfirmDeleteReceipt}
        title="Delete receipt"
        message={deleteReceipt ? `Delete receipt ${deleteReceipt.receiptNumber} of ${inr(deleteReceipt.amount)}? The invoice balance and the customer ledger go back by this amount.` : ''}
      />

      <ToastStack toasts={toasts} />
    </>
  );
}
