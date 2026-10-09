import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, Edit2, FileText, PackageCheck, Printer, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import LinesTable from '../components/LinesTable';
import { ConfirmModal, InfoRow, PageLoading, PageShell, Section, StatusBadge } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, decId, editPath, errMsg, fmtDate, formatINR, formatQty, num, refId, storeName, supplierName, viewPath } from '../components/helpers';
import { cancelGoodsReceipt, deleteGoodsReceipt, fetchGoodsReceipt, postGoodsReceipt } from './services/goodsReceiptSlice';

export default function GoodsReceiptDetails() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, currentError, saving } = useSelector((state) => state.goodsReceipt);
  const [modal, setModal] = useState(null); // 'post' | 'cancel' | 'delete'

  useEffect(() => {
    if (id) dispatch(fetchGoodsReceipt(id));
  }, [dispatch, id]);

  if (!id) return <PageLoading title="Goods receipt" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Goods receipt" error={currentError} />;

  const grn = current;
  const billed = !!grn.purchaseBillId;

  const run = async (thunk, fallback) => {
    try {
      const res = await dispatch(thunk).unwrap();
      notify(res?.message || fallback);
      setModal(null);
      dispatch(fetchGoodsReceipt(grn._id));
    } catch (e) {
      notifyError(errMsg(e));
    }
  };

  const runDelete = async () => {
    try {
      const res = await dispatch(deleteGoodsReceipt(grn._id)).unwrap();
      notify(res?.message || 'Goods receipt deleted');
      navigate(PATHS.receipts, { replace: true });
    } catch (e) {
      setModal(null);
      notifyError(errMsg(e));
    }
  };

  const createBill = () =>
    navigate(`${PATHS.bills}/create`, { state: { supplierId: refId(grn.supplierId), storeId: refId(grn.storeId), grnIds: [grn._id], purchaseOrderId: refId(grn.purchaseOrderId) || undefined } });

  const columns = [
    { key: 'i', label: '#', render: (_, i) => i + 1 },
    {
      key: 'product',
      label: 'Product',
      render: (l) => (
        <div>
          <div className="font-medium">{l.productName}</div>
          {l.sku && <div className="text-[11px] text-[var(--vs-text-secondary)]">SKU {l.sku}</div>}
        </div>
      ),
    },
    { key: 'unit', label: 'Unit', render: (l) => l.unit },
    ...(grn.purchaseOrderId ? [{ key: 'ordered', label: 'Ordered', align: 'right', render: (l) => formatQty(l.orderedQty) }] : []),
    { key: 'received', label: 'Received', align: 'right', render: (l) => formatQty(l.receivedQty) },
    {
      key: 'rejected',
      label: 'Rejected',
      align: 'right',
      render: (l) =>
        num(l.rejectedQty) > 0 ? (
          <div>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">{formatQty(l.rejectedQty)}</span>
            {l.rejectReason && <div className="text-[11px] text-[var(--vs-text-secondary)]">{l.rejectReason}</div>}
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'accepted', label: 'Accepted', align: 'right', render: (l) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatQty(l.acceptedQty)}</span> },
    { key: 'cost', label: 'Unit cost', align: 'right', render: (l) => formatINR(l.unitCost) },
    { key: 'value', label: 'Value', align: 'right', render: (l) => <span className="font-semibold">{formatINR(l.value)}</span> },
  ];

  const modalCfg = {
    post: {
      title: 'Add goods to stock',
      message: `Post ${grn.grnNumber}? The accepted quantities will be added to ${storeName(grn)} stock.`,
      label: 'Add to stock',
      variant: 'primary',
      onConfirm: () => run(postGoodsReceipt(grn._id), 'Goods added to stock'),
    },
    cancel: {
      title: 'Cancel goods receipt',
      message:
        grn.status === 'posted'
          ? 'The accepted goods will be taken out of stock again. This fails if some of them were already sold or moved.'
          : 'Cancel this draft goods receipt?',
      label: 'Cancel receipt',
      variant: 'danger',
      withReason: true,
      onConfirm: (reason) => run(cancelGoodsReceipt({ id: grn._id, reason }), 'Goods receipt cancelled'),
    },
  }[modal];

  return (
    <PageShell title={`Goods receipt ${grn.grnNumber}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vs-border)] pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={grn.status} size="lg" />
          {grn.status === 'posted' &&
            (billed ? (
              <button type="button" onClick={() => navigate(viewPath('bills', refId(grn.purchaseBillId)))} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                Billed in {grn.purchaseBillId?.billNumber || 'a purchase bill'}
              </button>
            ) : (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Not billed yet</span>
            ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {grn.status === 'draft' && (
            <>
              <Button size="sm" onClick={() => setModal('post')} startIcon={<PackageCheck className="w-4 h-4" />}>
                Add to stock
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(editPath('receipts', grn._id))} startIcon={<Edit2 className="w-4 h-4" />}>
                Edit
              </Button>
            </>
          )}
          {grn.status === 'posted' && !billed && (
            <Button size="sm" onClick={createBill} startIcon={<FileText className="w-4 h-4" />}>
              Create bill
            </Button>
          )}
          {grn.status !== 'cancelled' && !billed && (
            <Button size="sm" variant="outline" onClick={() => setModal('cancel')} startIcon={<Ban className="w-4 h-4" />}>
              Cancel
            </Button>
          )}
          {['draft', 'cancelled'].includes(grn.status) && (
            <Button size="sm" variant="danger" onClick={() => setModal('delete')} startIcon={<Trash2 className="w-4 h-4" />}>
              Delete
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()} startIcon={<Printer className="w-4 h-4" />}>
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Section title="Supplier" bodyClassName="p-4 flex flex-col gap-3">
          <button type="button" onClick={() => navigate(viewPath('suppliers', refId(grn.supplierId)))} className="text-left font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
            {supplierName(grn)}
          </button>
          <InfoRow label="GSTIN" value={grn.supplierSnapshot?.gstin || 'Unregistered'} mono />
          <InfoRow label="Phone" value={grn.supplierSnapshot?.phone} />
        </Section>
        <Section title="Receipt" bodyClassName="p-4 grid grid-cols-2 gap-3">
          <InfoRow label="GRN number" value={grn.grnNumber} mono />
          <InfoRow label="Date" value={fmtDate(grn.grnDate)} />
          <InfoRow label="Store" value={storeName(grn)} />
          <InfoRow label="Received by" value={grn.postedBy || grn.createdByName} />
          {grn.purchaseOrderId && (
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--vs-text-secondary)]">Purchase order</span>
              <button type="button" onClick={() => navigate(viewPath('orders', refId(grn.purchaseOrderId)))} className="text-left text-sm font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                {grn.poNumber || grn.purchaseOrderId?.poNumber}
              </button>
            </div>
          )}
          {grn.postedAt && <InfoRow label="Added to stock" value={fmtDate(grn.postedAt)} />}
        </Section>
        <Section title="Supplier document" bodyClassName="p-4 grid grid-cols-2 gap-3">
          <InfoRow label="Invoice / challan no" value={grn.supplierInvoiceNo || '—'} />
          <InfoRow label="Invoice date" value={fmtDate(grn.supplierInvoiceDate)} />
          <InfoRow label="Total value" value={formatINR(grn.totalValue)} />
          {grn.status === 'cancelled' && <InfoRow label="Cancel reason" value={grn.cancelReason || '—'} />}
        </Section>
      </div>

      <Section title="Items" bodyClassName="p-3">
        <LinesTable columns={columns} rows={grn.items || []} minWidth={1000} />
      </Section>

      {grn.notes && (
        <Section title="Notes">
          <p className="text-sm whitespace-pre-wrap">{grn.notes}</p>
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
      <DeleteModal
        isOpen={modal === 'delete'}
        isLoading={saving}
        onClose={() => setModal(null)}
        onConfirm={runDelete}
        title="Delete goods receipt"
        message={`Delete ${grn.grnNumber}? This cannot be undone.`}
      />
      <PurchaseToaster />
    </PageShell>
  );
}
