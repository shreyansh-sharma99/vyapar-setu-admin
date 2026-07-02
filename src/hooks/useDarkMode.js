import { useState, useEffect } from 'react';

/**
 * Reactively tracks whether dark mode is active by observing
 * the `class` attribute on <html>. Returns a boolean.
 *
 * Usage:
 *   const isDark = useDarkMode();
 *
 * Components using this hook automatically re-render when the
 * theme is toggled — no prop drilling required.
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const root = document.documentElement;

    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}
