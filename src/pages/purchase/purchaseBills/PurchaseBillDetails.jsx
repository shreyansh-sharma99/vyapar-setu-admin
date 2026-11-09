import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CalendarCheck, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Edit2, Package, Printer, ShoppingCart, Trash2, Truck, Undo2 } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, DetailList, DocumentLayout, PartyCard, Section, StatusBadge, TotalsPanel, TotalsRow } from '@/components/ui';
import { cn } from '@/lib/utils';
import PurchaseToaster from '../components/PurchaseToaster';
import PayBillPanel from '../components/PayBillPanel';
import LinesTable from '../components/LinesTable';
import { DocTotals } from '../components/Totals';
import { ConfirmModal, PageLoading } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, daysPast, decId, editPath, errMsg, fmtDate, formatINR, formatQty, isOverdue, methodLabel, num, refId, supplierName, viewPath } from '../components/helpers';
import { cancelPurchaseBill, confirmPurchaseBill, deletePurchaseBill, fetchPurchaseBill } from './services/purchaseBillSlice';
import { spChangeCount } from '../components/stockInColumns';

const BILL_STATUS_LABEL = { draft: 'Not finished', unpaid: 'To pay', partially_paid: 'Part paid', paid: 'Paid', cancelled: 'Cancelled' };

const FACT_TONE = { success: 'text-success', danger: 'text-danger' };

/** One "when / where" fact at the top of the bill. */
function Fact({ icon: Icon, label, value, sub, tone }) {
  return (
    <Card padding="none" className="flex min-w-0 items-start gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-brand-soft text-brand-ink">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-ink-subtle">{label}</div>
        <div className={cn('truncate text-sm font-bold text-ink', FACT_TONE[tone])}>{value}</div>
        {sub && <div className="truncate text-xs text-ink-subtle">{sub}</div>}
      </div>
    </Card>
  );
}

export default function PurchaseBillDetails() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, currentError, saving } = useSelector((state) => state.purchaseBill);
  const [modal, setModal] = useState(null); // 'confirm' | 'cancel' | 'delete'
  const [showPriceDetails, setShowPriceDetails] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchPurchaseBill(id));
  }, [dispatch, id]);

  if (!id) return <PageLoading title="Purchase bill" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Purchase bill" error={currentError} />;

  const bill = current;
  const open = ['unpaid', 'partially_paid'].includes(bill.status);
  const overdue = open && isOverdue(bill.dueDate, bill.balanceAmount);
  const hasMoneyAgainst = num(bill.paidAmount) > 0 || num(bill.adjustedAmount) > 0;
  const supplier = typeof bill.supplierId === 'object' && bill.supplierId ? bill.supplierId : null;
  const po = typeof bill.purchaseOrderId === 'object' && bill.purchaseOrderId ? bill.purchaseOrderId : null;
  const grns = (bill.grnIds || []).filter((g) => typeof g === 'object');
  const deliveredOn = bill.receivedDate || grns[0]?.grnDate || bill.billDate;
  const dueDays = daysPast(deliveredOn);

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

  const returnGoods = () =>
    navigate(`${PATHS.returns}/create`, { state: { supplierId: refId(bill.supplierId), purchaseBillId: bill._id } });

  const link = (kind, docId, text) => (
    <Button variant="link" size="sm" className="font-mono font-semibold" onClick={() => navigate(viewPath(kind, docId))}>
      {text}
    </Button>
  );

  const itemColumns = [
    {
      key: 'product',
      label: 'Product',
      render: (l) => {
        const p = typeof l.productId === 'object' && l.productId ? l.productId : null;
        const img = p?.images?.find((x) => x.isMain || x.isFeatured)?.path || p?.images?.[0]?.path;
        return (
          <div className="flex min-w-0 items-center gap-3">
            {img ? (
              <img src={img} alt={l.productName} className="size-11 shrink-0 rounded-lg bg-fill object-cover" />
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-fill text-ink-subtle">
                <Package className="size-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold">{l.productName}</div>
              {l.hsnCode && <div className="text-xs text-ink-subtle">HSN {l.hsnCode}</div>}
            </div>
          </div>
        );
      },
    },
    { key: 'qty', label: 'Qty', align: 'right', render: (l) => `${formatQty(l.qty)} ${l.unit}` },
    { key: 'rate', label: 'Cost price', align: 'right', render: (l) => formatINR(l.rate) },
    {
      key: 'gst',
      label: 'GST',
      align: 'right',
      render: (l) => (
        <>
          {formatINR(l.taxAmount)} <span className="text-xs text-ink-subtle">({num(l.taxPercent)}%)</span>
        </>
      ),
    },
    { key: 'total', label: 'Total', align: 'right', render: (l) => <span className="font-semibold">{formatINR(l.total)}</span> },
  ];

  const paymentColumns = [
    { key: 'date', label: 'Paid on', render: (p) => fmtDate(p.paymentDate) },
    { key: 'method', label: 'How', render: (p) => methodLabel(p.paymentMethod) },
    { key: 'ref', label: 'Reference', render: (p) => p.reference || '—' },
    { key: 'no', label: 'Payment no', render: (p) => link('payments', p._id, p.paymentNumber) },
    { key: 'amt', label: 'Amount', align: 'right', render: (p) => <span className="font-semibold text-success">{formatINR(p.amount)}</span> },
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
      title: 'Save bill',
      message: `Save ${bill.billNumber}? It will be added to what you owe ${supplierName(bill)}${bill.updateStock && !bill.grnIds?.length ? ' and the goods will be added to stock' : ''}.${
        spChangeCount(bill.items) ? ` The new selling price of ${spChangeCount(bill.items)} product(s) applies from today.` : ''
      }`,
      label: 'Save bill',
      variant: 'primary',
      onConfirm: () => run(confirmPurchaseBill(bill._id), 'Bill saved'),
    },
    cancel: {
      title: 'Cancel bill',
      message: hasMoneyAgainst
        ? 'Payments or returns are recorded against this bill. Cancel those first.'
        : `Cancel ${bill.billNumber}?${bill.stockPosted ? ' The goods added by this bill will be taken out of stock.' : ''}`,
      label: 'Cancel bill',
      variant: 'danger',
      withReason: true,
      onConfirm: (reason) => run(cancelPurchaseBill({ id: bill._id, reason }), 'Bill cancelled'),
    },
  }[modal];

  const address = supplier?.address
    ? [supplier.address.street, supplier.address.city, supplier.address.state, supplier.address.pincode].filter(Boolean).join(', ')
    : bill.supplierSnapshot?.address;
  const bank = supplier?.bankDetails || {};
  const phone = supplier?.phone || bill.supplierSnapshot?.phone;
  const returned = (bill.returns || []).some((r) => r.status !== 'cancelled');
  const settled = bill.status !== 'draft' && bill.status !== 'cancelled';

  return (
    <DocumentLayout
      header={{
        title: 'Purchase bill',
        docNo: bill.billNumber,
        description:
          [bill.supplierBillNo && `Supplier's bill no. ${bill.supplierBillNo}`, bill.autoFromGrn && 'Created automatically when the goods arrived'].filter(Boolean).join(' · ') ||
          undefined,
        actions: (
          <>
            <StatusBadge status={bill.status} label={BILL_STATUS_LABEL[bill.status]} size="md" />
            {overdue && <StatusBadge status="overdue" label={`Late by ${daysPast(bill.dueDate)} days`} size="md" />}
            {returned && (
              <Badge tone="warning" size="md" icon={Undo2}>
                Products returned
              </Badge>
            )}
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Button variant="secondary" onClick={() => window.print()} startIcon={<Printer />}>
                Print
              </Button>
              {['draft', 'cancelled'].includes(bill.status) && (
                <Button variant="danger-soft" onClick={() => setModal('delete')} startIcon={<Trash2 />}>
                  Delete
                </Button>
              )}
              {bill.status !== 'cancelled' && bill.status !== 'draft' && !bill.autoFromPo && (
                <Button
                  variant="secondary"
                  onClick={() => setModal('cancel')}
                  disabled={hasMoneyAgainst}
                  title={hasMoneyAgainst ? 'Cancel the payments and returns on this bill first' : ''}
                  startIcon={<Ban />}
                >
                  Cancel
                </Button>
              )}
              {['unpaid', 'partially_paid', 'paid'].includes(bill.status) && !returned && (
                <Button variant="secondary" onClick={returnGoods} startIcon={<Undo2 />}>
                  Return goods
                </Button>
              )}
              {bill.status === 'draft' && (
                <>
                  <Button variant="secondary" onClick={() => navigate(editPath('bills', bill._id))} startIcon={<Edit2 />}>
                    Edit
                  </Button>
                  <Button onClick={() => setModal('confirm')} startIcon={<CheckCircle2 />}>
                    Save bill
                  </Button>
                </>
              )}
            </div>
          </>
        ),
      }}
      summary={
        <>
          <TotalsPanel
            title="Amount"
            totalLabel={settled ? 'Still to pay' : 'Bill total (incl. GST)'}
            total={settled ? (num(bill.balanceAmount) > 0 ? formatINR(bill.balanceAmount) : 'Nothing') : formatINR(bill.totalAmount)}
            footer={
              <>
                <Button
                  variant="link-inverse"
                  size="sm"
                  className="self-start print:hidden"
                  onClick={() => setShowPriceDetails((v) => !v)}
                  startIcon={showPriceDetails ? <ChevronUp /> : <ChevronDown />}
                >
                  {showPriceDetails ? 'Hide price details' : 'Price details (GST split, discount, freight)'}
                </Button>
                {showPriceDetails && <DocTotals doc={bill} />}
              </>
            }
          >
            {settled && (
              <>
                <TotalsRow label="Bill total (incl. GST)" value={formatINR(bill.totalAmount)} />
                <TotalsRow label="Paid" value={formatINR(num(bill.paidAmount) + num(bill.adjustedAmount))} />
              </>
            )}
          </TotalsPanel>

          {open && num(bill.balanceAmount) > 0 && (
            <div className="print:hidden">
              <PayBillPanel key={`${bill._id}-${bill.balanceAmount}`} bill={bill} onPaid={() => dispatch(fetchPurchaseBill(bill._id))} />
            </div>
          )}
        </>
      }
    >
      {/* When / where */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Fact
          icon={ShoppingCart}
          label="Ordered on"
          value={po ? fmtDate(po.poDate) : 'No purchase'}
          sub={po ? <>From {link('orders', refId(po), po.poNumber || 'View order')}</> : null}
        />
        <Fact
          icon={Truck}
          label="Delivered on"
          value={fmtDate(deliveredOn)}
          sub={grns.length ? <>{grns.map((g) => <span key={refId(g)} className="mr-2 font-mono">{g.grnNumber || 'GRN'}</span>)}</> : bill.autoFromPo ? 'Received with the purchase' : 'Came with this bill'}
        />
        {bill.status === 'paid' ? (
          <Fact icon={CalendarCheck} label="Payment" value="Paid in full" tone="success" />
        ) : (
          <Fact
            icon={CalendarClock}
            label="Due days"
            value={open ? (dueDays === 0 ? 'Delivered today' : `${dueDays} ${dueDays === 1 ? 'day' : 'days'} since delivery`) : '—'}
            sub={bill.dueDate ? `Pay by ${fmtDate(bill.dueDate)}` : null}
            tone={overdue ? 'danger' : undefined}
          />
        )}
      </div>

      <Section title="Supplier">
        <div className="flex flex-col gap-4">
          <PartyCard
            name={supplierName(bill)}
            sub={supplier?.companyName && supplier.companyName !== supplierName(bill) ? supplier.companyName : address}
            actions={
              <Button variant="secondary" size="sm" onClick={() => navigate(viewPath('suppliers', refId(bill.supplierId)))}>
                View
              </Button>
            }
          />
          <DetailList
            cols={3}
            items={[
              { label: 'Phone', value: phone ? <a href={`tel:${phone}`} className="text-brand-ink hover:underline">{phone}</a> : '' },
              { label: 'GSTIN', value: supplier?.gstin || bill.supplierSnapshot?.gstin || 'Not registered', mono: !!(supplier?.gstin || bill.supplierSnapshot?.gstin) },
              supplier?.email && { label: 'Email', value: supplier.email },
              { label: 'Address', value: address, wide: true },
            ]}
          />
          {(bank.accountNumber || bank.upiId) && (
            <div className="rounded-control bg-fill px-4 py-3">
              <div className="mb-3 text-xs font-bold text-ink-muted">Pay to</div>
              <DetailList
                cols={3}
                items={[
                  bank.accountName && { label: 'Account name', value: bank.accountName },
                  bank.accountNumber && { label: 'Account no.', value: bank.accountNumber, mono: true },
                  bank.ifsc && { label: 'IFSC', value: bank.ifsc, mono: true },
                  bank.bankName && { label: 'Bank', value: bank.bankName },
                  bank.upiId && { label: 'UPI', value: bank.upiId, mono: true },
                ]}
              />
            </div>
          )}
        </div>
      </Section>

      <Section title="What you bought" description={`${(bill.items || []).length} ${(bill.items || []).length === 1 ? 'item' : 'items'}`} bodyClassName="px-3 sm:px-4">
        <LinesTable columns={itemColumns} rows={bill.items || []} rowKey={(l, i) => `${refId(l.productId)}-${i}`} minWidth={640} />
      </Section>

      <Section title="Payments" bodyClassName="px-3 sm:px-4">
        <LinesTable columns={paymentColumns} rows={bill.payments || []} minWidth={520} emptyText="Nothing paid yet." />
      </Section>

      {(bill.returns || []).length > 0 && (
        <Section title="Goods returned" bodyClassName="px-3 sm:px-4">
          <LinesTable columns={returnColumns} rows={bill.returns} minWidth={560} />
        </Section>
      )}

      {bill.notes && (
        <Section title="Notes">
          <p className="m-0 whitespace-pre-wrap text-sm text-ink-muted">{bill.notes}</p>
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
        title="Delete bill"
        message={`Delete ${bill.billNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        icon={Trash2}
        loading={saving}
        onClose={() => setModal(null)}
        onConfirm={runDelete}
      />
      <PurchaseToaster />
    </DocumentLayout>
  );
}
