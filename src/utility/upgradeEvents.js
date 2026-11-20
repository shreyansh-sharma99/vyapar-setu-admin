/**
 * App-wide events for plan limits and business access, raised by Http.js (403 codes) or by
 * screens, and handled by components/business/UpgradeHost.jsx.
 */
export const PLAN_LIMIT_EVENT = 'app:plan-limit';
export const BUSINESS_LOCKED_EVENT = 'app:business-locked';

/** Open the upgrade pop-up. detail: { feature, limit, currentCount } from the server. */
export const openUpgrade = (detail = {}) => window.dispatchEvent(new CustomEvent(PLAN_LIMIT_EVENT, { detail: { feature: 'maximumBusinesses', ...detail } }));

/** Show the "business locked" screen. */
export const showBusinessLocked = (detail = {}) => window.dispatchEvent(new CustomEvent(BUSINESS_LOCKED_EVENT, { detail }));
