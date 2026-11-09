import { useEffect, useLayoutEffect, useState } from 'react';

/**
 * Position a portal panel under (or above, when there's no room) an anchor element.
 * Returns a style object for `position: fixed`, or null while closed.
 */
export function useFloatingPanel(open, anchorRef, { align = 'start', matchWidth = false, offset = 6 } = {}) {
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const up = below < 240 && r.top > below;
      const next = { position: 'fixed', zIndex: 100005, maxHeight: Math.max(160, (up ? r.top : below) - 16) };
      if (matchWidth) next.width = r.width;
      if (align === 'end') next.right = Math.max(8, window.innerWidth - r.right);
      else next.left = Math.max(8, r.left);
      if (up) next.bottom = window.innerHeight - r.top + offset;
      else next.top = r.bottom + offset;
      setStyle(next);
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef, align, matchWidth, offset]);

  return open ? style : null;
}

/** Close on a mouse press outside every given ref, and on Escape. */
export function useDismiss(open, refs, onDismiss) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (refs.some((r) => r.current?.contains(e.target))) return;
      onDismiss();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, refs, onDismiss]);
}
