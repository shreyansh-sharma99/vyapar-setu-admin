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
  ChevronRight,
  X,
} from 'lucide-react';
import Logo from '../Logo';
import { canAccessPath } from '@/utility/shopPermissions';

const menuGroups = [
  {
    title: 'MENU',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { name: 'Customers', icon: Users, href: '/customers' },
      {
        name: 'Store Management',
        icon: Store,
        submenu: [
          { name: 'Stores / Warehouses', href: '/stores' },
          { name: 'Categories', href: '/categories' },
          { name: 'Subcategories', href: '/subcategories' },
          { name: 'Brands', href: '/brands' },
          { name: 'Manufacturers', href: '/manufacturers' },
          { name: 'Products', href: '/products' },
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
          { name: 'Store-wise Stock', href: '/inventory/store-wise' },
          { name: 'Stock Transfers', href: '/inventory/transfers' },
          { name: 'Damaged Stock', href: '/inventory/damaged' },
          { name: 'Reorder Report', href: '/inventory/reorder' },
          { name: 'Stock Valuation', href: '/inventory/valuation' },
          { name: 'Stock Movement History', href: '/inventory/audit-report' },
        ],
      },
      {
        name: 'Purchases',
        icon: ShoppingCart,
        submenu: [
          { name: 'Suppliers', href: '/purchase/suppliers' },
          { name: 'Purchase Orders', href: '/purchase/orders' },
          { name: 'Goods Receipts (GRN)', href: '/purchase/receipts' },
          { name: 'Purchase Bills', href: '/purchase/bills' },
          { name: 'Purchase Returns', href: '/purchase/returns' },
          { name: 'Payments Out', href: '/purchase/payments' },
          { name: 'Payables Ageing', href: '/purchase/payables-ageing' },
        ],
      },
      {
        name: 'Sales Management',
        icon: Receipt,
        submenu: [
          { name: 'Sales Invoices', href: '/sales/invoices' },
          { name: 'Quotation / Estimate', href: '/sales/quotations' },
          { name: 'Payment In', href: '/sales/payment-in' },
          { name: 'Customer Ledger', href: '/sales/customer-ledger' },
          { name: 'Payment Account', href: '/sales/payment-account' },
          { name: 'Sales Return', href: '/sales/return' },
          { name: 'Credit Note', href: '/sales/credit-note' },
          { name: 'Delivery Challan', href: '/sales/delivery-challan' },
          { name: 'Proforma Invoice', href: '/sales/proforma-invoice' },
        ],
      },
      {
        name: 'Reports & Analytics',
        icon: BarChart3,
        submenu: [
          { name: 'Sales Register', href: '/reports/sales-register' },
          { name: 'GSTR-1 Summary', href: '/reports/gstr1' },
          { name: 'HSN Summary', href: '/reports/hsn-summary' },
          { name: 'Accounts Ageing', href: '/reports/ageing' },
        ],
      },
      {
        name: 'Invoice Setting',
        icon: Settings,
        submenu: [
          { name: 'General Invoice Setting', href: '/sales/general-invoice-setting' },
          { name: 'Invoice Settings', href: '/sales/invoice-setting' },
          { name: 'Invoice Layout', href: '/sales/invoice-layout' },
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        style={{
          transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={[
          'fixed top-0 left-0 z-50 flex h-screen flex-col print:hidden',
          'border-r border-[var(--vs-border)]',
          'bg-[var(--vs-bg-primary)]',
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'lg:w-[72px] w-72' : 'w-72',
        ].join(' ')}
      >

        <div
          className={[
            'flex items-center h-16 px-4 shrink-0 border-b border-[var(--vs-border-subtle)] relative',
            sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'justify-center',
          ].join(' ')}
        >
          <Link to="/" className="flex items-center justify-center min-w-0">
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-center w-full px-2">
                <Logo className="w-full h-auto max-h-12 object-contain transition-all duration-300 hover:scale-105" />
              </div>
            ) : (
              <img
                src="/image/logos/newLogo.png"
                alt="Logo"
                className="w-10 h-10 object-contain transition-all duration-300 hover:scale-110"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/40x40?text=VS';
                }}
              />
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute right-3 p-1.5 rounded-lg transition-colors text-[var(--vs-text-secondary)] hover:bg-[var(--vs-btn-hover)] cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Navigation ── */}
        <div className="flex flex-col overflow-y-auto overflow-x-hidden flex-1 py-3 thin-scrollbar">
          <nav className={`flex flex-col gap-4 ${sidebarCollapsed ? 'px-2.5' : 'px-3.5'}`}>
            {groups.map((group, gi) => (
              <div key={gi}>
                {!sidebarCollapsed && (
                  <p className="mb-2 ml-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--vs-text-secondary)]/70 select-none">
                    {group.title}
                  </p>
                )}
                {sidebarCollapsed && gi > 0 && (
                  <hr className="border-[var(--vs-border-subtle)] my-2" />
                )}

                <ul className="flex flex-col gap-1 m-0 p-0 list-none">
                  {group.items.map((item, ii) => {
                    const hasSubmenu = !!item.submenu;
                    const isOpen = openDropdown === item.name;

                    let isActive = false;
                    if (item.href) {
                      isActive = isNavActive(item.href, location.pathname);
                    } else if (hasSubmenu) {
                      isActive = item.submenu.some((sub) =>
                        isNavActive(sub.href, location.pathname)
                      );
                    }

                    const ItemIcon = item.icon;

                    // Solid highlight = the group you are looking at: the open dropdown,
                    // or the current page's group when no other dropdown is open. The
                    // current page's group only gets a light tint while another one is open.
                    const isOpenGroup = hasSubmenu && isOpen;
                    const anotherOpen = !!openDropdown && openDropdown !== item.name;
                    const solid = isActive && (sidebarCollapsed || !hasSubmenu || !anotherOpen);
                    const tint = !solid && (isActive || isOpenGroup);

                    const rowBase = [
                      'group flex items-center rounded-xl transition-all duration-200 outline-none select-none cursor-pointer',
                      sidebarCollapsed
                        ? 'justify-center h-11 w-11 mx-auto'
                        : 'gap-3 px-3.5 h-11 w-full text-[14px] font-medium tracking-normal',
                      solid
                        ? 'bg-primary text-white font-semibold shadow-md shadow-primary/25'
                        : tint
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-primary/10 hover:text-primary active:scale-[0.98]',
                    ].join(' ');

                    const iconSizeClass = sidebarCollapsed ? 'h-6 w-6' : 'h-5 w-5';

                    return (
                      <li key={ii} className="list-none">
                        {hasSubmenu ? (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleDropdown(item.name)}
                              title={sidebarCollapsed ? item.name : undefined}
                              className={rowBase}
                            >
                              <ItemIcon
                                className={`${iconSizeClass} shrink-0 transition-all duration-200 ${solid ? 'text-white' : 'text-inherit'
                                  }`}
                              />
                              {!sidebarCollapsed && (
                                <>
                                  <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
                                  <ChevronRight
                                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''
                                      } ${solid ? 'text-white' : 'opacity-70 group-hover:opacity-100'}`}
                                  />
                                </>
                              )}
                            </button>

                            {!sidebarCollapsed && (
                              <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[700px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                                  }`}
                              >
                                <ul className="ml-4 pl-3.5 border-l-2 border-primary/20 dark:border-primary/30 flex flex-col gap-1 py-1.5 my-0.5 list-none">
                                  {item.submenu.map((sub, si) => {
                                    const isSubActive = isNavActive(sub.href, location.pathname);
                                    return (
                                      <li key={si} className="list-none">
                                        <Link
                                          to={sub.href}
                                          className={`group/sub flex items-center gap-2.5 py-2 px-3 text-[13.5px] rounded-lg font-medium transition-all duration-150 ${isSubActive
                                            ? 'bg-primary/12 text-primary font-semibold shadow-xs'
                                            : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                          <span className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
                                            {isSubActive ? (
                                              <>
                                                {/* Outer concentric circles leaving outward waves */}
                                                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-sub-wave pointer-events-none" />
                                                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 animate-sub-wave-delayed pointer-events-none" />
                                                {/* Center dot that blinks */}
                                                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary animate-sub-blink" />
                                              </>
                                            ) : (
                                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover/sub:bg-primary/70 group-hover/sub:scale-110 transition-all duration-200" />
                                            )}
                                          </span>
                                          <span className="whitespace-nowrap tracking-normal">{sub.name}</span>
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
                            className={rowBase}
                          >
                            <ItemIcon
                              className={`${iconSizeClass} shrink-0 transition-all duration-200 ${solid ? 'text-white' : 'text-inherit'
                                }`}
                            />
                            {!sidebarCollapsed && (
                              <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
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

        {/* ── Sidebar Footer (User Profile Card like Admin Owner) ── */}
        <div className="border-t border-[var(--vs-border-subtle)] bg-[var(--vs-bg-primary)]/40 shrink-0">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3.5 p-3.5">
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-primary/30">
                  {getInitials(user?.name)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--vs-bg-primary)] bg-emerald-500 shadow-xs" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold text-[var(--vs-text-primary)] truncate leading-tight mb-0.5">
                  {user?.name || 'Shop Owner'}
                </span>
                <span className="text-[11px] text-[var(--vs-text-secondary)] font-medium truncate">
                  {user?.email || 'owner@example.com'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-3" title={user?.name || 'Shop Owner'}>
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-primary/30">
                  {getInitials(user?.name)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--vs-bg-primary)] bg-emerald-500 shadow-xs" />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
