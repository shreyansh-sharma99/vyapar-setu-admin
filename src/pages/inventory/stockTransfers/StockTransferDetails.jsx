import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Edit2,
  Truck,
  PackageCheck,
  Ban,
  Trash2,
  Printer,
  Loader2,
  FilePlus2,
  CheckCircle2,
  XCircle,
  Warehouse,
  Calendar,
  StickyNote,
  AlertTriangle,
} from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Loader from '@/components/loader/Loader';
import DeleteModal from '@/components/modal/DeleteModal';
import {
  getStockTransferByIdApi,
  dispatchStockTransferApi,
  receiveStockTransferApi,
  cancelStockTransferApi,
  deleteStockTransferApi,
} from './services/stockTransferService';
import { StatusPill, Modal, ToastStack, StatCard } from './components/ui';
import useToasts from './components/useToasts';
import {
  TRANSFER_STATUS,
  fmtINR,
  fmtQty,
  fmtDate,
  fmtDateTime,
  encId,
  decId,
  apiError,
  fieldCls,
} from './components/utils';

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  body > *:not(#transfer-slip) { display: none !important; }

  #transfer-slip { display: block !important; width: 100%; color: #000; background: #fff; }
}
`;

const storeName = (populated, snap) => populated?.name || snap?.name || '—';
const storeCode = (populated, snap) => populated?.code || snap?.code || '';

function Timeline({ transfer }) {
  const steps = [
    {
      key: 'created',
      label: 'Created',
      done: true,
      at: transfer.createdAt,
      by: transfer.createdByName,
      icon: <FilePlus2 className="w-4 h-4" />,
      tone: 'bg-indigo-500',
    },
  ];
  if (transfer.status !== 'cancelled' || transfer.dispatchedAt) {
    steps.push({
      key: 'dispatched',
      label: 'Dispatched',
      done: !!transfer.dispatchedAt,
      at: transfer.dispatchedAt,
      by: transfer.dispatchedBy,
      note: transfer.vehicleNumber ? `Vehicle ${transfer.vehicleNumber}` : '',
      icon: <Truck className="w-4 h-4" />,
      tone: 'bg-amber-500',
    });
  }
  if (transfer.status !== 'cancelled') {
    steps.push({
      key: 'received',
      label: 'Received',
      done: !!transfer.receivedAt,
      at: transfer.receivedAt,
      by: transfer.receivedBy,
      note: transfer.receiveNotes,
      icon: <PackageCheck className="w-4 h-4" />,
      tone: 'bg-emerald-500',
    });
  }
  if (transfer.status === 'cancelled') {
    steps.push({
      key: 'cancelled',
      label: 'Cancelled',
      done: true,
      at: transfer.cancelledAt,
      note: transfer.cancelReason ? `Reason: ${transfer.cancelReason}` : '',
      icon: <XCircle className="w-4 h-4" />,
      tone: 'bg-rose-500',
    });
  }

  return (
    <ol className="relative m-0 p-0 list-none">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${steps[i + 1].done ? 'bg-indigo-400/60' : 'bg-[var(--vs-border)]'}`}
            />
          )}
          <span
            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${s.done ? s.tone : 'bg-slate-300 dark:bg-white/10'
              }`}
          >
            {s.icon}
          </span>
          <div className="min-w-0 pt-0.5">
            <div className={`text-sm font-bold ${s.done ? 'text-[var(--vs-text-primary)]' : 'text-[var(--vs-text-secondary)]'}`}>
              {s.label}
              {!s.done && <span className="ml-2 text-[11px] font-semibold text-[var(--vs-text-secondary)]">Pending</span>}
            </div>
            {s.done && (
              <div className="text-xs text-[var(--vs-text-secondary)]">
                {fmtDateTime(s.at)}
                {s.by ? ` · by ${s.by}` : ''}
              </div>
            )}
            {s.note && <div className="text-xs text-[var(--vs-text-secondary)] mt-0.5 italic">{s.note}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function TransferSlip({ transfer }) {
  return createPortal(<SlipBody transfer={transfer} />, document.body);
}

function SlipBody({ transfer }) {
  const showReceived = transfer.status === 'received';
  return (
    <div id="transfer-slip" className="hidden" style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>STOCK TRANSFER SLIP</div>
          <div>Status: {TRANSFER_STATUS[transfer.status]?.label || transfer.status}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{transfer.transferNumber}</div>
          <div>Date: {fmtDate(transfer.transferDate)}</div>
          {transfer.vehicleNumber && <div>Vehicle: {transfer.vehicleNumber}</div>}
        </div>
      </div>
      <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', verticalAlign: 'top', padding: 6, border: '1px solid #999' }}>
              <b>FROM</b>
              <br />
              {storeName(transfer.fromStoreId, transfer.fromStoreSnapshot)} {storeCode(transfer.fromStoreId, transfer.fromStoreSnapshot) && `(${storeCode(transfer.fromStoreId, transfer.fromStoreSnapshot)})`}
            </td>
            <td style={{ width: '50%', verticalAlign: 'top', padding: 6, border: '1px solid #999' }}>
              <b>TO</b>
              <br />
              {storeName(transfer.toStoreId, transfer.toStoreSnapshot)} {storeCode(transfer.toStoreId, transfer.toStoreSnapshot) && `(${storeCode(transfer.toStoreId, transfer.toStoreSnapshot)})`}
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            {['#', 'Product', 'SKU', 'Unit', 'Qty sent', ...(showReceived ? ['Received', 'Short'] : ['Received (sign)'])].map((h) => (
              <th key={h} style={{ border: '1px solid #999', padding: 5, textAlign: 'left' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(transfer.items || []).map((it, i) => (
            <tr key={it._id}>
              <td style={{ border: '1px solid #999', padding: 5 }}>{i + 1}</td>
              <td style={{ border: '1px solid #999', padding: 5 }}>{it.productId?.name || it.productName}</td>
              <td style={{ border: '1px solid #999', padding: 5 }}>{it.productId?.sku || it.sku || ''}</td>
              <td style={{ border: '1px solid #999', padding: 5 }}>{it.productId?.unit || it.unit}</td>
              <td style={{ border: '1px solid #999', padding: 5, textAlign: 'right' }}>{fmtQty(it.qty)}</td>
              {showReceived ? (
                <>
                  <td style={{ border: '1px solid #999', padding: 5, textAlign: 'right' }}>{fmtQty(it.receivedQty)}</td>
                  <td style={{ border: '1px solid #999', padding: 5, textAlign: 'right' }}>{it.shortQty ? fmtQty(it.shortQty) : ''}</td>
                </>
              ) : (
                <td style={{ border: '1px solid #999', padding: 5, width: 110 }} />
              )}
            </tr>
          ))}
          <tr>
            <td colSpan={4} style={{ border: '1px solid #999', padding: 5, textAlign: 'right', fontWeight: 700 }}>
              Total
            </td>
            <td style={{ border: '1px solid #999', padding: 5, textAlign: 'right', fontWeight: 700 }}>{fmtQty(transfer.totalQty)}</td>
            {showReceived ? (
              <>
                <td style={{ border: '1px solid #999', padding: 5 }} />
                <td style={{ border: '1px solid #999', padding: 5 }} />
              </>
            ) : (
              <td style={{ border: '1px solid #999', padding: 5 }} />
            )}
          </tr>
        </tbody>
      </table>
      {transfer.notes && (
        <p style={{ marginTop: 10 }}>
          <b>Notes:</b> {transfer.notes}
        </p>
      )}
      <table style={{ width: '100%', marginTop: 40 }}>
        <tbody>
          <tr>
            {['Prepared by', 'Dispatched by', 'Received by'].map((l, i) => (
              <td key={l} style={{ width: '33%', textAlign: 'center', paddingTop: 30 }}>
                <div style={{ borderTop: '1px solid #000', margin: '0 16px', paddingTop: 4 }}>
                  {l}
                  <br />
                  <span style={{ fontSize: 11 }}>
                    {[transfer.createdByName, transfer.dispatchedBy, transfer.receivedBy][i] || ''}
                  </span>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function StockTransferDetails() {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = decId(rawId);
  const { toasts, showToast } = useToasts(location.state);

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [receive, setReceive] = useState({ isOpen: false, qty: {}, notes: '' });
  const [cancel, setCancel] = useState({ isOpen: false, reason: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    getStockTransferByIdApi(id)
      .then((res) => {
        if (alive) setTransfer(res.data);
      })
      .catch((err) => {
        if (alive) showToast(apiError(err, 'Could not load the transfer'), 'danger');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, showToast]);

  const run = async (key, fn, after) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res?.data) setTransfer(res.data);
      showToast(res?.message || 'Done', 'success');
      after?.();
    } catch (err) {
      showToast(apiError(err, 'Action failed'), 'danger');
    } finally {
      setBusy('');
    }
  };

  const openReceive = () => {
    const qty = {};
    (transfer.items || []).forEach((it) => {
      qty[it._id] = String(it.qty);
    });
    setReceive({ isOpen: true, qty, notes: '' });
  };

  const receiveLines = (transfer?.items || []).map((it) => {
    const raw = receive.qty[it._id];
    const rec = raw === '' || raw === undefined ? 0 : Math.max(0, Math.min(Number(it.qty), Number(raw) || 0));
    const short = Math.max(0, Number(it.qty) - rec);
    const unitValue = it.qty > 0 ? (Number(it.value) || 0) / Number(it.qty) : 0;
    return { it, rec, short, shortValue: short * unitValue, invalid: raw !== '' && (Number(raw) < 0 || Number(raw) > Number(it.qty)) };
  });
  const receiveShortValue = receiveLines.reduce((s, l) => s + l.shortValue, 0);
  const receiveShortLines = receiveLines.filter((l) => l.short > 0).length;
  const receiveInvalid = receiveLines.some((l) => l.invalid);

  const submitReceive = () =>
    run(
      'receive',
      () =>
        receiveStockTransferApi(transfer._id, {
          items: receiveLines.map((l) => ({ itemId: l.it._id, receivedQty: l.rec })),
          notes: receive.notes.trim(),
        }),
      () => setReceive({ isOpen: false, qty: {}, notes: '' })
    );

  if (loading || !transfer) {
    return (
      <Card h1="Stock Transfer" buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
        {loading ? (
          <Loader className="my-10" />
        ) : (
          <p className="text-sm text-[var(--vs-text-secondary)] text-center py-10">Transfer not found.</p>
        )}
        <ToastStack toasts={toasts} />
      </Card>
    );
  }

  const s = transfer.status;
  const items = transfer.items || [];
  const totalReceived = items.reduce((a, it) => a + (Number(it.receivedQty) || 0), 0);
  const totalShort = items.reduce((a, it) => a + (Number(it.shortQty) || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <style>{PRINT_CSS}</style>
      <TransferSlip transfer={transfer} />

      <Card
        h1={`Transfer ${transfer.transferNumber}`}
        description={`Dated ${fmtDate(transfer.transferDate)}`}
        buttonName="Back"
        navigation="/inventory/transfers"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-4 sm:p-6"
      >
        {/* Control bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--vs-border)]">
          <StatusPill map={TRANSFER_STATUS} status={s} className="!text-xs !px-3 !py-1" />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => window.print()} startIcon={<Printer className="w-3.5 h-3.5" />} className="!h-9 px-3">
              Print slip
            </Button>
            {s === 'draft' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/inventory/transfers/edit/${encId(transfer._id)}`)}
                  startIcon={<Edit2 className="w-3.5 h-3.5" />}
                  className="!h-9 px-3"
                >
                  Edit
                </Button>
                <Button onClick={() => setDispatchOpen(true)} startIcon={<Truck className="w-3.5 h-3.5" />} className="!h-9 px-3" disabled={!!busy}>
                  Dispatch
                </Button>
              </>
            )}
            {s === 'in_transit' && (
              <Button onClick={openReceive} startIcon={<PackageCheck className="w-3.5 h-3.5" />} className="!h-9 px-3" disabled={!!busy}>
                Receive
              </Button>
            )}
            {(s === 'draft' || s === 'in_transit') && (
              <Button
                variant="outline"
                onClick={() => setCancel({ isOpen: true, reason: '' })}
                startIcon={<Ban className="w-3.5 h-3.5" />}
                className="!h-9 px-3 !text-rose-600 !border-rose-300 dark:!border-rose-500/40"
                disabled={!!busy}
              >
                Cancel
              </Button>
            )}
            {(s === 'draft' || s === 'cancelled') && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)} startIcon={<Trash2 className="w-3.5 h-3.5" />} className="!h-9 px-3" disabled={!!busy}>
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <div className="rounded-xl border border-[var(--vs-border)] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">From</div>
              <div className="font-bold text-[var(--vs-text-primary)] truncate">{storeName(transfer.fromStoreId, transfer.fromStoreSnapshot)}</div>
              <div className="text-xs font-mono text-[var(--vs-text-secondary)]">{storeCode(transfer.fromStoreId, transfer.fromStoreSnapshot)}</div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-indigo-500 rotate-90 md:rotate-0" />
          </div>
          <div className="rounded-xl border border-[var(--vs-border)] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">To</div>
              <div className="font-bold text-[var(--vs-text-primary)] truncate">{storeName(transfer.toStoreId, transfer.toStoreSnapshot)}</div>
              <div className="text-xs font-mono text-[var(--vs-text-secondary)]">{storeCode(transfer.toStoreId, transfer.toStoreSnapshot)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <StatCard label="Products" value={items.length} tone="indigo" />
          <StatCard label="Qty sent" value={fmtQty(transfer.totalQty)} tone="blue" />
          <StatCard
            label="Value"
            value={s === 'draft' ? '—' : fmtINR(transfer.totalValue)}
            sub={s === 'draft' ? 'Fixed when dispatched (at cost)' : 'At cost'}
            tone="emerald"
          />
          <StatCard
            label="Short on receipt"
            value={s === 'received' ? fmtINR(transfer.shortValue) : '—'}
            sub={s === 'received' ? `${fmtQty(totalShort)} units short` : 'Known after receiving'}
            tone={transfer.shortValue > 0 ? 'rose' : 'slate'}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Items */}
        <Card h1="Items" bodyClassName="p-0" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[var(--vs-text-secondary)] border-b border-[var(--vs-border)]">
                  <th className="text-left font-bold px-4 py-2.5">Product</th>
                  <th className="text-right font-bold px-3 py-2.5">Sent</th>
                  <th className="text-right font-bold px-3 py-2.5">Received</th>
                  <th className="text-right font-bold px-3 py-2.5">Short</th>
                  <th className="text-right font-bold px-4 py-2.5">Value</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id} className="border-b border-[var(--vs-border)] last:border-b-0">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-[var(--vs-text-primary)]">{it.productId?.name || it.productName}</div>
                      <div className="text-[11px] font-mono text-[var(--vs-text-secondary)]">{it.productId?.sku || it.sku || '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                      {fmtQty(it.qty)} <span className="text-[10px] text-[var(--vs-text-secondary)]">{it.productId?.unit || it.unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{s === 'received' ? fmtQty(it.receivedQty) : '—'}</td>
                    <td
                      className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${it.shortQty > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--vs-text-secondary)]'}`}
                    >
                      {s === 'received' ? (it.shortQty > 0 ? fmtQty(it.shortQty) : '0') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">{s === 'draft' ? '—' : fmtINR(it.value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--vs-bg-secondary)] font-bold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-3 py-2.5 text-right">{fmtQty(transfer.totalQty)}</td>
                  <td className="px-3 py-2.5 text-right">{s === 'received' ? fmtQty(totalReceived) : '—'}</td>
                  <td className={`px-3 py-2.5 text-right ${totalShort > 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                    {s === 'received' ? fmtQty(totalShort) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">{s === 'draft' ? '—' : fmtINR(transfer.totalValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Timeline + meta */}
        <div className="flex flex-col gap-4">
          <Card h1="Timeline" bodyClassName="p-4">
            <Timeline transfer={transfer} />
          </Card>
          <Card h1="Details" bodyClassName="p-4 flex flex-col gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-[var(--vs-text-secondary)] mt-0.5" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--vs-text-secondary)]">Transfer date</div>
                <div>{fmtDate(transfer.transferDate)}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-[var(--vs-text-secondary)] mt-0.5" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--vs-text-secondary)]">Vehicle</div>
                <div className="font-mono">{transfer.vehicleNumber || '—'}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <StickyNote className="w-4 h-4 text-[var(--vs-text-secondary)] mt-0.5" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--vs-text-secondary)]">Notes</div>
                <div className="whitespace-pre-wrap">{transfer.notes || '—'}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Dispatch confirm */}
      <Modal
        isOpen={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        busy={busy === 'dispatch'}
        size="sm"
        icon={<Truck className="w-4 h-4" />}
        title="Dispatch this transfer?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDispatchOpen(false)} disabled={busy === 'dispatch'}>
              Go back
            </Button>
            <Button
              onClick={() => run('dispatch', () => dispatchStockTransferApi(transfer._id), () => setDispatchOpen(false))}
              disabled={busy === 'dispatch'}
              startIcon={busy === 'dispatch' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            >
              Dispatch
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--vs-text-secondary)] m-0">
          {fmtQty(transfer.totalQty)} units will leave <b>{storeName(transfer.fromStoreId, transfer.fromStoreSnapshot)}</b> now and stay
          in transit until <b>{storeName(transfer.toStoreId, transfer.toStoreSnapshot)}</b> receives them.
        </p>
      </Modal>

      {/* Receive */}
      <Modal
        isOpen={receive.isOpen}
        onClose={() => setReceive({ isOpen: false, qty: {}, notes: '' })}
        busy={busy === 'receive'}
        size="lg"
        icon={<PackageCheck className="w-4 h-4" />}
        title="Receive stock"
        subtitle={`Enter what actually arrived at ${storeName(transfer.toStoreId, transfer.toStoreSnapshot)}. Anything less than sent is recorded as short.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setReceive({ isOpen: false, qty: {}, notes: '' })} disabled={busy === 'receive'}>
              Cancel
            </Button>
            <Button
              onClick={submitReceive}
              disabled={busy === 'receive' || receiveInvalid}
              startIcon={busy === 'receive' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            >
              Confirm receipt
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          {receiveLines.map(({ it, short, shortValue, invalid }) => (
            <div
              key={it._id}
              className={`grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_80px_120px_110px] gap-2 items-center rounded-xl border px-3 py-2 ${short > 0 ? 'border-rose-300/70 bg-rose-50/50 dark:bg-rose-500/5 dark:border-rose-500/30' : 'border-[var(--vs-border)]'
                }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate text-[var(--vs-text-primary)]">{it.productId?.name || it.productName}</div>
                <div className="text-[11px] text-[var(--vs-text-secondary)]">
                  Sent {fmtQty(it.qty)} {it.productId?.unit || it.unit}
                </div>
              </div>
              <div className="hidden sm:block text-right text-sm font-semibold">{fmtQty(it.qty)}</div>
              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={it.qty}
                  step="any"
                  value={receive.qty[it._id] ?? ''}
                  onChange={(e) => setReceive((r) => ({ ...r, qty: { ...r.qty, [it._id]: e.target.value } }))}
                  className={`${fieldCls} !h-9 text-right font-semibold ${invalid ? '!border-rose-500' : ''}`}
                  aria-label={`Received quantity for ${it.productId?.name || it.productName}`}
                />
              </div>
              <div className="col-span-2 sm:col-span-1 text-right text-xs">
                {short > 0 ? (
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    Short {fmtQty(short)}
                    {shortValue > 0 && <span className="block font-medium">{fmtINR(shortValue)}</span>}
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Full</span>
                )}
              </div>
            </div>
          ))}
          {receiveInvalid && (
            <p className="text-xs font-semibold text-rose-600 m-0">Received quantity must be between 0 and the quantity sent.</p>
          )}
          {receiveShortLines > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 px-3 py-2 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {receiveShortLines} line{receiveShortLines === 1 ? ' is' : 's are'} short — estimated loss {fmtINR(receiveShortValue)}. Short stock
              will not be added to either store.
            </div>
          )}
          <textarea
            value={receive.notes}
            onChange={(e) => setReceive((r) => ({ ...r, notes: e.target.value }))}
            placeholder="Notes (e.g. 2 boxes damaged in transit)"
            rows={2}
            className={`${fieldCls} !h-auto py-2 mt-1`}
          />
        </div>
      </Modal>

      {/* Cancel */}
      <Modal
        isOpen={cancel.isOpen}
        onClose={() => setCancel({ isOpen: false, reason: '' })}
        busy={busy === 'cancel'}
        size="sm"
        icon={<Ban className="w-4 h-4" />}
        title="Cancel this transfer?"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancel({ isOpen: false, reason: '' })} disabled={busy === 'cancel'}>
              Keep transfer
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                run('cancel', () => cancelStockTransferApi(transfer._id, { reason: cancel.reason.trim() }), () =>
                  setCancel({ isOpen: false, reason: '' })
                )
              }
              disabled={busy === 'cancel' || cancel.reason.trim().length < 3}
              startIcon={busy === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            >
              Cancel transfer
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--vs-text-secondary)] mt-0">
          {s === 'in_transit'
            ? 'The stock in transit will go back to the source store.'
            : 'No stock has moved yet. The draft will be marked as cancelled.'}
        </p>
        <textarea
          value={cancel.reason}
          onChange={(e) => setCancel((c) => ({ ...c, reason: e.target.value }))}
          placeholder="Reason (required)"
          rows={3}
          className={`${fieldCls} !h-auto py-2`}
          autoFocus
        />
      </Modal>

      <DeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        isLoading={busy === 'delete'}
        onConfirm={async () => {
          setBusy('delete');
          try {
            const res = await deleteStockTransferApi(transfer._id);
            navigate('/inventory/transfers', { state: { message: res?.message || 'Transfer deleted', color: 'success' } });
          } catch (err) {
            showToast(apiError(err, 'Could not delete'), 'danger');
            setBusy('');
            setDeleteOpen(false);
          }
        }}
        title="Delete Transfer"
        message={`Delete transfer ${transfer.transferNumber}? This cannot be undone.`}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
