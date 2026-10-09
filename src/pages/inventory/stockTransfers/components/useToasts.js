import { useState, useCallback, useEffect } from 'react';

let seq = 0;
const nextId = () => {
  seq += 1;
  return seq;
};

/**
 * Small toast queue. `initial` may be a router `location.state` carrying
 * `{ message, color }` from the previous page; it is shown once.
 */
export default function useToasts(initial) {
  const [toasts, setToasts] = useState(() =>
    initial?.message ? [{ id: 'initial', message: initial.message, color: initial.color || 'success' }] : []
  );

  const showToast = useCallback((message, color = 'success') => {
    if (!message) return;
    const id = nextId();
    setToasts((prev) => [...prev.slice(-3), { id, message, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    if (!initial?.message) return undefined;
    window.history.replaceState({}, document.title);
    const t = setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== 'initial')), 3500);
    return () => clearTimeout(t);
    // only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { toasts, showToast };
}
