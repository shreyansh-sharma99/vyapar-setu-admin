import { useEffect, useState } from 'react';
import { BUSINESS_LOCKED_EVENT, PLAN_LIMIT_EVENT } from '@/utility/upgradeEvents';
import UpgradePlanModal from './UpgradePlanModal';

/**
 * Listens for plan-limit events (from Http.js 403 PLAN_LIMIT_REACHED or a screen) and opens the
 * upgrade pop-up. onLocked tells the layout to show the lock screen (403 BUSINESS_LOCKED).
 */
export default function UpgradeHost({ onLocked }) {
  const [detail, setDetail] = useState(null);
  const [opened, setOpened] = useState(0); // remount key: every opening starts fresh

  useEffect(() => {
    const onLimit = (e) => { setDetail(e.detail || {}); setOpened((n) => n + 1); };
    const onLock = (e) => onLocked?.(e.detail || {});
    window.addEventListener(PLAN_LIMIT_EVENT, onLimit);
    window.addEventListener(BUSINESS_LOCKED_EVENT, onLock);
    return () => {
      window.removeEventListener(PLAN_LIMIT_EVENT, onLimit);
      window.removeEventListener(BUSINESS_LOCKED_EVENT, onLock);
    };
  }, [onLocked]);

  return <UpgradePlanModal key={opened} open={!!detail} detail={detail || {}} onClose={() => setDetail(null)} />;
}
