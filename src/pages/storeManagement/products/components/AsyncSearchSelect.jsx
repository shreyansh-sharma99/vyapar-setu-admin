import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { useDebouncedValue } from '../utils/productUtils';

/**
 * Search-as-you-type picker.
 * `fetchOptions(query)` must be stable (module function or useCallback) and resolve to
 * [{ value, label, sublabel?, raw? }].
 */
export default function AsyncSearchSelect({
  value,
  selectedLabel = '',
  onChange,
  fetchOptions,
  placeholder = 'Search...',
  emptyText = 'No results found',
  clearable = true,
  disabled = false,
  keepOpenOnSelect = false,
  className = '',
}) {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ query: null, options: [], failed: false });
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    Promise.resolve(fetchOptions(debouncedQuery))
      .then((options) => {
        if (!cancelled) setResults({ query: debouncedQuery, options: options || [], failed: false });
      })
      .catch(() => {
        if (!cancelled) setResults({ query: debouncedQuery, options: [], failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery, fetchOptions]);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const loading = open && (results.query !== debouncedQuery || query !== debouncedQuery);

  const handleSelect = (option) => {
    onChange?.(option);
    if (!keepOpenOnSelect) {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          autoComplete="off"
          disabled={disabled}
          value={open ? query : selectedLabel}
          placeholder={selectedLabel || placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          className="h-11 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 pl-9 pr-16 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 outline-none transition-all focus:border-indigo-500/60 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={() => onChange?.(null)}
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
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[1000] max-h-64 overflow-auto rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] shadow-xl">
          {results.failed ? (
            <div className="px-3 py-2.5 text-sm text-rose-500">Could not load results. Try again.</div>
          ) : results.options.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-[var(--vs-text-secondary)]">
              {loading ? 'Searching...' : emptyText}
            </div>
          ) : (
            results.options.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer flex flex-col ${opt.value === value ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''}`}
              >
                <span className="font-medium text-[var(--vs-text-primary)]">{opt.label}</span>
                {opt.sublabel && <span className="text-xs text-[var(--vs-text-secondary)]">{opt.sublabel}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
