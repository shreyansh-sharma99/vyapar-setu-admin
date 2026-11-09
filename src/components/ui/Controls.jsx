import { forwardRef, useId, useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from './styles';

/**
 * <Checkbox checked onChange={(bool) => …} label="Track batches" indeterminate />
 * Also works with react-hook-form: <Checkbox label="Active" {...register('isActive')} /> (uncontrolled).
 */
const Checkbox = forwardRef(function Checkbox(
  { checked, onChange, label, description, indeterminate = false, disabled = false, id, className, wrapperClassName, ...props },
  ref
) {
  const autoId = useId();
  const boxId = id ?? `cb-${autoId}`;
  return (
    <label
      htmlFor={boxId}
      className={cn('inline-flex select-none items-start gap-2.5', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', wrapperClassName)}
    >
      <span className="relative mt-px inline-flex">
        <input
          ref={ref}
          id={boxId}
          type="checkbox"
          // With register() (name, no checked) the box is uncontrolled.
          checked={props.name !== undefined && checked === undefined ? undefined : !!checked}
          disabled={disabled}
          aria-checked={indeterminate ? 'mixed' : undefined}
          onChange={(e) => onChange?.(e.target.checked)}
          className={cn(
            'peer size-[18px] shrink-0 cursor-[inherit] appearance-none rounded-[6px] border-[1.5px] border-line-strong bg-surface transition-colors',
            'checked:border-brand checked:bg-brand',
            indeterminate && 'border-brand bg-brand',
            FOCUS_RING,
            className
          )}
          {...props}
        />
        <span className={cn('pointer-events-none absolute inset-0 place-items-center text-white', indeterminate ? 'grid' : 'hidden peer-checked:grid')}>
          {indeterminate ? <Minus className="size-3" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />}
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-medium text-ink">{label}</span>}
          {description && <span className="text-xs text-ink-subtle">{description}</span>}
        </span>
      )}
    </label>
  );
});

const SWITCH_SIZES = {
  sm: { track: 'h-5 w-9', knob: 'size-4', on: 'translate-x-4' },
  md: { track: 'h-6 w-11', knob: 'size-5', on: 'translate-x-5' },
};

/**
 * <Switch checked onChange={(bool) => …} label="Send PDF on WhatsApp" size="sm|md" />
 * Works uncontrolled too (defaultChecked).
 */
function Switch({ checked, defaultChecked = false, onChange, label, size = 'md', disabled = false, className, id }) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked !== undefined ? !!checked : inner;
  const s = SWITCH_SIZES[size] ?? SWITCH_SIZES.md;
  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInner(!on);
    onChange?.(!on);
  };
  return (
    <span className={cn('inline-flex select-none items-center gap-2.5', disabled && 'opacity-50', className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-chip p-0.5 transition-colors disabled:cursor-not-allowed',
          s.track,
          on ? 'bg-brand' : 'bg-line-strong',
          FOCUS_RING
        )}
      >
        <span className={cn('rounded-full bg-white shadow-sm transition-transform', s.knob, on && s.on)} />
      </button>
      {label && (
        <span className="cursor-pointer text-sm font-medium text-ink-muted" onClick={toggle}>
          {label}
        </span>
      )}
    </span>
  );
}

const SEG_SIZES = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-3.5 text-sm' };

/**
 * Pill switcher: <Segmented options={[{ value, label, count, icon }]} value onChange size="sm|md" fullWidth />
 * Used for tabs with counts (All 412 · Paid 356), Walk-in / Saved customer, Tax invoice / Bill of supply.
 */
function Segmented({ options = [], value, onChange, size = 'md', fullWidth = false, className, 'aria-label': ariaLabel }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex gap-1 rounded-control bg-fill p-1', fullWidth && 'flex w-full', className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange?.(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] font-semibold transition-colors disabled:opacity-50',
              SEG_SIZES[size] ?? SEG_SIZES.md,
              fullWidth && 'flex-1',
              active ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
              FOCUS_RING
            )}
          >
            {Icon && <Icon className="size-4" />}
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn('rounded-chip px-1.5 text-[11px] tabular-nums', active ? 'bg-brand-soft text-brand-ink' : 'bg-surface/60 text-ink-subtle')}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { Checkbox, Switch, Segmented };
