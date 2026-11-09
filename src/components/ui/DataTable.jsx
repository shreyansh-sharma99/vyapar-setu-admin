import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, Ban, BookOpen, Check, Columns3, Copy, Download, Eye, History, Image as ImageIcon, IndianRupee, Link2, PackageCheck,
  Pencil, Printer, Search, Send, Trash2, Undo2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { Checkbox, Segmented } from './Controls';
import { EmptyState, SkeletonRows } from './Display';
import { Input } from './Input';
import { Popover } from './Menu';
import { Pagination } from './Pagination';

/*
 * List table for every list page.
 *
 *   <DataTable
 *     columns={[
 *       { key: 'invoiceNumber', header: 'Invoice', type: 'mono', mobile: 'title' },
 *       { key: 'invoiceDate', header: 'Date', type: 'date', sortable: true },
 *       { key: 'totalAmount', header: 'Amount (₹)', type: 'money', mobile: 'amount' },
 *       { key: 'status', header: 'Status', type: 'status' },
 *     ]}
 *     rows={invoices} loading={loading}
 *     tabs={[{ value: 'all', label: 'All', count: 412 }]} tab={tab} onTabChange={setTab}
 *     search={{ value, onChange, onSubmit, onClear, placeholder }}
 *     filters={<…date inputs…/>} toolbar={<Button …/>}
 *     rowActions={(row) => [{ label: 'Print', icon: Printer, onClick }, { label: 'Delete', icon: Trash2, danger: true, onClick }]}
 *     onRowClick={(row) => navigate(…)}
 *     pagination={{ page, pageSize, total, onPageChange, onPageSizeChange }}   // or 'client'
 *     empty={{ title: 'No invoices yet', action: <Button …/> }}
 *   />
 *
 * Column `type`: text (default) · money (₹, Indian grouping, right) · number (right) · date (24 Oct 2026)
 *               · status (StatusBadge) · mono (doc numbers, GSTIN) · image · actions.
 * Column `mobile`: 'title' | 'amount' | 'hidden' — under 768 px every row becomes a card.
 *
 * Row actions (`rowActions` items and every `type: 'actions'` column) are shown as icon buttons in ONE first
 * column that stays put while the rest of the row scrolls sideways under it. An item without `icon` gets one
 * from its label (View, Edit, Delete, Print, Pay…), or shows as a small text button.
 * Search runs on the search icon, Enter, or × (clears and searches again with an empty value).
 */

const RIGHT_TYPES = new Set(['money', 'number']);
const HIDE_BELOW = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell', '2xl': 'hidden 2xl:table-cell' };

const inr = (v) => '₹ ' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const colKey = (c, i) => c.key ?? c.header ?? String(i);

const ICON_BY_LABEL = [
  [/delete|remove/i, Trash2],
  [/edit|update/i, Pencil],
  [/view|open|details/i, Eye],
  [/print/i, Printer],
  [/pdf|download|export/i, Download],
  [/pay|payment|collect|refund/i, IndianRupee],
  [/duplicate|copy/i, Copy],
  [/void|cancel/i, Ban],
  [/confirm|approve|issue|apply/i, Check],
  [/remind|send|share/i, Send],
  [/link/i, Link2],
  [/ledger/i, BookOpen],
  [/receive/i, PackageCheck],
  [/return/i, Undo2],
  [/audit|history/i, History],
];

/** One row action as an icon button (tooltip = label). */
function ActionButton({ item }) {
  const Icon = item.icon ?? ICON_BY_LABEL.find(([re]) => re.test(item.label ?? ''))?.[1];
  // colour by meaning (like the owner admin): delete / cancel red, money green, the rest blue
  const label = item.label ?? '';
  const tone = item.danger || /delete|remove|void|cancel|block/i.test(label)
    ? 'text-danger hover:bg-danger-soft hover:text-danger'
    : /pay|payment|collect|refund|receipt|approve|confirm|receive/i.test(label)
      ? 'text-success hover:bg-success-soft hover:text-success'
      : 'text-info hover:bg-info-soft hover:text-info';
  if (!Icon) {
    return (
      <Button variant="ghost" size="xs" className={tone} disabled={item.disabled} onClick={() => item.onClick?.()}>
        {item.label}
      </Button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title={item.label}
      aria-label={item.label}
      className={tone}
      disabled={item.disabled}
      onClick={() => item.onClick?.()}
    >
      <Icon />
    </Button>
  );
}

/** Long plain text: first 8 words, click to see all. */
function Truncated({ value }) {
  const [open, setOpen] = useState(false);
  if (typeof value !== 'string') return value ?? '—';
  const words = value.trim().split(/\s+/);
  if (words.length <= 8) return value;
  return (
    <span className="cursor-pointer" title="Click to show all" onClick={() => setOpen((o) => !o)}>
      {open ? value : `${words.slice(0, 8).join(' ')}…`}
    </span>
  );
}

function cellValue(col, row, i) {
  if (col.render) return col.render(row, i);
  const raw = row?.[col.key];
  switch (col.type) {
    case 'money':
      return raw === null || raw === undefined || raw === '' ? '—' : inr(raw);
    case 'number':
      return raw ?? '—';
    case 'date':
      return fmtDate(raw);
    case 'status':
      return raw ? <StatusBadge status={raw} label={col.statusLabel?.(row)} /> : '—';
    case 'mono':
      return raw ? <span className="font-mono text-[13px]">{raw}</span> : '—';
    case 'image':
      return raw ? (
        <img
          src={raw}
          alt={row?.name || ''}
          className="size-9 rounded-lg object-cover"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/88x88?text=No+Image'; }}
        />
      ) : (
        <span className="grid size-9 place-items-center rounded-lg bg-fill text-ink-subtle"><ImageIcon className="size-4" /></span>
      );
    default:
      return col.truncate ? <Truncated value={raw} /> : raw ?? '—';
  }
}

/** Plain text of a cell, for local search. */
function searchText(col, row) {
  const raw = row?.[col.key];
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (col.render) {
    try {
      const out = col.render(row);
      if (typeof out === 'string' || typeof out === 'number') return String(out);
    } catch { /* ignore */ }
  }
  return '';
}

function alignOf(col, row) {
  if (col.align) {
    if (col.align !== 'auto') return col.align;
    const raw = row?.[col.key];
    return typeof raw === 'number' ? 'right' : raw === '—' || raw === '-' ? 'center' : 'left';
  }
  if (col.type === 'actions') return 'right';
  return RIGHT_TYPES.has(col.type) ? 'right' : 'left';
}
const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };

const interactive = (el) => el.closest('button, a, input, select, textarea, label, [role="menuitem"], [role="switch"], [data-no-row-click]');

function DataTable({
  columns,
  rows = [],
  rowKey = '_id',
  loading = false,
  error,
  onRetry,
  empty,
  tabs,
  tab,
  onTabChange,
  search,
  filters,
  toolbar,
  columnPicker = true,
  selectable = false,
  bulkActions,
  rowActions,
  onRowClick,
  pagination = 'client',
  pageSizeOptions = [10, 20, 50, 100],
  sort: controlledSort,
  onSortChange,
  maxHeight,
  className,
}) {
  const keyOf = (row, i) => (typeof rowKey === 'function' ? rowKey(row, i) : row?.[rowKey] ?? i);

  /* columns: every action (rowActions + 'actions' columns) in one sticky column at the start */
  const allColumns = useMemo(() => {
    const parts = columns.filter((c) => c.type === 'actions');
    const rest = columns.filter((c) => c.type !== 'actions');
    if (!rowActions && parts.length === 0) return rest;
    return [{ key: '__actions', header: 'Actions', type: 'actions', sticky: true, parts }, ...rest];
  }, [columns, rowActions]);

  const [hidden, setHidden] = useState(() => new Set(columns.filter((c) => c.defaultHidden).map((c) => colKey(c, columns.indexOf(c)))));
  const visible = allColumns.filter((c) => c.sticky || !hidden.has(colKey(c, columns.indexOf(c))));

  /* search: the box keeps a draft; the list (or the page's API call) changes on the search icon, Enter or × */
  const [localQuery, setLocalQuery] = useState('');
  const controlledSearch = search && search.value !== undefined;
  const query = controlledSearch ? search.value : localQuery;
  const [draft, setDraft] = useState(query ?? '');
  const [draftFor, setDraftFor] = useState(query);
  if (draftFor !== query) {
    setDraftFor(query);
    setDraft(query ?? '');
  }
  // Latest search props, so a deferred submit reads the page's updated state.
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  });
  const runSearch = (value) => {
    if (!controlledSearch) {
      setLocalQuery(value);
      return;
    }
    search.onChange?.(value);
    setTimeout(() => searchRef.current?.onSubmit?.(value), 0);
  };
  const clearSearch = () => {
    setDraft('');
    if (!controlledSearch) {
      setLocalQuery('');
      return;
    }
    search.onChange?.('');
    if (search.onClear) search.onClear();
    else setTimeout(() => searchRef.current?.onSubmit?.(''), 0);
  };

  /* sort (controlled when sort + onSortChange are given) */
  const [localSort, setLocalSort] = useState({ key: null, direction: 'asc' });
  const isControlledSort = controlledSort !== undefined && !!onSortChange;
  const sort = isControlledSort ? controlledSort : localSort;

  /* client paging */
  const client = pagination === 'client';
  const [localPage, setLocalPage] = useState(1);
  const [localSize, setLocalSize] = useState(pageSizeOptions[0] ?? 10);
  const [queryFor, setQueryFor] = useState(query);
  if (queryFor !== query) {
    setQueryFor(query);
    if (client) setLocalPage(1);
  }

  /* selection */
  const [selected, setSelected] = useState(() => new Set());

  const filtered = useMemo(() => {
    if (controlledSearch || !query) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) => columns.some((c) => searchText(c, row).toLowerCase().includes(q)));
  }, [rows, columns, query, controlledSearch]);

  const sorted = useMemo(() => {
    if (isControlledSort || !sort.key) return filtered;
    const col = columns.find((c) => (c.sortKey ?? c.key) === sort.key);
    const get = (row) => {
      const v = row?.[sort.key];
      return v ?? (col ? searchText(col, row) || null : null);
    };
    return [...filtered].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const cmp = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : x > y ? 1 : x < y ? -1 : 0;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort, isControlledSort, columns]);

  const page = client ? localPage : pagination?.page ?? 1;
  const pageSize = client ? localSize : pagination?.pageSize ?? sorted.length;
  const total = client ? sorted.length : pagination ? pagination.total ?? sorted.length : sorted.length;
  const shown = client ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;

  const toggleSort = (key) => {
    let next = { key, direction: 'asc' };
    if (sort.key === key && sort.direction === 'asc') next = { key, direction: 'desc' };
    else if (sort.key === key && sort.direction === 'desc') next = { key: null, direction: 'asc' };
    if (isControlledSort) onSortChange(next);
    else setLocalSort(next);
  };

  const shownKeys = shown.map(keyOf);
  const allOnPage = shownKeys.length > 0 && shownKeys.every((k) => selected.has(k));
  const someOnPage = shownKeys.some((k) => selected.has(k));
  const selectedRows = rows.filter((r, i) => selected.has(keyOf(r, i)));
  const toggleRow = (k) => setSelected((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const togglePage = () => setSelected((s) => { const n = new Set(s); shownKeys.forEach((k) => (allOnPage ? n.delete(k) : n.add(k))); return n; });
  const clearSelection = () => setSelected(new Set());

  const rowClick = (row, i) => (e) => {
    if (!onRowClick || interactive(e.target)) return;
    onRowClick(row, i);
  };

  const actionsCell = (col, row, i) => (
    <div className="flex items-center gap-0.5" data-no-row-click>
      {col.parts.map((part, pi) => <Fragment key={colKey(part, pi)}>{cellValue(part, row, i)}</Fragment>)}
      {rowActions?.(row, i)
        .filter((a) => a && !a.divider && !a.hidden)
        .map((a) => <ActionButton key={a.key ?? a.label} item={a} />)}
    </div>
  );
  const renderCell = (col, row, i) => (col.sticky ? actionsCell(col, row, i) : cellValue(col, row, i));
  const actionsColumn = allColumns.find((c) => c.sticky);

  /* ── pieces ── */
  const pickerColumns = columns.filter((c) => c.header && c.type !== 'actions');
  const searchBox = search && (
    <div className="w-full sm:max-w-xs">
      <Input
        size="sm"
        aria-label={search.placeholder || 'Search'}
        placeholder={search.placeholder || 'Search…'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(draft.trim()); } }}
        className="pr-16"
        endIcon={
          <span className="flex items-center gap-0.5">
            {draft && (
              <button
                type="button"
                aria-label="Clear search"
                title="Clear"
                className="grid size-6 cursor-pointer place-items-center rounded-md text-danger hover:bg-danger-soft"
                onClick={clearSearch}
              >
                <X className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Search"
              title="Search"
              className="grid size-7 cursor-pointer place-items-center rounded-md text-brand-ink hover:bg-brand-soft"
              onClick={() => runSearch(draft.trim())}
            >
              <Search className="size-4" />
            </button>
          </span>
        }
      />
    </div>
  );

  const emptyProps = typeof empty === 'string' ? { title: empty } : { title: 'Nothing here yet', ...empty };

  const body = loading ? (
    <div className="px-4 py-6 sm:px-5"><SkeletonRows rows={6} cols={Math.min(5, Math.max(2, visible.length))} /></div>
  ) : error ? (
    <EmptyState
      title="Couldn't load this list"
      text={typeof error === 'string' ? error : 'Check your connection and try again.'}
      action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    />
  ) : shown.length === 0 ? (
    <EmptyState {...emptyProps} />
  ) : (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-auto px-2 md:block" style={{ maxHeight: maxHeight || 'max(320px, calc(100vh - 340px))' }}>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {selectable && (
                <th className="sticky left-0 top-0 z-30 w-11 min-w-11 border-r border-line bg-fill-2 px-3 py-2 first:rounded-l-control">
                  <Checkbox aria-label="Select all on this page" checked={allOnPage} indeterminate={!allOnPage && someOnPage} onChange={togglePage} />
                </th>
              )}
              {visible.map((col, ci) => {
                const sk = col.sortKey ?? col.key;
                const active = sort.key === sk;
                return (
                  <th
                    key={colKey(col, ci)}
                    scope="col"
                    style={{ width: col.width }}
                    aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'sticky top-0 z-10 whitespace-nowrap border-r border-line bg-fill-2 px-3 py-2 text-xs font-semibold text-ink-subtle first:rounded-l-control last:rounded-r-control last:border-r-0',
                      col.sticky && cn('w-px', selectable ? 'left-11 z-30' : 'left-0 z-30'),
                      ALIGN[col.align && col.align !== 'auto' ? col.align : RIGHT_TYPES.has(col.type) ? 'right' : 'left'],
                      col.hideBelow && HIDE_BELOW[col.hideBelow],
                      col.className
                    )}
                  >
                    {col.sortable ? (
                      <button type="button" onClick={() => toggleSort(sk)} className="inline-flex cursor-pointer items-center gap-1 hover:text-ink">
                        {col.header}
                        <span className="flex flex-col" aria-hidden="true">
                          <ArrowUp className={cn('-mb-1 size-3', active && sort.direction === 'asc' ? 'text-ink' : 'opacity-30')} />
                          <ArrowDown className={cn('size-3', active && sort.direction === 'desc' ? 'text-ink' : 'opacity-30')} />
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, ri) => {
              const k = keyOf(row, ri);
              const isSel = selected.has(k);
              return (
                <tr
                  key={k}
                  onClick={rowClick(row, ri)}
                  className={cn('transition-colors hover:[&>td]:bg-fill-2', onRowClick && 'cursor-pointer', isSel && '[&>td]:bg-brand-soft')}
                >
                  {selectable && (
                    <td className="sticky left-0 z-[2] w-11 min-w-11 border-b border-r border-line bg-surface px-3 py-1.5">
                      <Checkbox aria-label="Select row" checked={isSel} onChange={() => toggleRow(k)} />
                    </td>
                  )}
                  {visible.map((col, ci) => (
                    <td
                      key={colKey(col, ci)}
                      className={cn(
                        'whitespace-nowrap border-b border-r border-line px-3 py-1.5 align-middle text-ink last:border-r-0',
                        col.sticky && cn('sticky z-[2] w-px bg-surface px-2 py-1', selectable ? 'left-11' : 'left-0'),
                        ALIGN[alignOf(col, row)],
                        RIGHT_TYPES.has(col.type) && 'tabular-nums',
                        col.type === 'money' && 'font-semibold',
                        col.hideBelow && HIDE_BELOW[col.hideBelow],
                        col.cellClassName
                      )}
                    >
                      {renderCell(col, row, ri)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phone: one card per row */}
      <ul className="m-0 flex list-none flex-col gap-2 p-3 md:hidden">
        {shown.map((row, ri) => {
          const k = keyOf(row, ri);
          const cols = allColumns.filter((c) => c.type !== 'actions' && c.mobile !== 'hidden' && !hidden.has(colKey(c, columns.indexOf(c))));
          const titleCol = cols.find((c) => c.mobile === 'title') ?? cols[0];
          const amountCol = cols.find((c) => c.mobile === 'amount') ?? cols.find((c) => c.type === 'money');
          const statusCol = cols.find((c) => c.type === 'status');
          const rest = cols.filter((c) => c !== titleCol && c !== amountCol && c !== statusCol);
          return (
            <li
              key={k}
              onClick={rowClick(row, ri)}
              className={cn('flex flex-col gap-2 rounded-control bg-fill-2 p-3.5', onRowClick && 'cursor-pointer active:bg-fill', selected.has(k) && 'bg-brand-soft')}
            >
              <div className="flex items-start gap-3">
                {selectable && <Checkbox aria-label="Select row" checked={selected.has(k)} onChange={() => toggleRow(k)} />}
                <div className="min-w-0 flex-1 font-semibold text-ink">{titleCol ? cellValue(titleCol, row, ri) : null}</div>
                {amountCol && <div className="shrink-0 text-right font-bold tabular-nums text-ink">{cellValue(amountCol, row, ri)}</div>}
              </div>
              {(statusCol || rest.length > 0) && (
                <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {statusCol && <div className="col-span-2">{cellValue(statusCol, row, ri)}</div>}
                  {rest.map((c) => (
                    <div key={colKey(c, 0)} className="min-w-0">
                      <dt className="text-ink-subtle">{c.header}</dt>
                      <dd className="m-0 truncate text-ink">{cellValue(c, row, ri)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {actionsColumn && (
                <div className="flex flex-wrap items-center justify-end gap-1 border-t border-line pt-2">{actionsCell(actionsColumn, row, ri)}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    <Card padding="none" className={cn('flex min-w-0 flex-col', className)}>
      {tabs?.length > 0 && (
        <div className="overflow-x-auto px-4 pt-4 sm:px-5">
          <Segmented aria-label="Filter list" options={tabs} value={tab} onChange={onTabChange} />
        </div>
      )}

      {(search || filters || toolbar || columnPicker) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-4 sm:px-5">
          {searchBox}
          {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {columnPicker && pickerColumns.length > 1 && (
              <span className="hidden md:inline-flex">
                <Popover
                  align="end"
                  trigger={
                    <Button variant="secondary" size="sm" startIcon={<Columns3 />}>
                      Columns
                    </Button>
                  }
                >
                  <div className="flex max-h-72 w-56 flex-col gap-2 overflow-auto">
                    <span className="text-xs font-semibold text-ink-subtle">Show columns</span>
                    {pickerColumns.map((c) => {
                      const k = colKey(c, columns.indexOf(c));
                      return (
                        <Checkbox
                          key={k}
                          label={c.header}
                          checked={!hidden.has(k)}
                          onChange={() => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                        />
                      );
                    })}
                  </div>
                </Popover>
              </span>
            )}
            {toolbar}
          </div>
        </div>
      )}

      {selectable && selected.size > 0 && (
        <div className="mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-control bg-brand-soft px-4 py-2.5 text-sm text-brand-ink sm:mx-5">
          <b className="font-bold">{selected.size} selected</b>
          <div className="flex flex-1 flex-wrap items-center gap-2">{bulkActions?.(selectedRows, clearSelection)}</div>
          <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
        </div>
      )}

      {body}

      {pagination && !loading && total > 0 && (
        <div className="border-t border-line px-4 py-3 sm:px-5">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            pageSizeOptions={pagination.pageSizeOptions ?? pageSizeOptions}
            onPageChange={client ? setLocalPage : pagination.onPageChange}
            onPageSizeChange={
              client
                ? (s) => { setLocalSize(s); setLocalPage(1); }
                : pagination.onPageSizeChange
            }
          />
        </div>
      )}
    </Card>
  );
}

export default DataTable;
export { DataTable };
