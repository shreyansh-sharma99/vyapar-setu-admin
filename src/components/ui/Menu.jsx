import { cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { OPTION, PANEL } from './styles';
import { useDismiss, useFloatingPanel } from './useFloating';

function useAnchoredPanel(align) {
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const refs = useMemo(() => [anchorRef, panelRef], []);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, refs, close);
  const style = useFloatingPanel(open, anchorRef, { align });
  return { anchorRef, panelRef, open, setOpen, close, style };
}

/**
 * Row "⋯" actions, Export menu, user menu.
 *   <DropdownMenu trigger={<Button variant="ghost" size="icon" aria-label="More"><MoreHorizontal/></Button>}
 *     items={[{ label: 'Print', icon: Printer, onClick }, { divider: true }, { label: 'Delete', icon: Trash2, danger: true, onClick }]} />
 * Keyboard: ↑ ↓ move, Enter picks, Esc closes and returns focus to the trigger.
 */
function DropdownMenu({ trigger, items = [], align = 'end', header, className }) {
  const { anchorRef, panelRef, open, setOpen, close, style } = useAnchoredPanel(align);

  // Focus the first item once the menu is placed.
  useEffect(() => {
    if (open && style) panelRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
  }, [open, style, panelRef]);

  const closeAndReturn = () => {
    close();
    anchorRef.current?.querySelector('button, [tabindex]')?.focus();
  };

  const onMenuKey = (e) => {
    const nodes = [...panelRef.current.querySelectorAll('[role="menuitem"]:not([disabled])')];
    const at = nodes.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (at + (e.key === 'ArrowDown' ? 1 : -1) + nodes.length) % nodes.length;
      nodes[next]?.focus();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      closeAndReturn();
    } else if (e.key === 'Tab') {
      close();
    }
  };

  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger, { 'aria-haspopup': 'menu', 'aria-expanded': open })
    : trigger;

  return (
    <>
      <span ref={anchorRef} className="inline-flex" onClick={() => setOpen((o) => !o)}>
        {triggerEl}
      </span>
      {open && style && createPortal(
        <div ref={panelRef} role="menu" style={style} onKeyDown={onMenuKey} className={cn(PANEL, 'min-w-[200px] overflow-auto', className)}>
          {header && <div className="px-3 pb-2 pt-1.5 text-xs text-ink-subtle">{header}</div>}
          {items.map((item, i) => {
            if (item.divider) return <div key={`d${i}`} role="separator" className="my-1 h-px bg-line" />;
            const Icon = item.icon;
            return (
              <button
                key={item.key ?? item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { close(); item.onClick?.(); }}
                className={cn(OPTION, 'hover:bg-fill focus:bg-fill', item.danger && 'text-danger')}
              >
                {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <span className="font-mono text-[11px] text-ink-subtle">{item.shortcut}</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

/** Free-form floating panel (filter chips, column picker): <Popover trigger={…}>{content}</Popover> */
function Popover({ trigger, children, align = 'start', className }) {
  const { anchorRef, panelRef, open, setOpen, style } = useAnchoredPanel(align);
  const triggerEl = isValidElement(trigger) ? cloneElement(trigger, { 'aria-expanded': open }) : trigger;
  return (
    <>
      <span ref={anchorRef} className="inline-flex" onClick={() => setOpen((o) => !o)}>
        {triggerEl}
      </span>
      {open && style && createPortal(
        <div ref={panelRef} role="dialog" style={style} className={cn(PANEL, 'p-3', className)}>
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

export { DropdownMenu, Popover };
