import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { Label } from '@/components/inputs/Label';

/* ─── Status badge ────────────────────────────────────────────────────────── */

const STATUS = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10' },
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20' },
  partially_received: { label: 'Partially received', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20' },
  received: { label: 'Received', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
  closed: { label: 'Closed', cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/20' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20' },
  posted: { label: 'Posted', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
  unpaid: { label: 'Unpaid', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20' },
  partially_paid: { label: 'Partially paid', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20' },
  paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
  overdue: { label: 'Overdue', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20' },
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
  inactive: { label: 'Inactive', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20' },
};

export function StatusBadge({ status, label, size = 'sm' }) {
  const cfg = STATUS[status] || { label: status || '—', cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10' };
  const pad = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
  return <span className={`inline-flex items-center rounded-full border font-semibold whitespace-nowrap ${pad} ${cfg.cls}`}>{label || cfg.label}</span>;
}

/* ─── Layout bits ─────────────────────────────────────────────────────────── */

export function PageShell({ title, description, children, rightNode, bodyClassName = 'p-4 sm:p-6 flex flex-col gap-6' }) {
  return (
    <div className="flex flex-col gap-6 mx-auto w-full text-[var(--vs-text-primary)]">
      <Card
        h1={title}
        description={description}
        rightNode={
          rightNode || (
            <span className="print:hidden">
              <Button size="xs" variant="danger" startIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => window.history.back()}>
                Back
              </Button>
            </span>
          )
        }
        bodyClassName={bodyClassName}
      >
        {children}
      </Card>
    </div>
  );
}

export function PageLoading({ title, error }) {
  return (
    <PageShell title={title}>
      {error ? (
        <div className="p-6 text-center text-sm text-rose-600 dark:text-rose-400">{error}</div>
      ) : (
        <Loader className="my-10" />
      )}
    </PageShell>
  );
}

export function Section({ title, rightNode, children, bodyClassName = 'p-4', className = '' }) {
  return (
    <Card title={title} rightNode={rightNode} bodyClassName={bodyClassName} className={className}>
      {children}
    </Card>
  );
}

export function InfoRow({ label, value, mono = false }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--vs-text-secondary)]">{label}</span>
      <span className={`text-sm font-medium text-[var(--vs-text-primary)] break-words ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export function StatCard({ label, value, hint, tone = 'default', icon }) {
  const tones = {
    default: 'text-[var(--vs-text-primary)]',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
    blue: 'text-blue-600 dark:text-blue-400',
  };
  return (
    <div className="rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-4 py-3 flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--vs-text-secondary)]">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-lg font-bold truncate ${tones[tone] || tones.default}`}>{value}</div>
      {hint && <div className="text-[11px] text-[var(--vs-text-secondary)] truncate">{hint}</div>}
    </div>
  );
}

export function Field({ label, required, error, hint, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      {label && (
        <Label className="!mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </Label>
      )}
      {children}
      {error ? <span className="text-xs text-red-500">{error}</span> : hint ? <span className="text-[11px] text-[var(--vs-text-secondary)]">{hint}</span> : null}
    </div>
  );
}

const controlCls =
  'w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 text-sm text-gray-900 dark:!text-white outline-none focus:border-indigo-500/60 disabled:opacity-60 disabled:cursor-not-allowed';

export function NativeSelect({ value, onChange, options, className = '', size = 'md', error = false, ...rest }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${controlCls} ${size === 'sm' ? 'h-9' : 'h-11'} cursor-pointer ${error ? '!border-red-500' : ''} ${className}`}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TextArea({ value, onChange, rows = 3, placeholder, className = '' }) {
  return (
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${controlCls} py-2 resize-y placeholder:text-gray-400 ${className}`}
    />
  );
}

export function FilterSelect({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none cursor-pointer shadow-sm ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl border border-red-200 dark:border-red-500/20 text-sm font-medium">
      {message}
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="p-6 text-center rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-dashed border-gray-300 dark:border-gray-700 text-sm text-[var(--vs-text-secondary)]">
      {children}
    </div>
  );
}

/* ─── Modals ──────────────────────────────────────────────────────────────── */

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop-enter"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`relative w-full ${maxWidth} rounded-2xl shadow-2xl overflow-hidden modal-content-enter text-[var(--vs-text-primary)]`}
        style={{ background: 'var(--vs-bg-primary)', border: '1px solid var(--vs-border)' }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--vs-border)' }}>
          <h3 className="text-lg font-bold !text-indigo-600 dark:!text-indigo-400">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--vs-text-secondary)] mt-0.5">{subtitle}</p>}
        </div>
        <div className="p-6 flex flex-col gap-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 flex items-center justify-end gap-2.5 bg-gray-50 dark:bg-white/5" style={{ borderTop: '1px solid var(--vs-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
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
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Go back
          </Button>
          <Button
            variant={variant}
            disabled={loading || blocked}
            onClick={() => onConfirm(reason.trim())}
            startIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm text-[var(--vs-text-secondary)]">{message}</p>}
      {withReason && (
        <TextArea value={reason} onChange={setReason} rows={3} placeholder={reasonPlaceholder} />
      )}
    </Modal>
  );
}
