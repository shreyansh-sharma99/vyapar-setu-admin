/**
 * Shop owner / staff access rules for the Shop Owner panel.
 *
 * The logged-in user lives in redux at `state.auth.user` (set by login and refreshed from
 * GET /auth/profile). Owners have `userType: 'owner'`; staff have `userType: 'staff'` plus
 * `roleName`, `designation`, `permissions` from their role (e.g. ['sales.view', 'sales.create'])
 * and `storeIds` (empty = all stores).
 *
 * The backend enforces the same rules (403 on a refused call); this file only decides what
 * the UI shows.
 */

/** Route path prefix → permission module key. `null` = owner only. */
export const MENU_PERMISSIONS = {
  '/': 'dashboard',
  '/customers': 'customers',
  '/categories': 'catalog',
  '/subcategories': 'catalog',
  '/brands': 'catalog',
  '/manufacturers': 'catalog',
  '/products': 'catalog',
  '/stores': 'stores',
  '/inventory/transfers': 'stock_transfer',
  '/inventory': 'inventory',
  '/purchase/suppliers': 'suppliers',
  '/purchase': 'purchase',
  '/sales': 'sales',
  '/reports': 'reports',
  // Owner only
  '/staff': null,
  '/sales/general-invoice-setting': null,
  '/sales/invoice-setting': null,
  '/sales/invoice-settings': null,
  '/sales/invoice-layout': null,
  '/sales/payment-account': null,
};

/** Where to send a user after login / from the "no access" page, in order of preference. */
export const HOME_CANDIDATES = [
  '/',
  '/sales/invoices',
  '/customers',
  '/products',
  '/inventory',
  '/inventory/transfers',
  '/purchase/suppliers',
  '/stores',
  '/reports',
];

/** Owner (or a legacy saved owner object without userType). */
export const isOwner = (user) => !!user && user.userType !== 'staff';

export const isStaff = (user) => !!user && user.userType === 'staff';

/** CRUD levels a permission key can carry (`<module>.<level>`). */
export const PERMISSION_LEVELS = ['view', 'create', 'update', 'delete'];

/**
 * Can the user do `level` on a module?
 * owner → always; staff → `${module}.${level}` is in their role permissions.
 * create / update / delete each imply view, and the legacy `${module}.manage`
 * counts as create + update + delete (and so view too).
 * A `null` module means owner only.
 */
export const can = (user, module, level = 'view') => {
  if (!user) return false;
  if (isOwner(user)) return true;
  if (!module) return false;
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  if (permissions.includes(`${module}.${level}`)) return true;
  if (permissions.includes(`${module}.manage`)) return true;
  if (level === 'view') {
    return PERMISSION_LEVELS.some((l) => l !== 'view' && permissions.includes(`${module}.${l}`));
  }
  return false;
};

const normalisePath = (path) => {
  let p = String(path || '/').split(/[?#]/)[0] || '/';
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
};

/**
 * Module rule for a path (longest matching prefix, matched on whole path segments).
 * Returns `{ matched: false }` when no rule applies, otherwise `{ matched: true, prefix, module }`.
 * '/' only matches the dashboard itself, not every page.
 */
export const getPathRule = (path) => {
  const p = normalisePath(path);
  let best = null;
  Object.keys(MENU_PERMISSIONS).forEach((prefix) => {
    const hit = prefix === '/' ? p === '/' : (p === prefix || p.startsWith(`${prefix}/`));
    if (hit && (!best || prefix.length > best.length)) best = prefix;
  });
  if (best === null) return { matched: false };
  return { matched: true, prefix: best, module: MENU_PERMISSIONS[best] };
};

/**
 * Can the user open this route? Paths without a rule (e.g. the 404 page) are open to any
 * logged-in user.
 */
export const canAccessPath = (user, path) => {
  if (!user) return false;
  if (isOwner(user)) return true;
  const rule = getPathRule(path);
  if (!rule.matched) return true;
  if (rule.module === null) return false;
  return can(user, rule.module, 'view');
};

/** First page the user may open (dashboard for owners). */
export const getHomePath = (user) => HOME_CANDIDATES.find((p) => canAccessPath(user, p)) || '/';

/**
 * Store ids the user is limited to, or `null` when they can use every store
 * (owners, and staff with an empty store list).
 */
export const getAllowedStoreIds = (user) => {
  if (!user || isOwner(user)) return null;
  const ids = Array.isArray(user.storeIds) ? user.storeIds.map(String) : [];
  return ids.length ? ids : null;
};

export const canUseStore = (user, storeId) => {
  const allowed = getAllowedStoreIds(user);
  return allowed === null || allowed.includes(String(storeId?._id || storeId));
};
