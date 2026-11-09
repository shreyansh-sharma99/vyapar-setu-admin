import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { Badge, Button, Input } from '@/components/ui';
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
  const listId = `${id || 'product-picker'}-list`;

  return (
    <div className="flex w-full flex-col gap-2">
      <div ref={wrapperRef} className="relative w-full">
        <Input
          id={id}
          ref={inputRef}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          invalid={invalid}
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
          startIcon={single && !open ? <ProductThumb product={single} size="xs" /> : <Search />}
          className="pr-20"
          endIcon={
            <span className="flex items-center gap-0.5">
              {loading && <Loader2 className="animate-spin text-brand" />}
              {single && !disabled && (
                <Button variant="ghost" size="icon-sm" onClick={() => remove(single)} title="Clear" aria-label="Clear" className="!size-7">
                  <X />
                </Button>
              )}
              <ChevronDown className={`pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>
          }
        />

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-[1000] m-0 max-h-72 list-none overflow-auto overscroll-contain rounded-control border border-line bg-surface p-1 shadow-xl sm:max-h-80"
          >
            {results.error ? (
              <li className="px-3 py-2.5 text-sm text-danger">{results.error}</li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-ink-subtle">{loading ? 'Searching...' : 'No products found'}</li>
            ) : (
              options.map((p, idx) => {
                const selected = isSelected(p);
                return (
                  <li
                    role="option"
                    aria-selected={selected}
                    key={p._id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(p)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex min-h-[48px] cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink ${
                      idx === activeIndex ? 'bg-fill' : selected ? 'bg-brand-soft/60' : ''
                    }`}
                  >
                    {multiple && (
                      <span
                        className={`flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] ${
                          selected ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface'
                        }`}
                      >
                        {selected && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    )}
                    <ProductThumb product={p} size="md" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold text-ink">{p.name}</span>
                      <span className="truncate text-xs text-ink-subtle">{p.sku ? `SKU ${p.sku}` : 'No SKU'}</span>
                    </span>
                    <Badge tone={p?.gst?.next ? 'info' : 'neutral'} className="tabular-nums">
                      GST {gstNow(p)}%{gstNext(p)}
                    </Badge>
                    {!multiple && selected && <Check className="size-4 shrink-0 text-brand-ink" />}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {multiple && selectedList.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedList.map((p) => (
            <span key={p._id} className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-chip bg-brand-soft pl-1 pr-1 text-xs font-semibold text-brand-ink">
              <ProductThumb product={p} size="xs" />
              <span className="max-w-[200px] truncate">{p.name}</span>
              <span className="shrink-0 rounded-chip bg-surface px-1.5 py-px text-[11px] font-bold tabular-nums text-info" title="GST now">
                {gstNow(p)}%{gstNext(p)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(p)}
                disabled={disabled}
                title="Remove"
                aria-label={`Remove ${p.name}`}
                className="!size-6 rounded-full text-brand-ink hover:bg-surface [&_svg]:!size-3"
              >
                <X />
              </Button>
            </span>
          ))}
          <Button variant="ghost" size="xs" onClick={() => onChange?.([])} disabled={disabled} className="hover:text-danger">
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
