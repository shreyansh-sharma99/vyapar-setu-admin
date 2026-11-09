import { forwardRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_BASE, FIELD_INVALID, FIELD_SIZES, FOCUS_RING } from './styles';

const isAriaInvalid = (v) => v === true || v === 'true';

/**
 * <Input size="sm|md|lg" startIcon endIcon invalid />
 * `error` (old API: boolean or react-hook-form error object) also marks it invalid.
 */
const Input = forwardRef(function Input(
  { size = 'md', startIcon, endIcon, invalid, error, className, wrapperClassName, type = 'text', ...props },
  ref
) {
  const isInvalid = invalid || !!error || isAriaInvalid(props['aria-invalid']);
  return (
    <div className={cn('relative flex w-full items-center', wrapperClassName)}>
      {startIcon && (
        <span className="pointer-events-none absolute left-3.5 flex items-center text-ink-subtle [&_svg]:size-4">
          {startIcon}
        </span>
      )}
      <input
        ref={ref}
        type={type}
        aria-invalid={isInvalid || undefined}
        className={cn(
          FIELD_BASE,
          FIELD_SIZES[size] ?? FIELD_SIZES.md,
          isInvalid && FIELD_INVALID,
          startIcon && 'pl-10',
          endIcon && 'pr-10',
          className
        )}
        {...props}
      />
      {endIcon && <span className="absolute right-3 flex items-center text-ink-subtle [&_svg]:size-4">{endIcon}</span>}
    </div>
  );
});

/** <Textarea rows={3} invalid /> */
const Textarea = forwardRef(function Textarea({ invalid, error, rows = 3, className, ...props }, ref) {
  const isInvalid = invalid || !!error || isAriaInvalid(props['aria-invalid']);
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={isInvalid || undefined}
      className={cn(FIELD_BASE, 'px-3.5 py-2.5 text-sm leading-relaxed resize-y min-h-[44px]', isInvalid && FIELD_INVALID, className)}
      {...props}
    />
  );
});

const inr = (n) =>
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Rupee amount: ₹ prefix, right aligned, Indian grouping (1,05,600.00) when not focused.
 * onChange receives the plain number string ("105600.5") or "".
 */
const MoneyInput = forwardRef(function MoneyInput({ value, onChange, onFocus, onBlur, className, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  const raw = value === null || value === undefined ? '' : String(value);
  const shown = !focused && raw !== '' && !Number.isNaN(Number(raw)) ? inr(raw) : raw;
  return (
    <Input
      ref={ref}
      inputMode="decimal"
      startIcon={<span className="text-sm font-semibold">₹</span>}
      value={shown}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      onChange={(e) => onChange?.(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
      className={cn('text-right tabular-nums', className)}
      {...props}
    />
  );
});

/**
 * Whole or decimal quantity with optional − / + buttons. Clamps to min / max on blur.
 * onChange receives a number, or "" while the field is empty.
 */
const NumberInput = forwardRef(function NumberInput(
  { value, onChange, min, max, step = 1, stepper = false, onBlur, className, disabled, ...props },
  ref
) {
  const clamp = (n) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const bump = (dir) => onChange?.(clamp((Number(value) || 0) + dir * step));
  const stepBtn = cn(
    'absolute top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-40',
    FOCUS_RING
  );
  return (
    <div className="relative w-full">
      <Input
        ref={ref}
        inputMode="decimal"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.-]/g, '');
          onChange?.(v === '' || v === '-' ? '' : Number(v));
        }}
        onBlur={(e) => { if (value !== '' && value !== undefined) onChange?.(clamp(Number(value))); onBlur?.(e); }}
        className={cn('text-right tabular-nums', stepper && 'px-10 text-center', className)}
        {...props}
      />
      {stepper && (
        <>
          <button type="button" aria-label="Decrease" className={cn(stepBtn, 'left-2')} disabled={disabled || (min !== undefined && Number(value) <= min)} onClick={() => bump(-1)}>
            <Minus className="size-4" />
          </button>
          <button type="button" aria-label="Increase" className={cn(stepBtn, 'right-2')} disabled={disabled || (max !== undefined && Number(value) >= max)} onClick={() => bump(1)}>
            <Plus className="size-4" />
          </button>
        </>
      )}
    </div>
  );
});

export { Input, Textarea, MoneyInput, NumberInput };
