import { cn } from '@/lib/utils';
import { TONE_CLASSES } from './statusTones';

const PADDING = { none: '', sm: 'p-4', md: 'p-5 sm:p-6' };

/** White rounded panel. <Card padding="none|sm|md" as="section"> */
function Card({ as: Comp = 'div', padding = 'md', className, children, ...props }) {
  return (
    <Comp className={cn('rounded-card bg-surface shadow-card', PADDING[padding] ?? PADDING.md, className)} {...props}>
      {children}
    </Comp>
  );
}

/**
 * Card with a heading row — the form sections in the PO / Sales invoice mockups.
 *   <Section title="Supplier" description="Who you're ordering from" actions={<Button …/>}>…</Section>
 */
function Section({ title, description, actions, className, bodyClassName, children }) {
  return (
    <Card as="section" padding="none" className={className}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-5 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-1">
            {title && <h2 className="m-0 !text-[15px] !font-extrabold !leading-6 text-brand-ink">{title}</h2>}
            {description && <p className="m-0 text-[13px] text-ink-subtle">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('px-5 pb-5 pt-4 sm:px-6', !title && !actions && 'pt-5', bodyClassName)}>{children}</div>
    </Card>
  );
}

/**
 * Page title row.
 *   <PageHeader title="New purchase" docNo="PO-2026-0087" description="…" actions={<>…</>} />
 */
function PageHeader({ title, docNo, description, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-end gap-x-4 gap-y-3', className)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="m-0 !text-2xl !font-extrabold tracking-tight text-brand-ink">{title}</h1>
          {docNo && (
            <span className="rounded-chip bg-brand-soft px-2.5 py-0.5 font-mono text-xs font-medium text-brand-ink">{docNo}</span>
          )}
        </div>
        {description && <p className="m-0 mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * KPI card. <StatCard label="To collect" value="₹ 1,73,120" icon={Receipt} tone="warning" chip="24 invoices" />
 * `tone` colours the icon tile; `chipTone` (defaults to tone) colours the chip.
 * With `onClick` it becomes a filter button; `active` outlines it.
 */
function StatCard({ label, value, icon: Icon, tone = 'primary', chip, chipTone, onClick, active = false, className }) {
  return (
    <Card
      as={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      padding="none"
      className={cn(
        'flex items-center gap-3 px-4 py-3 text-left',
        onClick && 'cursor-pointer transition-shadow hover:shadow-[0_0_0_1.5px_var(--ui-line-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ui-ring)]',
        active && 'shadow-[0_0_0_2px_var(--ui-primary)] hover:shadow-[0_0_0_2px_var(--ui-primary)]',
        className
      )}
    >
      {Icon && (
        <span className={cn('hidden size-9 shrink-0 place-items-center rounded-[11px] sm:grid', TONE_CLASSES[tone])}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-medium text-ink-muted">{label}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-base font-extrabold leading-7 tabular-nums tracking-tight text-ink sm:text-lg">{value}</span>
          {chip && (
            <span className={cn('w-fit rounded-chip px-2 py-px text-[11px] font-bold', TONE_CLASSES[chipTone ?? tone])}>{chip}</span>
          )}
        </span>
      </span>
    </Card>
  );
}

const DETAIL_COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
};

/**
 * Read-only label / value grid for details pages.
 *   <DetailList cols={3} items={[{ label: 'GSTIN', value: '27AAF…', mono: true }, { label: 'Address', value: '…', wide: true }]} />
 * Empty values show "—". `wide` spans the whole row; `mono` for codes; `tone` (success|warning|danger) colours the value.
 */
function DetailList({ items = [], cols = 3, className }) {
  const toneCls = { success: 'text-success', warning: 'text-warning', danger: 'text-danger', brand: 'text-brand-ink' };
  return (
    <dl className={cn('m-0 grid gap-x-6 gap-y-4', DETAIL_COLS[cols] ?? DETAIL_COLS[3], className)}>
      {items.filter(Boolean).map((it, i) => {
        const empty = it.value === undefined || it.value === null || it.value === '';
        return (
          <div key={it.key ?? (typeof it.label === 'string' ? it.label : i)} className={cn('min-w-0', it.wide && 'col-span-full')}>
            <dt className="text-xs font-medium text-ink-subtle">{it.label}</dt>
            <dd className={cn('m-0 mt-1 break-words text-sm font-semibold text-ink', it.mono && 'font-mono font-medium', toneCls[it.tone], empty && 'font-normal text-ink-subtle')}>
              {empty ? '—' : it.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export { Card, Section, PageHeader, StatCard, DetailList };
