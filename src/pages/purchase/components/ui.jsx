import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Alert, Button, Card, Label, Modal as UiModal, PageHeader, Spinner, StatusBadge as UiStatusBadge, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

/*
 * The few purchase-page helpers that still have their own props (used by the purchase forms and
 * details pages). Everything else comes straight from @/components/ui.
 */

export function StatusBadge({ status, label, size = 'sm' }) {
  return <UiStatusBadge status={status} label={label} size={size === 'lg' ? 'md' : 'sm'} />;
}

/** Full-page loading / error state with the page title and a Back button. */
export function PageLoading({ title, error }) {
  return (
    <div className="mx-auto flex w-full flex-col gap-5">
      <PageHeader
        title={title}
        actions={
          <span className="print:hidden">
            <Button variant="secondary" size="sm" startIcon={<ArrowLeft />} onClick={() => window.history.back()}>
              Back
            </Button>
          </span>
        }
      />
      <Card>
        {error ? <Alert tone="danger">{error}</Alert> : <div className="flex justify-center py-10"><Spinner label="Loading…" /></div>}
      </Card>
    </div>
  );
}

/** Label + control + error / hint. Unlike the ui Field it takes several children (no id wiring). */
export function Field({ label, required, error, hint, children, className = '' }) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error ? (
        <p role="alert" className="m-0 mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <div className="mt-1.5 text-xs text-ink-subtle">{hint}</div>
      ) : null}
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return <Alert tone="danger">{message}</Alert>;
}

/* ─── Modals ──────────────────────────────────────────────────────────────── */

const SIZE_OF = (maxWidth = '') =>
  /max-w-(sm|xs)\b/.test(maxWidth) ? 'sm' : /max-w-(md|lg)\b/.test(maxWidth) ? 'md' : /max-w-(xl|2xl)\b/.test(maxWidth) ? 'lg' : /max-w-/.test(maxWidth) ? 'xl' : 'md';

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = 'max-w-md' }) {
  return (
    <UiModal open={open} onClose={onClose} title={title} subtitle={subtitle} footer={footer} size={SIZE_OF(maxWidth)} hideClose={!onClose} bodyClassName="flex flex-col gap-4">
      {children}
    </UiModal>
  );
}

/**
 * Confirmation dialog with an optional reason box. Mount it with a `key`
 * (or only while open) so the reason starts empty each time.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'primary',
  withReason = false,
  reasonRequired = false,
  reasonPlaceholder = 'Reason (optional)',
  loading = false,
}) {
  const [reason, setReason] = useState('');
  const blocked = reasonRequired && reason.trim().length < 3;
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Go back
          </Button>
          <Button variant={variant} disabled={blocked} loading={loading} onClick={() => onConfirm(reason.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="m-0 text-sm text-ink-muted">{message}</p>}
      {withReason && <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={reasonPlaceholder} />}
    </Modal>
  );
}
