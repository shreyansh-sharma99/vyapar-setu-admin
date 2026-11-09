import { useEffect, useRef } from 'react';

const isTyping = (el) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/**
 * Keyboard shortcuts for a page while it is mounted.
 *   useShortcuts({ F2: addLine, 'mod+s': saveDraft, 'mod+p': print, Escape: cancel });
 * `mod` is Ctrl (Cmd on Mac). F-keys and mod+key fire even while typing; plain keys such as
 * Escape only fire when focus is not in a text field and no dialog is open.
 */
export function useShortcuts(map) {
  const ref = useRef(map);
  useEffect(() => {
    ref.current = map;
  });

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = (mod ? 'mod+' : '') + (e.key.length === 1 ? e.key.toLowerCase() : e.key);
      const fn = ref.current?.[key];
      if (!fn) return;
      const plain = !mod && !/^F\d{1,2}$/.test(e.key);
      if (plain && (isTyping(document.activeElement) || document.querySelector('[aria-modal="true"]'))) return;
      e.preventDefault();
      fn(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
