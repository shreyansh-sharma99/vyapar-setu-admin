import { Children, cloneElement, forwardRef, isValidElement, useId } from 'react';
import { cn } from '@/lib/utils';

/** Plain field label (also the old components/inputs/Label). */
const Label = forwardRef(function Label({ className, required, children, ...props }, ref) {
  return (
    <label ref={ref} className={cn('mb-2 block text-[13px] font-semibold text-ink-muted', className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
    </label>
  );
});

/**
 * Label + control + hint / error in one block.
 *   <Field label="Order date" required hint="…" error={errors.orderDate?.message}>
 *     <Input {...register('orderDate')} />
 *   </Field>
 * Wires id, aria-describedby and aria-invalid onto the single child control.
 */
function Field({ label, required, hint, error, htmlFor, className, children }) {
  const autoId = useId();
  const child = Children.only(children);
  const id = htmlFor ?? child.props?.id ?? `field-${autoId}`;
  const message = typeof error === 'string' ? error : error?.message;
  const noteId = message || hint ? `${id}-note` : undefined;

  const control = isValidElement(child)
    ? cloneElement(child, {
        id,
        'aria-describedby': cn(child.props['aria-describedby'], noteId) || undefined,
        'aria-invalid': message ? true : child.props['aria-invalid'],
      })
    : child;

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      {control}
      {message ? (
        <p id={noteId} role="alert" className="m-0 mt-1.5 text-xs font-medium text-danger">{message}</p>
      ) : hint ? (
        <p id={noteId} className="m-0 mt-1.5 text-xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

const COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

/** Field rows from the mockups: 3 columns on desktop, 1 on phones. Use `className="col-span-full"` for a wide field. */
function FormGrid({ cols = 3, className, children }) {
  return <div className={cn('grid gap-x-4 gap-y-4', COLS[cols] ?? COLS[3], className)}>{children}</div>;
}

/**
 * One setting: title + description on the left, a Switch / Select / Button on the right.
 *   <SettingRow title="Active" description="Inactive roles cannot be given to staff"><Switch … /></SettingRow>
 * Stack several inside a Section; they get a divider between them.
 */
function SettingRow({ title, description, htmlFor, className, children }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line py-3.5 first:pt-0 last:border-0 last:pb-0', className)}>
      <div className="min-w-0 flex-1">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">{title}</label>
        ) : (
          <div className="text-sm font-semibold text-ink">{title}</div>
        )}
        {description && <p className="m-0 mt-0.5 text-xs text-ink-subtle">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

export { Label, Field, FormGrid, SettingRow };
