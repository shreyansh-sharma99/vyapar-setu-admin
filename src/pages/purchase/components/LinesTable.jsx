/**
 * Simple read-only table for document lines and linked records.
 * columns: [{ key, label, render(row, index), align: 'left'|'right'|'center', className }]
 */
export default function LinesTable({ columns, rows, emptyText = 'Nothing to show.', minWidth = 640, footer = null, rowKey = (r, i) => r._id || i }) {
  const alignCls = (a) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
      <table className="w-full text-sm border-collapse" style={{ minWidth }}>
        <thead className="bg-[var(--vs-bg-secondary)]">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key || c.label}
                className={`py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] border-b border-[var(--vs-border)] whitespace-nowrap ${alignCls(c.align)}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-[var(--vs-text-secondary)]">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="border-b border-[var(--vs-border)] last:border-b-0 hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                {columns.map((c) => (
                  <td key={c.key || c.label} className={`py-2.5 px-3 align-top ${alignCls(c.align)} ${c.className || ''}`}>
                    {c.render ? c.render(row, i) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer}
      </table>
    </div>
  );
}
