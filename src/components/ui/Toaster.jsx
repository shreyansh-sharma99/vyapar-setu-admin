import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_CLASSES } from './statusTones';
import { getToasts, subscribeToasts, toast } from './toastStore';

const ICONS = { success: CheckCircle2, danger: AlertCircle, warning: AlertTriangle, info: Info, primary: Info, neutral: Info };
// CoreUI colour names used by the older pages' local toasts.
const FROM_COLOR = { success: 'success', danger: 'danger', error: 'danger', warning: 'warning', info: 'info', primary: 'primary', secondary: 'neutral', dark: 'neutral', light: 'neutral' };

/**
 * Bottom-right toast stack. Pages with their own toast state pass it in:
 *   <ToastStack toasts={toasts} />   // items: { id, message, color | tone }
 * New code calls toast.success(…) and relies on the app-wide <Toaster />.
 */
function ToastStack({ toasts = [], onDismiss, className }) {
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={cn('pointer-events-none fixed bottom-5 right-5 z-[100010] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2 print:hidden', className)}
    >
      {toasts.map((t) => {
        const tone = t.tone ?? FROM_COLOR[t.color] ?? 'success';
        const Icon = ICONS[tone] ?? Info;
        return (
          <div
            key={t.id}
            className="modal-content-enter pointer-events-auto flex items-start gap-3 rounded-control bg-surface px-3 py-2.5 shadow-[0_12px_32px_-8px_rgba(30,27,75,0.3)] ring-1 ring-line"
          >
            <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg', TONE_CLASSES[tone])}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <p className="m-0 flex-1 py-1 text-sm font-semibold text-ink">{t.message}</p>
            {onDismiss && (
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => onDismiss(t.id)}
                className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-subtle hover:bg-fill hover:text-ink"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>,
    document.body
  );
}

/** Mounted once (main.jsx); shows everything sent through toast.*(). */
function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts);
  return <ToastStack toasts={toasts} onDismiss={toast.dismiss} />;
}

export { Toaster, ToastStack };
