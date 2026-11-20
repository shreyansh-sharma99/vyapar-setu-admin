import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import NoAccess from './NoAccess';
import { useRouteAccess } from '@/utility/routeAccess';
import UpgradeHost from '@/components/business/UpgradeHost';
import BusinessStatusBanner from '@/components/business/BusinessStatusBanner';
import BusinessLockedScreen from '@/components/business/BusinessLockedScreen';

function Layout({ setDarkMode }) {
  // Set by PrivateRoute: pages the staff member may not open show <NoAccess /> instead.
  const access = useRouteAccess();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // A locked business (plan downgrade, read-only days over) shows the lock screen; Businesses stays open to switch away.
  const { user } = useSelector((s) => s.auth || {});
  const [lock, setLock] = useState(null);
  const { pathname } = useLocation();
  const locked = (lock || user?.businessAccess === 'locked') && !pathname.startsWith('/businesses');

  return (
    <div className="flex h-screen overflow-hidden bg-page transition-colors duration-300">
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

        <main className="flex-1 bg-page px-3 pb-4 pt-1 transition-colors duration-300 md:px-5 md:pb-6">
          <BusinessStatusBanner />
          {access && !access.allowed ? <NoAccess homePath={access.homePath} /> : locked ? <BusinessLockedScreen detail={lock || {}} /> : <Outlet />}
        </main>
        <footer className="px-3 pb-3 print:hidden md:px-5">
          <div className="flex flex-col items-center justify-between gap-1 rounded-card bg-surface px-5 py-3 text-xs text-ink-muted shadow-card sm:flex-row">
            <span>
              © {new Date().getFullYear()} <b className="font-extrabold text-brand-ink">ecn</b><b className="font-extrabold text-highlight">biz</b> by Easy Connect. All rights reserved.
            </span>
            <span className="text-ink-subtle">Billing, stock and GST for your shop</span>
          </div>
        </footer>
        <UpgradeHost onLocked={setLock} />
      </div>

    </div>
  );
}

export default Layout;
