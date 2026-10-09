/* Shared helpers for the inventory screens (formatting, toasts, debounce, ids, CSV) */
import { useState, useEffect, useCallback, useRef } from 'react';
import { encryptData, decryptData } from '@/utility/crypto';

/* ─── Formatting ────────────────────────────────────────────────────────── */

/** ₹1,23,456.78 (en-IN). `decimals` = fixed fraction digits. */
export const formatCurrency = (value, decimals = 2) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

/** Quantities: up to 3 decimals, en-IN grouping. */
export const formatQty = (value) =>
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ─── Ids in URLs (same encryption as Product List / Product Audit) ─────── */

export const encodeId = (id) => (id ? encodeURIComponent(encryptData(String(id))) : '');

/** Accepts an encrypted id (preferred) or a raw 24-hex id from older links. */
export const decodeId = (value) => {
  if (!value) return '';
  if (/^[a-f0-9]{24}$/i.test(value)) return value;
  return decryptData(decodeURIComponent(value)) || '';
};

export const productAuditPath = (productId) => `/products/audit/${encodeId(productId)}`;

/** Adjust Stock page with product (+ store) preselected. */
export const adjustStockPath = (productId, storeId) => {
  const params = new URLSearchParams();
  if (productId) params.set('productId', encryptData(String(productId)));
  if (storeId) params.set('storeId', encryptData(String(storeId)));
  const qs = params.toString();
  return `/inventory/adjust${qs ? `?${qs}` : ''}`;
};

/* ─── Hooks ─────────────────────────────────────────────────────────────── */

/** Returns `value` after it has stopped changing for `delay` ms. */
export const useDebouncedValue = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const TOAST_MS = 3500;

/**
 * Local CoreUI toast queue. `initial` ({ message, color }) is shown once on
 * mount — used for messages passed through location.state.
 */
export const useToasts = (initial) => {
  const [toasts, setToasts] = useState(() =>
    initial?.message ? [{ id: 'initial', message: initial.message, color: initial.color || 'success' }] : []
  );
  const seq = useRef(0);

  const hasInitial = toasts.some((t) => t.id === 'initial');
  useEffect(() => {
    if (!hasInitial) return undefined;
    const t = setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== 'initial')), TOAST_MS);
    return () => clearTimeout(t);
  }, [hasInitial]);

  const showToast = useCallback((message, color = 'success') => {
    if (!message) return;
    seq.current += 1;
    const id = `${Date.now()}-${seq.current}`;
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  return { toasts, showToast };
};

/**
 * Dispatches a list thunk whenever `params` change and aborts the previous
 * request. Errors (not aborts) are reported through `onError`.
 * Returns a `reload()` function.
 */
export const useReportLoader = (dispatch, thunk, params, onError, enabled = true) => {
  const [reloadKey, setReloadKey] = useState(0);
  const paramsKey = JSON.stringify(params);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const promise = dispatch(thunk(JSON.parse(paramsKey)));
    promise.unwrap().catch((err) => {
      if (err?.name === 'AbortError') return;
      onErrorRef.current?.(typeof err === 'string' ? err : err?.message || 'Something went wrong');
    });
    return () => promise.abort();
  }, [dispatch, thunk, paramsKey, reloadKey, enabled]);

  return useCallback(() => setReloadKey((k) => k + 1), []);
};

/* ─── CSV (client side) ─────────────────────────────────────────────────── */

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Downloads rows as CSV. `columns` = [{ label, value: (row) => any }]. */
export const downloadCsv = (fileNamePrefix, columns, rows) => {
  const lines = [
    columns.map((c) => csvCell(c.label)).join(','),
    ...rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(',')),
  ];
  // BOM so Excel opens ₹ and other characters correctly
  const blob = new Blob([String.fromCharCode(0xfeff) + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/** Builds the "Store [CODE]" label used in store dropdowns. */
export const storeLabel = (s) =>
  s ? `${s.name || 'Store'}${s.code ? ` [${s.code}]` : ''}${s.isDefault ? ' (Default)' : ''}` : '';

/**
 * Sellable qty of `product` in `store`, read from product.storeStocks
 * (legacy products without store rows keep all their stock in the default store).
 */
export const getStoreQty = (product, store) => {
  if (!product || !store) return null;
  const rows = product.storeStocks || [];
  const row = rows.find((s) => String(s.storeId?._id ?? s.storeId) === String(store._id));
  if (row) return Number(row.stock || 0);
  if (!rows.length && store.isDefault) return Number(product.currentStock || 0);
  return 0;
};
