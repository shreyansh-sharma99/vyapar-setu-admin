import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_INVALID, OPTION, PANEL } from './styles';
import { useDismiss, useFloatingPanel } from './useFloating';

const BOX =
  'flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-control border-[1.5px] border-transparent bg-fill px-2 py-1.5 text-sm text-ink transition-[border-color,box-shadow,background-color] ' +
  'hover:border-line-strong focus-within:border-brand focus-within:bg-surface focus-within:shadow-[0_0_0_4px_var(--ui-ring)]';

function Chip({ label, onRemove, disabled }) {
  return (
    <span className="inline-flex h-7 max-w-full items-center gap-1 rounded-chip bg-brand-soft pl-2.5 pr-1 text-xs font-semibold text-brand-ink">
      <span className="truncate">{label}</span>
      {!disabled && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onRemove}
          className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-surface"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

/**
 * Pick several values from a list.
 *   <MultiSelect options={[{ value, label, description }]} value={['a', 'b']} onChange={(values) => …} placeholder invalid />
 * Type to filter · ↑ ↓ to move · Enter to tick / untick · Backspace removes the last chip · Esc closes.
 */
function MultiSelect({ options = [], value = [], onChange, placeholder = 'Select…', invalid, disabled = false, emptyText = 'No matches', id, className, 'aria-label': ariaLabel }) {
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const refs = useMemo(() => [anchorRef, panelRef], []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const chosen = new Set(value);
  const list = query ? options.filter((o) => String(o.label).toLowerCase().includes(query.toLowerCase())) : options;
  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useDismiss(open, refs, close);
  const style = useFloatingPanel(open, anchorRef, { matchWidth: true });

  const toggle = (opt) => {
    if (!opt || opt.disabled) return;
    onChange?.(chosen.has(opt.value) ? value.filter((v) => v !== opt.value) : [...value, opt.value]);
    setQuery('');
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (list.length ? (i + dir + list.length) % list.length : 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      toggle(list[active]);
    } else if (e.key === 'Backspace' && !query && value.length) {
      onChange?.(value.slice(0, -1));
    } else if (e.key === 'Tab') {
      close();
    }
  };

  return (
    <div ref={anchorRef} className={cn('relative w-full', className)}>
      <div
        className={cn(BOX, invalid && FIELD_INVALID, disabled && 'cursor-not-allowed opacity-50')}
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
      >
        {value.map((v) => {
          const opt = options.find((o) => o.value === v);
          return <Chip key={v} label={opt?.label ?? String(v)} disabled={disabled} onRemove={() => onChange?.(value.filter((x) => x !== v))} />;
        })}
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          aria-activedescendant={open && list[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={value.length ? '' : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onKeyDown={onKeyDown}
          className="min-w-[100px] flex-1 border-0 bg-transparent px-1.5 py-1 text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
        <ChevronDown className={cn('mr-1 size-4 shrink-0 text-ink-subtle transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </div>

      {open && style && createPortal(
        <div ref={panelRef} style={style} className={cn(PANEL, 'overflow-auto')}>
          <ul id={listId} role="listbox" aria-multiselectable="true" className="m-0 list-none p-0">
            {list.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-ink-subtle">{emptyText}</li>
            ) : (
              list.map((opt, i) => {
                const on = chosen.has(opt.value);
                return (
                  <li
                    key={opt.value}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={on}
                    data-active={i === active}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => { e.preventDefault(); toggle(opt); }}
                    className={cn(OPTION, on && 'font-semibold text-brand-ink')}
                  >
                    <span className={cn('grid size-[18px] shrink-0 place-items-center rounded-[6px] border-[1.5px]', on ? 'border-brand bg-brand text-white' : 'border-line-strong')}>
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{opt.label}</span>
                      {opt.description && <span className="block truncate text-xs font-normal text-ink-subtle">{opt.description}</span>}
                    </span>
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

/**
 * Free-text tags (product tags, keywords). Enter or leaving the field adds what was typed.
 *   <TagInput value={['organic', 'vegan']} onChange={(tags) => …} placeholder="Type and press Enter" />
 * `value` may also be a comma-separated string (older data).
 */
function TagInput({ value, onChange, placeholder, invalid, disabled = false, id, className }) {
  const [text, setText] = useState('');
  const tags = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const add = () => {
    const t = text.trim();
    if (t && !tags.includes(t)) onChange?.([...tags, t]);
    setText('');
  };
  return (
    <div className={cn(BOX, invalid && FIELD_INVALID, disabled && 'cursor-not-allowed opacity-50', className)}>
      {tags.map((t) => (
        <Chip key={t} label={t} disabled={disabled} onRemove={() => onChange?.(tags.filter((x) => x !== t))} />
      ))}
      <input
        id={id}
        type="text"
        disabled={disabled}
        value={text}
        aria-invalid={invalid || undefined}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(); }
          else if (e.key === 'Backspace' && !text && tags.length) onChange?.(tags.slice(0, -1));
        }}
        onBlur={add}
        placeholder={tags.length ? '' : placeholder}
        className="min-w-[120px] flex-1 border-0 bg-transparent px-1.5 py-1 text-sm text-ink outline-none placeholder:text-ink-subtle"
      />
    </div>
  );
}

export { MultiSelect, TagInput };
