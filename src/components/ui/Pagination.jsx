import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from './Select';
import { FOCUS_RING } from './styles';

// 1 … 4 5 6 … 20
function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...set].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  return list.flatMap((p, i) => (i > 0 && p - list[i - 1] > 1 ? ['…', p] : [p]));
}

const btn = cn(
  'grid h-8 min-w-8 place-items-center rounded-[10px] px-2 text-sm font-semibold tabular-nums text-ink-muted transition-colors hover:bg-fill hover:text-ink disabled:pointer-events-none disabled:opacity-40',
  FOCUS_RING
);

/**
 * "Showing 1–10 of 412" · pages · rows per page.
 *   <Pagination page pageSize total onPageChange onPageSizeChange pageSizeOptions={[10, 20, 50]} />
 */
function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100], className }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav aria-label="Pagination" className={cn('flex flex-wrap items-center justify-between gap-3 text-sm', className)}>
      <span className="tabular-nums text-ink-muted">
        Showing <b className="font-semibold text-ink">{from}–{to}</b> of <b className="font-semibold text-ink">{total.toLocaleString('en-IN')}</b>
      </span>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-ink-muted">
            <span className="hidden sm:inline">Rows</span>
            <span className="w-[76px]">
              <Select
                size="sm"
                searchable={false}
                aria-label="Rows per page"
                value={pageSize}
                onChange={(v) => onPageSizeChange(Number(v))}
                options={pageSizeOptions.map((n) => ({ value: n, label: String(n) }))}
              />
            </span>
          </label>
        )}
        <div className="flex items-center gap-1">
          <button type="button" className={btn} aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-2 tabular-nums text-ink-muted sm:hidden">{page} / {pages}</span>
          {pageList(page, pages).map((p, i) =>
            p === '…' ? (
              <span key={`gap${i}`} className="hidden px-1 text-ink-subtle sm:inline">…</span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPageChange(p)}
                className={cn(btn, 'hidden sm:grid', p === page && 'bg-brand text-white hover:bg-brand-hover hover:text-white')}
              >
                {p}
              </button>
            )
          )}
          <button type="button" className={btn} aria-label="Next page" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Pagination;
export { Pagination };
