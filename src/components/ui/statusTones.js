/**
 * One colour tone per record / document status, shared by StatusBadge and DataTable.
 * Add a status here once; every list, form and details page picks it up.
 */
export const STATUS_TONE = {
  paid: 'success',
  received: 'success',
  completed: 'success',
  confirmed: 'success',
  posted: 'success',
  active: 'success',
  approved: 'success',
  issued: 'success',
  success: 'success',

  partial: 'warning',
  partially_paid: 'warning',
  partially_received: 'warning',
  pending: 'warning',
  unpaid: 'warning',
  ordered: 'warning',

  overdue: 'danger',
  cancelled: 'danger',
  voided: 'danger',
  void: 'danger',
  rejected: 'danger',
  inactive: 'danger',
  damaged: 'danger',
  failed: 'danger',

  sent: 'info',
  in_transit: 'info',
  returned: 'info',
  credit: 'info',

  draft: 'neutral',
  closed: 'neutral',
  ignored: 'neutral',
};

/** Soft chip classes for each tone (token-based, so light and dark come for free). */
export const TONE_CLASSES = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-neutral-soft text-neutral',
  primary: 'bg-brand-soft text-brand-ink',
};

const normalize = (status) => String(status ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

export function toneForStatus(status) {
  return STATUS_TONE[normalize(status)] ?? 'neutral';
}

/** "partially_received" → "Partially received" */
export function labelForStatus(status) {
  const text = normalize(status).replace(/_/g, ' ');
  return text ? text[0].toUpperCase() + text.slice(1) : '—';
}
