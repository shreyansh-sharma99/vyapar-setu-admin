import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CIcon from '@coreui/icons-react';
import {
  cilSpeedometer, cilBasket, cilChevronBottom, cilX, cilUser, cilTag, cilSettings, cilChartPie,
} from '@coreui/icons';

const menuGroups = [
  {
    title: 'MENU',
    items: [
      { name: 'Dashboard', icon: cilSpeedometer, href: '/' },
      { name: 'Customers', icon: cilUser, href: '/customers' },
      {
        name: 'Store Management',
        icon: cilBasket,
        submenu: [
          { name: 'Categories', href: '/categories' },
          { name: 'Subcategories', href: '/subcategories' },
          { name: 'Brands', href: '/brands' },
          { name: 'Manufacturers', href: '/manufacturers' },
          { name: 'Products', href: '/products' },
        ],
      },
      {
        name: 'Sales Management',
        icon: cilTag,
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
        icon: cilChartPie,
        submenu: [
          { name: 'Sales Register', href: '/reports/sales-register' },
          { name: 'GSTR-1 Summary', href: '/reports/gstr1' },
          { name: 'HSN Summary', href: '/reports/hsn-summary' },
          { name: 'Accounts Ageing', href: '/reports/ageing' },
        ],
      },
      {
        name: 'Invoice Setting',
        icon: cilSettings,
        submenu: [
          { name: 'General Invoice Setting', href: '/sales/general-invoice-setting' },
          { name: 'Invoice Settings', href: '/sales/invoice-setting' },
        ],
      },

    ],
  },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen, sidebarCollapsed }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const location = useLocation();

  useEffect(() => { if (sidebarCollapsed) setOpenDropdown(null); }, [sidebarCollapsed]);

  useEffect(() => {
    if (!sidebarCollapsed) {
      menuGroups.forEach(group => {
        group.items.forEach(item => {
          if (item.submenu) {
            const isSubActive = item.submenu.some(sub => location.pathname.startsWith(sub.href));
            if (isSubActive) {
              setOpenDropdown(item.name);
            }
          }
        });
      });
    }
  }, [location.pathname, sidebarCollapsed]);

  const toggleDropdown = (name) => {
    if (!sidebarCollapsed) setOpenDropdown(p => p === name ? null : name);
  };

  const bg = 'bg-[var(--vs-bg-primary)]';
  const border = 'border-[var(--vs-border)]';
  const logoBorder = 'border-[var(--vs-border-subtle)]';
  const labelColor = 'text-[var(--vs-text-secondary)]';
  const divider = 'border-[var(--vs-border-subtle)]';
  const logoText = 'text-[var(--vs-text-primary)]';

  const itemActive = 'bg-[var(--vs-active-bg)]';
  const itemDefault = 'hover:bg-[var(--vs-btn-hover)]';
  const subLink = 'hover:text-[var(--vs-active-text)]';
  const subBorder = 'border-[var(--vs-border-sidebar-line)]';

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        style={{ transition: 'width 300ms ease, transform 300ms ease, background-color 300ms ease' }}
        className={[
          'fixed top-0 left-0 z-50 flex h-screen flex-col',
          'border-r',
          bg, border,
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'lg:w-[72px] w-64' : 'w-64',
        ].join(' ')}
      >
        {/* ── Logo ── */}
        <div
          className={[
            'flex items-center h-12 px-4 shrink-0 border-b relative',
            logoBorder,
            sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'justify-center',
          ].join(' ')}
        >
          <Link to="/" className="flex items-center justify-center min-w-0">
            {!sidebarCollapsed ? (
              <div className="flex flex-col select-none items-center justify-center leading-none text-center">
                <div className="flex items-baseline leading-none justify-center">
                  <span className="text-xl font-extrabold text-[#0f6ebd] tracking-tight">Vyapar</span>
                  <span
                    className="text-xl font-extrabold text-[#ff5722] tracking-tight ml-0.5"
                    style={{ textShadow: '0 0 10px rgba(255, 87, 34, 0.4)' }}
                  >
                    Setu
                  </span>
                </div>
                <span className="text-[7px] font-extrabold tracking-[0.16em] text-[#ff5722] uppercase mt-1 leading-none whitespace-nowrap">
                  CONNECT &bull; TRADE &bull; GROW
                </span>
              </div>
            ) : (
              <img
                src="/image/logos/newLogo.png"
                alt="Logo"
                className="h-8 w-8 object-contain shrink-0"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/32x32?text=VS';
                }}
              />
            )}
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute right-4 p-1.5 rounded-md transition-colors text-[var(--vs-text-secondary)] hover:bg-[var(--vs-btn-hover)]"
          >
            <CIcon icon={cilX} className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col overflow-y-auto overflow-x-hidden flex-1 pt-1.5 pb-3">
          <nav className={`flex flex-col gap-3.5 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
            {menuGroups.map((group, gi) => (
              <div key={gi}>
                {!sidebarCollapsed && (
                  <p className={`mb-1 ml-2 text-[10px] font-bold uppercase tracking-widest ${labelColor} m-0`}>
                    {group.title}
                  </p>
                )}
                {sidebarCollapsed && gi > 0 && (
                  <hr className={`${divider} mb-2`} />
                )}

                <ul className="flex flex-col gap-0.5 m-0 p-0">
                  {group.items.map((item, ii) => {
                    const hasSubmenu = !!item.submenu;
                    const isOpen = openDropdown === item.name;

                    // Determine if the item is active
                    let isActive = false;
                    if (item.href) {
                      isActive = item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href);
                    } else if (hasSubmenu) {
                      isActive = item.submenu.some(sub => location.pathname.startsWith(sub.href));
                    }

                    const rowBase = [
                      'flex items-center rounded-lg transition-all duration-150 w-full',
                      sidebarCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-2',
                      isActive ? itemActive : itemDefault,
                    ].join(' ');

                    const rowStyle = {
                      color: isActive ? 'var(--vs-active-text)' : 'var(--vs-text-sidebar)',
                    };

                    const iconStyle = {
                      color: isActive ? 'var(--vs-active-icon)' : 'var(--vs-text-sidebar-icon)',
                    };

                    const ic = [
                      'shrink-0',
                      sidebarCollapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4',
                    ].join(' ');

                    return (
                      <li key={ii} className={`list-none ${isActive ? 'text-[var(--vs-active-text)]' : 'text-[var(--vs-text-sidebar)]'}`}>
                        {hasSubmenu ? (
                          <>
                            <button
                              onClick={() => toggleDropdown(item.name)}
                              title={sidebarCollapsed ? item.name : undefined}
                              className={rowBase}
                            >
                              <CIcon icon={item.icon} className={`${ic} ${isActive ? 'text-[var(--vs-active-icon)]' : 'text-[var(--vs-text-sidebar-icon)]'}`} />
                              {!sidebarCollapsed && (
                                <>
                                  <span className="flex-1 text-left text-sm font-medium">{item.name}</span>
                                  <CIcon
                                    icon={cilChevronBottom}
                                    className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-inherit`}
                                  />
                                </>
                              )}
                            </button>

                            {!sidebarCollapsed && (
                              <div className={`overflow-hidden ml-6 transition-all duration-300 ${isOpen ? 'max-h-[600px]' : 'max-h-0'}`}>
                                <ul className={`mt-0.5 flex flex-col gap-0.5 border-l-2 pl-4 ${subBorder} m-0 p-0`}>
                                  {item.submenu.map((sub, si) => {
                                    const isSubActive = location.pathname.startsWith(sub.href);
                                    return (
                                      <li key={si} className="list-none text-[var(--vs-text-sidebar)]">
                                        <Link
                                          to={sub.href}
                                          className={`block py-1.5 px-2 text-sm rounded transition-all duration-150 ${subLink} ${isSubActive
                                            ? '!text-[var(--vs-active-text)] bg-[var(--vs-active-bg)] font-semibold shadow-xs'
                                            : 'hover:bg-[var(--vs-btn-hover)]'
                                            }`}
                                        >
                                          {sub.name}
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
                            className={`${rowBase} relative ${isActive ? 'text-[var(--vs-active-text)]' : 'text-[var(--vs-text-sidebar)]'}`}
                          >
                            <CIcon icon={item.icon} className={`${ic} ${isActive ? 'text-[var(--vs-active-icon)]' : 'text-[var(--vs-text-sidebar-icon)]'}`} />
                            {!sidebarCollapsed && (
                              <span className="flex-1 text-sm font-medium">{item.name}</span>
                            )}
                            {!sidebarCollapsed && item.badge && (
                              <span className="ml-auto rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                                {item.badge}
                              </span>
                            )}
                            {sidebarCollapsed && item.badge && (
                              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-600" />
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
      </aside>
    </>
  );
}
