import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import NoAccess from './NoAccess';
import { useRouteAccess } from '@/utility/routeAccess';

function Layout({ setDarkMode }) {
  // Set by PrivateRoute: pages the staff member may not open show <NoAccess /> instead.
  const access = useRouteAccess();
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

        <main className="flex-1 p-2 md:p-5 bg-[var(--vs-page-bg)] transition-colors duration-300">
          {access && !access.allowed ? <NoAccess homePath={access.homePath} /> : <Outlet />}
        </main>
        <footer className="sticky z-10 bottom-0 bg-white px-4 py-1 text-center text-xs border-t border-gray-200 dark:border-none dark:bg-white/[0.03] dark:text-white">Easy Connect © {new Date().getFullYear()} — All Rights Reserved</footer>
      </div>

    </div>
  );
}

export default Layout;
