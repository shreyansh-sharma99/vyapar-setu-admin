// Class strings shared by several ui/* components. Pages never use these directly.

export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ui-ring)]';

/** Filled "soft" field: Input, Textarea, Select, MoneyInput, NumberInput. */
export const FIELD_BASE =
  'w-full rounded-control bg-fill border-[1.5px] border-transparent text-ink placeholder:text-ink-subtle ' +
  'transition-[border-color,box-shadow,background-color] duration-150 hover:border-line-strong ' +
  'focus:outline-none focus:bg-surface focus:border-brand focus:shadow-[0_0_0_4px_var(--ui-ring)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed read-only:hover:border-transparent';

export const FIELD_INVALID =
  'border-danger bg-danger-soft hover:border-danger focus:border-danger focus:shadow-[0_0_0_4px_var(--ui-danger-soft)]';

export const FIELD_SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-3.5 text-sm',
  lg: 'h-12 px-4 text-base',
};

/** Floating panel: Select menu, DropdownMenu, Popover. */
export const PANEL =
  'bg-surface text-ink rounded-control border border-line shadow-[0_12px_32px_-8px_rgba(30,27,75,0.25)] p-1';

/** Line items table cells (LineItemsTable). */
export const LINE_TH =
  'bg-fill-2 px-3 py-2.5 text-left text-xs font-semibold text-ink-subtle whitespace-nowrap border-r border-line last:border-r-0 first:rounded-l-control last:rounded-r-control';
export const LINE_TD = 'px-3 py-3 align-top border-b border-r border-line last:border-r-0 text-ink';
export const LINE_TF = 'px-3 py-3 bg-fill-2 font-semibold text-ink border-r border-line last:border-r-0 first:rounded-l-control last:rounded-r-control';
/** Compact input inside a table cell. */
export const CELL_INPUT =
  'h-9 w-full rounded-lg bg-fill border-[1.5px] border-transparent px-2.5 text-sm text-ink tabular-nums outline-none transition-[border-color,box-shadow,background-color] ' +
  'hover:border-line-strong focus:bg-surface focus:border-brand focus:shadow-[0_0_0_3px_var(--ui-ring)] disabled:opacity-50 disabled:cursor-not-allowed read-only:hover:border-transparent';

export const OPTION =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink cursor-pointer select-none outline-none ' +
  'data-[active=true]:bg-fill disabled:opacity-50 disabled:cursor-not-allowed';
