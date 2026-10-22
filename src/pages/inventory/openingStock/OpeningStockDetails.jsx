import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, Edit2, PackageCheck, Printer, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '@/pages/purchase/components/PurchaseToaster';
import LinesTable from '@/pages/purchase/components/LinesTable';
import { ConfirmModal, InfoRow, PageLoading, PageShell, Section } from '@/pages/purchase/components/ui';
import useApi from '@/pages/purchase/components/useApi';
import { notify, notifyError } from '@/pages/purchase/components/toast';
import { decId, errMsg, fmtDate, formatINR, formatQty, num, storeName } from '@/pages/purchase/components/helpers';
import { cancelOpeningStockApi, deleteOpeningStockApi, getOpeningStockByIdApi, postOpeningStockApi } from './services/openingStockService';
import { OPENING_PATH, openingEditPath } from './paths';
import { OpeningStatus } from './OpeningStockList';

/** inventory/opening-stock/view/:id — lines with batch, MRP and cost; post / cancel / delete / print. */
export default function OpeningStockDetails() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const navigate = useNavigate();
  const { data, error, reload } = useApi(id ? `opening:${id}` : null, () => getOpeningStockByIdApi(id));
  const [modal, setModal] = useState(null); // 'post' | 'cancel' | 'delete'
  const [busy, setBusy] = useState(false);

  if (!id) return <PageLoading title="Opening stock" error="This link is not valid." />;
  const doc = data?.data;
  if (!doc) return <PageLoading title="Opening stock" error={error} />;

  const run = async (fn, fallback) => {
    setBusy(true);
    try {
      const res = await fn();
      notify(res?.message || fallback);
      setModal(null);
      reload();
    } catch (e) {
      notifyError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    setBusy(true);
    try {
      const res = await deleteOpeningStockApi(doc._id);
      notify(res?.message || 'Opening stock deleted');
      navigate(OPENING_PATH, { replace: true });
    } catch (e) {
      setModal(null);
      notifyError(errMsg(e));
    } finally {
      setBusy(false);
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
          {l.sku && <div className="text-[11px] text-[var(--vs-text-secondary)]">SKU {l.sku}</div>}
        </div>
      ),
    },
    { key: 'qty', label: 'Qty', align: 'right', render: (l) => `${formatQty(l.qty)} ${l.unit || ''}` },
    { key: 'cost', label: 'Cost / unit', align: 'right', render: (l) => formatINR(l.unitCost) },
    { key: 'mrp', label: 'MRP / pc', align: 'right', render: (l) => (num(l.mrp) > 0 ? formatINR(l.mrp) : '—') },
    {
      key: 'sp',
      label: 'New SP / pc',
      align: 'right',
      render: (l) => (num(l.sellingPrice) > 0 ? <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatINR(l.sellingPrice)}</span> : '—'),
    },
    {
      key: 'batch',
      label: 'Batch',
      render: (l) =>
        l.batchNo || l.expiryDate ? (
          <div className="text-xs">
            {l.batchNo && <div className="font-mono">{l.batchNo}</div>}
            {l.expiryDate && <div className="text-[var(--vs-text-secondary)]">Exp {fmtDate(l.expiryDate)}</div>}
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'value', label: 'Value', align: 'right', render: (l) => <span className="font-semibold">{formatINR(l.value)}</span> },
  ];
  const totalQty = (doc.items || []).reduce((s, l) => s + num(l.qty), 0);
  const footer = (
    <tfoot className="bg-[var(--vs-bg-secondary)] font-semibold">
      <tr>
        <td colSpan={2} className="py-2.5 px-3 border border-[var(--vs-border)] text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
          Total
        </td>
        <td className="py-2.5 px-3 border border-[var(--vs-border)] text-right">{formatQty(totalQty)}</td>
        <td colSpan={4} className="py-2.5 px-3 border border-[var(--vs-border)]" />
        <td className="py-2.5 px-3 border border-[var(--vs-border)] text-right text-indigo-600 dark:text-indigo-400">{formatINR(doc.totalValue)}</td>
      </tr>
    </tfoot>
  );

  const modalCfg = {
    post: {
      title: 'Add to stock',
      message: `Post ${doc.openingNumber}? The quantities go into ${storeName(doc)} stock as batches dated ${fmtDate(doc.openingDate)}.`,
      label: 'Add to stock',
      variant: 'primary',
      onConfirm: () => run(() => postOpeningStockApi(doc._id), 'Opening stock added'),
    },
    cancel: {
      title: 'Cancel opening stock',
      message:
        doc.status === 'posted'
          ? 'Its batches are taken out of stock again. This fails if some of them were already sold or moved.'
          : 'Cancel this unfinished opening stock?',
      label: 'Cancel opening stock',
      variant: 'danger',
      withReason: true,
      onConfirm: (reason) => run(() => cancelOpeningStockApi(doc._id, reason), 'Opening stock cancelled'),
    },
  }[modal];

  return (
    <PageShell title={`Opening stock ${doc.openingNumber}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vs-border)] pb-4">
        <OpeningStatus status={doc.status} size="lg" />
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {doc.status === 'draft' && (
            <>
              <Button size="sm" onClick={() => setModal('post')} startIcon={<PackageCheck className="w-4 h-4" />}>
                Add to stock
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(openingEditPath(doc._id))} startIcon={<Edit2 className="w-4 h-4" />}>
                Edit
              </Button>
            </>
          )}
          {doc.status !== 'cancelled' && (
            <Button size="sm" variant="outline" onClick={() => setModal('cancel')} startIcon={<Ban className="w-4 h-4" />}>
              Cancel
            </Button>
          )}
          {['draft', 'cancelled'].includes(doc.status) && (
            <Button size="sm" variant="danger" onClick={() => setModal('delete')} startIcon={<Trash2 className="w-4 h-4" />}>
              Delete
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()} startIcon={<Printer className="w-4 h-4" />}>
            Print
          </Button>
        </div>
      </div>

      <Section title="Details" bodyClassName="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoRow label="Number" value={doc.openingNumber} mono />
        <InfoRow label="Opening date" value={fmtDate(doc.openingDate)} />
        <InfoRow label="Store" value={storeName(doc)} />
        <InfoRow label="Value (at cost)" value={formatINR(doc.totalValue)} />
        <InfoRow label="Created by" value={doc.createdByName || '—'} />
        {doc.postedAt && <InfoRow label="Added to stock" value={`${fmtDate(doc.postedAt)}${doc.postedBy ? ` · ${doc.postedBy}` : ''}`} />}
        {doc.status === 'cancelled' && <InfoRow label="Cancel reason" value={doc.cancelReason || '—'} />}
      </Section>

      <Section title="Products" bodyClassName="p-3">
        <LinesTable columns={columns} rows={doc.items || []} minWidth={1000} footer={footer} />
      </Section>

      {doc.notes && (
        <Section title="Notes">
          <p className="text-sm whitespace-pre-wrap">{doc.notes}</p>
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
          loading={busy}
          onClose={() => setModal(null)}
          onConfirm={modalCfg.onConfirm}
        />
      )}
      <DeleteModal
        isOpen={modal === 'delete'}
        isLoading={busy}
        onClose={() => setModal(null)}
        onConfirm={runDelete}
        title="Delete opening stock"
        message={`Delete ${doc.openingNumber}? This cannot be undone.`}
      />
      <PurchaseToaster />
    </PageShell>
  );
}
