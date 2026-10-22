import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CalendarCheck, CalendarClock, Check, CheckCircle2, ChevronDown, ChevronUp, Edit2, Loader2, Package, Printer, ShoppingCart, Store, Trash2, Truck, Undo2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import PayMethodPicker from '../components/PayMethodPicker';
import LinesTable from '../components/LinesTable';
import { DocTotals } from '../components/Totals';
import { ConfirmModal, Field, PageLoading, PageShell, Section, StatusBadge } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, daysPast, decId, editPath, errMsg, fmtDate, formatINR, formatQty, isOverdue, methodLabel, num, refId, round2, storeName, supplierName, todayISO, viewPath } from '../components/helpers';
import { cancelPurchaseBill, confirmPurchaseBill, deletePurchaseBill, fetchPurchaseBill } from './services/purchaseBillSlice';
import { createPaymentOut } from '../paymentsOut/services/paymentOutSlice';
import { spChangeCount } from '../components/stockInColumns';

const BILL_STATUS_LABEL = { draft: 'Not finished', unpaid: 'To pay', partially_paid: 'Part paid', paid: 'Paid', cancelled: 'Cancelled' };

/** One "when / where" fact at the top of the bill. */
function Fact({ icon, label, value, sub, tone = '' }) {
  return (
    <div className="rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-4 py-3 flex items-start gap-3 min-w-0">
      <span className="mt-0.5 text-[var(--vs-text-secondary)]">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-[var(--vs-text-secondary)]">{label}</div>
        <div className={`text-sm font-bold truncate ${tone}`}>{value}</div>
        {sub && <div className="text-[11px] text-[var(--vs-text-secondary)] truncate">{sub}</div>}
      </div>
    </div>
  );
}

/** Pay this bill right here: amount, date (today), how. */
function PayPanel({ bill, onPaid }) {
  const dispatch = useDispatch();
  const saving = useSelector((state) => state.paymentOut?.saving);
  const balance = round2(bill.balanceAmount);
  const [amount, setAmount] = useState(String(balance));
  const [paymentDate, setPaymentDate] = useState(() => todayISO());
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const pay = num(amount);
  const extra = round2(Math.max(0, pay - balance));

  const save = async () => {
    if (!(pay > 0)) {
      setError('Enter how much you paid.');
      return;
    }
    setError('');
    try {
      const res = await dispatch(
        createPaymentOut({
          supplierId: refId(bill.supplierId),
          paymentDate,
          amount: round2(pay),
          paymentMethod: method,
          reference: method === 'cash' ? '' : reference.trim(),
          notes: '',
          allocations: [{ purchaseBillId: bill._id, amount: round2(Math.min(pay, balance)) }],
        })
      ).unwrap();
      notify(res?.message || `Payment of ${formatINR(pay)} saved`);
      onPaid();
    } catch (e) {
      const msg = errMsg(e);
      setError(msg);
      notifyError(msg);
    }
  };

  return (
    <Section title="Pay this bill" bodyClassName="p-4 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAmount(String(balance))}
          className={`px-3 h-9 rounded-full border text-sm font-semibold cursor-pointer ${
            pay === balance ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'border-[var(--vs-border)] hover:bg-[var(--vs-bg-secondary)]'
          }`}
        >
          Full {formatINR(balance)}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)" required>
          <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="!font-bold" />
        </Field>
        <Field label="Pay date">
          <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">How did you pay?</span>
        <PayMethodPicker method={method} onMethodChange={setMethod} reference={reference} onReferenceChange={setReference} compact />
      </div>
      {pay > 0 && pay < balance && <p className="text-xs text-[var(--vs-text-secondary)]">{formatINR(round2(balance - pay))} will still be left to pay on this bill.</p>}
      {extra > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{formatINR(extra)} extra is kept as an advance for this supplier&apos;s next bill.</p>}
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      <Button onClick={save} disabled={saving} className="w-full" startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}>
        Save payment
      </Button>
    </Section>
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
    navigate(`${PATHS.returns}/create`, { state: { supplierId: refId(bill.supplierId), storeId: refId(bill.storeId), purchaseBillId: bill._id } });

  const link = (kind, docId, text) => (
    <button type="button" onClick={() => navigate(viewPath(kind, docId))} className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
      {text}
    </button>
  );

  const paymentColumns = [
    { key: 'date', label: 'Paid on', render: (p) => fmtDate(p.paymentDate) },
    { key: 'method', label: 'How', render: (p) => methodLabel(p.paymentMethod) },
    { key: 'ref', label: 'Reference', render: (p) => p.reference || '—' },
    { key: 'no', label: 'Payment no', render: (p) => link('payments', p._id, p.paymentNumber) },
    { key: 'amt', label: 'Amount', align: 'right', render: (p) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(p.amount)}</span> },
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
        : `Cancel ${bill.billNumber}?${bill.stockPosted ? ' The goods added by this bill will be taken out of stock.' : ''}${bill.grnIds?.length ? ' The linked goods receipts become unbilled again.' : ''}`,
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

  return (
    <PageShell title={`Bill ${bill.billNumber}`} description={bill.supplierBillNo ? `Supplier's bill no. ${bill.supplierBillNo}` : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vs-border)] pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={bill.status} label={BILL_STATUS_LABEL[bill.status]} size="lg" />
          {overdue && <StatusBadge status="overdue" label={`Late by ${daysPast(bill.dueDate)} days`} size="lg" />}
          {bill.autoFromGrn && <span className="text-xs text-[var(--vs-text-secondary)]">Created automatically when the goods arrived</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {bill.status === 'draft' && (
            <>
              <Button size="sm" onClick={() => setModal('confirm')} startIcon={<CheckCircle2 className="w-4 h-4" />}>
                Save bill
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(editPath('bills', bill._id))} startIcon={<Edit2 className="w-4 h-4" />}>
                Edit
              </Button>
            </>
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

      {/* When / where */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Fact
          icon={<ShoppingCart className="w-4 h-4" />}
          label="Ordered on"
          value={po ? fmtDate(po.poDate) : 'No purchase order'}
          sub={po ? <>{link('orders', refId(po), po.poNumber || 'View order')}</> : null}
        />
        <Fact
          icon={<Truck className="w-4 h-4" />}
          label="Delivered on"
          value={fmtDate(deliveredOn)}
          sub={grns.length ? <>{grns.map((g) => <span key={refId(g)} className="mr-2">{link('receipts', refId(g), g.grnNumber || 'GRN')}</span>)}</> : 'Came with this bill'}
        />
        <Fact icon={<Store className="w-4 h-4" />} label="Store" value={storeName(bill)} />
        {bill.status === 'paid' ? (
          <Fact icon={<CalendarCheck className="w-4 h-4" />} label="Payment" value="Paid in full" tone="text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Fact
            icon={<CalendarClock className="w-4 h-4" />}
            label="Due days"
            value={open ? (dueDays === 0 ? 'Delivered today' : `${dueDays} ${dueDays === 1 ? 'day' : 'days'} since delivery`) : '—'}
            sub={bill.dueDate ? `Pay by ${fmtDate(bill.dueDate)}` : null}
            tone={overdue ? 'text-rose-600 dark:text-rose-400' : ''}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Section title="What you bought" bodyClassName="p-0">
            <div className="divide-y divide-[var(--vs-border)]">
              <div className="hidden sm:grid grid-cols-[2.2fr_0.8fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-[var(--vs-bg-secondary)] text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                <span>Product</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Cost price</span>
                <span className="text-right">GST</span>
                <span className="text-right">Total</span>
              </div>
              {(bill.items || []).map((l, i) => {
                const p = typeof l.productId === 'object' && l.productId ? l.productId : null;
                const img = p?.images?.find((x) => x.isMain || x.isFeatured)?.path || p?.images?.[0]?.path;
                return (
                  <div key={`${refId(l.productId)}-${i}`} className="grid grid-cols-2 sm:grid-cols-[2.2fr_0.8fr_1fr_1fr_1fr] gap-x-3 gap-y-1 px-4 py-3 items-center text-sm">
                    <div className="col-span-2 sm:col-span-1 flex items-center gap-3 min-w-0">
                      {img ? (
                        <img src={img} alt={l.productName} className="w-11 h-11 rounded-lg object-cover border border-[var(--vs-border)] shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)] flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-[var(--vs-text-secondary)]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{l.productName}</div>
                        <div className="text-[11px] text-[var(--vs-text-secondary)]">{l.hsnCode ? `HSN ${l.hsnCode}` : ''}</div>
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <span className="sm:hidden text-[11px] text-[var(--vs-text-secondary)]">Qty </span>
                      {formatQty(l.qty)} {l.unit}
                    </div>
                    <div className="text-right">
                      <span className="sm:hidden text-[11px] text-[var(--vs-text-secondary)]">CP </span>
                      {formatINR(l.rate)}
                    </div>
                    <div className="sm:text-right">
                      <span className="sm:hidden text-[11px] text-[var(--vs-text-secondary)]">GST </span>
                      {formatINR(l.taxAmount)} <span className="text-[11px] text-[var(--vs-text-secondary)]">({num(l.taxPercent)}%)</span>
                    </div>
                    <div className="text-right font-semibold">{formatINR(l.total)}</div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Payments" bodyClassName="p-3">
            <LinesTable columns={paymentColumns} rows={bill.payments || []} minWidth={520} emptyText="Nothing paid yet." />
          </Section>

          {(bill.returns || []).length > 0 && (
            <Section title="Goods returned" bodyClassName="p-3">
              <LinesTable columns={returnColumns} rows={bill.returns} minWidth={560} />
            </Section>
          )}

          {bill.notes && (
            <Section title="Notes">
              <p className="text-sm whitespace-pre-wrap">{bill.notes}</p>
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Section title="Amount" bodyClassName="p-4 flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--vs-text-secondary)]">Bill total (incl. GST)</span>
              <span className="font-mono font-semibold">{formatINR(bill.totalAmount)}</span>
            </div>
            {bill.status !== 'draft' && bill.status !== 'cancelled' && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--vs-text-secondary)]">Paid</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatINR(num(bill.paidAmount) + num(bill.adjustedAmount))}</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-[var(--vs-border)] pt-3">
                  <span className="font-semibold">Still to pay</span>
                  <span className={`font-mono text-xl font-bold ${num(bill.balanceAmount) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {num(bill.balanceAmount) > 0 ? formatINR(bill.balanceAmount) : 'Nothing'}
                  </span>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowPriceDetails((v) => !v)}
              className="self-start inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer print:hidden"
            >
              {showPriceDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showPriceDetails ? 'Hide price details' : 'Price details (GST split, discount, freight)'}
            </button>
            {showPriceDetails && <DocTotals doc={bill} />}
          </Section>

          {open && num(bill.balanceAmount) > 0 && (
            <div className="print:hidden">
              <PayPanel key={`${bill._id}-${bill.balanceAmount}`} bill={bill} onPaid={() => dispatch(fetchPurchaseBill(bill._id))} />
            </div>
          )}

          <Section title="Supplier" bodyClassName="p-4 flex flex-col gap-2 text-sm">
            <div>{link('suppliers', refId(bill.supplierId), supplierName(bill))}</div>
            {supplier?.companyName && supplier.companyName !== supplierName(bill) && <div>{supplier.companyName}</div>}
            {(supplier?.phone || bill.supplierSnapshot?.phone) && (
              <a href={`tel:${supplier?.phone || bill.supplierSnapshot?.phone}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                {supplier?.phone || bill.supplierSnapshot?.phone}
              </a>
            )}
            {supplier?.email && <div className="text-[var(--vs-text-secondary)] break-all">{supplier.email}</div>}
            <div className="text-[var(--vs-text-secondary)]">GSTIN: <span className="font-mono">{supplier?.gstin || bill.supplierSnapshot?.gstin || 'Not registered'}</span></div>
            {address && <div className="text-[var(--vs-text-secondary)]">{address}</div>}
            {(bank.accountNumber || bank.upiId) && (
              <div className="mt-1 rounded-lg bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)] p-3 text-xs flex flex-col gap-0.5">
                <span className="font-bold text-[var(--vs-text-secondary)]">Pay to</span>
                {bank.accountName && <span>{bank.accountName}</span>}
                {bank.accountNumber && <span className="font-mono">A/c {bank.accountNumber}</span>}
                {bank.ifsc && <span className="font-mono">IFSC {bank.ifsc}</span>}
                {bank.bankName && <span>{bank.bankName}</span>}
                {bank.upiId && <span className="font-mono">UPI {bank.upiId}</span>}
              </div>
            )}
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
