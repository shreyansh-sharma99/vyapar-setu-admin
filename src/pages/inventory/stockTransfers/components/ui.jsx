import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import { CheckCircle2, AlertCircle, X, Search, Loader2, Package, ScanLine } from 'lucide-react';
import { lookupProductsApi } from '../services/stockTransferService';
import { fmtQty, labelCls } from './utils';

/* ─── Status pill ────────────────────────────────────────────────────────── */

export function StatusPill({ map, status, className = '' }) {
  const cfg = map[status] || { label: status || '—', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ring-1 whitespace-nowrap ${cfg.cls} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ─── Toast stack ────────────────────────────────────────────────────────── */

export function ToastStack({ toasts }) {
  return (
    <CToaster
      className="p-3 print:hidden"
      style={{ zIndex: 99999, position: 'fixed', bottom: '20px', right: '20px' }}
    >
      {toasts.map((t) => (
        <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2 shadow-lg">
          <div className="d-flex">
            <CToastBody className="flex items-center gap-2 font-semibold">
              {t.color === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-white shrink-0" />
              )}
              <span>{t.message}</span>
            </CToastBody>
          </div>
        </CToast>
      ))}
    </CToaster>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */

export function Modal({ isOpen, onClose, title, subtitle, icon, children, footer, size = 'md', busy = false }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, busy]);

  if (!isOpen) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop-enter print:hidden"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className={`relative w-full ${widths[size] || widths.md} max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden modal-content-enter bg-[var(--vs-bg-primary)] border border-[var(--vs-border)]`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--vs-active-bg)] text-[var(--vs-active-text)] shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--vs-text-primary)] leading-tight m-0">{title}</h3>
              {subtitle && <p className="text-xs text-[var(--vs-text-secondary)] mt-1 mb-0">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-lg text-[var(--vs-text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ─── Field wrapper ──────────────────────────────────────────────────────── */

export function Field({ label, required, hint, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className={labelCls}>
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1 mb-0">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-[var(--vs-text-secondary)] mt-1 mb-0">{hint}</p>
      ) : null}
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */

const TONES = {
  indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
  slate: 'text-slate-600 dark:text-slate-300 bg-slate-500/10',
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
};

export function StatCard({ label, value, sub, icon, tone = 'indigo', active = false, onClick, className = '' }) {
  const toneCls = TONES[tone] || TONES.indigo;
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left w-full rounded-xl border p-3 sm:p-4 transition-all bg-[var(--vs-bg-primary)] ${active
        ? 'border-indigo-500/60 ring-2 ring-indigo-500/20'
        : 'border-[var(--vs-border)]'
        } ${onClick ? 'cursor-pointer hover:border-indigo-400/60' : ''} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] truncate">
          {label}
        </span>
        {icon && (
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${toneCls}`}>{icon}</span>
        )}
      </div>
      <div className={`mt-1.5 text-xl sm:text-2xl font-extrabold tracking-tight ${toneCls.split(' bg-')[0]}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--vs-text-secondary)] mt-0.5 truncate">{sub}</div>}
    </Comp>
  );
}

/* ─── Progress bar ───────────────────────────────────────────────────────── */

export function ProgressBar({ value = 0, total = 0, className = '', showLabel = true, height = 'h-2' }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500';
  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${height} rounded-full bg-black/5 dark:bg-white/10 overflow-hidden`}>
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <div className="flex justify-between text-[11px] text-[var(--vs-text-secondary)] mt-1">
          <span>
            {value.toLocaleString('en-IN')} / {total.toLocaleString('en-IN')} counted
          </span>
          <span className="font-bold">{pct}%</span>
        </div>
      )}
    </div>
  );
}

/* ─── Async product search ───────────────────────────────────────────────── */

/**
 * Debounced search on /lookups/products. With `storeId` each row shows the
 * stock available in that store.
 */
export function ProductSearch({
  storeId,
  onSelect,
  placeholder = 'Search product by name, SKU or barcode…',
  disabled = false,
  showStock = true,
  excludeIds = [],
  clearOnSelect = true,
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open || disabled) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = { q: q.trim(), limit: 20 };
        if (storeId) params.storeId = storeId;
        const res = await lookupProductsApi(params);
        if (alive) {
          setResults(res.data || []);
          setHighlight(0);
        }
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, storeId, open, disabled]);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const visible = results.filter((p) => !excludeIds.includes(p._id));

  const choose = (p) => {
    onSelect(p);
    if (clearOnSelect) setQ('');
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, visible.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (visible[highlight]) choose(visible[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={wrapRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--vs-text-secondary)] pointer-events-none" />
        <input
          type="text"
          value={q}
          disabled={disabled}
          placeholder={disabled ? 'Select the source store first' : placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-11 w-full pl-9 pr-9 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none focus:border-indigo-500/60 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] disabled:opacity-60 disabled:cursor-not-allowed"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500" />
        )}
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] shadow-xl max-h-80 overflow-y-auto">
          {visible.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-sm text-[var(--vs-text-secondary)]">
              {q.trim() ? 'No matching products' : 'Start typing to search products'}
            </div>
          )}
          {visible.map((p, i) => {
            const stock = Number(p.storeStock ?? 0);
            return (
              <button
                type="button"
                key={p._id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 border-b border-[var(--vs-border)] last:border-b-0 cursor-pointer ${i === highlight ? 'bg-[var(--vs-active-bg)]' : 'hover:bg-[var(--vs-bg-secondary)]'
                  }`}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  {p.matchedExactly ? <ScanLine className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--vs-text-primary)] truncate">{p.name}</div>
                  <div className="text-[11px] text-[var(--vs-text-secondary)] truncate font-mono">
                    {[p.sku, p.barcode].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                {showStock && storeId && (
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold ${stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                    >
                      {fmtQty(stock)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-[var(--vs-text-secondary)]">
                      {p.unit || 'pcs'} in stock
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Empty / error block ────────────────────────────────────────────────── */

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--vs-active-bg)] text-[var(--vs-active-text)] flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-bold text-[var(--vs-text-primary)] m-0">{title}</h4>
      {message && <p className="text-xs text-[var(--vs-text-secondary)] mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
