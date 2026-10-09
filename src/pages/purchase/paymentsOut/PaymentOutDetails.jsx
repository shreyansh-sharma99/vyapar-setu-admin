import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, Printer } from 'lucide-react';
import Button from '@/components/inputs/Button';
import PurchaseToaster from '../components/PurchaseToaster';
import LinesTable from '../components/LinesTable';
import { ConfirmModal, InfoRow, PageLoading, PageShell, Section, StatusBadge } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { decId, errMsg, fmtDate, formatINR, methodLabel, num, refId, round2, viewPath } from '../components/helpers';
import { cancelPaymentOut, fetchPaymentOut } from './services/paymentOutSlice';

export default function PaymentOutDetails() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, currentError, saving } = useSelector((state) => state.paymentOut);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchPaymentOut(id));
  }, [dispatch, id]);

  if (!id) return <PageLoading title="Payment" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Payment" error={currentError} />;

  const p = current;
  const supplier = typeof p.supplierId === 'object' ? p.supplierId : null;
  const allocated = round2(num(p.amount) - num(p.unallocatedAmount));

  const cancel = async (reason) => {
    try {
      const res = await dispatch(cancelPaymentOut({ id: p._id, reason })).unwrap();
      notify(res?.message || 'Payment cancelled');
      setShowCancel(false);
      dispatch(fetchPaymentOut(p._id));
    } catch (e) {
      notifyError(errMsg(e));
    }
  };

  const columns = [
    {
      key: 'bill',
      label: 'Bill',
      render: (a) => (
        <button type="button" onClick={() => navigate(viewPath('bills', refId(a.purchaseBillId)))} className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
          {a.billNumber || 'View bill'}
        </button>
      ),
    },
    { key: 'sup', label: 'Supplier bill no', render: (a) => a.supplierBillNo || '—' },
    { key: 'amt', label: 'Amount applied', align: 'right', render: (a) => <span className="font-semibold">{formatINR(a.amount)}</span> },
  ];

  return (
    <PageShell title={`Payment ${p.paymentNumber}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vs-border)] pb-4">
        <StatusBadge status={p.status} size="lg" />
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {p.status === 'completed' && (
            <Button size="sm" variant="outline" onClick={() => setShowCancel(true)} startIcon={<Ban className="w-4 h-4" />}>
              Cancel payment
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()} startIcon={<Printer className="w-4 h-4" />}>
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Section title="Paid to" bodyClassName="p-4 flex flex-col gap-3">
          <button type="button" onClick={() => navigate(viewPath('suppliers', refId(p.supplierId)))} className="text-left font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
            {supplier?.name || p.supplierName}
          </button>
          {supplier?.companyName && <span className="text-xs text-[var(--vs-text-secondary)]">{supplier.companyName}</span>}
          <InfoRow label="Phone" value={supplier?.phone} />
          <InfoRow label="GSTIN" value={supplier?.gstin} mono />
          {supplier?.bankDetails?.accountNumber && (
            <InfoRow label="Bank account" value={`${supplier.bankDetails.accountNumber}${supplier.bankDetails.ifsc ? ` · ${supplier.bankDetails.ifsc}` : ''}`} mono />
          )}
          <InfoRow label="UPI" value={supplier?.bankDetails?.upiId} mono />
        </Section>
        <Section title="Payment" bodyClassName="p-4 grid grid-cols-2 gap-3">
          <InfoRow label="Payment no" value={p.paymentNumber} mono />
          <InfoRow label="Date" value={fmtDate(p.paymentDate)} />
          <InfoRow label="Method" value={methodLabel(p.paymentMethod)} />
          <InfoRow label="Reference" value={p.reference || '—'} mono />
          <InfoRow label="Recorded by" value={p.createdByName} />
          {p.status === 'cancelled' && <InfoRow label="Cancel reason" value={p.cancelReason || '—'} />}
        </Section>
        <Section title="Amount" bodyClassName="p-4 flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between text-base font-bold">
            <span>Amount paid</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatINR(p.amount)}</span>
          </div>
          <div className="flex justify-between text-[var(--vs-text-secondary)]">
            <span>Applied to bills</span>
            <span className="font-mono">{formatINR(allocated)}</span>
          </div>
          <div className="flex justify-between text-[var(--vs-text-secondary)]">
            <span>Advance (not applied)</span>
            <span className="font-mono text-amber-600 dark:text-amber-400">{formatINR(p.unallocatedAmount)}</span>
          </div>
          {num(p.unallocatedAmount) > 0 && <p className="text-[11px] text-[var(--vs-text-secondary)]">The advance already reduces the supplier&apos;s payable balance.</p>}
        </Section>
      </div>

      <Section title="Bills paid" bodyClassName="p-3">
        <LinesTable columns={columns} rows={p.allocations || []} rowKey={(a, i) => `${refId(a.purchaseBillId)}-${i}`} minWidth={480} emptyText="Not applied to any bill (full advance)." />
      </Section>

      {p.notes && (
        <Section title="Notes">
          <p className="text-sm whitespace-pre-wrap">{p.notes}</p>
        </Section>
      )}

      {showCancel && (
        <ConfirmModal
          open
          title="Cancel payment"
          message="The bills this payment settled will become due again and the supplier's payable balance goes back up."
          confirmLabel="Cancel payment"
          variant="danger"
          withReason
          loading={saving}
          onClose={() => setShowCancel(false)}
          onConfirm={cancel}
        />
      )}
      <PurchaseToaster />
    </PageShell>
  );
}
