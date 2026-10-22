import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { useDebouncedValue } from '@/pages/storeManagement/products/utils/productUtils';
import { searchGstProductsApi } from '../services/gstRateService';
import { formatDay, productCardGst } from './gstUtils';
import ProductThumb from './ProductThumb';

/** Today's GST from the GST master (withGst lookup), else the product card. */
const gstNow = (p) => (p?.gst && p.gst.current !== undefined ? Number(p.gst.current) : productCardGst(p));
/** " → 12% from 13 Oct 2026" when a GST change is scheduled. */
const gstNext = (p) => (p?.gst?.next ? ` → ${Number(p.gst.next.gstRate)}% from ${formatDay(p.gst.next.effectiveFrom)}` : '');

const sameId = (a, b) => String(a?._id) === String(b?._id);

/**
 * Searchable product dropdown with images.
 * - `multiple`: value is an array of product rows, options have checkboxes, chips are shown below.
 * - single: value is one product row (or null).
 * Product rows come from GET /lookups/products.
 */
export default function ProductPicker({
  id,
  multiple = false,
  value,
  onChange,
  placeholder = 'Search by name, SKU or barcode',
  disabled = false,
  invalid = false,
}) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [results, setResults] = useState({ query: null, options: [], error: '' });
  const debouncedQuery = useDebouncedValue(query, 300);

  const selectedList = multiple ? (Array.isArray(value) ? value : []) : value ? [value] : [];
  const isSelected = (p) => selectedList.some((s) => sameId(s, p));

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    searchGstProductsApi(debouncedQuery, 20)
      .then((res) => {
        if (!cancelled) setResults({ query: debouncedQuery, options: Array.isArray(res?.data) ? res.data : [], error: '' });
      })
      .catch((err) => {
        const message = err?.response?.data?.message || 'Could not load products. Try again.';
        if (!cancelled) setResults({ query: debouncedQuery, options: [], error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery]);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, []);

  const loading = open && (results.query !== debouncedQuery || query !== debouncedQuery);
  const options = results.options;

  const openDropdown = () => {
    if (disabled) return;
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
    setOpen(true);
  };

  const choose = (product) => {
    if (!product) return;
    if (multiple) {
      onChange?.(isSelected(product) ? selectedList.filter((s) => !sameId(s, product)) : [...selectedList, product]);
      inputRef.current?.focus();
    } else {
      onChange?.(product);
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  const remove = (product) => {
    if (multiple) onChange?.(selectedList.filter((s) => !sameId(s, product)));
    else onChange?.(null);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openDropdown();
      return;
    }
    if (!options.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(options[Math.min(activeIndex, options.length - 1)]);
    }
  };

  const single = !multiple && value ? value : null;
  // the product with its GST now, e.g. "Bottle (5%)"
  const inputValue = open ? query : single ? `${single.name} (${gstNow(single)}%${gstNext(single)})` : '';
  const inputPlaceholder = multiple && selectedList.length ? `${selectedList.length} selected — search to add more` : placeholder;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div ref={wrapperRef} className="relative w-full">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
            {single && !open ? <ProductThumb product={single} size="xs" /> : <Search className="w-4 h-4 text-gray-400" />}
          </span>
          <input
            id={id}
            ref={inputRef}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            disabled={disabled}
            value={inputValue}
            placeholder={inputPlaceholder}
            onFocus={openDropdown}
            onClick={openDropdown}
            onKeyDown={onKeyDown}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
              if (!open) setOpen(true);
            }}
            className={`h-11 w-full rounded-xl border bg-gray-50 dark:bg-white/5 pl-10 pr-16 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 outline-none transition-all focus:border-indigo-500/60 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] disabled:opacity-50 disabled:cursor-not-allowed ${invalid ? 'border-rose-400 dark:border-rose-500/60' : 'border-gray-200 dark:border-white/10'}`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
            {single && !disabled && (
              <button
                type="button"
                onClick={() => remove(single)}
                className="p-1 rounded text-gray-400 hover:text-rose-500 cursor-pointer"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {open && (
          <div
            role="listbox"
            aria-multiselectable={multiple || undefined}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-[1000] max-h-72 sm:max-h-80 overflow-auto overscroll-contain rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] shadow-xl py-1"
          >
            {results.error ? (
              <div className="px-3 py-2.5 text-sm text-rose-500">{results.error}</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2.5 text-sm text-[var(--vs-text-secondary)]">{loading ? 'Searching...' : 'No products found'}</div>
            ) : (
              options.map((p, idx) => {
                const selected = isSelected(p);
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    key={p._id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(p)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left px-3 py-2 min-h-[48px] text-sm cursor-pointer flex items-center gap-3 ${
                      idx === activeIndex ? 'bg-indigo-50 dark:bg-indigo-500/10' : selected ? 'bg-indigo-50/60 dark:bg-indigo-500/5' : ''
                    }`}
                  >
                    {multiple && (
                      <span
                        className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                          selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-white/20'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                      </span>
                    )}
                    <ProductThumb product={p} size="md" />
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="font-medium text-[var(--vs-text-primary)] truncate">{p.name}</span>
                      <span className="text-xs text-[var(--vs-text-secondary)] truncate">
                        {p.sku ? `SKU ${p.sku}` : 'No SKU'}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">
                      GST {gstNow(p)}%{gstNext(p)}
                    </span>
                    {!multiple && selected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {multiple && selectedList.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedList.map((p) => (
            <span
              key={p._id}
              className="inline-flex items-center gap-1.5 max-w-full pl-1 pr-1 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
            >
              <ProductThumb product={p} size="xs" />
              <span className="truncate max-w-[200px]">{p.name}</span>
              <span className="shrink-0 px-1.5 py-px rounded-md text-[10px] font-bold bg-white text-sky-700 dark:bg-white/10 dark:text-sky-300" title="GST now">
                {gstNow(p)}%{gstNext(p)}
              </span>
              <button
                type="button"
                onClick={() => remove(p)}
                disabled={disabled}
                className="p-0.5 rounded hover:text-rose-500 cursor-pointer disabled:cursor-not-allowed"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange?.([])}
            disabled={disabled}
            className="text-xs font-semibold text-[var(--vs-text-secondary)] hover:text-rose-500 px-2 py-1 cursor-pointer disabled:cursor-not-allowed"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
