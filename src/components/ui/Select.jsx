import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_BASE, FIELD_INVALID, FIELD_SIZES, OPTION, PANEL } from './styles';
import { useDismiss, useFloatingPanel } from './useFloating';

/**
 * Pick one value.
 *   <Select options={[{ value, label, description, element }]} value onChange={(v) => …}
 *           searchable clearable invalid size="sm|md|lg" placeholder />
 * Async (customer / supplier / product search):
 *   <Select loadOptions={(query) => api(query).then(toOptions)} value onChange />
 * Keyboard: ↑ ↓ to move, Enter to pick, Esc to close.
 */
function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  searchable = true,
  clearable = false,
  loadOptions,
  loading = false,
  disabled = false,
  invalid,
  error,
  size = 'md',
  emptyText = 'No results found',
  className,
  wrapperClassName,
  id,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
}) {
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const timer = useRef(null);
  const refs = useMemo(() => [anchorRef, panelRef], []);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [found, setFound] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);

  // Follows `value`, but still shows a pick when the parent doesn't control it.
  const [inner, setInner] = useState(value ?? '');
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInner(value ?? '');
  }

  const isAsync = typeof loadOptions === 'function';
  const pool = isAsync ? found : options;
  const list = !isAsync && searchable && query
    ? pool.filter((o) => String(o.label ?? '').toLowerCase().includes(query.toLowerCase()))
    : pool;
  const selected = options.find((o) => o.value === inner) ?? (picked?.value === inner ? picked : null);
  const isInvalid = invalid || !!error || ariaInvalid === true || ariaInvalid === 'true';

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useDismiss(open, refs, close);
  const style = useFloatingPanel(open, anchorRef, { matchWidth: true });

  const runSearch = (q) => {
    if (!isAsync) return;
    clearTimeout(timer.current);
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        setFound((await loadOptions(q)) ?? []);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const openList = () => {
    if (disabled || open) return;
    setOpen(true);
    setActive(Math.max(0, list.findIndex((o) => o.value === inner)));
    if (isAsync && found.length === 0) runSearch('');
  };

  const choose = (opt) => {
    if (!opt || opt.disabled) return;
    setInner(opt.value);
    setPicked(opt);
    onChange?.(opt.value, opt);
    close();
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return openList();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (list.length ? (i + dir + list.length) % list.length : 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      choose(list[active]);
    } else if (e.key === 'Tab') {
      close();
    }
  };

  const busy = loading || searching;
  const shown = open && searchable ? query : selected?.label ?? '';

  return (
    <div ref={anchorRef} className={cn('relative w-full', wrapperClassName)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={isInvalid || undefined}
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && list[active] ? `${listId}-${active}` : undefined}
        readOnly={!searchable}
        disabled={disabled}
        placeholder={loading ? 'Loading…' : selected ? selected.label : placeholder}
        value={shown}
        onFocus={openList}
        onClick={openList}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
          runSearch(e.target.value);
        }}
        className={cn(
          FIELD_BASE,
          FIELD_SIZES[size] ?? FIELD_SIZES.md,
          clearable ? 'pr-16' : 'pr-9',
          'cursor-pointer read-only:cursor-pointer',
          isInvalid && FIELD_INVALID,
          className
        )}
      />
      <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-ink-subtle">
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {clearable && inner !== '' && inner != null && !disabled && (
          <button
            type="button"
            aria-label="Clear"
            className="grid size-6 place-items-center rounded-md hover:bg-surface hover:text-ink"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setInner(''); setPicked(null); onChange?.('', null); }}
          >
            <X className="size-3.5" />
          </button>
        )}
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </span>

      {open && style && createPortal(
        <div ref={panelRef} style={style} className={cn(PANEL, 'overflow-auto')}>
          <ul id={listId} role="listbox" className="m-0 list-none p-0">
            {list.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-ink-subtle">{busy ? 'Searching…' : emptyText}</li>
            ) : (
              list.map((opt, i) => {
                const isSel = opt.value === inner;
                return (
                  <li
                    key={opt.value}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={isSel}
                    aria-disabled={opt.disabled || undefined}
                    data-active={i === active}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => { e.preventDefault(); choose(opt); }}
                    className={cn(OPTION, isSel && 'font-semibold text-brand-ink', opt.disabled && 'cursor-not-allowed opacity-50')}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{opt.element ?? opt.label}</span>
                      {opt.description && <span className="block truncate text-xs font-normal text-ink-subtle">{opt.description}</span>}
                    </span>
                    {isSel && <Check className="size-4 shrink-0" aria-hidden="true" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Select;
export { Select };
