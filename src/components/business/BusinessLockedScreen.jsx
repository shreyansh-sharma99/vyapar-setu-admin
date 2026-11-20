import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Lock } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { isOwner } from '@/utility/shopPermissions';
import { openUpgrade } from '@/utility/upgradeEvents';

/** Replaces the page while the open business is locked (its read-only days after a downgrade are over). */
export default function BusinessLockedScreen({ detail = {} }) {
  const { user } = useSelector((s) => s.auth || {});
  const owner = isOwner(user);
  const limit = detail.limit ?? user?.businessLimit;
  const used = detail.used ?? user?.businessesUsed;
  return (
    <Card className="mx-auto mt-6 flex max-w-lg flex-col items-center gap-4 text-center" padding="lg">
      <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger"><Lock className="size-6" aria-hidden="true" /></span>
      <div>
        <h1 className="m-0 !text-xl !font-extrabold text-ink">{user?.business?.name || 'This business'} is locked</h1>
        <p className="m-0 mt-2 text-sm text-ink-muted">
          {owner
            ? `Your plan covers ${limit ?? 'fewer'} business${limit === 1 ? '' : 'es'} and ${used ?? 'more'} are in use. Nothing is deleted — upgrade to open it again, or archive a business you don't need.`
            : 'This business is locked on the current plan. Please ask the shop owner.'}
        </p>
      </div>
      {owner && (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => openUpgrade({ limit, currentCount: used })}>Upgrade plan</Button>
          <Button variant="secondary" as={Link} to="/businesses">Switch business</Button>
        </div>
      )}
    </Card>
  );
}
