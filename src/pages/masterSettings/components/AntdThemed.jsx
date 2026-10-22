import { ConfigProvider, theme as antdTheme } from 'antd';
import { useDarkMode } from '@/hooks/useDarkMode';

/** antd ConfigProvider that follows the app's light / dark mode. */
export default function AntdThemed({ children }) {
  const isDark = useDarkMode();
  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#4f46e5', borderRadius: 8, fontSize: 13 },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
