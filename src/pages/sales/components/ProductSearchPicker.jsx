import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Search, Loader2, ScanLine, X } from 'lucide-react';
import { Badge, Button, Input } from '@/components/ui';
import { lookupProductsApi } from '../services/productLookupService';

const DEBOUNCE_MS = 300;

// The selling price; a product without one is sold at its MRP.
const formatPrice = (p) => {
  const price = Number(p.discountedPrice > 0 ? p.discountedPrice : p.basePrice || 0);
  if (!(price > 0) && Number(p.mrp) > 0) return `₹${Number(p.mrp).toFixed(2)} MRP`;
  return `₹${price.toFixed(2)}`;
};

/** Shared hook: debounced product search with stale-response protection. */
function useProductSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchedFor, setSearchedFor] = useState(null);
  const requestRef = useRef(0);
  const timerRef = useRef(null);

  const runSearch = async (q) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const rows = await lookupProductsApi({ q, limit: 20 });
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
 * - Every result shows the product's sellable stock.
 * - Press Enter after scanning / typing a barcode or SKU: the exact match is selected.
 */
export default function ProductSearchPicker({
  value,
  selectedLabel = '',
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
  const { results, loading, searchedFor, scheduleSearch, searchNow } = useProductSearch();

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
      className="overflow-auto rounded-control border border-line bg-surface text-ink shadow-[0_12px_32px_-8px_rgba(30,27,75,0.25)]"
    >
      {notice && (
        <div className="border-b border-line bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
          {notice}
        </div>
      )}
      {loading && results.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-ink-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Searching...
        </div>
      ) : results.length === 0 ? (
        <div className="px-3 py-3 text-sm text-ink-muted">
          {query.trim() ? 'No matching products.' : 'No products found.'}
        </div>
      ) : (
        results.map((p, i) => {
          const stock = Number(p.currentStock ?? 0);
          return (
            <div
              key={p._id}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-3 py-2 cursor-pointer border-b last:border-b-0 border-line ${
                i === activeIndex || p._id === value ? 'bg-brand-soft' : 'hover:bg-fill-2'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{p.name}</div>
                  <div className="text-[11px] text-ink-muted truncate">
                    {[p.sku && `SKU: ${p.sku}`, p.barcode && `Barcode: ${p.barcode}`, p.unit && `Unit: ${p.unit}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-0.5">
                  <span className="text-xs font-semibold tabular-nums text-ink">{formatPrice(p)}</span>
                  {showStock && (
                    <Badge tone={stock > 0 ? 'success' : 'danger'} size="xs" className="rounded-md font-semibold">
                      In stock: {stock} {p.unit || ''}
                    </Badge>
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
      <Input
        ref={inputRef}
        size="sm"
        autoComplete="off"
        disabled={disabled}
        value={isOpen ? query : selectedLabel}
        placeholder={isOpen && selectedLabel ? selectedLabel : placeholder}
        onFocus={handleFocus}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        invalid={!!error}
        startIcon={<Search />}
        endIcon={loading && isOpen ? <Loader2 className="animate-spin text-brand" /> : null}
      />
      {isOpen && ReactDOM.createPortal(dropdown, document.body)}
    </div>
  );
}

/**
 * Barcode / SKU scan box. Scanners type the code and press Enter; the exact match is passed
 * to `onProduct`. Typing a code by hand and pressing Enter works the same way.
 */
export function BarcodeScanInput({ onProduct, placeholder = 'Scan barcode or type SKU, then press Enter' }) {
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
      const rows = await lookupProductsApi({ q, limit: 5 });
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
      <Input
        size="sm"
        autoComplete="off"
        value={code}
        onChange={(e) => { setCode(e.target.value); setMessage(null); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="bg-surface text-xs"
        startIcon={<ScanLine />}
        endIcon={
          busy ? (
            <Loader2 className="animate-spin text-brand" />
          ) : code ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { setCode(''); setMessage(null); }}
              className="!size-6 !rounded-md"
              title="Clear"
              aria-label="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          ) : null
        }
      />
      {message && (
        <span className={`text-[11px] font-medium ${message.ok ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
