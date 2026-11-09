import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, Printer } from 'lucide-react';
import { Alert, Button, DetailList, DocumentLayout, PartyCard, Section, StatusBadge, TotalsPanel, TotalsRow } from '@/components/ui';
import PurchaseToaster from '../components/PurchaseToaster';
import LinesTable from '../components/LinesTable';
import { ConfirmModal, PageLoading } from '../components/ui';
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
        <Button variant="link" size="sm" className="font-mono font-semibold" onClick={() => navigate(viewPath('bills', refId(a.purchaseBillId)))}>
          {a.billNumber || 'View bill'}
        </Button>
      ),
    },
    { key: 'sup', label: 'Supplier bill no', render: (a) => a.supplierBillNo || '—' },
    { key: 'amt', label: 'Amount applied', align: 'right', render: (a) => <span className="font-semibold">{formatINR(a.amount)}</span> },
  ];

  const bank = supplier?.bankDetails;

  return (
    <DocumentLayout
      header={{
        title: 'Payment',
        docNo: p.paymentNumber,
        actions: (
          <>
            <StatusBadge status={p.status} size="md" />
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Button variant="secondary" onClick={() => window.print()} startIcon={<Printer />}>
                Print
              </Button>
              {p.status === 'completed' && (
                <Button variant="danger-soft" onClick={() => setShowCancel(true)} startIcon={<Ban />}>
                  Cancel payment
                </Button>
              )}
            </div>
          </>
        ),
      }}
      summary={
        <TotalsPanel
          title="Amount"
          totalLabel="Amount paid"
          total={formatINR(p.amount)}
          note={num(p.unallocatedAmount) > 0 ? "The advance already reduces the supplier's payable balance." : undefined}
        >
          <TotalsRow label="Applied to bills" value={formatINR(allocated)} />
          <TotalsRow label="Advance (not applied)" value={formatINR(p.unallocatedAmount)} />
        </TotalsPanel>
      }
    >
      {p.status === 'cancelled' && (
        <Alert tone="danger" title="This payment is cancelled">
          {p.cancelReason || 'No reason given.'}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Paid to">
          <div className="flex flex-col gap-4">
            <PartyCard
              name={supplier?.name || p.supplierName}
              sub={supplier?.companyName || supplier?.phone}
              actions={
                <Button variant="secondary" size="sm" onClick={() => navigate(viewPath('suppliers', refId(p.supplierId)))}>
                  View
                </Button>
              }
            />
            <DetailList
              cols={2}
              items={[
                { label: 'Phone', value: supplier?.phone },
                { label: 'GSTIN', value: supplier?.gstin, mono: true },
                bank?.accountNumber && { label: 'Bank account', value: `${bank.accountNumber}${bank.ifsc ? ` · ${bank.ifsc}` : ''}`, mono: true },
                bank?.upiId && { label: 'UPI', value: bank.upiId, mono: true },
              ]}
            />
          </div>
        </Section>
        <Section title="Payment">
          <DetailList
            cols={2}
            items={[
              { label: 'Payment no', value: p.paymentNumber, mono: true },
              { label: 'Date', value: fmtDate(p.paymentDate) },
              { label: 'Method', value: methodLabel(p.paymentMethod) },
              { label: 'Reference', value: p.reference, mono: !!p.reference },
              { label: 'Recorded by', value: p.createdByName },
            ]}
          />
        </Section>
      </div>

      <Section title="Bills paid" bodyClassName="px-3 sm:px-4">
        <LinesTable columns={columns} rows={p.allocations || []} rowKey={(a, i) => `${refId(a.purchaseBillId)}-${i}`} minWidth={480} emptyText="Not applied to any bill (full advance)." />
      </Section>

      {p.notes && (
        <Section title="Notes">
          <p className="m-0 whitespace-pre-wrap text-sm text-ink-muted">{p.notes}</p>
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
    </DocumentLayout>
  );
}
