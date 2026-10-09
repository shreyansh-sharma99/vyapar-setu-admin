import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, X } from 'lucide-react';

const calcStyle = (el) => {
  if (!el) return {};
  const r = el.getBoundingClientRect();
  const width = Math.max(r.width, 280);
  const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
  const spaceBelow = window.innerHeight - r.bottom;
  const openUp = spaceBelow < 260 && r.top > spaceBelow;
  return {
    position: 'absolute',
    left: left + window.scrollX,
    top: openUp ? r.top + window.scrollY - 4 : r.bottom + window.scrollY + 4,
    transform: openUp ? 'translateY(-100%)' : 'none',
    width,
    zIndex: 100005,
  };
};

/**
 * Search-as-you-type select. `loadOptions(query)` returns
 * [{ value, label, sub?, data? }]. `value` is { value, label } or null.
 */
export default function AsyncSelect({
  value,
  onChange,
  loadOptions,
  placeholder = 'Search...',
  error = false,
  disabled = false,
  clearable = false,
  className = '',
  size = 'md',
  emptyText = 'No matches found',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [style, setStyle] = useState({});
  const wrapRef = useRef(null);
  const dropRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const reqRef = useRef(0);

  const runSearch = (q) => {
    clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      reqRef.current += 1;
      const req = reqRef.current;
      try {
        const res = await loadOptions(q);
        if (req === reqRef.current) {
          setOptions(res || []);
          setHighlight(0);
        }
      } catch {
        if (req === reqRef.current) setOptions([]);
      } finally {
        if (req === reqRef.current) setLoading(false);
      }
    }, 250);
  };

  const openMenu = () => {
    if (disabled || open) return;
    setStyle(calcStyle(wrapRef.current));
    setOpen(true);
    setQuery('');
    runSearch('');
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const pick = (opt) => {
    onChange?.(opt);
    close();
    inputRef.current?.blur();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target) || dropRef.current?.contains(e.target)) return;
      setOpen(false);
      setQuery('');
    };
    const onMove = () => setStyle(calcStyle(wrapRef.current));
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[highlight]) pick(options[highlight]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      close();
    }
  };

  const height = size === 'sm' ? 'h-9' : 'h-11';
  const border = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
    : 'border-gray-200 dark:border-white/10 focus:border-indigo-500/60 focus:ring-indigo-500/10';

  return (
    <div className={`relative w-full ${className}`} ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={open ? query : value?.label || ''}
        placeholder={value?.label && open ? value.label : placeholder}
        onFocus={openMenu}
        onClick={openMenu}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) {
            setStyle(calcStyle(wrapRef.current));
            setOpen(true);
          }
          runSearch(e.target.value);
        }}
        className={`${height} w-full rounded-xl border bg-gray-50 dark:bg-white/5 pl-3 pr-14 text-sm text-gray-900 dark:!text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:ring-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${border}`}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400">
        {clearable && value?.value && !disabled && (
          <button
            type="button"
            title="Clear"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange?.(null);
            }}
            className="p-0.5 rounded hover:text-rose-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {loading && open ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </div>

      {open &&
        createPortal(
          <div
            ref={dropRef}
            style={style}
            className="rounded-xl border border-[var(--vs-drop-border)] bg-[var(--vs-drop-bg)] shadow-2xl max-h-72 overflow-auto py-1 text-sm text-[var(--vs-text-primary)]"
          >
            {loading && options.length === 0 ? (
              <div className="px-3 py-2 text-[var(--vs-text-secondary)]">Searching...</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-[var(--vs-text-secondary)]">{emptyText}</div>
            ) : (
              options.map((opt, i) => (
                <div
                  key={opt.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(opt);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`px-3 py-2 cursor-pointer ${i === highlight ? 'bg-[var(--vs-drop-hover)]' : ''} ${opt.value === value?.value ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''}`}
                >
                  <div className="truncate">{opt.label}</div>
                  {opt.sub && <div className="text-[11px] text-[var(--vs-text-secondary)] truncate">{opt.sub}</div>}
                </div>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
