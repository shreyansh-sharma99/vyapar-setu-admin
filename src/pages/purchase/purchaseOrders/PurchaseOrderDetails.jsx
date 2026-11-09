import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CheckCircle2, Edit2, IndianRupee, PackageCheck, Printer, Trash2, Undo2 } from 'lucide-react';
import { Alert, Badge, Button, ConfirmDialog, DetailList, DocumentLayout, PartyCard, Section, StatusBadge, TotalsPanel } from '@/components/ui';
import PurchaseToaster from '../components/PurchaseToaster';
import LinesTable from '../components/LinesTable';
import PayBillPanel from '../components/PayBillPanel';
import { DocTotals } from '../components/Totals';
import { stockInDetailColumns } from '../components/stockInColumns';
import { PageLoading } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, decId, editPath, errMsg, fmtDate, formatINR, formatQty, methodLabel, num, refId, supplierName, viewPath } from '../components/helpers';
import { cancelPurchaseOrder, deletePurchaseOrder, fetchPurchaseOrder, setPurchaseOrderStatus } from './services/purchaseOrderSlice';

/** Draft, or an old "sent" order with nothing received yet — both can still be edited and received. */
const isOpenDraft = (po) => po.status === 'draft' || (po.status === 'sent' && !po.purchaseBillId && (po.items || []).every((i) => !(num(i.receivedQty) > 0)));

export default function PurchaseOrderDetails() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, currentError, saving } = useSelector((state) => state.purchaseOrder);
  const [modal, setModal] = useState(null); // 'cancel' | 'close'
  const [showDelete, setShowDelete] = useState(false);
  const [showPay, setShowPay] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchPurchaseOrder(id));
  }, [dispatch, id]);

  if (!id) return <PageLoading title="Purchase" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Purchase" error={currentError} />;

  const po = current;
  const bill = po.bill || null;
  const draft = isOpenDraft(po);
  const received = po.status === 'received' && !!bill;
  const billOpen = received && ['unpaid', 'partially_paid'].includes(bill.status) && num(bill.balanceAmount) > 0;
  // a bill's products are returned once (the server refuses a second return)
  const doneReturns = (bill?.returns || []).filter((r) => r.status !== 'cancelled');
  const reload = () => dispatch(fetchPurchaseOrder(po._id));

  const runCancel = async () => {
    try {
      const res = await dispatch(cancelPurchaseOrder({ id: po._id })).unwrap();
      notify(res?.message || 'Purchase cancelled');
      setModal(null);
      reload();
    } catch (e) {
      setModal(null);
      notifyError(errMsg(e));
    }
  };

  const runClose = async () => {
    try {
      const res = await dispatch(setPurchaseOrderStatus({ id: po._id, status: 'closed' })).unwrap();
      notify(res?.message || 'Purchase closed');
      setModal(null);
      reload();
    } catch (e) {
      notifyError(errMsg(e));
    }
  };

  const runDelete = async () => {
    try {
      const res = await dispatch(deletePurchaseOrder(po._id)).unwrap();
      notify(res?.message || 'Purchase deleted');
      navigate(PATHS.orders, { replace: true });
    } catch (e) {
      setShowDelete(false);
      notifyError(errMsg(e));
    }
  };

  const returnProducts = () => navigate(`${PATHS.returns}/create`, { state: { supplierId: refId(po.supplierId), purchaseBillId: po.purchaseBillId } });

  const link = (kind, docId, text) => (
    <Button variant="link" size="sm" className="font-mono font-semibold" onClick={() => navigate(viewPath(kind, docId))}>
      {text}
    </Button>
  );

  const columns = [
    { key: 'i', label: '#', render: (_, i) => <span className="text-ink-subtle">{i + 1}</span> },
    {
      key: 'product',
      label: 'Product',
      render: (l) => (
        <div className="min-w-[180px]">
          <div className="font-semibold">{l.productName}</div>
          <div className="text-xs text-ink-subtle">{[l.sku && `SKU ${l.sku}`, l.hsnCode && `HSN ${l.hsnCode}`].filter(Boolean).join(' · ')}</div>
        </div>
      ),
    },
    { key: 'qty', label: 'Qty', align: 'right', render: (l) => `${formatQty(l.qty)} ${l.unit}` },
    ...stockInDetailColumns(po.items),
    {
      key: 'rate',
      label: 'Rate',
      align: 'right',
      render: (l) => (
        <>
          <div>{formatINR(l.rate)}</div>
          {num(l.discountPercent) > 0 && <div className="text-xs text-ink-subtle">{l.discountPercent}% off</div>}
        </>
      ),
    },
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

  const paymentColumns = [
    { key: 'no', label: 'Payment no', render: (p) => link('payments', p._id, p.paymentNumber) },
    { key: 'date', label: 'Paid on', render: (p) => fmtDate(p.paymentDate) },
    { key: 'method', label: 'How', render: (p) => methodLabel(p.paymentMethod) },
    { key: 'amount', label: 'Amount', align: 'right', render: (p) => <span className="font-semibold">{formatINR(p.amount)}</span> },
  ];
  const returnColumns = [
    { key: 'no', label: 'Return', render: (r) => link('returns', r._id, r.returnNumber) },
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.returnDate) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatINR(r.totalAmount) },
  ];

  const cancelMessage = received
    ? `Cancel ${po.poNumber}? The goods it added are taken out of stock and bill ${bill.billNumber} is cancelled, so the supplier balance goes back. Not possible while a payment or return is recorded on the bill.`
    : `Cancel ${po.poNumber}? Nothing was received, so no stock or balance changes.`;

  const snap = po.supplierSnapshot || {};

  return (
    <div className="flex flex-col gap-5">
      <DocumentLayout
        header={{
          title: 'Purchase',
          docNo: po.poNumber,
          actions: (
            <>
              <StatusBadge status={po.status} size="md" />
              {doneReturns.length > 0 && (
                <Badge tone="warning" size="md" icon={Undo2}>
                  Products returned · {doneReturns.map((r) => r.returnNumber).join(', ')}
                </Badge>
              )}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <Button variant="secondary" onClick={() => window.print()} startIcon={<Printer />}>
                  Print
                </Button>
                {['draft', 'cancelled'].includes(po.status) && (
                  <Button variant="danger-soft" onClick={() => setShowDelete(true)} startIcon={<Trash2 />}>
                    Delete
                  </Button>
                )}
                {(draft || received) && (
                  <Button variant="secondary" onClick={() => setModal('cancel')} startIcon={<Ban />}>
                    Cancel
                  </Button>
                )}
                {po.status === 'partially_received' && (
                  <Button variant="secondary" onClick={() => setModal('close')} startIcon={<CheckCircle2 />}>
                    Close
                  </Button>
                )}
                {received && bill.status !== 'cancelled' && doneReturns.length === 0 && (
                  <Button variant="secondary" onClick={returnProducts} startIcon={<Undo2 />}>
                    Return Products
                  </Button>
                )}
                {draft && (
                  <>
                    <Button variant="secondary" onClick={() => navigate(editPath('orders', po._id))} startIcon={<Edit2 />}>
                      Edit
                    </Button>
                    <Button onClick={() => navigate(editPath('orders', po._id))} startIcon={<PackageCheck />}>
                      Receive
                    </Button>
                  </>
                )}
                {billOpen && (
                  <Button onClick={() => setShowPay((v) => !v)} startIcon={<IndianRupee />}>
                    Pay Supplier
                  </Button>
                )}
              </div>
            </>
          ),
        }}
        summary={
          <>
            {billOpen && showPay && (
              <div className="print:hidden">
                <PayBillPanel
                  key={`${bill._id}-${bill.balanceAmount}`}
                  bill={bill}
                  title="Pay supplier"
                  onPaid={() => {
                    setShowPay(false);
                    reload();
                  }}
                />
              </div>
            )}
            <TotalsPanel title="Order summary" totalLabel="Total (incl. GST)" total={formatINR(po.totalAmount)}>
              <DocTotals doc={po} showTotal={false} />
            </TotalsPanel>
          </>
        }
      >
        {po.status === 'partially_received' && (
          <Alert tone="info" title="Old purchase">
            Received with goods receipts. It can only be closed.
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Section title="Supplier">
            <div className="flex flex-col gap-4">
              <PartyCard
                name={supplierName(po)}
                sub={snap.companyName || snap.phone}
                actions={
                  <Button variant="secondary" size="sm" onClick={() => navigate(viewPath('suppliers', po.supplierId?._id || po.supplierId))}>
                    View
                  </Button>
                }
              />
              <DetailList
                cols={2}
                items={[
                  { label: 'Phone', value: snap.phone },
                  { label: 'GSTIN', value: snap.gstin || 'Unregistered', mono: !!snap.gstin },
                  { label: 'Address', value: snap.address, wide: true },
                ]}
              />
            </div>
          </Section>
          <Section title="Purchase info">
            <DetailList
              cols={2}
              items={[
                { label: 'PO number', value: po.poNumber, mono: true },
                { label: 'Purchase date', value: fmtDate(po.poDate) },
                { label: 'Expected delivery', value: fmtDate(po.expectedDate) },
                { label: 'Supplier invoice', value: [po.supplierInvoiceNo, po.supplierInvoiceDate && fmtDate(po.supplierInvoiceDate)].filter(Boolean).join(' · ') },
                { label: 'Created by', value: po.createdByName },
                { label: 'Created on', value: fmtDate(po.createdAt) },
              ]}
            />
          </Section>
        </div>
      </DocumentLayout>

      <Section title="Items" description={`${(po.items || []).length} ${(po.items || []).length === 1 ? 'line' : 'lines'}`} bodyClassName="px-3 sm:px-4">
        <LinesTable columns={columns} rows={po.items || []} minWidth={900} />
      </Section>

      {bill && (
        <Section title="Bill & payments" bodyClassName="flex flex-col gap-4">
          <DetailList
            cols={4}
            items={[
              { label: 'Bill', value: link('bills', bill._id, bill.billNumber) },
              { label: 'Total', value: formatINR(bill.totalAmount) },
              { label: 'Paid', value: formatINR(bill.paidAmount), tone: num(bill.paidAmount) > 0 ? 'success' : undefined },
              { label: 'Balance', value: formatINR(bill.balanceAmount), tone: num(bill.balanceAmount) > 0 ? 'danger' : undefined },
            ]}
          />
          {bill.status === 'cancelled' && <Alert tone="danger">This bill is cancelled.</Alert>}
          {num(bill.adjustedAmount) > 0 && <Alert tone="neutral">{formatINR(bill.adjustedAmount)} was cut from the bill by returns.</Alert>}
          <LinesTable columns={paymentColumns} rows={bill.payments || []} minWidth={480} emptyText="No payment yet." />
          {(bill.returns || []).length > 0 && <LinesTable columns={returnColumns} rows={bill.returns} minWidth={480} />}
        </Section>
      )}

      {(po.notes || po.terms) && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {po.notes && (
            <Section title="Notes">
              <p className="m-0 whitespace-pre-wrap text-sm text-ink-muted">{po.notes}</p>
            </Section>
          )}
          {po.terms && (
            <Section title="Terms & conditions">
              <p className="m-0 whitespace-pre-wrap text-sm text-ink-muted">{po.terms}</p>
            </Section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={modal === 'cancel'}
        title="Cancel purchase"
        message={cancelMessage}
        confirmLabel="Cancel purchase"
        cancelLabel="Go back"
        tone="danger"
        icon={Ban}
        loading={saving}
        onClose={() => setModal(null)}
        onConfirm={runCancel}
      />
      <ConfirmDialog
        open={modal === 'close'}
        title="Close purchase"
        message="Stop waiting for the remaining quantity? The purchase will be closed."
        confirmLabel="Close purchase"
        cancelLabel="Go back"
        tone="primary"
        icon={CheckCircle2}
        loading={saving}
        onClose={() => setModal(null)}
        onConfirm={runClose}
      />
      <ConfirmDialog
        open={showDelete}
        title="Delete purchase"
        message={`Delete ${po.poNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        icon={Trash2}
        loading={saving}
        onClose={() => setShowDelete(false)}
        onConfirm={runDelete}
      />
      <PurchaseToaster />
    </div>
  );
}
