import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';
import { TONE_CLASSES } from './statusTones';
import { FOCUS_RING } from './styles';
import { useOverlay } from './useOverlay';

const BACKDROP = 'fixed inset-0 z-[100000] bg-[rgba(11,13,26,0.45)] backdrop-blur-[2px] modal-backdrop-enter';
const MODAL_SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      className={cn('grid size-9 shrink-0 place-items-center rounded-[10px] text-ink-subtle hover:bg-fill hover:text-ink', FOCUS_RING)}
    >
      <X className="size-[18px]" />
    </button>
  );
}

/**
 * <Modal open onClose title="Record payment" subtitle="…" size="sm|md|lg|xl" footer={<>…buttons</>}>
 * On phones it opens as a bottom sheet. Esc / backdrop close it (closeOnBackdrop={false} to keep it open).
 */
function Modal({ open, onClose, title, subtitle, footer, size = 'md', closeOnBackdrop = true, hideClose = false, className, bodyClassName, children }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useOverlay(open, onClose, panelRef);
  if (!open) return null;

  return createPortal(
    <div
      className={cn(BACKDROP, 'flex items-end justify-center sm:items-center sm:p-4')}
      onMouseDown={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'modal-content-enter flex max-h-[92vh] w-full flex-col rounded-t-card bg-surface text-ink shadow-2xl outline-none sm:rounded-card',
          MODAL_SIZES[size] ?? MODAL_SIZES.md,
          className
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start gap-3 px-5 pt-5 sm:px-6">
            <div className="min-w-0 flex-1">
              {title && <h2 id={titleId} className="m-0 !text-lg !font-extrabold text-ink">{title}</h2>}
              {subtitle && <p className="m-0 mt-1 text-sm text-ink-muted">{subtitle}</p>}
            </div>
            {!hideClose && <CloseButton onClick={onClose} />}
          </div>
        )}
        <div className={cn('min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-card border-t border-line bg-fill-2 px-5 py-4 sm:px-6">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * Are-you-sure dialog (replaces DeleteModal).
 *   <ConfirmDialog open onClose onConfirm title="Delete supplier?" message="…" confirmLabel="Delete" tone="danger|primary" loading />
 */
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  loadingLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon: Icon = AlertTriangle,
  loading = false,
}) {
  const close = () => { if (!loading) onClose?.(); };
  return (
    <Modal open={open} onClose={close} size="sm" hideClose closeOnBackdrop={!loading} bodyClassName="pt-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className={cn('grid size-12 place-items-center rounded-card', TONE_CLASSES[tone] ?? TONE_CLASSES.danger)}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="m-0 !text-lg !font-extrabold text-ink">{title}</h2>
        {message && <p className="m-0 text-sm text-ink-muted">{message}</p>}
        <div className="mt-3 flex w-full gap-2">
          <Button variant="secondary" className="flex-1" onClick={close} disabled={loading} data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} className="flex-1" onClick={onConfirm} loading={loading}>
            {loading ? loadingLabel ?? confirmLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const DRAWER_SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' };

/** Side panel (invoice peek, filters on phones): <Drawer open onClose title footer size="sm|md|lg"> */
function Drawer({ open, onClose, title, subtitle, footer, size = 'md', className, children }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useOverlay(open, onClose, panelRef);
  if (!open) return null;

  return createPortal(
    <div className={BACKDROP} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'drawer-enter absolute inset-y-0 right-0 flex w-full flex-col bg-surface text-ink shadow-2xl outline-none',
          DRAWER_SIZES[size] ?? DRAWER_SIZES.md,
          className
        )}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            {title && <h2 id={titleId} className="m-0 !text-base !font-extrabold text-ink">{title}</h2>}
            {subtitle && <p className="m-0 mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export { Modal, ConfirmDialog, Drawer };
