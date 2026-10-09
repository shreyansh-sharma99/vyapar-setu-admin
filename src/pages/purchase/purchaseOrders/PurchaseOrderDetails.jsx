import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CheckCircle2, Edit2, PackageCheck, Printer, Send, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import LinesTable from '../components/LinesTable';
import { DocTotals } from '../components/Totals';
import { ConfirmModal, InfoRow, PageLoading, PageShell, Section, StatusBadge } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, decId, editPath, errMsg, fmtDate, formatINR, formatQty, num, storeName, supplierName, viewPath } from '../components/helpers';
import { deletePurchaseOrder, fetchPurchaseOrder, setPurchaseOrderStatus } from './services/purchaseOrderSlice';

const STATUS_ACTIONS = {
  sent: { title: 'Mark as sent', message: 'Mark this order as sent to the supplier? You can still edit it afterwards.', label: 'Mark sent', variant: 'primary' },
  closed: { title: 'Close purchase order', message: 'Stop waiting for the remaining quantity? The order will be closed and no more goods can be received against it.', label: 'Close order', variant: 'primary' },
  cancelled: { title: 'Cancel purchase order', message: 'Cancel this purchase order? This cannot be undone.', label: 'Cancel order', variant: 'danger' },
};

export default function PurchaseOrderDetails() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, currentError, saving } = useSelector((state) => state.purchaseOrder);
  const [statusAction, setStatusAction] = useState(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchPurchaseOrder(id));
  }, [dispatch, id]);

  if (!id) return <PageLoading title="Purchase order" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Purchase order" error={currentError} />;

  const po = current;
  const canEdit = ['draft', 'sent'].includes(po.status);
  const canReceive = ['sent', 'partially_received'].includes(po.status);

  const runStatus = async () => {
    const status = statusAction;
    try {
      const res = await dispatch(setPurchaseOrderStatus({ id: po._id, status })).unwrap();
      notify(res?.message || 'Purchase order updated');
      setStatusAction(null);
      dispatch(fetchPurchaseOrder(po._id));
    } catch (e) {
      notifyError(errMsg(e));
    }
  };

  const runDelete = async () => {
    try {
      const res = await dispatch(deletePurchaseOrder(po._id)).unwrap();
      notify(res?.message || 'Purchase order deleted');
      navigate(PATHS.orders, { replace: true });
    } catch (e) {
      setShowDelete(false);
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
          <div className="text-[11px] text-[var(--vs-text-secondary)]">{[l.sku && `SKU ${l.sku}`, l.hsnCode && `HSN ${l.hsnCode}`].filter(Boolean).join(' · ')}</div>
        </div>
      ),
    },
    { key: 'qty', label: 'Ordered', align: 'right', render: (l) => `${formatQty(l.qty)} ${l.unit}` },
    { key: 'received', label: 'Received', align: 'right', render: (l) => <span className="text-emerald-600 dark:text-emerald-400">{formatQty(l.receivedQty)}</span> },
    {
      key: 'pending',
      label: 'Pending',
      align: 'right',
      render: (l) => <span className={num(l.pendingQty) > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-[var(--vs-text-secondary)]'}>{formatQty(l.pendingQty)}</span>,
    },
    { key: 'rate', label: 'Rate', align: 'right', render: (l) => formatINR(l.rate) },
    { key: 'disc', label: 'Disc %', align: 'right', render: (l) => (num(l.discountPercent) ? `${l.discountPercent}%` : '—') },
    { key: 'taxable', label: 'Taxable', align: 'right', render: (l) => formatINR(l.taxableValue) },
    { key: 'gst', label: 'GST', align: 'right', render: (l) => `${num(l.taxPercent)}% · ${formatINR(l.taxAmount)}` },
    { key: 'total', label: 'Amount', align: 'right', render: (l) => <span className="font-semibold">{formatINR(l.total)}</span> },
  ];

  const receiptColumns = [
    {
      key: 'grn',
      label: 'GRN',
      render: (g) => (
        <button type="button" onClick={() => navigate(viewPath('receipts', g._id))} className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
          {g.grnNumber}
        </button>
      ),
    },
    { key: 'date', label: 'Date', render: (g) => fmtDate(g.grnDate) },
    { key: 'status', label: 'Status', render: (g) => <StatusBadge status={g.status} /> },
    { key: 'value', label: 'Value', align: 'right', render: (g) => formatINR(g.totalValue) },
    { key: 'bill', label: 'Billed', render: (g) => (g.purchaseBillId ? 'Yes' : g.status === 'posted' ? 'Not yet' : '—') },
  ];

  const totalOrdered = po.items.reduce((s, l) => s + num(l.qty), 0);
  const totalReceived = po.items.reduce((s, l) => s + Math.min(num(l.receivedQty), num(l.qty)), 0);
  const progress = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  return (
    <PageShell title={`Purchase order ${po.poNumber}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vs-border)] pb-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={po.status} size="lg" />
          <span className="text-xs text-[var(--vs-text-secondary)]">{progress}% received</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {canReceive && (
            <Button size="sm" onClick={() => navigate(`${PATHS.receipts}/create`, { state: { purchaseOrderId: po._id } })} startIcon={<PackageCheck className="w-4 h-4" />}>
              Receive goods
            </Button>
          )}
          {po.status === 'draft' && (
            <Button size="sm" onClick={() => setStatusAction('sent')} startIcon={<Send className="w-4 h-4" />}>
              Mark sent
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => navigate(editPath('orders', po._id))} startIcon={<Edit2 className="w-4 h-4" />}>
              Edit
            </Button>
          )}
          {canReceive && (
            <Button size="sm" variant="outline" onClick={() => setStatusAction('closed')} startIcon={<CheckCircle2 className="w-4 h-4" />}>
              Close
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setStatusAction('cancelled')} startIcon={<Ban className="w-4 h-4" />}>
              Cancel
            </Button>
          )}
          {['draft', 'cancelled'].includes(po.status) && (
            <Button size="sm" variant="danger" onClick={() => setShowDelete(true)} startIcon={<Trash2 className="w-4 h-4" />}>
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
                <button
                  type="button"
                  onClick={() => navigate(viewPath('suppliers', po.supplierId?._id || po.supplierId))}
                  className="text-left font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {supplierName(po)}
                </button>
                {po.supplierSnapshot?.companyName && <div className="text-xs text-[var(--vs-text-secondary)]">{po.supplierSnapshot.companyName}</div>}
              </div>
              <InfoRow label="Phone" value={po.supplierSnapshot?.phone} />
              <InfoRow label="GSTIN" value={po.supplierSnapshot?.gstin || 'Unregistered'} mono />
              <div className="sm:col-span-2">
                <InfoRow label="Address" value={po.supplierSnapshot?.address} />
              </div>
            </Section>
            <Section title="Order info" bodyClassName="p-4 grid grid-cols-2 gap-3">
              <InfoRow label="PO number" value={po.poNumber} mono />
              <InfoRow label="Order date" value={fmtDate(po.poDate)} />
              <InfoRow label="Expected delivery" value={fmtDate(po.expectedDate)} />
              <InfoRow label="Deliver to" value={storeName(po)} />
              <InfoRow label="Created by" value={po.createdByName} />
              <InfoRow label="Created on" value={fmtDate(po.createdAt)} />
            </Section>
          </div>

          <Section title="Items" bodyClassName="p-3">
            <LinesTable columns={columns} rows={po.items} minWidth={900} />
          </Section>

          <Section title="Goods receipts against this order" bodyClassName="p-3">
            <LinesTable columns={receiptColumns} rows={po.receipts || []} minWidth={520} emptyText="Nothing received yet." />
          </Section>

          {(po.notes || po.terms) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {po.notes && (
                <Section title="Notes">
                  <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
                </Section>
              )}
              {po.terms && (
                <Section title="Terms & conditions">
                  <p className="text-sm whitespace-pre-wrap">{po.terms}</p>
                </Section>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <Section title="Amount">
            <DocTotals doc={po} />
          </Section>
        </div>
      </div>

      {statusAction && (
        <ConfirmModal
          open
          title={STATUS_ACTIONS[statusAction].title}
          message={STATUS_ACTIONS[statusAction].message}
          confirmLabel={STATUS_ACTIONS[statusAction].label}
          variant={STATUS_ACTIONS[statusAction].variant}
          loading={saving}
          onClose={() => setStatusAction(null)}
          onConfirm={runStatus}
        />
      )}
      <DeleteModal
        isOpen={showDelete}
        isLoading={saving}
        onClose={() => setShowDelete(false)}
        onConfirm={runDelete}
        title="Delete purchase order"
        message={`Delete ${po.poNumber}? This cannot be undone.`}
      />
      <PurchaseToaster />
    </PageShell>
  );
}
