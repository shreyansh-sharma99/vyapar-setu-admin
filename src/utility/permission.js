import { decryptData, encryptData } from './crypto';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

export const getDecryptedPermissions = () => {
  const encrypted = localStorage.getItem('_v_menu_permissions');
  if (!encrypted) return [];
  try {
    const decrypted = decryptData(encrypted);
    if (decrypted) {
      return JSON.parse(decrypted);
    }
  } catch (e) {
    console.error('Failed to decrypt permissions', e);
  }
  return [];
};

export const storePermissions = (data) => {
  if (!data) return;
  const realData = data.success && data.data ? data.data : data;
  const user = realData.user || realData.owner || realData;
  const userType = user?.userType;
  
  if (userType === 'team_member') {
    const permissions = user.role?.permissions || [];
    const encrypted = encryptData(JSON.stringify(permissions));
    localStorage.setItem('_v_menu_permissions', encrypted);
  } else {
    localStorage.removeItem('_v_menu_permissions');
  }
};

export const hasMenuPermission = (slug) => {
  const userType = localStorage.getItem('userType');
  if (userType !== 'team_member') {
    return true; // owners and others have access to everything
  }

  const permissions = getDecryptedPermissions();
  const perm = permissions.find((p) => p.slug === slug);
  if (perm) {
    return perm.canRead || perm.canWrite || perm.canUpdate || perm.canDelete;
  }
  return false;
};

export const hasActionPermission = (slug, action) => {
  const userType = localStorage.getItem('userType');
  if (userType !== 'team_member') {
    return true;
  }

  const permissions = getDecryptedPermissions();
  const perm = permissions.find((p) => p.slug === slug);
  if (perm) {
    return !!perm[action];
  }
  return false;
};

export const getSlugFromPath = (path) => {
  let normalized = path;
  if (normalized.endsWith('/') && normalized !== '/') {
    normalized = normalized.slice(0, -1);
  }

  const exactSlugs = [
    '/TeamMembers/hierarchy',
    '/Cash/wallet',
    '/Cash/ledger',
    '/reports/admin',
    '/reports/revenue',
    '/reports/subscriptions',
    '/reports/invoices',
    '/reports/razorpay-payments',
    '/reports/razorpay-settlements',
    '/HelpDesk/stats',
  ];

  if (exactSlugs.includes(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('/Admin')) {
    if (normalized.startsWith('/AdminManagement')) {
      return '/AdminManagement';
    }
    return '/Admin';
  }

  if (normalized.startsWith('/TeamMembers')) {
    return '/TeamMembers';
  }

  if (normalized.startsWith('/Plans') || normalized.startsWith('/AddPlans') || normalized.startsWith('/EditPlans')) {
    return '/Plans';
  }

  if (normalized.startsWith('/Subscriptions')) {
    return '/Subscriptions';
  }

  if (normalized.startsWith('/Invoices')) {
    return '/Invoices';
  }

  if (normalized.startsWith('/HelpDesk')) {
    return '/HelpDesk';
  }

  if (normalized.startsWith('/settings')) {
    return '/settings';
  }

  if (normalized.startsWith('/designations')) {
    return '/designations';
  }

  if (normalized.startsWith('/roles')) {
    return '/roles';
  }

  if (normalized.startsWith('/Cash/report')) {
    return '/Cash/ledger';
  }

  return normalized;
};

export const usePermission = () => {
  const { profile } = useSelector((state) => state.user);
  const userType = profile?.user?.userType || profile?.userType || localStorage.getItem('userType');
  const location = useLocation();

  const permissions = useMemo(() => {
    if (userType !== 'team_member') return null;
    return getDecryptedPermissions();
  }, [userType]);

  const checkMenuPermission = (slug) => {
    if (userType !== 'team_member') return true;
    if (!permissions) return false;
    const perm = permissions.find((p) => p.slug === slug);
    return perm ? (perm.canRead || perm.canWrite || perm.canUpdate || perm.canDelete) : false;
  };

  const checkActionPermission = (slug, action) => {
    if (userType !== 'team_member') return true;
    if (!permissions) return false;
    const perm = permissions.find((p) => p.slug === slug);
    return perm ? !!perm[action] : false;
  };

  const activeSlug = useMemo(() => getSlugFromPath(location.pathname), [location.pathname]);

  const pagePermissions = useMemo(() => {
    if (userType !== 'team_member') {
      return { canRead: true, canWrite: true, canUpdate: true, canDelete: true };
    }
    if (!permissions) {
      return { canRead: false, canWrite: false, canUpdate: false, canDelete: false };
    }
    const perm = permissions.find((p) => p.slug === activeSlug);
    return {
      canRead: perm ? perm.canRead : false,
      canWrite: perm ? perm.canWrite : false,
      canUpdate: perm ? perm.canUpdate : false,
      canDelete: perm ? perm.canDelete : false,
    };
  }, [userType, permissions, activeSlug]);

  return {
    isTeamMember: userType === 'team_member',
    hasMenuPermission: checkMenuPermission,
    hasActionPermission: checkActionPermission,
    pagePermissions,
    activeSlug,
  };
};
