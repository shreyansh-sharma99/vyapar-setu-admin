import { useEffect, useRef } from 'react';
import { Modal } from 'antd';
import AntdThemed from '@/pages/masterSettings/components/AntdThemed';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const money = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const th = 'py-2 px-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] whitespace-nowrap';

/**
 * "Which batch?" — shown when the product's open batches in this store differ in SP or
 * MRP. Batches come oldest first (the order they are sold); Enter picks the oldest.
 * Each batch sells at its own price.
 */
export default function BatchPickerModal({ picker, onPick, onClose }) {
  const firstRef = useRef(null);
  const open = !!picker;

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => firstRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  const batches = picker?.batches || [];
  const pickOnEnter = (b) => (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onPick(b);
    }
  };
  return (
    <AntdThemed>
      <Modal open={open} onCancel={onClose} footer={null} title={`Which batch? — ${picker?.product?.name || ''}`} destroyOnHidden width={680}>
        <p className="text-xs text-[var(--vs-text-secondary)] mb-1">
          This product is on the shelf at different prices. Pick the batch in the customer&apos;s hand. Enter = oldest.
        </p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3">Customer wants new stock? Pick the newer batch.</p>
        <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
          <table className="w-full text-sm border-collapse min-w-[600px]" role="listbox">
            <thead className="bg-[var(--vs-bg-secondary)]">
              <tr>
                <th className={th}>Batch</th>
                <th className={th}>Store</th>
                <th className={th}>Received</th>
                <th className={th}>Expiry</th>
                <th className={`${th} text-right`}>MRP</th>
                <th className={`${th} text-right`}>SP</th>
                <th className={`${th} text-right`}>Left</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b, i) => {
                const sp = Number(b.clearancePrice) > 0 ? Number(b.clearancePrice) : Number(b.sellingPrice) || 0;
                return (
                  <tr
                    key={b._id}
                    ref={i === 0 ? firstRef : null}
                    tabIndex={0}
                    role="option"
                    aria-selected={false}
                    onClick={() => onPick(b)}
                    onKeyDown={pickOnEnter(b)}
                    className="border-t border-[var(--vs-border)] cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 focus:bg-indigo-50 dark:focus:bg-indigo-500/10 focus:outline-none"
                  >
                    <td className="py-2 px-2 font-mono font-semibold">
                      {b.batchNo || '—'}
                      {i === 0 && <span className="ml-1.5 text-[10px] font-sans font-semibold text-indigo-600 dark:text-indigo-400">Oldest</span>}
                    </td>
                    <td className="py-2 px-2 text-xs">{b.storeName || '—'}</td>
                    <td className="py-2 px-2 text-xs">{fmtDay(b.receivedAt)}</td>
                    <td className="py-2 px-2 text-xs">{fmtDay(b.expiryDate)}</td>
                    <td className="py-2 px-2 text-right">{Number(b.mrp) > 0 ? money(b.mrp) : '—'}</td>
                    <td className="py-2 px-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {sp > 0 ? money(sp) : <span className="text-xs font-normal text-[var(--vs-text-secondary)]">Default</span>}
                      {Number(b.clearancePrice) > 0 && <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Clearance</div>}
                      {sp > 0 && !(Number(b.clearancePrice) > 0) && b.priceIncludesGst === false && <div className="text-[10px] font-normal text-[var(--vs-text-secondary)]">+ GST</div>}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">{Number(b.qtyRemaining) || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>
    </AntdThemed>
  );
}
