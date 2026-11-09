import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import UiKit from './UiKit';
import ShellPreview from './ShellPreview';

/** Dev-only pages under /ui-kit: the component gallery and the app shell preview. */
export default function DevRoutes({ setDarkMode }) {
  // ?theme=dark|light picks the theme without clicking, for QA screenshots.
  useEffect(() => {
    const theme = new URLSearchParams(window.location.search).get('theme');
    if (theme) setDarkMode?.(theme === 'dark');
  }, [setDarkMode]);

  return (
    <Routes>
      <Route index element={<UiKit setDarkMode={setDarkMode} />} />
      <Route path="shell/*" element={<ShellPreview setDarkMode={setDarkMode} />} />
    </Routes>
  );
}
