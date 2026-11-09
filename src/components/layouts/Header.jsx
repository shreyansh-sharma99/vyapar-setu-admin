import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Moon, Settings, Sun, User } from 'lucide-react';
import { logoutUser } from '../../pages/login/services/authSlice';
import { clearSettingsToast } from '../../pages/settings/services/settingsSlice';
import { Avatar, Badge, Button, DropdownMenu, ToastStack } from '@/components/ui';
import SettingsModal from '../../pages/settings/components/SettingsModal';
import { isOwner } from '@/utility/shopPermissions';

export default function Header({
  sidebarOpen, setSidebarOpen,
  sidebarCollapsed, setSidebarCollapsed,
  setDarkMode,
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Only used to pick the toggle icon (sun vs moon); the CSS tokens handle every colour.
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  const [toasts, setToasts] = useState([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast: reduxToast } = useSelector((state) => state.settings || {});
  const { user } = useSelector((state) => state.auth || {});
  const owner = isOwner(user);
  // Staff see their role; the owner sees "Owner".
  const roleLabel = owner ? 'Owner' : (user?.roleName || 'Staff');
  const designationRaw = owner ? '' : user?.designation;
  const designationLabel = typeof designationRaw === 'string' ? designationRaw : (designationRaw?.name || '');
  // Short line under the name for staff: "Designation · Role".
  const staffLine = designationLabel ? `${designationLabel} · ${roleLabel}` : roleLabel;

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearSettingsToast());
    }
  }, [reduxToast, dispatch]);

  const handleHamburger = () => {
    if (window.innerWidth < 1024) setSidebarOpen(!sidebarOpen);
    else setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleToggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    setDarkMode(next);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await dispatch(logoutUser());
    setIsLoggingOut(false);
    navigate('/login');
  };

  const menuItems = [
    { label: 'My Profile', icon: User },
    // Shop settings are owner only.
    ...(owner ? [{ label: 'Settings', icon: Settings, onClick: () => setSettingsOpen(true) }] : []),
    { divider: true },
    { label: isLoggingOut ? 'Logging out…' : 'Log out', icon: LogOut, danger: true, disabled: isLoggingOut, onClick: handleLogout },
  ];

  const menuHeader = (
    <div className="flex flex-col gap-1.5 py-1">
      <span className="truncate text-sm font-bold text-ink">{user?.name || 'Admin'}</span>
      <span className="truncate text-xs text-ink-muted">{user?.email || 'admin@example.com'}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={owner ? 'primary' : 'warning'}>{roleLabel}</Badge>
        {designationLabel && <span className="truncate text-[11px] text-ink-subtle">{designationLabel}</span>}
      </div>
      {!owner && user?.businessName && <span className="truncate text-[11px] text-ink-subtle">{user.businessName}</span>}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 w-full shrink-0 bg-page/85 px-3 pb-2 pt-3 backdrop-blur-md transition-colors duration-300 print:hidden md:px-5">
      <div className="relative flex h-16 items-center gap-3 rounded-card bg-surface px-3 shadow-card">

      {/* ── Left: menu ── */}
      <div className="mr-auto flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={handleHamburger} aria-label="Toggle sidebar">
          <Menu />
        </Button>
      </div>

      {/* ── Centre: wordmark, always ── */}
      <a
        href="/"
        aria-label="ecnbiz home"
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 select-none items-baseline leading-none"
      >
        <span className="text-2xl font-extrabold tracking-tight text-brand-ink md:text-[28px]">ecn</span>
        <span className="text-2xl font-extrabold tracking-tight text-highlight md:text-[28px]">biz</span>
      </a>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleToggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <Sun /> : <Moon />}
        </Button>

        <DropdownMenu
          header={menuHeader}
          items={menuItems}
          trigger={
            <Button variant="secondary" className="h-auto gap-2 py-1 pl-1 pr-2 md:pr-3">
              <Avatar name={user?.name || 'U'} size="sm" tone="primary" />
              <span className="hidden flex-col items-start leading-tight md:flex">
                <span className="whitespace-nowrap text-sm font-semibold text-ink">{user?.name || 'Admin'}</span>
                {!owner && <span className="whitespace-nowrap text-[10px] font-medium text-ink-muted">{staffLine}</span>}
              </span>
              <ChevronDown className="hidden size-4 shrink-0 text-ink-subtle md:block" />
            </Button>
          }
        />
      </div>
      </div>
      {owner && <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />}

      <ToastStack toasts={toasts} />
    </header>
  );
}
