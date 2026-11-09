import { cn } from '@/lib/utils';
import { TONE_CLASSES, labelForStatus, toneForStatus } from './statusTones';

const SIZES = {
  xs: 'h-5 px-1.5 text-[10px] gap-1',
  sm: 'h-6 px-2.5 text-xs gap-1',
  md: 'h-7 px-3 text-[13px] gap-1.5',
};

/** <Badge tone="success|warning|danger|info|neutral|primary" size="xs|sm|md" dot icon={Icon}>Paid</Badge> */
function Badge({ tone = 'neutral', size = 'sm', dot = false, icon: Icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-chip font-bold',
        SIZES[size] ?? SIZES.sm,
        TONE_CLASSES[tone] ?? TONE_CLASSES.neutral,
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** <StatusBadge status="partially_received" /> → amber "Partially received". Tone from statusTones.js. */
function StatusBadge({ status, label, size = 'sm', className }) {
  return (
    <Badge tone={toneForStatus(status)} size={size} className={className}>
      {label ?? labelForStatus(status)}
    </Badge>
  );
}

export { Badge, StatusBadge };
