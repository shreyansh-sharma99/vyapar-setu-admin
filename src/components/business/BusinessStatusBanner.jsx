import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Alert, Button } from '@/components/ui';
import { isOwner } from '@/utility/shopPermissions';
import { openUpgrade } from '@/utility/upgradeEvents';

const longDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Shown above every page while the open business is read-only after a plan downgrade. */
export default function BusinessStatusBanner() {
  const { user } = useSelector((s) => s.auth || {});
  if (user?.businessAccess !== 'readOnly' || !user.readOnlyUntil) return null;
  const owner = isOwner(user);
  return (
    <Alert
      tone="warning"
      title={`${user.business?.name || 'This business'} is read-only until ${longDate(user.readOnlyUntil)}`}
      className="mb-4"
      action={owner && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => openUpgrade({ limit: user.businessLimit, currentCount: user.businessesUsed })}>Upgrade</Button>
          <Button size="sm" variant="secondary" as={Link} to="/businesses">Switch business</Button>
        </div>
      )}
    >
      {owner
        ? `Your plan allows ${user.businessLimit ?? 'fewer'} business${user.businessLimit === 1 ? '' : 'es'}. You can still open and download everything here, but you can't make changes. After that date it locks until you upgrade.`
        : 'You can view everything but can\'t make changes for now. Please ask the shop owner.'}
    </Alert>
  );
}
