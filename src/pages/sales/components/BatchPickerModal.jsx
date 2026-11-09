import { useEffect, useRef } from 'react';
import { Badge, LINE_TD, LINE_TH, LineItemsTable, LineRow, Modal } from '@/components/ui';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const money = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const th = LINE_TH;
const td = `${LINE_TD} !py-2.5`;

/**
 * "Which batch?" — shown when the product's open batches differ in SP or
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
    <Modal open={open} onClose={onClose} title={`Which batch? — ${picker?.product?.name || ''}`} size="lg">
      <p className="m-0 mb-1 text-xs text-ink-muted">
        This product is on the shelf at different prices. Pick the batch in the customer&apos;s hand. Enter = oldest.
      </p>
      <p className="m-0 mb-3 text-xs font-medium text-brand-ink">Customer wants new stock? Pick the newer batch.</p>
      <div role="listbox" aria-label="Batches">
        <LineItemsTable
          minWidth={600}
          head={
            <tr>
              <th className={th}>Batch</th>
              <th className={th}>Received</th>
              <th className={th}>Expiry</th>
              <th className={`${th} text-right`}>MRP</th>
              <th className={`${th} text-right`}>SP</th>
              <th className={`${th} text-right`}>Left</th>
            </tr>
          }
        >
          {batches.map((b, i) => {
            const sp = Number(b.clearancePrice) > 0 ? Number(b.clearancePrice) : Number(b.sellingPrice) || 0;
            return (
              <LineRow
                key={b._id}
                ref={i === 0 ? firstRef : null}
                tabIndex={0}
                role="option"
                aria-selected={false}
                onClick={() => onPick(b)}
                onKeyDown={pickOnEnter(b)}
                className="cursor-pointer focus:outline-none focus:[&>td]:bg-brand-soft"
              >
                <td className={`${td} font-mono font-semibold whitespace-nowrap`}>
                  {b.batchNo || '—'}
                  {i === 0 && <Badge tone="primary" size="xs" className="ml-1.5 font-sans">Oldest</Badge>}
                </td>
                <td className={`${td} text-xs text-ink-muted whitespace-nowrap`}>{fmtDay(b.receivedAt)}</td>
                <td className={`${td} text-xs text-ink-muted whitespace-nowrap`}>{fmtDay(b.expiryDate)}</td>
                <td className={`${td} text-right tabular-nums`}>{Number(b.mrp) > 0 ? money(b.mrp) : '—'}</td>
                <td className={`${td} text-right font-bold tabular-nums text-brand-ink`}>
                  {sp > 0 ? money(sp) : <span className="text-xs font-normal text-ink-muted">Default</span>}
                  {Number(b.clearancePrice) > 0 && <div className="text-[10px] font-semibold text-warning">Clearance</div>}
                  {sp > 0 && !(Number(b.clearancePrice) > 0) && b.priceIncludesGst === false && <div className="text-[10px] font-normal text-ink-muted">+ GST</div>}
                </td>
                <td className={`${td} text-right font-semibold tabular-nums`}>{Number(b.qtyRemaining) || 0}</td>
              </LineRow>
            );
          })}
        </LineItemsTable>
      </div>
    </Modal>
  );
}
