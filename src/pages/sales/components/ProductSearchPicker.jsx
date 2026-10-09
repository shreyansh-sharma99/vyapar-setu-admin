import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Search, Loader2, ScanLine, X } from 'lucide-react';
import { lookupProductsApi } from '../services/productLookupService';

const DEBOUNCE_MS = 300;

const formatPrice = (p) => {
  const price = Number(p.discountedPrice > 0 ? p.discountedPrice : p.basePrice || 0);
  return `₹${price.toFixed(2)}`;
};

/** Shared hook: debounced product search with stale-response protection. */
function useProductSearch(storeId) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchedFor, setSearchedFor] = useState(null);
  const requestRef = useRef(0);
  const timerRef = useRef(null);

  const runSearch = async (q) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const rows = await lookupProductsApi({ q, storeId, limit: 20 });
      if (reqId === requestRef.current) {
        setResults(rows);
        setSearchedFor(q);
      }
      return rows;
    } catch {
      if (reqId === requestRef.current) {
        setResults([]);
        setSearchedFor(q);
      }
      return [];
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  };

  const scheduleSearch = (q) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(q), DEBOUNCE_MS);
  };

  const searchNow = (q) => {
    clearTimeout(timerRef.current);
    return runSearch(q);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { results, loading, searchedFor, scheduleSearch, searchNow, setResults };
}

/** Picks the row to add when Enter is pressed (scanner or typed code). */
const pickOnEnter = (rows) => rows.find((r) => r.matchedExactly) || (rows.length === 1 ? rows[0] : null);

/**
 * Async product picker for document lines.
 * - Type to search (debounced) by name, SKU, barcode, pack barcode or HSN.
 * - With `storeId`, every result shows the sellable stock in that store.
 * - Press Enter after scanning / typing a barcode or SKU: the exact match is selected.
 */
export default function ProductSearchPicker({
  value,
  selectedLabel = '',
  storeId,
  onSelect,
  error = false,
  placeholder = 'Search name, SKU or scan barcode',
  disabled = false,
  showStock = true,
}) {
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [notice, setNotice] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const { results, loading, searchedFor, scheduleSearch, searchNow } = useProductSearch(storeId);

  useEffect(() => {
    const onOutside = (e) => {
      if (wrapperRef.current?.contains(e.target) || dropdownRef.current?.contains(e.target)) return;
      setIsOpen(false);
      setQuery('');
      setNotice('');
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    // Opens UPWARD, fixed to the viewport, so the list never makes the page
    // taller. Falls back to opening downward only when there is little room above.
    const calc = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 4;
      const preferred = 288; // same as max-h-72
      const spaceAbove = rect.top - gap - 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
      const openUp = spaceAbove >= 160 || spaceAbove >= spaceBelow;
      const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 16);
      setDropdownStyle({
        position: 'fixed',
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
        maxHeight: Math.max(120, Math.min(preferred, openUp ? spaceAbove : spaceBelow)),
        zIndex: 100005,
        ...(openUp ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
      });
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('scroll', calc, true);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('scroll', calc, true);
    };
  }, [isOpen]);

  const choose = (product) => {
    onSelect(product);
    setIsOpen(false);
    setQuery('');
    setNotice('');
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    setQuery('');
    setActiveIndex(-1);
    searchNow('');
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    setNotice('');
    setActiveIndex(-1);
    if (!isOpen) setIsOpen(true);
    scheduleSearch(q.trim());
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const q = query.trim();
      const resultsAreCurrent = searchedFor === q && !loading;
      if (activeIndex >= 0 && resultsAreCurrent && results[activeIndex]) {
        choose(results[activeIndex]);
        return;
      }
      if (!q) return;
      const rows = resultsAreCurrent ? results : await searchNow(q);
      const match = pickOnEnter(rows);
      if (match) choose(match);
      else setNotice(rows.length ? 'No exact barcode / SKU match. Pick a product from the list.' : `No product found for "${q}".`);
    }
  };

  const dropdown = (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] shadow-lg overflow-auto"
    >
      {notice && (
        <div className="px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-b border-[var(--vs-border)]">
          {notice}
        </div>
      )}
      {loading && results.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-[var(--vs-text-secondary)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Searching...
        </div>
      ) : results.length === 0 ? (
        <div className="px-3 py-3 text-sm text-[var(--vs-text-secondary)]">
          {query.trim() ? 'No matching products.' : 'No products found.'}
        </div>
      ) : (
        results.map((p, i) => {
          const stock = Number(p.storeStock ?? 0);
          return (
            <div
              key={p._id}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-3 py-2 cursor-pointer border-b last:border-b-0 border-[var(--vs-border)] ${
                i === activeIndex || p._id === value ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-[var(--vs-bg-secondary)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--vs-text-primary)] truncate">{p.name}</div>
                  <div className="text-[11px] text-[var(--vs-text-secondary)] truncate">
                    {[p.sku && `SKU: ${p.sku}`, p.barcode && `Barcode: ${p.barcode}`, p.unit && `Unit: ${p.unit}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-0.5">
                  <span className="text-xs font-semibold text-[var(--vs-text-primary)]">{formatPrice(p)}</span>
                  {showStock && storeId && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        stock > 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}
                    >
                      In store: {stock} {p.unit || ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--vs-text-secondary)] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={isOpen ? query : selectedLabel}
        placeholder={isOpen && selectedLabel ? selectedLabel : placeholder}
        onFocus={handleFocus}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-lg border bg-white dark:bg-slate-900 pl-9 pr-8 py-2 text-sm outline-none text-[var(--vs-text-primary)] focus:ring-2 disabled:opacity-60 ${
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-200 dark:border-white/10 focus:border-indigo-500/60 focus:ring-indigo-500/20'
        }`}
      />
      {loading && isOpen && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500" />
      )}
      {isOpen && ReactDOM.createPortal(dropdown, document.body)}
    </div>
  );
}

/**
 * Barcode / SKU scan box. Scanners type the code and press Enter; the exact match is passed
 * to `onProduct`. Typing a code by hand and pressing Enter works the same way.
 */
export function BarcodeScanInput({ storeId, onProduct, placeholder = 'Scan barcode or type SKU, then press Enter' }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const handleKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = code.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      const rows = await lookupProductsApi({ q, storeId, limit: 5 });
      const match = pickOnEnter(rows);
      if (match) {
        onProduct(match);
        setMessage({ ok: true, text: `Added ${match.name}` });
        setCode('');
      } else {
        setMessage({ ok: false, text: `No product with barcode or SKU "${q}".` });
      }
    } catch {
      setMessage({ ok: false, text: 'Could not look up the product. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full sm:w-80">
      <div className="relative">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--vs-text-secondary)] pointer-events-none" />
        <input
          type="text"
          autoComplete="off"
          value={code}
          onChange={(e) => { setCode(e.target.value); setMessage(null); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-8 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 pl-9 pr-8 text-xs outline-none text-[var(--vs-text-primary)] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
        />
        {busy ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-indigo-500" />
        ) : code ? (
          <button
            type="button"
            onClick={() => { setCode(''); setMessage(null); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--vs-text-secondary)] cursor-pointer"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      {message && (
        <span className={`text-[11px] font-medium ${message.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
