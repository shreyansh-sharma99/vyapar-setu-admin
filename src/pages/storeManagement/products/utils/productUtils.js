import { useCallback, useEffect, useRef, useState } from 'react';
import { encryptData } from '@/utility/crypto';

/** Base units offered in the product form (free text is also allowed). */
export const UNIT_OPTIONS = ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'dozen', 'm'];

/** ₹ amount in en-IN format. Returns '—' for empty values. */
export const formatINR = (value, { decimals = 2 } = {}) => {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—';
  return `₹${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })}`;
};

/** Plain number in en-IN format. */
export const formatQty = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 3 });
};

/** Same id encoding the existing product routes use. */
export const encodeId = (id) => encodeURIComponent(encryptData(String(id)));

/** Number parse that keeps 0 (unlike `Number(x) || fallback`). */
export const toNumberOr = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Price the customer pays, mirroring the backend rule:
 * discounted price (if > 0) else base price, plus GST when GST is applicable and not included.
 */
export const computeCustomerPrice = ({ basePrice, discountedPrice, isGstApplicable, isGstIncludedInPrice, gstRateOverride }) => {
  const discounted = toNumberOr(discountedPrice, 0);
  const price = discounted > 0 ? discounted : toNumberOr(basePrice, 0);
  const gstOn = isGstApplicable === true || isGstApplicable === 'true';
  const gstIncluded = isGstIncludedInPrice === true || isGstIncludedInPrice === 'true';
  const value = gstOn && !gstIncluded ? price * (1 + toNumberOr(gstRateOverride, 0) / 100) : price;
  return Math.round(value * 100) / 100;
};

/** Stock badge state for a product or store row. */
export const getStockState = (stock, threshold) => {
  const qty = toNumberOr(stock, 0);
  const limit = toNumberOr(threshold, 0);
  if (qty <= 0) return 'out';
  if (qty <= limit) return 'low';
  return 'in';
};

/** Valid EAN-13 (13 digits with a correct check digit). */
export const isValidEan13 = (code) => {
  const s = String(code || '');
  if (!/^\d{13}$/.test(s)) return false;
  const sum = s
    .slice(0, 12)
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === Number(s[12]);
};

/** Error message from an axios error, including blob (file download) responses. */
export const getApiErrorMessage = async (error, fallback = 'Something went wrong') => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || error?.message || fallback;
};

/** Saves a blob axios response as a file, using the Content-Disposition name when present. */
export const saveBlobResponse = (response, fallbackName) => {
  const disposition = response?.headers?.['content-disposition'] || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  return filename;
};

/** YYYY-MM-DD for file names. */
export const todayStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Small toast queue used by the product pages (rendered with <ToastStack />). */
export const useToasts = (duration = 4000) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const showToast = useCallback((message, color = 'success') => {
    if (!message) return;
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, color }]);
    timers.current.push(setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration));
  }, [duration]);

  return { toasts, showToast };
};

/** Debounced copy of a value. */
export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export const emptyAlternateUnit = () => ({ unit: '', factor: '', barcode: '' });

/** Validates alternate unit rows. Returns { errors: {idx: {unit|factor}}, hasErrors }. */
export const validateAlternateUnits = (rows = [], baseUnit = '') => {
  const errors = {};
  const seen = new Set();
  const base = String(baseUnit || '').trim().toLowerCase();
  rows.forEach((r, idx) => {
    const unit = String(r.unit || '').trim().toLowerCase();
    const factor = Number(r.factor);
    if (!unit && !r.factor && !r.barcode) return; // blank row, ignored
    if (!unit) errors[idx] = { unit: 'Enter the unit name.' };
    else if (unit === base) errors[idx] = { unit: 'Alternate unit must differ from the base unit.' };
    else if (seen.has(unit)) errors[idx] = { unit: `"${unit}" is listed twice.` };
    else if (!(factor > 0)) errors[idx] = { factor: 'Enter how many base units are in one of this unit.' };
    seen.add(unit);
  });
  return { errors, hasErrors: Object.keys(errors).length > 0 };
};

/** Alternate units ready for the API (blank rows dropped). */
export const cleanAlternateUnits = (rows = []) =>
  rows
    .filter((r) => String(r.unit || '').trim() && Number(r.factor) > 0)
    .map((r) => ({
      unit: String(r.unit).trim().toLowerCase(),
      factor: Number(r.factor),
      barcode: String(r.barcode || '').trim(),
    }));
