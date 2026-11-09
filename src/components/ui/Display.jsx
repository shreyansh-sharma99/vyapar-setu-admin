import { cloneElement, isValidElement, useId } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Info, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_CLASSES } from './statusTones';

const AVATAR_TONES = ['primary', 'warning', 'success', 'danger', 'info'];
const AVATAR_SIZES = { sm: 'size-8 text-[11px] rounded-[10px]', md: 'size-10 text-xs rounded-control', lg: 'size-12 text-sm rounded-control' };

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

/** Initials tile; the tone is picked from the name so the same customer always gets the same colour. */
function Avatar({ name, size = 'md', tone, className }) {
  const auto = AVATAR_TONES[[...(name ?? '')].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      aria-hidden="true"
      className={cn('grid shrink-0 place-items-center font-extrabold', AVATAR_SIZES[size] ?? AVATAR_SIZES.md, TONE_CLASSES[tone ?? auto], className)}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Keyboard shortcut chip: <Kbd>F2</Kbd> */
function Kbd({ className, children }) {
  return (
    <kbd className={cn('inline-flex h-5 items-center rounded-md border border-line bg-surface px-1.5 font-mono text-[11px] font-medium text-ink-muted', className)}>
      {children}
    </kbd>
  );
}

const SIDES = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

/** Hover / focus hint: <Tooltip content="Print invoice"><Button size="icon" …/></Tooltip> */
function Tooltip({ content, side = 'top', className, children }) {
  const id = useId();
  const child = isValidElement(children) ? cloneElement(children, { 'aria-describedby': id }) : children;
  return (
    <span className="group relative inline-flex">
      {child}
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-[100006] hidden whitespace-nowrap rounded-lg bg-nav px-2.5 py-1.5 text-xs font-medium text-white shadow-lg',
          'group-hover:block group-focus-within:block',
          SIDES[side] ?? SIDES.top,
          className
        )}
      >
        {content}
      </span>
    </span>
  );
}

/** Empty list / no data: <EmptyState icon={FileText} title="No invoices yet" text="…" action={<Button …/>} /> */
function EmptyState({ icon: Icon = Inbox, title, text, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <span className="grid size-12 place-items-center rounded-card bg-brand-soft text-brand-ink">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      {title && <p className="m-0 text-base font-bold text-ink">{title}</p>}
      {text && <p className="m-0 max-w-sm text-sm text-ink-muted">{text}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Grey loading block: <Skeleton className="h-4 w-32" /> */
function Skeleton({ className }) {
  return <span aria-hidden="true" className={cn('block animate-pulse rounded-lg bg-fill', className)} />;
}

/** Loading rows for a table or list. */
function SkeletonRows({ rows = 5, cols = 4, className }) {
  return (
    <div role="status" aria-label="Loading" className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-2/5' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Inline spinner: <Spinner label="Saving" /> */
function Spinner({ label, className }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-ink-muted', className)}>
      <Loader2 className="size-4 animate-spin text-brand" aria-hidden="true" />
      {label ?? <span className="sr-only">Loading</span>}
    </span>
  );
}

const ALERT_TONES = {
  info: { box: 'bg-info-soft', ink: 'text-info', icon: Info },
  success: { box: 'bg-success-soft', ink: 'text-success', icon: CheckCircle2 },
  warning: { box: 'bg-warning-soft', ink: 'text-warning', icon: AlertTriangle },
  danger: { box: 'bg-danger-soft', ink: 'text-danger', icon: XCircle },
  neutral: { box: 'bg-fill', ink: 'text-ink-muted', icon: Info },
};

/**
 * Banner note inside a page or section.
 *   <Alert tone="warning" title="Supplier has no GSTIN">No input tax credit on this bill.</Alert>
 *   <Alert tone="danger" action={<Button size="sm" variant="secondary">Retry</Button>}>Could not load.</Alert>
 * tone: info | success | warning | danger | neutral. `icon={false}` hides the icon.
 */
function Alert({ tone = 'info', title, icon, action, className, children }) {
  const t = ALERT_TONES[tone] ?? ALERT_TONES.info;
  const Icon = icon === false ? null : icon ?? t.icon;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-control px-3.5 py-3 text-sm', t.box, className)}>
      {Icon && <Icon className={cn('mt-0.5 size-4 shrink-0', t.ink)} aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        {title && <div className={cn('font-semibold', t.ink)}>{title}</div>}
        {children && <div className={cn('text-ink-muted', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export { Avatar, Kbd, Tooltip, EmptyState, Skeleton, SkeletonRows, Spinner, Alert };
