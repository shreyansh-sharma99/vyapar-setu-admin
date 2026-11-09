import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CheckCircle2, Edit2, HandCoins, Printer, Trash2 } from 'lucide-react';
import { Alert, Button, ConfirmDialog, DetailList, DocumentLayout, PartyCard, Section, StatusBadge, TotalsPanel, TotalsRow } from '@/components/ui';
import PurchaseToaster from '../components/PurchaseToaster';
import RefundReceivedModal from '../components/RefundReceivedModal';
import LinesTable from '../components/LinesTable';
import { DocTotals } from '../components/Totals';
import { ConfirmModal, PageLoading } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, decId, editPath, errMsg, fmtDate, formatINR, formatQty, methodLabel, num, refId, returnRefundLeft, supplierName, viewPath } from '../components/helpers';
import { cancelPurchaseReturn, confirmPurchaseReturn, deletePurchaseReturn, fetchPurchaseReturn } from './services/purchaseReturnSlice';

export default function PurchaseReturnDetails() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, currentError, saving } = useSelector((state) => state.purchaseReturn);
  const [modal, setModal] = useState(null); // 'confirm' | 'cancel' | 'delete' | 'refund'

  useEffect(() => {
    if (id) dispatch(fetchPurchaseReturn(id));
  }, [dispatch, id]);

  if (!id) return <PageLoading title="Purchase return" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Purchase return" error={currentError} />;

  const ret = current;
  const refundLeft = returnRefundLeft(ret);
  const agreed = ret.agreedAmount === null || ret.agreedAmount === undefined ? num(ret.totalAmount) : num(ret.agreedAmount);

  const run = async (thunk, fallback) => {
    try {
      const res = await dispatch(thunk).unwrap();
      notify(res?.message || fallback);
      setModal(null);
      dispatch(fetchPurchaseReturn(ret._id));
    } catch (e) {
      notifyError(errMsg(e));
    }
  };

  const runDelete = async () => {
    try {
      const res = await dispatch(deletePurchaseReturn(ret._id)).unwrap();
      notify(res?.message || 'Purchase return deleted');
      navigate(PATHS.returns, { replace: true });
    } catch (e) {
      setModal(null);
      notifyError(errMsg(e));
    }
  };

  const columns = [
    { key: 'i', label: '#', render: (_, i) => <span className="text-ink-subtle">{i + 1}</span> },
    {
      key: 'product',
      label: 'Product',
      render: (l) => (
        <div>
          <div className="font-semibold">{l.productName}</div>
          {l.sku && <div className="text-xs text-ink-subtle">SKU {l.sku}</div>}
        </div>
      ),
    },
    { key: 'qty', label: 'Qty', align: 'right', render: (l) => `${formatQty(l.qty)} ${l.unit}` },
    {
      key: 'bucket',
      label: 'From',
      render: (l) => (
        <span className={l.fromBucket === 'damaged' ? 'font-semibold text-danger' : 'text-ink-muted'}>{l.fromBucket === 'damaged' ? 'Damaged stock' : 'Sellable stock'}</span>
      ),
    },
    { key: 'reason', label: 'Reason', render: (l) => l.reason || '—' },
    { key: 'rate', label: 'Rate', align: 'right', render: (l) => formatINR(l.rate) },
    { key: 'taxable', label: 'Taxable', align: 'right', render: (l) => formatINR(l.taxableValue) },
    {
      key: 'gst',
      label: 'GST',
      align: 'right',
      render: (l) => (
        <>
          <div>{formatINR(l.taxAmount)}</div>
          <div className="text-xs text-ink-subtle">{num(l.taxPercent)}%</div>
        </>
      ),
    },
    { key: 'total', label: 'Amount', align: 'right', render: (l) => <span className="font-semibold">{formatINR(l.total)}</span> },
  ];

  const modalCfg = {
    confirm: {
      title: 'Confirm return',
      message: `Confirm ${ret.returnNumber}? The goods will be taken out of stock and ${formatINR(agreed)} will be reduced from what you owe ${supplierName(ret)}.${num(ret.lossAmount) > 0 ? ` ${formatINR(ret.lossAmount)} is booked as a loss.` : ''}`,
      label: 'Confirm return',
      variant: 'primary',
      onConfirm: () => run(confirmPurchaseReturn(ret._id), 'Purchase return confirmed'),
    },
    cancel: {
      title: 'Cancel return',
      message: ret.status === 'confirmed' ? 'The goods will come back into stock and the supplier balance will be restored.' : 'Cancel this draft return?',
      label: 'Cancel return',
      variant: 'danger',
      withReason: true,
      onConfirm: (reason) => run(cancelPurchaseReturn({ id: ret._id, reason }), 'Purchase return cancelled'),
    },
  }[modal];

  const confirmed = ret.status === 'confirmed';

  return (
    <DocumentLayout
      header={{
        title: 'Purchase return',
        docNo: ret.returnNumber,
        description: 'Debit note',
        actions: (
          <>
            <StatusBadge status={ret.status} label={ret.status === 'draft' ? 'Not finished' : undefined} size="md" />
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Button variant="secondary" onClick={() => window.print()} startIcon={<Printer />}>
                Print
              </Button>
              {['draft', 'cancelled'].includes(ret.status) && (
                <Button variant="danger-soft" onClick={() => setModal('delete')} startIcon={<Trash2 />}>
                  Delete
                </Button>
              )}
              {ret.status !== 'cancelled' && !(num(ret.refundReceived) > 0) && (
                <Button variant="secondary" onClick={() => setModal('cancel')} startIcon={<Ban />}>
                  Cancel
                </Button>
              )}
              {ret.status === 'draft' && (
                <>
                  <Button variant="secondary" onClick={() => navigate(editPath('returns', ret._id))} startIcon={<Edit2 />}>
                    Edit
                  </Button>
                  <Button onClick={() => setModal('confirm')} startIcon={<CheckCircle2 />}>
                    Confirm
                  </Button>
                </>
              )}
              {refundLeft > 0 && (
                <Button onClick={() => setModal('refund')} startIcon={<HandCoins />}>
                  Money received?
                </Button>
              )}
            </div>
          </>
        ),
      }}
      summary={
        <>
          <TotalsPanel
            title="Money from the supplier"
            totalLabel="Still to receive"
            total={confirmed ? (refundLeft > 0 ? formatINR(refundLeft) : 'Nothing') : undefined}
            footer={
              confirmed && refundLeft > 0 ? (
                <Button variant="accent" fullWidth className="print:hidden" onClick={() => setModal('refund')} startIcon={<HandCoins />}>
                  Money received?
                </Button>
              ) : null
            }
          >
            <TotalsRow label="Goods value (cost + GST)" value={formatINR(ret.totalAmount)} />
            <TotalsRow label="Supplier gives" value={formatINR(agreed)} bold />
            {num(ret.lossAmount) > 0 && <TotalsRow label="Loss" value={formatINR(ret.lossAmount)} tone="danger" />}
            {confirmed && num(ret.billAdjustedAmount) > 0 && <TotalsRow label="Cut from bill" value={formatINR(ret.billAdjustedAmount)} />}
            {confirmed && num(ret.refundReceived) > 0 && (
              <TotalsRow
                label={`Received${ret.refundReceivedAt ? ` on ${fmtDate(ret.refundReceivedAt)}` : ''}${ret.refundMethod ? ` · ${methodLabel(ret.refundMethod)}` : ''}`}
                value={formatINR(ret.refundReceived)}
              />
            )}
          </TotalsPanel>
          <Section title="Price details">
            <DocTotals doc={ret} />
          </Section>
        </>
      }
    >
      {ret.status === 'cancelled' && (
        <Alert tone="danger" title="This return is cancelled">
          {ret.cancelReason || 'No reason given.'}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Supplier">
          <div className="flex flex-col gap-4">
            <PartyCard
              name={supplierName(ret)}
              sub={ret.supplierSnapshot?.phone}
              actions={
                <Button variant="secondary" size="sm" onClick={() => navigate(viewPath('suppliers', refId(ret.supplierId)))}>
                  View
                </Button>
              }
            />
            <DetailList
              cols={2}
              items={[
                { label: 'GSTIN', value: ret.supplierSnapshot?.gstin || 'Unregistered', mono: !!ret.supplierSnapshot?.gstin },
                { label: 'Phone', value: ret.supplierSnapshot?.phone },
              ]}
            />
          </div>
        </Section>
        <Section title="Return info">
          <DetailList
            cols={2}
            items={[
              { label: 'Return no', value: ret.returnNumber, mono: true },
              { label: 'Date', value: fmtDate(ret.returnDate) },
              ret.purchaseBillId
                ? {
                    label: 'Against bill',
                    value: (
                      <Button variant="link" size="sm" className="font-mono font-semibold" onClick={() => navigate(viewPath('bills', refId(ret.purchaseBillId)))}>
                        {ret.purchaseBillId.billNumber || 'View bill'}
                      </Button>
                    ),
                  }
                : { label: 'Against bill', value: 'None (reduces overall payable)' },
              num(ret.billAdjustedAmount) > 0 && { label: 'Set off on bill', value: formatINR(ret.billAdjustedAmount) },
              { label: 'Created by', value: ret.createdByName },
            ]}
          />
        </Section>
      </div>

      <Section title="Items returned" description={`${(ret.items || []).length} ${(ret.items || []).length === 1 ? 'line' : 'lines'}`} bodyClassName="px-3 sm:px-4">
        <LinesTable columns={columns} rows={ret.items || []} minWidth={720} />
      </Section>

      {ret.notes && (
        <Section title="Notes">
          <p className="m-0 whitespace-pre-wrap text-sm text-ink-muted">{ret.notes}</p>
        </Section>
      )}

      {modalCfg && (
        <ConfirmModal
          open
          title={modalCfg.title}
          message={modalCfg.message}
          confirmLabel={modalCfg.label}
          variant={modalCfg.variant}
          withReason={modalCfg.withReason}
          loading={saving}
          onClose={() => setModal(null)}
          onConfirm={modalCfg.onConfirm}
        />
      )}
      <ConfirmDialog
        open={modal === 'delete'}
        title="Delete purchase return"
        message={`Delete ${ret.returnNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        icon={Trash2}
        loading={saving}
        onClose={() => setModal(null)}
        onConfirm={runDelete}
      />
      {modal === 'refund' && (
        <RefundReceivedModal
          ret={ret}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            dispatch(fetchPurchaseReturn(ret._id));
          }}
        />
      )}
      <PurchaseToaster />
    </DocumentLayout>
  );
}
