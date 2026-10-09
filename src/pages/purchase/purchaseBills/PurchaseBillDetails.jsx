import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CheckCircle2, Edit2, IndianRupee, Printer, Trash2, Undo2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import LinesTable from '../components/LinesTable';
import { DocTotals } from '../components/Totals';
import { ConfirmModal, InfoRow, PageLoading, PageShell, Section, StatusBadge } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, daysPast, decId, editPath, errMsg, fmtDate, formatINR, formatQty, isOverdue, methodLabel, num, refId, storeName, supplierName, viewPath } from '../components/helpers';
import { cancelPurchaseBill, confirmPurchaseBill, deletePurchaseBill, fetchPurchaseBill } from './services/purchaseBillSlice';

export default function PurchaseBillDetails() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, currentError, saving } = useSelector((state) => state.purchaseBill);
  const [modal, setModal] = useState(null); // 'confirm' | 'cancel' | 'delete'

  useEffect(() => {
    if (id) dispatch(fetchPurchaseBill(id));
  }, [dispatch, id]);

  if (!id) return <PageLoading title="Purchase bill" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Purchase bill" error={currentError} />;

  const bill = current;
  const open = ['unpaid', 'partially_paid'].includes(bill.status);
  const overdue = open && isOverdue(bill.dueDate, bill.balanceAmount);
  const hasMoneyAgainst = num(bill.paidAmount) > 0 || num(bill.adjustedAmount) > 0;

  const run = async (thunk, fallback) => {
    try {
      const res = await dispatch(thunk).unwrap();
      notify(res?.message || fallback);
      setModal(null);
      dispatch(fetchPurchaseBill(bill._id));
    } catch (e) {
      notifyError(errMsg(e));
    }
  };

  const runDelete = async () => {
    try {
      const res = await dispatch(deletePurchaseBill(bill._id)).unwrap();
      notify(res?.message || 'Bill deleted');
      navigate(PATHS.bills, { replace: true });
    } catch (e) {
      setModal(null);
      notifyError(errMsg(e));
    }
  };

  const recordPayment = () =>
    navigate(`${PATHS.payments}/create`, { state: { supplierId: refId(bill.supplierId), purchaseBillId: bill._id, amount: bill.balanceAmount } });
  const returnGoods = () =>
    navigate(`${PATHS.returns}/create`, { state: { supplierId: refId(bill.supplierId), storeId: refId(bill.storeId), purchaseBillId: bill._id } });

  const link = (kind, docId, text) => (
    <button type="button" onClick={() => navigate(viewPath(kind, docId))} className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
      {text}
    </button>
  );

  const columns = [
    { key: 'i', label: '#', render: (_, i) => i + 1 },
    {
      key: 'product',
      label: 'Product',
      render: (l) => (
        <div>
          <div className="font-medium">{l.productName}</div>
          <div className="text-[11px] text-[var(--vs-text-secondary)]">
            {l.hsnCode ? `HSN ${l.hsnCode}` : ''}
          </div>
        </div>
      ),
    },
    { key: 'qty', label: 'Qty', align: 'right', render: (l) => `${formatQty(l.qty)} ${l.unit}` },
    { key: 'rate', label: 'Rate', align: 'right', render: (l) => formatINR(l.rate) },
    { key: 'disc', label: 'Disc', align: 'right', render: (l) => (num(l.discountAmount) ? formatINR(l.discountAmount) : '—') },
    { key: 'taxable', label: 'Taxable', align: 'right', render: (l) => formatINR(l.taxableValue) },
    {
      key: 'gst',
      label: 'GST',
      align: 'right',
      render: (l) => (
        <div>
          <div>{formatINR(l.taxAmount)}</div>
          <div className="text-[11px] text-[var(--vs-text-secondary)]">
            {num(l.taxPercent)}%{bill.isInterState ? ' IGST' : ` (${num(l.taxPercent) / 2}% + ${num(l.taxPercent) / 2}%)`}
          </div>
        </div>
      ),
    },
    { key: 'total', label: 'Amount', align: 'right', render: (l) => <span className="font-semibold">{formatINR(l.total)}</span> },
    {
      key: 'landed',
      label: 'Landed cost / unit',
      align: 'right',
      render: (l) => (
        <span title="Cost per base unit used for stock valuation (taxable value + share of other charges, + GST if no input credit)">
          {formatINR(l.landedUnitCost)}
          {typeof l.productId === 'object' && l.productId?.unit ? <span className="text-[11px] text-[var(--vs-text-secondary)]"> /{l.productId.unit}</span> : null}
        </span>
      ),
    },
  ];

  const paymentColumns = [
    { key: 'no', label: 'Payment', render: (p) => link('payments', p._id, p.paymentNumber) },
    { key: 'date', label: 'Date', render: (p) => fmtDate(p.paymentDate) },
    { key: 'method', label: 'Method', render: (p) => methodLabel(p.paymentMethod) },
    { key: 'ref', label: 'Reference', render: (p) => p.reference || '—' },
    { key: 'amt', label: 'Applied to this bill', align: 'right', render: (p) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(p.amount)}</span> },
  ];

  const returnColumns = [
    { key: 'no', label: 'Return', render: (r) => link('returns', r._id, r.returnNumber) },
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.returnDate) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'total', label: 'Return value', align: 'right', render: (r) => formatINR(r.totalAmount) },
    { key: 'adj', label: 'Set off on bill', align: 'right', render: (r) => formatINR(r.billAdjustedAmount) },
  ];

  const modalCfg = {
    confirm: {
      title: 'Confirm bill',
      message: `Confirm ${bill.billNumber}? It will be added to what you owe ${supplierName(bill)}${bill.updateStock && !bill.grnIds?.length ? ' and the goods will be added to stock' : ''}.`,
      label: 'Confirm bill',
      variant: 'primary',
      onConfirm: () => run(confirmPurchaseBill(bill._id), 'Bill confirmed'),
    },
    cancel: {
      title: 'Cancel bill',
      message: hasMoneyAgainst
        ? 'Payments or returns are recorded against this bill. Cancel those first.'
        : `Cancel ${bill.billNumber}?${bill.stockPosted ? ' The goods added by this bill will be taken out of stock.' : ''}${bill.grnIds?.length ? ' The linked goods receipts become unbilled again.' : ''}`,
      label: 'Cancel bill',
      variant: 'danger',
      withReason: true,
      onConfirm: (reason) => run(cancelPurchaseBill({ id: bill._id, reason }), 'Bill cancelled'),
    },
  }[modal];

  return (
    <PageShell title={`Bill ${bill.billNumber}`} description={bill.supplierBillNo ? `Supplier bill no. ${bill.supplierBillNo}` : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vs-border)] pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={bill.status} size="lg" />
          {overdue && <StatusBadge status="overdue" label={`Overdue by ${daysPast(bill.dueDate)} days`} size="lg" />}
          {bill.stockPosted && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Stock added by this bill</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {bill.status === 'draft' && (
            <>
              <Button size="sm" onClick={() => setModal('confirm')} startIcon={<CheckCircle2 className="w-4 h-4" />}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(editPath('bills', bill._id))} startIcon={<Edit2 className="w-4 h-4" />}>
                Edit
              </Button>
            </>
          )}
          {open && num(bill.balanceAmount) > 0 && (
            <Button size="sm" onClick={recordPayment} startIcon={<IndianRupee className="w-4 h-4" />}>
              Record payment
            </Button>
          )}
          {['unpaid', 'partially_paid', 'paid'].includes(bill.status) && (
            <Button size="sm" variant="outline" onClick={returnGoods} startIcon={<Undo2 className="w-4 h-4" />}>
              Return goods
            </Button>
          )}
          {bill.status !== 'cancelled' && bill.status !== 'draft' && (
            <Button size="sm" variant="outline" onClick={() => setModal('cancel')} disabled={hasMoneyAgainst} title={hasMoneyAgainst ? 'Cancel the payments and returns on this bill first' : ''} startIcon={<Ban className="w-4 h-4" />}>
              Cancel
            </Button>
          )}
          {['draft', 'cancelled'].includes(bill.status) && (
            <Button size="sm" variant="danger" onClick={() => setModal('delete')} startIcon={<Trash2 className="w-4 h-4" />}>
              Delete
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()} startIcon={<Printer className="w-4 h-4" />}>
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Supplier" bodyClassName="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">{link('suppliers', refId(bill.supplierId), supplierName(bill))}</div>
              <InfoRow label="GSTIN" value={bill.supplierSnapshot?.gstin || 'Unregistered'} mono />
              <InfoRow label="Phone" value={bill.supplierSnapshot?.phone} />
              <div className="sm:col-span-2">
                <InfoRow label="Address" value={bill.supplierSnapshot?.address} />
              </div>
            </Section>
            <Section title="Bill info" bodyClassName="p-4 grid grid-cols-2 gap-3">
              <InfoRow label="Our bill no" value={bill.billNumber} mono />
              <InfoRow label="Supplier bill no" value={bill.supplierBillNo || '—'} mono />
              <InfoRow label="Bill date" value={fmtDate(bill.billDate)} />
              <InfoRow label="Due date" value={fmtDate(bill.dueDate)} />
              <InfoRow label="Store" value={storeName(bill)} />
              <InfoRow label="Input tax credit" value={bill.itcEligible ? 'Eligible' : 'Not eligible (unregistered supplier)'} />
              {bill.purchaseOrderId && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--vs-text-secondary)]">Purchase order</span>
                  {link('orders', refId(bill.purchaseOrderId), bill.purchaseOrderId?.poNumber || 'View')}
                </div>
              )}
              {bill.grnIds?.length > 0 && (
                <div className="flex flex-col col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--vs-text-secondary)]">Goods receipts</span>
                  <div className="flex flex-wrap gap-2">
                    {bill.grnIds.map((g) => (
                      <span key={refId(g)}>{link('receipts', refId(g), g.grnNumber || 'GRN')}</span>
                    ))}
                  </div>
                </div>
              )}
              {bill.status === 'cancelled' && <InfoRow label="Cancel reason" value={bill.cancelReason || '—'} />}
            </Section>
          </div>

          <Section title="Items" bodyClassName="p-3">
            <LinesTable columns={columns} rows={bill.items || []} minWidth={1000} />
          </Section>

          <Section title="Payments" bodyClassName="p-3">
            <LinesTable columns={paymentColumns} rows={bill.payments || []} minWidth={560} emptyText="No payments recorded against this bill." />
          </Section>

          <Section title="Returns / debit notes" bodyClassName="p-3">
            <LinesTable columns={returnColumns} rows={bill.returns || []} minWidth={560} emptyText="No goods returned against this bill." />
          </Section>

          {bill.notes && (
            <Section title="Notes">
              <p className="text-sm whitespace-pre-wrap">{bill.notes}</p>
            </Section>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <Section title="Amount">
            <DocTotals
              doc={bill}
              extra={
                bill.status === 'draft' || bill.status === 'cancelled'
                  ? []
                  : [
                      { label: 'Paid', value: `- ${formatINR(bill.paidAmount)}`, tone: 'text-emerald-600 dark:text-emerald-400' },
                      ...(num(bill.adjustedAmount) > 0 ? [{ label: 'Adjusted by returns', value: `- ${formatINR(bill.adjustedAmount)}`, tone: 'text-emerald-600 dark:text-emerald-400' }] : []),
                      { label: 'Balance due', value: formatINR(bill.balanceAmount), tone: num(bill.balanceAmount) > 0 ? 'text-rose-600 dark:text-rose-400' : '', bold: true },
                    ]
              }
            />
          </Section>
        </div>
      </div>

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
      <DeleteModal
        isOpen={modal === 'delete'}
        isLoading={saving}
        onClose={() => setModal(null)}
        onConfirm={runDelete}
        title="Delete bill"
        message={`Delete ${bill.billNumber}? This cannot be undone.`}
      />
      <PurchaseToaster />
    </PageShell>
  );
}
