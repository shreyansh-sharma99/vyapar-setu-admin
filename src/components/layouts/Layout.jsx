import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function Layout({ setDarkMode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--vs-page-bg)] transition-colors duration-300">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden min-w-0">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          setDarkMode={setDarkMode}
        />

        <main className="flex-1 p-4 md:p-5 bg-[var(--vs-page-bg)] transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
