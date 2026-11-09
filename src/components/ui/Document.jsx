import { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, Kbd } from './Display';
import { PageHeader } from './Card';
import { Switch } from './Controls';

/*
 * Building blocks of the document forms (purchase order / bill / return, sales invoice / return,
 * credit note): page layout with a sticky totals panel, the party card, and the line items table.
 */

/**
 * Header + two columns: form sections on the left, the totals panel on the right (sticky).
 * Under 1024 px the panel follows the form and `mobileBar` (total + main button) stays pinned
 * to the bottom of the screen.
 *   <DocumentLayout header={{ title, docNo, description, actions }} summary={<TotalsPanel …/>}
 *                   mobileBar={{ label: 'Total', value: '₹ 1,01,106', action: <Button …/> }}>
 *     <Section …/> …
 *   </DocumentLayout>
 */
function DocumentLayout({ header, summary, mobileBar, children, className }) {
  return (
    <div className={cn('flex flex-col gap-5', mobileBar && 'pb-24 lg:pb-0', className)}>
      {header && <PageHeader {...header} />}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
        {summary && <aside className="flex flex-col gap-4 lg:sticky lg:top-20">{summary}</aside>}
      </div>
      {mobileBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(30,27,75,0.25)] backdrop-blur lg:hidden print:hidden">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-ink-muted">{mobileBar.label ?? 'Total'}</div>
            <div className="truncate text-lg font-extrabold tabular-nums text-ink">{mobileBar.value}</div>
          </div>
          {mobileBar.action}
        </div>
      )}
    </div>
  );
}

// Rows inside TotalsPanel switch to light-on-dark colours.
const OnDark = createContext(false);

/**
 * Dark totals card from the mockups (same look in light and dark mode).
 *   <TotalsPanel title="Order summary" total="₹ 1,01,106" footer={<…buttons/>}>
 *     <TotalsRow label="Subtotal" value="95,800.00" />
 *     <TotalsRow label="Overall discount (%)"><TotalsInput value onChange /></TotalsRow>
 *     <TotalsToggle label="Round off total" checked onChange />
 *   </TotalsPanel>
 */
function TotalsPanel({ title, total, totalLabel = 'Total', note, footer, className, children }) {
  return (
    <OnDark.Provider value>
      <section className={cn('flex flex-col gap-3 rounded-card bg-nav p-5 text-sm text-nav-ink shadow-[0_20px_40px_-24px_rgba(30,27,75,0.7)]', className)}>
        {title && <h2 className="m-0 !text-[15px] !font-extrabold text-white">{title}</h2>}
        <div className="flex flex-col gap-2.5">{children}</div>
        {total !== undefined && (
          <div className="mt-1 flex items-end justify-between gap-3 border-t border-dashed border-white/20 pt-3">
            <span className="text-sm text-nav-ink">{totalLabel}</span>
            <span className="text-2xl font-extrabold tabular-nums text-highlight">{total}</span>
          </div>
        )}
        {note && <p className="m-0 text-[11px] leading-relaxed text-nav-ink/70">{note}</p>}
        {footer && <div className="mt-1 flex flex-col gap-2">{footer}</div>}
      </section>
    </OnDark.Provider>
  );
}

/** Label · value line. Pass children instead of `value` for an inline input. Works in a light card too. */
function TotalsRow({ label, value, tone, bold = false, children }) {
  const dark = useContext(OnDark);
  const toneCls = { danger: 'text-danger', success: 'text-success', warning: 'text-warning' }[tone];
  return (
    <div className={cn('flex items-center justify-between gap-3', bold && 'text-base font-bold')}>
      <span className={dark ? 'text-nav-ink' : 'text-ink-muted'}>{label}</span>
      {children ?? (
        <span className={cn('font-semibold tabular-nums', toneCls ?? (dark ? 'text-white' : 'text-ink'), dark && tone === 'danger' && 'text-nav-danger')}>{value}</span>
      )}
    </div>
  );
}

/** Small right-aligned number box for a totals row (discount %, freight). */
function TotalsInput({ className, ...props }) {
  const dark = useContext(OnDark);
  return (
    <input
      type="number"
      className={cn(
        'h-8 w-24 rounded-lg px-2 text-right text-sm tabular-nums outline-none transition-colors',
        dark
          ? 'border border-white/10 bg-white/10 text-white placeholder:text-white/40 focus:border-highlight focus:ring-2 focus:ring-highlight/30'
          : 'border-[1.5px] border-transparent bg-fill text-ink focus:border-brand focus:bg-surface focus:shadow-[0_0_0_4px_var(--ui-ring)]',
        className
      )}
      {...props}
    />
  );
}

/** Switch row inside the totals panel (round off, reverse charge, send PDF …). */
function TotalsToggle({ label, checked, onChange, disabled }) {
  const dark = useContext(OnDark);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={dark ? 'text-nav-ink' : 'text-ink-muted'}>{label}</span>
      <Switch size="sm" checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

/**
 * Chosen supplier / customer.
 *   <PartyCard name="Annapurna Wholesale" sub="27AAFCA4410P1Z3 · Pune" meta={{ label: 'You owe', value: '₹ 42,000', tone: 'danger' }}
 *              actions={<Button variant="secondary" size="sm">Change</Button>}>
 *     optional extra line(s)
 *   </PartyCard>
 */
function PartyCard({ name, sub, meta, actions, loading = false, className, children }) {
  const metaTone = { danger: 'text-danger', success: 'text-success', warning: 'text-warning' }[meta?.tone] ?? 'text-ink';
  return (
    <div className={cn('flex flex-col gap-2 rounded-[16px] bg-fill px-3.5 py-3', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-ink">{name}</div>
          {(sub || loading) && <div className="truncate text-xs text-ink-subtle">{loading ? 'Loading details…' : sub}</div>}
        </div>
        {meta && (
          <div className="text-right">
            <div className="text-[11px] text-ink-subtle">{meta.label}</div>
            <div className={cn('font-bold tabular-nums', metaTone)}>{meta.value}</div>
          </div>
        )}
        {actions}
      </div>
      {children}
    </div>
  );
}

/**
 * Soft table shell for editable lines. Use the LINE_TH / LINE_TD / CELL_INPUT classes from
 * ui/styles for the cells, and <LineRow tone="warning"> for a row with a problem.
 *   <LineItemsTable minWidth={1000} head={<tr>…</tr>} foot={<tr>…</tr>}>{rows}</LineItemsTable>
 */
function LineItemsTable({ head, foot, minWidth, className, children }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-separate border-spacing-0 text-sm" style={minWidth ? { minWidth } : undefined}>
        {head && <thead>{head}</thead>}
        <tbody>{children}</tbody>
        {foot && <tfoot>{foot}</tfoot>}
      </table>
    </div>
  );
}

const ROW_TONES = {
  warning: '[&>td]:bg-highlight-soft',
  danger: '[&>td]:bg-danger-soft',
};

function LineRow({ tone, className, children, ...props }) {
  return (
    <tr className={cn('transition-colors', ROW_TONES[tone] ?? 'hover:[&>td]:bg-fill-2', className)} {...props}>
      {children}
    </tr>
  );
}

/**
 * Bar under the lines: a scan / search control, an Add button, and the F2 hint.
 *   <AddLineBar onAdd={addLine}>{<BarcodeScanInput …/>}</AddLineBar>
 */
function AddLineBar({ onAdd, addLabel = 'Add item', shortcut = 'F2', children, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-control bg-fill px-3 py-2.5', className)}>
      <div className="min-w-0 flex-1">{children}</div>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-surface px-3 text-sm font-semibold text-brand-ink shadow-card hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ui-ring)]"
        >
          + {addLabel}
        </button>
      )}
      {shortcut && <Kbd className="hidden sm:inline-flex">{shortcut}</Kbd>}
    </div>
  );
}

/**
 * Save / Cancel row at the end of a simple form. On phones it sticks to the bottom of the screen.
 *   <FormActions><Button variant="secondary" onClick={back}>Cancel</Button><Button type="submit">Save</Button></FormActions>
 */
function FormActions({ className, children }) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 -mx-3 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface/95 px-3 py-3 backdrop-blur',
        'md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none',
        className
      )}
    >
      {children}
    </div>
  );
}

export { FormActions, DocumentLayout, TotalsPanel, TotalsRow, TotalsInput, TotalsToggle, PartyCard, LineItemsTable, LineRow, AddLineBar };
