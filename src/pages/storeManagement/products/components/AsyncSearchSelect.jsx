import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
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
      <Input
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
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
        startIcon={<Search />}
        endIcon={
          <span className="flex items-center gap-1">
            {loading && <Loader2 className="animate-spin text-brand" />}
            {clearable && value && !disabled && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onChange?.(null)}
                className="size-6 hover:text-danger"
                title="Clear"
                aria-label="Clear"
              >
                <X className="!size-3.5" />
              </Button>
            )}
            <ChevronDown className={`pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        }
        className="pr-20"
      />

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[1000] max-h-64 overflow-auto rounded-control border border-line bg-surface p-1 shadow-[0_12px_32px_-8px_rgba(30,27,75,0.25)]"
        >
          {results.failed ? (
            <div className="px-3 py-2.5 text-sm text-danger">Could not load results. Try again.</div>
          ) : results.options.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-ink-muted">
              {loading ? 'Searching...' : emptyText}
            </div>
          ) : (
            results.options.map((opt) => (
              <div
                role="option"
                aria-selected={opt.value === value}
                key={opt.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer select-none flex flex-col ${opt.value === value ? 'bg-brand-soft' : 'hover:bg-fill'}`}
              >
                <span className={`font-medium ${opt.value === value ? 'text-brand-ink' : 'text-ink'}`}>{opt.label}</span>
                {opt.sublabel && <span className="text-xs text-ink-muted">{opt.sublabel}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
