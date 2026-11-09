import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Edit2, Check, X, Trash2 } from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import {
  Badge, Button, Card, ConfirmDialog, DetailList, DocumentLayout, LineItemsTable, LineRow, PageHeader, PartyCard, Section,
  SkeletonRows, StatusBadge, ToastStack, TotalsPanel, TotalsRow, LINE_TD, LINE_TH,
} from '@/components/ui';
import {
  getSalesReturnById,
  clearCurrentReturn,
  updateSalesReturnStatus,
  deleteSalesReturn,
  clearReturnToast,
} from './services/salesReturnSlice';
import { firstAddress, customerAddress } from '../components/address';
import { InvoiceDocument } from '@/pages/Invoices/invoiceLayout/components/InvoiceTemplates';
import { docFromReturn } from '@/pages/Invoices/invoiceLayout/components/invoiceDoc';
import { printWidth } from '../salesInvoices/invoiceLayoutPdf';

/** ₹ with two decimals, as this page always showed amounts. */
const rs = (v) => `₹${Number(v || 0).toFixed(2)}`;

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
      <div className="flex flex-col gap-5">
        <PageHeader title="Sales return" />
        <Card>
          <SkeletonRows rows={6} cols={4} />
        </Card>
      </div>
    );
  }

  const confirmConfig = {
    approve: { title: 'Approve Sales Return?', message: 'This will approve the sales return. You cannot edit it after approval.', label: 'Approve', tone: 'primary', icon: Check },
    reject:  { title: 'Reject Sales Return?',  message: 'This will mark the sales return as rejected.',                             label: 'Reject',  tone: 'danger',  icon: X },
  };

  const currentConfirm = confirmModal.type ? confirmConfig[confirmModal.type] : null;

  const billingStr = firstAddress(
    salesReturn.customerSnapshot?.billingAddress,
    salesReturn.salesInvoiceId?.customerSnapshot?.billingAddress,
    customerAddress(salesReturn.customerId),
  );

  const customer = salesReturn.customerSnapshot || {};
  const hasGstSplit = salesReturn.cgstTotal > 0 || salesReturn.sgstTotal > 0 || salesReturn.igstTotal > 0;

  return (
    <>
      <DocumentLayout
        header={{
          title: 'Sales return',
          docNo: salesReturn.returnNumber,
          actions: (
            <>
              <StatusBadge status={salesReturn.status} size="md" />
              {/* Edit (draft only) */}
              {salesReturn.status === 'draft' && (
                <Button variant="secondary" onClick={() => navigate(`/sales/return/edit/${encodeURIComponent(encryptData(salesReturn._id))}`)} startIcon={<Edit2 />}>Edit</Button>
              )}
              {/* Delete (draft and rejected only) */}
              {(salesReturn.status === 'draft' || salesReturn.status === 'rejected') && (
                <Button variant="danger-soft" onClick={() => setDeleteModal(true)} startIcon={<Trash2 />}>Delete</Button>
              )}
              {/* Reject (draft and approved only) */}
              {(salesReturn.status === 'draft' || salesReturn.status === 'approved') && (
                <Button variant="secondary" onClick={() => openConfirm('reject')} startIcon={<X />}>Reject</Button>
              )}
              {/* Approve (draft only) */}
              {salesReturn.status === 'draft' && (
                <Button onClick={() => openConfirm('approve')} startIcon={<Check />}>Approve</Button>
              )}
            </>
          ),
        }}
        summary={
          <TotalsPanel title="Pricing summary" totalLabel="Grand total" total={rs(salesReturn.totalAmount)}>
            <TotalsRow label="Subtotal" value={rs(salesReturn.subtotal)} />
            <TotalsRow label="GST total" value={rs(salesReturn.taxAmount)} />
            {hasGstSplit && salesReturn.cgstTotal > 0 && <TotalsRow label="CGST" value={rs(salesReturn.cgstTotal)} />}
            {hasGstSplit && salesReturn.sgstTotal > 0 && <TotalsRow label="SGST" value={rs(salesReturn.sgstTotal)} />}
            {hasGstSplit && salesReturn.igstTotal > 0 && <TotalsRow label="IGST" value={rs(salesReturn.igstTotal)} />}
            {salesReturn.roundOff !== 0 && <TotalsRow label="Round off" value={rs(salesReturn.roundOff)} />}
          </TotalsPanel>
        }
      >
        <Section title="Return details">
          <div className="flex flex-col gap-5">
            <DetailList
              cols={3}
              items={[
                { label: 'Return number', value: salesReturn.returnNumber, mono: true },
                { label: 'Return date', value: salesReturn.returnDate ? new Date(salesReturn.returnDate).toLocaleDateString('en-IN') : '—' },
                { label: 'Source invoice', value: salesReturn.salesInvoiceId?.invoiceNumber || '—', mono: true },
              ]}
            />
            <PartyCard name={customer.name || 'Walk-in Customer'} sub={[customer.phone, customer.email].filter(Boolean).join(' · ')}>
              <DetailList
                cols={2}
                className="border-t border-line pt-3"
                items={[
                  { label: 'GSTIN', value: customer.gstin, mono: true },
                  { label: 'Billing address', value: billingStr || 'No address specified' },
                ]}
              />
            </PartyCard>
          </div>
        </Section>

        {/* ── Returned Items Table ── */}
        <Section title="Returned items" description={`${salesReturn.lineItems?.length || 0} lines`}>
          <LineItemsTable
            minWidth={680}
            head={
              <tr>
                <th className={LINE_TH}>Product / reason</th>
                <th className={LINE_TH}>HSN</th>
                <th className={`${LINE_TH} text-right`}>Qty</th>
                <th className={`${LINE_TH} text-right`}>Rate</th>
                <th className={`${LINE_TH} text-right`}>Disc.</th>
                <th className={`${LINE_TH} text-right`}>GST</th>
                <th className={LINE_TH}>Condition</th>
                <th className={`${LINE_TH} text-right`}>Total</th>
              </tr>
            }
          >
            {salesReturn.lineItems?.map((item, index) => {
              const rate = Number(item.rate || 0);
              const disc = Number(item.discountPercent || 0);
              const qty = Number(item.qty || 0);
              const taxable = qty * rate * (1 - disc / 100);
              const tax = taxable * (Number(item.taxPercent || 0) / 100);
              const total = taxable + tax;

              return (
                <LineRow key={index}>
                  <td className={LINE_TD}>
                    <div className="font-semibold">{item.productName}</div>
                    {item.returnReason && <div className="mt-0.5 text-xs text-ink-subtle">{item.returnReason}</div>}
                  </td>
                  <td className={`${LINE_TD} font-mono text-ink-muted`}>{item.hsnCode || '—'}</td>
                  <td className={`${LINE_TD} text-right font-semibold tabular-nums`}>{qty}</td>
                  <td className={`${LINE_TD} text-right tabular-nums`}>₹{rate.toFixed(2)}</td>
                  <td className={`${LINE_TD} text-right tabular-nums ${disc > 0 ? 'text-danger' : 'text-ink-subtle'}`}>{disc > 0 ? `${disc}%` : '—'}</td>
                  <td className={`${LINE_TD} text-right tabular-nums`}>{item.taxPercent || 0}%</td>
                  <td className={LINE_TD}>
                    {item.condition === 'damaged' ? (
                      <span title="Moved to damaged stock — not available for sale"><Badge tone="danger">Damaged</Badge></span>
                    ) : (
                      <span title="Returned to sellable stock"><Badge tone="success">Good</Badge></span>
                    )}
                  </td>
                  <td className={`${LINE_TD} text-right font-semibold tabular-nums`}>₹{total.toFixed(2)}</td>
                </LineRow>
              );
            })}
          </LineItemsTable>
        </Section>

        {salesReturn.notes && (
          <Section title="Notes">
            <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{salesReturn.notes}</p>
          </Section>
        )}

        {/* The return, in the same Invoice Layout as its invoice */}
        {salesReturn.print && (
          <Section title="Return document" description="Printed in your invoice layout">
            <div className="overflow-x-auto rounded-control bg-fill p-3 sm:p-6">
              <div className="mx-auto bg-white shadow-card" style={{ width: printWidth(salesReturn.print?.layout?.theme) }}>
                <InvoiceDocument layout={salesReturn.print?.layout || {}} doc={docFromReturn(salesReturn)} />
              </div>
            </div>
          </Section>
        )}
      </DocumentLayout>

      {/* ── Delete Modal ── */}
      <ConfirmDialog
        open={deleteModal}
        loading={loading}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Sales Return"
        message="Are you sure you want to delete this sales return? This cannot be undone."
      />

      {/* ── Status Confirm Modal ── */}
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

      {/* ── Toaster ── */}
      <ToastStack toasts={toasts} />
    </>
  );
}
