import { LINE_TD, LINE_TH, LineItemsTable, LineRow } from '@/components/ui';
import { cn } from '@/lib/utils';

const ALIGN = { right: 'whitespace-nowrap text-right tabular-nums', center: 'text-center' };

/**
 * Simple read-only table for document lines and linked records (purchase details pages).
 * columns: [{ key, label, render(row, index), align: 'left'|'right'|'center', className }]
 * footer: <tr> row(s) for the table foot (use LINE_TF cells).
 */
export default function LinesTable({ columns, rows, emptyText = 'Nothing to show.', minWidth = 640, footer = null, rowKey = (r, i) => r._id || i }) {
  return (
    <LineItemsTable
      minWidth={minWidth}
      head={
        <tr>
          {columns.map((c) => (
            <th key={c.key || c.label} className={cn(LINE_TH, ALIGN[c.align])}>
              {c.label}
            </th>
          ))}
        </tr>
      }
      foot={footer}
    >
      {rows.length === 0 ? (
        <tr>
          <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-ink-subtle">
            {emptyText}
          </td>
        </tr>
      ) : (
        rows.map((row, i) => (
          <LineRow key={rowKey(row, i)}>
            {columns.map((c) => (
              <td key={c.key || c.label} className={cn(LINE_TD, ALIGN[c.align], c.className)}>
                {c.render ? c.render(row, i) : row[c.key] ?? '—'}
              </td>
            ))}
          </LineRow>
        ))
      )}
    </LineItemsTable>
  );
}
