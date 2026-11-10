import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  Store,
  Boxes,
  ShoppingCart,
  Receipt,
  BarChart3,
  Settings,
  UserCog,
  SlidersHorizontal,
  ChevronRight,
  X,
} from 'lucide-react';
import { canAccessPath } from '@/utility/shopPermissions';

const menuGroups = [
  {
    title: 'MENU',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { name: 'Customers', icon: Users, href: '/customers' },
      {
        name: 'Catalog',
        icon: Store,
        submenu: [
          { name: 'Categories', href: '/categories' },
          { name: 'Subcategories', href: '/subcategories' },
          { name: 'Brands', href: '/brands' },
          { name: 'Manufacturers', href: '/manufacturers' },
          { name: 'Products & Services', href: '/products' },
          { name: 'Import / Export', href: '/products/import-export' },
          { name: 'Print Barcode Labels', href: '/products/labels' },
        ],
      },
      {
        name: 'Inventory',
        icon: Boxes,
        submenu: [
          { name: 'Stock Overview', href: '/inventory' },
          { name: 'Adjust Stock', href: '/inventory/adjust' },
          { name: 'Damaged Stock', href: '/inventory/damaged' },
          { name: 'Stock Valuation', href: '/inventory/valuation' },
          { name: 'Stock Movement History', href: '/inventory/audit-report' },
        ],
      },
      {
        name: 'Purchases',
        icon: ShoppingCart,
        submenu: [
          { name: 'Suppliers', href: '/purchase/suppliers' },
          { name: 'Purchases', href: '/purchase/orders' },
          { name: 'Purchase Returns', href: '/purchase/returns' },
        ],
      },
      {
        name: 'Sales Management',
        icon: Receipt,
        submenu: [
          { name: 'Sales Invoices', href: '/sales/invoices' },
          { name: 'Payment Account', href: '/sales/payment-account' },
          { name: 'Sales Return', href: '/sales/return' },
          { name: 'Credit Note', href: '/sales/credit-note' },
        ],
      },
      {
        name: 'Reports & Analytics',
        icon: BarChart3,
        submenu: [
          { name: 'Sales Register', href: '/reports/sales-register' },
          { name: 'GSTR-1 Summary', href: '/reports/gstr1' },
          { name: 'HSN / SAC Summary', href: '/reports/hsn-summary' },
          { name: 'Accounts Ageing', href: '/reports/ageing' },
          { name: 'Profit', href: '/reports/profit' },
          { name: 'Price Overrides', href: '/reports/price-overrides' },
        ],
      },
      {
        name: 'Invoice Setting',
        icon: Settings,
        submenu: [
          { name: 'General Invoice Setting', href: '/sales/general-invoice-setting' },
          { name: 'Bill Fields', href: '/sales/bill-fields' },
          { name: 'Invoice Settings', href: '/sales/invoice-setting' },
          { name: 'Invoice Layout', href: '/sales/invoice-layout' },
        ],
      },
      {
        name: 'Master Settings',
        icon: SlidersHorizontal,
        submenu: [
          { name: 'GST Rates', href: '/master/gst-rates' },
          { name: 'Prices & Offers', href: '/master/prices' },
        ],
      },
      {
        name: 'Staff & Roles',
        icon: UserCog,
        submenu: [
          { name: 'Staff', href: '/staff' },
          { name: 'Roles & Permissions', href: '/staff/roles' },
          { name: 'Designations', href: '/staff/designations' },
        ],
      },
    ],
  },
];

/** Menu filtered to what this user may open (staff see only permitted items). */
const visibleMenu = (user) =>
  menuGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => (item.submenu ? { ...item, submenu: item.submenu.filter((sub) => canAccessPath(user, sub.href)) } : item))
        .filter((item) => (item.submenu ? item.submenu.length > 0 : canAccessPath(user, item.href))),
    }))
    .filter((group) => group.items.length > 0);

const allNavHrefs = [
  ...new Set(
    menuGroups.flatMap((group) =>
      group.items.flatMap((item) =>
        item.submenu ? item.submenu.map((sub) => sub.href) : (item.href ? [item.href] : [])
      )
    )
  ),
];

export const isNavActive = (href, currentPath) => {
  if (!href || !currentPath) return false;

  // Exact match
  if (href === '/') {
    return currentPath === '/';
  }
  if (currentPath === href) {
    return true;
  }

  // Prefix match (for sub-routes e.g. /inventory/adjust for /inventory)
  if (currentPath.startsWith(href + '/')) {
    // Check if there is another sidebar item with a longer/more specific match
    // e.g. for '/inventory', if '/inventory/audit-report' also matches currentPath,
    // then '/inventory' is NOT active because '/inventory/audit-report' is more specific
    const hasMoreSpecificMatch = allNavHrefs.some(
      (otherHref) =>
        otherHref !== href &&
        otherHref.length > href.length &&
        (currentPath === otherHref || currentPath.startsWith(otherHref + '/'))
    );
    return !hasMoreSpecificMatch;
  }

  return false;
};

const getInitials = (name) => {
  if (!name) return 'SO';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function Sidebar({ sidebarOpen, setSidebarOpen, sidebarCollapsed }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const location = useLocation();
  const { user } = useSelector((state) => state.auth || {});
  const groups = useMemo(() => visibleMenu(user), [user]);

  useEffect(() => {
    if (sidebarCollapsed) setOpenDropdown(null);
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!sidebarCollapsed) {
      // Uses the static menu (not the user-filtered one) so a profile refresh
      // doesn't re-run this and snap the menu back to the current page's group.
      let matchedDropdown = null;
      menuGroups.forEach((group) => {
        group.items.forEach((item) => {
          if (item.submenu) {
            const isSubActive = item.submenu.some((sub) =>
              isNavActive(sub.href, location.pathname)
            );
            if (isSubActive) {
              if (openDropdown === item.name) {
                matchedDropdown = item.name;
              } else if (!matchedDropdown) {
                matchedDropdown = item.name;
              }
            }
          }
        });
      });
      if (matchedDropdown) {
        setOpenDropdown(matchedDropdown);
      }
    }
  }, [location.pathname, sidebarCollapsed]);

  const toggleDropdown = (name) => {
    if (!sidebarCollapsed) {
      setOpenDropdown((prev) => (prev === name ? null : name));
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(11,13,26,0.45)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Soft cards: the menu is a floating dark card (bg-nav) on the page background. */}
      <aside
        style={{
          transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={[
          'fixed top-0 left-0 z-50 flex h-screen shrink-0 flex-col p-3 print:hidden lg:static lg:translate-x-0 lg:pr-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'w-72 lg:w-[84px]' : 'w-72',
        ].join(' ')}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-card bg-nav text-nav-ink shadow-[0_20px_40px_-20px_rgba(30,27,75,0.6)]">

          <div className={['relative flex shrink-0 items-center justify-center', sidebarCollapsed ? 'h-16 px-5 lg:px-0' : 'h-20 px-12'].join(' ')}>
            <Link to="/" className="flex min-w-0 items-center" aria-label="ecnbiz home">
              {!sidebarCollapsed ? (
                <img src="/image/logos/ecnbiz-logo-dark.svg" alt="ecnbiz" className="h-12 w-auto max-w-full" />
              ) : (
                <img src="/favicon.svg" alt="ecnbiz" className="size-11 shrink-0" />
              )}
            </Link>

            {/* Close button on mobile */}
            {/* eslint-disable-next-line no-restricted-syntax -- nav-coloured icon button on the navy sidebar */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 grid size-9 cursor-pointer place-items-center rounded-[10px] text-nav-ink hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* ── Scrollable navigation ── */}
          <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-3 pt-1">
            <nav className={`flex flex-col gap-4 ${sidebarCollapsed ? 'px-3.5' : 'px-3'}`}>
              {groups.map((group, gi) => (
                <div key={gi}>
                  {!sidebarCollapsed && (
                    <p className="m-0 mb-2 ml-3 select-none text-[11px] font-bold uppercase tracking-[0.14em] text-nav-ink/50">
                      {group.title}
                    </p>
                  )}
                  {sidebarCollapsed && gi > 0 && <hr className="my-2 border-white/10" />}

                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {group.items.map((item, ii) => {
                      const hasSubmenu = !!item.submenu;
                      const isOpen = openDropdown === item.name;

                      let isActive = false;
                      if (item.href) {
                        isActive = isNavActive(item.href, location.pathname);
                      } else if (hasSubmenu) {
                        isActive = item.submenu.some((sub) => isNavActive(sub.href, location.pathname));
                      }

                      const ItemIcon = item.icon;

                      // Solid pill = the group you are looking at: the open dropdown,
                      // or the current page's group when no other dropdown is open. The
                      // current page's group only gets a light tint while another one is open.
                      const isOpenGroup = hasSubmenu && isOpen;
                      const anotherOpen = !!openDropdown && openDropdown !== item.name;
                      const solid = isActive && (sidebarCollapsed || !hasSubmenu || !anotherOpen);
                      const tint = !solid && (isActive || isOpenGroup);

                      const rowBase = [
                        'group flex h-11 cursor-pointer select-none items-center rounded-xl outline-none transition-colors duration-200',
                        'focus-visible:ring-4 focus-visible:ring-white/20',
                        sidebarCollapsed
                          ? 'mx-auto w-11 justify-center'
                          : 'w-full gap-3 px-3.5 text-[14px] font-medium',
                        solid
                          ? 'bg-nav-active font-bold text-nav-active-ink shadow-card'
                          : tint
                            ? 'bg-white/10 font-semibold text-white'
                            : 'text-nav-ink hover:bg-white/[0.08] hover:text-white',
                      ].join(' ');

                      const iconClass = `${sidebarCollapsed ? 'size-[22px]' : 'size-5'} shrink-0 ${solid ? 'text-highlight' : 'text-inherit'}`;

                      return (
                        <li key={ii} className="list-none">
                          {hasSubmenu ? (
                            <>
                              {/* eslint-disable-next-line no-restricted-syntax -- sidebar nav row, same look as the NavLink rows */}
                              <button
                                type="button"
                                onClick={() => toggleDropdown(item.name)}
                                title={sidebarCollapsed ? item.name : undefined}
                                aria-expanded={sidebarCollapsed ? undefined : isOpen}
                                className={rowBase}
                              >
                                <ItemIcon className={iconClass} />
                                {!sidebarCollapsed && (
                                  <>
                                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">{item.name}</span>
                                    <ChevronRight
                                      className={`size-4 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''} ${solid ? '' : 'opacity-60 group-hover:opacity-100'}`}
                                    />
                                  </>
                                )}
                              </button>

                              {!sidebarCollapsed && (
                                <div
                                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'mt-1 max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}
                                >
                                  <ul className="my-0.5 ml-5 flex list-none flex-col gap-0.5 border-l border-white/10 py-1 pl-3">
                                    {item.submenu.map((sub, si) => {
                                      const isSubActive = isNavActive(sub.href, location.pathname);
                                      return (
                                        <li key={si} className="list-none">
                                          <Link
                                            to={sub.href}
                                            aria-current={isSubActive ? 'page' : undefined}
                                            className={`group/sub flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-150 ${isSubActive
                                              ? 'bg-white/10 font-semibold text-white'
                                              : 'text-nav-ink/80 hover:bg-white/[0.06] hover:text-white'
                                              }`}
                                          >
                                            <span
                                              className={`size-1.5 shrink-0 rounded-full transition-colors ${isSubActive ? 'bg-highlight' : 'bg-white/25 group-hover/sub:bg-white/60'}`}
                                            />
                                            <span className="whitespace-nowrap">{sub.name}</span>
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                            </>
                          ) : (
                            <Link
                              to={item.href}
                              title={sidebarCollapsed ? item.name : undefined}
                              aria-current={isActive ? 'page' : undefined}
                              className={rowBase}
                            >
                              <ItemIcon className={iconClass} />
                              {!sidebarCollapsed && (
                                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">{item.name}</span>
                              )}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {/* ── Signed-in user ── */}
          <div className="shrink-0 border-t border-white/10 p-3">
            <div
              className={`flex items-center gap-3 rounded-xl bg-white/[0.06] ${sidebarCollapsed ? 'justify-center p-1.5 lg:bg-transparent' : 'p-2.5'}`}
              title={sidebarCollapsed ? user?.name || 'Shop Owner' : undefined}
            >
              <span className="relative shrink-0">
                <span className="grid size-10 place-items-center rounded-xl bg-brand text-sm font-bold text-white">
                  {getInitials(user?.name)}
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--ui-nav)] bg-success" />
              </span>
              {!sidebarCollapsed && (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] font-bold leading-tight text-white">{user?.name || 'Shop Owner'}</span>
                  <span className="truncate text-[11px] font-medium text-nav-ink/70">{user?.email || 'owner@example.com'}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
