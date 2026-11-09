import { useMemo } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useDarkMode } from '@/hooks/useDarkMode';

const readToken = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * Themes every antd component (DatePicker, Select, Pagination, Modal …) from the
 * Soft UI CSS tokens in index.css, so light / dark colours have one source.
 * Mounted once in main.jsx.
 */
export default function ThemeProvider({ children }) {
  const isDark = useDarkMode();

  // isDark is the trigger: the .dark class has already switched the CSS tokens.
  const theme = useMemo(() => ({
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: readToken('--ui-primary'),
      colorSuccess: readToken('--ui-success'),
      colorWarning: readToken('--ui-warning'),
      colorError: readToken('--ui-danger'),
      colorInfo: readToken('--ui-info'),
      colorBgContainer: readToken('--ui-surface'),
      colorBgElevated: readToken('--ui-surface'),
      colorBgLayout: readToken('--ui-page'),
      colorBorder: readToken('--ui-line-strong'),
      colorBorderSecondary: readToken('--ui-line'),
      colorText: readToken('--ui-ink'),
      colorTextSecondary: readToken('--ui-ink-muted'),
      colorTextPlaceholder: readToken('--ui-ink-subtle'),
      borderRadius: 12,
      fontFamily: "'Outfit', sans-serif",
    },
  }), [isDark]);

  return <ConfigProvider theme={theme}>{children}</ConfigProvider>;
}
