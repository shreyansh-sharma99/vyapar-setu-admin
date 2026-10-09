import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CheckCircle2, Edit2, Printer, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import LinesTable from '../components/LinesTable';
import { DocTotals } from '../components/Totals';
import { ConfirmModal, InfoRow, PageLoading, PageShell, Section, StatusBadge } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, decId, editPath, errMsg, fmtDate, formatINR, formatQty, num, refId, storeName, supplierName, viewPath } from '../components/helpers';
import { cancelPurchaseReturn, confirmPurchaseReturn, deletePurchaseReturn, fetchPurchaseReturn } from './services/purchaseReturnSlice';

export default function PurchaseReturnDetails() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, currentError, saving } = useSelector((state) => state.purchaseReturn);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (id) dispatch(fetchPurchaseReturn(id));
  }, [dispatch, id]);

  if (!id) return <PageLoading title="Purchase return" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Purchase return" error={currentError} />;

  const ret = current;

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
    { key: 'i', label: '#', render: (_, i) => i + 1 },
    {
      key: 'product',
      label: 'Product',
      render: (l) => (
        <div>
          <div className="font-medium">{l.productName}</div>
          <div className="text-[11px] text-[var(--vs-text-secondary)]">{l.sku ? `SKU ${l.sku}` : ''}</div>
        </div>
      ),
    },
    { key: 'qty', label: 'Qty', align: 'right', render: (l) => `${formatQty(l.qty)} ${l.unit}` },
    {
      key: 'bucket',
      label: 'From',
      render: (l) => (
        <span className={l.fromBucket === 'damaged' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>{l.fromBucket === 'damaged' ? 'Damaged stock' : 'Sellable stock'}</span>
      ),
    },
    { key: 'reason', label: 'Reason', render: (l) => l.reason || '—' },
    { key: 'rate', label: 'Rate', align: 'right', render: (l) => formatINR(l.rate) },
    { key: 'taxable', label: 'Taxable', align: 'right', render: (l) => formatINR(l.taxableValue) },
    { key: 'gst', label: 'GST', align: 'right', render: (l) => `${num(l.taxPercent)}% · ${formatINR(l.taxAmount)}` },
    { key: 'total', label: 'Amount', align: 'right', render: (l) => <span className="font-semibold">{formatINR(l.total)}</span> },
  ];

  const modalCfg = {
    confirm: {
      title: 'Confirm return',
      message: `Confirm ${ret.returnNumber}? The goods will be taken out of ${storeName(ret)} and ${formatINR(ret.totalAmount)} will be reduced from what you owe ${supplierName(ret)}.`,
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

  return (
    <PageShell title={`Purchase return ${ret.returnNumber}`} description="Debit note">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vs-border)] pb-4">
        <StatusBadge status={ret.status} size="lg" />
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {ret.status === 'draft' && (
            <>
              <Button size="sm" onClick={() => setModal('confirm')} startIcon={<CheckCircle2 className="w-4 h-4" />}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(editPath('returns', ret._id))} startIcon={<Edit2 className="w-4 h-4" />}>
                Edit
              </Button>
            </>
          )}
          {ret.status !== 'cancelled' && (
            <Button size="sm" variant="outline" onClick={() => setModal('cancel')} startIcon={<Ban className="w-4 h-4" />}>
              Cancel
            </Button>
          )}
          {['draft', 'cancelled'].includes(ret.status) && (
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
              <div className="sm:col-span-2">
                <button type="button" onClick={() => navigate(viewPath('suppliers', refId(ret.supplierId)))} className="text-left font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                  {supplierName(ret)}
                </button>
              </div>
              <InfoRow label="GSTIN" value={ret.supplierSnapshot?.gstin || 'Unregistered'} mono />
              <InfoRow label="Phone" value={ret.supplierSnapshot?.phone} />
            </Section>
            <Section title="Return info" bodyClassName="p-4 grid grid-cols-2 gap-3">
              <InfoRow label="Return no" value={ret.returnNumber} mono />
              <InfoRow label="Date" value={fmtDate(ret.returnDate)} />
              <InfoRow label="From store" value={storeName(ret)} />
              {ret.purchaseBillId ? (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--vs-text-secondary)]">Against bill</span>
                  <button type="button" onClick={() => navigate(viewPath('bills', refId(ret.purchaseBillId)))} className="text-left text-sm font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                    {ret.purchaseBillId.billNumber || 'View bill'}
                  </button>
                </div>
              ) : (
                <InfoRow label="Against bill" value="None (reduces overall payable)" />
              )}
              {num(ret.billAdjustedAmount) > 0 && <InfoRow label="Set off on bill" value={formatINR(ret.billAdjustedAmount)} />}
              <InfoRow label="Created by" value={ret.createdByName} />
              {ret.status === 'cancelled' && <InfoRow label="Cancel reason" value={ret.cancelReason || '—'} />}
            </Section>
          </div>
          <Section title="Items returned" bodyClassName="p-3">
            <LinesTable columns={columns} rows={ret.items || []} minWidth={900} />
          </Section>
          {ret.notes && (
            <Section title="Notes">
              <p className="text-sm whitespace-pre-wrap">{ret.notes}</p>
            </Section>
          )}
        </div>
        <Section title="Amount">
          <DocTotals doc={ret} />
        </Section>
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
        title="Delete purchase return"
        message={`Delete ${ret.returnNumber}? This cannot be undone.`}
      />
      <PurchaseToaster />
    </PageShell>
  );
}
