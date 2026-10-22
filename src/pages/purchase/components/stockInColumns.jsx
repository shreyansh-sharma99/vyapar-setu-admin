import { fmtDate, formatINR, num } from './helpers';

/** Did any line record new-batch details (batch, MRP or new SP)? */
export const hasStockInInfo = (items = []) => items.some((i) => num(i.mrp) > 0 || i.batchNo || num(i.sellingPrice) > 0);

/** Lines whose SP was changed on the document (becomes the price from today when posted). */
export const spChangeCount = (items = []) => items.filter((i) => num(i.sellingPrice) > 0).length;

/** Read-only Batch / MRP / new SP columns for GRN, bill and opening stock details. */
export const stockInDetailColumns = (items = []) =>
  hasStockInInfo(items)
    ? [
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
        { key: 'mrp', label: 'MRP / pc', align: 'right', render: (l) => (num(l.mrp) > 0 ? formatINR(l.mrp) : '—') },
        {
          key: 'sp',
          label: 'New SP / pc',
          align: 'right',
          render: (l) => (num(l.sellingPrice) > 0 ? <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatINR(l.sellingPrice)}</span> : '—'),
        },
      ]
    : [];
