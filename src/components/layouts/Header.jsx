import { useState } from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilMenu, cilBell, cilSun, cilMoon,
  cilEnvelopeOpen, cilChevronBottom, cilUser,
  cilSettings, cilExitToApp,
} from '@coreui/icons';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../pages/login/services/authSlice';
import { Loader2 } from 'lucide-react';

export default function Header({
  sidebarOpen, setSidebarOpen,
  sidebarCollapsed, setSidebarCollapsed,
  setDarkMode,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Only used to pick the correct toggle icon (sun vs moon); CSS vars handle all colors.
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleHamburger = () => {
    if (window.innerWidth < 1024) setSidebarOpen(!sidebarOpen);
    else setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleToggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    setDarkMode(next);
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    setIsLoggingOut(true);
    await dispatch(logoutUser());
    setIsLoggingOut(false);
    navigate('/login');
  };

  // Shared class for square icon buttons in the header bar
  const iconBtn = `flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer
    text-[var(--vs-header-icon)] hover:bg-[var(--vs-btn-hover)]`;

  return (
    <header className="sticky top-0 z-40 flex w-full h-12 items-center px-3 md:px-4 shrink-0
      bg-[var(--vs-bg-primary)] border-b border-[var(--vs-border)] transition-colors duration-300 relative">

      {/* ── Left: hamburger ── */}
      <div className="flex items-center gap-2 mr-auto">
        <button onClick={handleHamburger} className={iconBtn} aria-label="Toggle sidebar">
          <CIcon icon={cilMenu} className="w-4 h-4" />
        </button>
      </div>

      {/* ── Centre: brand name ── */}
      <a href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none z-10">
        <span className="text-base md:text-lg font-extrabold tracking-widest bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent animate-gradient-flow cursor-pointer !text-transparent">
          Vyapar Setu
        </span>
      </a>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-1">

        {/* Theme toggle — icon choice needs isDark, colors are CSS vars */}
        <button onClick={handleToggleTheme} className={iconBtn} aria-label="Toggle dark mode">
          <CIcon icon={isDark ? cilSun : cilMoon} className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className={`${iconBtn} relative`}
          >
            <CIcon icon={cilBell} className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-[var(--vs-bg-primary)]" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-xl p-3 z-50
              bg-[var(--vs-drop-bg)] border border-[var(--vs-drop-border)]">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                Notifications
              </p>
              {[
                {
                  icon: cilEnvelopeOpen,
                  iconClr: '#3b82f6',
                  // CSS var string — the .dark class updates --vs-notif-bg-blue automatically
                  iconBg: 'var(--vs-notif-bg-blue)',
                  title: 'New message received',
                  time: '2 min ago',
                },
                {
                  icon: cilSettings,
                  iconClr: '#10b981',
                  iconBg: 'var(--vs-notif-bg-green)',
                  title: 'Server rebooted',
                  time: '1 hour ago',
                },
              ].map((n, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-[var(--vs-drop-hover)]"
                >
                  <span
                    style={{ backgroundColor: n.iconBg, color: n.iconClr }}
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  >
                    <CIcon icon={n.icon} className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--vs-text-primary)] m-0">{n.title}</p>
                    <p className="text-[10px] text-[var(--vs-text-secondary)] m-0">{n.time}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="mx-1 h-5 w-px bg-[var(--vs-border)]" />

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-[var(--vs-btn-hover)]"
          >
            <div className="h-7 w-7 rounded-full overflow-hidden ring-2 ring-indigo-500/20 shrink-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                alt="avatar"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="hidden md:block text-sm font-semibold whitespace-nowrap m-0 text-[var(--vs-text-primary)]">
              Shreyansh S.
            </p>
            <CIcon
              icon={cilChevronBottom}
              className="hidden md:block w-3 h-3 shrink-0 m-0 text-[var(--vs-header-icon)]"
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl py-1.5 z-50
              bg-[var(--vs-drop-bg)] border border-[var(--vs-drop-border)]">

              {[
                { icon: cilUser, label: 'My Profile' },
                { icon: cilSettings, label: 'Settings' },
              ].map((item, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
                    text-[var(--vs-text-primary)] dark:!text-white
                    hover:bg-[var(--vs-drop-hover)]"
                >
                  <CIcon icon={item.icon} className="w-3.5 h-3.5 text-[var(--vs-header-icon)]" />
                  {item.label}
                </a>
              ))}

              <hr className="my-1 border-[var(--vs-drop-border)]" />

              {/* Logout — text and hover bg both driven by CSS vars */}
              <a
                href="#"
                onClick={handleLogout}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
                  text-[var(--vs-logout-text)] dark:!text-white
                  hover:bg-[var(--vs-logout-hover-bg)] 
                  ${isLoggingOut ? 'opacity-70 pointer-events-none' : ''}`}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    logging out ...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilExitToApp} className="w-3.5 h-3.5" />
                    Log Out
                  </>
                )}
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
