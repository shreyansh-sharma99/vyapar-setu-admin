import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from './styles';

// Pick a look with `variant`, never with classes in the page.
const VARIANTS = {
  primary: 'bg-brand text-white shadow-card hover:bg-brand-hover',
  secondary: 'bg-surface text-ink-muted shadow-card ring-1 ring-line hover:text-ink hover:bg-fill-2',
  soft: 'bg-brand-soft text-brand-ink hover:brightness-95',
  ghost: 'text-ink-muted hover:bg-fill hover:text-ink',
  accent: 'bg-highlight text-white shadow-card hover:brightness-95',
  danger: 'bg-danger text-white shadow-card hover:brightness-95',
  'danger-soft': 'bg-danger-soft text-danger hover:brightness-95',
  success: 'bg-success text-white shadow-card hover:brightness-95',
  link: 'text-brand-ink underline-offset-4 hover:underline !h-auto !px-0',
  // Link on a dark panel (TotalsPanel, nav).
  'link-inverse': 'text-highlight underline-offset-4 hover:underline !h-auto !px-0',
  // Back / Cancel: red, so leaving a page or dialog is never mistaken for saving.
  cancel: 'bg-danger-soft text-danger ring-1 ring-danger/25 hover:bg-danger hover:text-white',
};

// Old names from components/inputs/Button keep working.
const ALIASES = { outline: 'secondary' };

// Quiet buttons that say "Back" / "Cancel" (any page, dialog or old component) get the red cancel look.
const QUIET = new Set(['secondary', 'outline', 'ghost', 'soft']);
const CANCEL_TEXT = /^(back|go back|cancel)$/i;
const textOf = (node) =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : node?.props?.children !== undefined
        ? textOf(node.props.children)
        : '';

const SIZES = {
  xs: 'h-7 px-2.5 text-xs rounded-lg gap-1.5 [&_svg]:size-3.5',
  sm: 'h-8 px-3 text-sm rounded-[10px] gap-1.5 [&_svg]:size-4',
  md: 'h-10 px-4 text-sm rounded-control gap-2 [&_svg]:size-4',
  lg: 'h-12 px-5 text-base rounded-control gap-2 [&_svg]:size-5',
  icon: 'h-10 w-10 rounded-control [&_svg]:size-[18px]',
  'icon-sm': 'h-8 w-8 rounded-[10px] [&_svg]:size-4',
};

/**
 * <Button variant="primary|secondary|soft|ghost|accent|danger|danger-soft|success|link|link-inverse|cancel"
 *         size="xs|sm|md|lg|icon|icon-sm" loading fullWidth startIcon endIcon as={Link}>
 */
const Button = forwardRef(function Button(
  {
    as: Comp = 'button',
    variant = 'primary',
    size = 'md',
    startIcon,
    endIcon,
    loading = false,
    fullWidth = false,
    disabled,
    type,
    className,
    children,
    ...props
  },
  ref
) {
  // "login" was the old full-width sign-in button.
  const isLogin = variant === 'login';
  const named = isLogin ? 'primary' : ALIASES[variant] ?? variant;
  const look = QUIET.has(variant) && CANCEL_TEXT.test(textOf(children).trim()) ? 'cancel' : named;
  const scale = isLogin ? 'lg' : size;
  const isNative = Comp === 'button';

  return (
    <Comp
      ref={ref}
      type={isNative ? type ?? 'button' : type}
      disabled={isNative ? disabled || loading : undefined}
      aria-disabled={!isNative && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none cursor-pointer',
        'transition-[background-color,color,box-shadow,filter,transform] duration-150 active:scale-[0.98]',
        'disabled:opacity-50 disabled:pointer-events-none [&_svg]:shrink-0',
        FOCUS_RING,
        SIZES[scale] ?? SIZES.md,
        VARIANTS[look] ?? VARIANTS.primary,
        (fullWidth || isLogin) && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : startIcon}
      {children}
      {endIcon}
    </Comp>
  );
});

export default Button;
export { Button };
