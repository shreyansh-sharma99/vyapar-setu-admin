import { encryptData, decryptData } from '@/utility/crypto';

/* ─── Formatting ─────────────────────────────────────────────────────────── */

export const fmtINR = (n) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtINRShort = (n) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const fmtQty = (n) => (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 4 });

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '—';

/** Local date as YYYY-MM-DD */
export const toISODate = (d = new Date()) => {
  const dt = new Date(d);
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
};

/* ─── URL id encoding (same scheme as the sales pages) ──────────────────── */

export const encId = (id) => encodeURIComponent(encryptData(String(id)));
export const decId = (raw) => (raw ? decryptData(decodeURIComponent(raw)) : null);

export const apiError = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.message || fallback;

/* ─── Status maps ────────────────────────────────────────────────────────── */

export const TRANSFER_STATUS = {
  draft: {
    label: 'Draft',
    cls: 'bg-slate-100 text-slate-700 ring-slate-300/60 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
    dot: 'bg-slate-400',
  },
  in_transit: {
    label: 'In transit',
    cls: 'bg-amber-50 text-amber-700 ring-amber-300/60 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
    dot: 'bg-amber-500',
  },
  received: {
    label: 'Received',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-300/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    cls: 'bg-rose-50 text-rose-700 ring-rose-300/60 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
    dot: 'bg-rose-500',
  },
};

export const COUNT_STATUS = {
  in_progress: {
    label: 'Counting',
    cls: 'bg-indigo-50 text-indigo-700 ring-indigo-300/60 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
    dot: 'bg-indigo-500',
  },
  submitted: {
    label: 'Awaiting review',
    cls: 'bg-amber-50 text-amber-700 ring-amber-300/60 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
    dot: 'bg-amber-500',
  },
  approved: {
    label: 'Approved',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-300/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    cls: 'bg-rose-50 text-rose-700 ring-rose-300/60 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
    dot: 'bg-rose-500',
  },
};

export const SCOPE_LABEL = {
  all: 'All products',
  category: 'By category',
  brand: 'By brand',
  products: 'Selected products',
  rack: 'Rack / shelf',
};

/* ─── Shared class names ─────────────────────────────────────────────────── */

export const fieldCls =
  'h-10 w-full px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none focus:border-indigo-500/60 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all disabled:opacity-60 disabled:cursor-not-allowed';

export const labelCls =
  'block text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] mb-1.5';

/* ─── CSV download ───────────────────────────────────────────────────────── */

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const downloadCsv = (filename, rows) => {
  const content = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([String.fromCharCode(0xfeff) + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
