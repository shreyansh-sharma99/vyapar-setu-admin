import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronsUpDown, Plus, Settings2 } from 'lucide-react';
import { Avatar, Button, DropdownMenu, toast } from '@/components/ui';
import BusinessStatusBadge from './BusinessStatusBadge';
import { cn } from '@/lib/utils';
import { isOwner } from '@/utility/shopPermissions';
import { listBusinessesApi } from '@/pages/business/services/businessService';
import { switchBusiness } from '@/utility/switchBusiness';
import { openUpgrade } from '@/utility/upgradeEvents';
import CreateBusinessModal from './CreateBusinessModal';

function Row({ b }) {
  return (
    <span className="flex w-full min-w-0 items-center gap-3 py-0.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{b.name || 'Business'}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
          <span className="truncate">{[b.state, b.gstin].filter(Boolean).join(' · ') || (b.isMain ? 'Main business' : 'No GSTIN')}</span>
          <BusinessStatusBadge business={b} />
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn('grid size-[18px] shrink-0 place-items-center rounded-full border-2', b.isCurrent ? 'border-brand' : 'border-line-strong')}
      >
        {b.isCurrent && <span className="size-2 rounded-full bg-brand" />}
      </span>
    </span>
  );
}

/**
 * Header chip: the open business (logo / initials, name, phone). The menu lists the
 * login's businesses — pick one to switch — plus "Create new business" and "Manage".
 * Staff see the business name only.
 */
export default function BusinessSwitcher() {
  const { user } = useSelector((s) => s.auth || {});
  const navigate = useNavigate();
  const owner = isOwner(user);
  const [data, setData] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => listBusinessesApi().then(setData).catch(() => setData(null)), []);
  useEffect(() => { if (owner) load(); }, [owner, load]);

  const name = user?.business?.name || user?.businessName || 'My business';
  const phone = user?.business?.phone || '';

  if (!owner) {
    return name ? (
      <span className="hidden max-w-[180px] items-center gap-2 truncate text-sm font-semibold text-ink-muted lg:inline-flex">
        <Building2 className="size-4 shrink-0" aria-hidden="true" />{name}
      </span>
    ) : null;
  }

  const pick = async (b) => {
    if (b.isCurrent) return;
    try {
      toast.info(`Opening ${b.name}…`);
      await switchBusiness(b._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open that business');
    }
  };

  const onCreate = () => {
    if (data && !data.canCreate) openUpgrade({ limit: data.limit, currentCount: data.used });
    else setCreating(true);
  };

  const list = data?.businesses || [];
  const items = [
    ...list.map((b) => ({ key: b._id, label: <Row b={b} />, onClick: () => pick(b) })),
    { divider: true },
    { key: 'create', icon: Plus, label: <span className="font-semibold text-brand-ink">Create new business</span>, onClick: onCreate },
    { key: 'manage', icon: Settings2, label: 'Manage businesses', onClick: () => navigate('/businesses') },
  ];
  const usage = data ? `${data.used} of ${data.limit ?? '∞'} used` : '';

  return (
    <>
      <DropdownMenu
        align="end"
        className="w-[min(340px,calc(100vw-90px))]"
        header={(
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">Switch business</span>
            {usage && <span className="text-[11px] text-ink-subtle">{usage}</span>}
          </span>
        )}
        items={items}
        trigger={(
          <Button variant="secondary" className="h-auto max-w-[220px] gap-2 p-1 sm:pr-2" aria-label={`Business: ${name}. Switch business`}>
            {user?.business?.logo
              ? <img src={user.business.logo} alt="" className="size-8 shrink-0 rounded-full object-cover" />
              : <Avatar name={name} size="sm" />}
            {/* name + phone only on wide screens: the header centre holds the wordmark */}
            <span className="hidden min-w-0 flex-col items-start leading-tight xl:flex">
              <span className="max-w-[140px] truncate text-sm font-semibold text-ink">{name}</span>
              {phone && <span className="text-[10px] font-medium text-ink-muted">{phone}</span>}
            </span>
            <ChevronsUpDown className="hidden size-4 shrink-0 text-ink-subtle sm:block" aria-hidden="true" />
          </Button>
        )}
      />
      <CreateBusinessModal open={creating} onClose={() => { setCreating(false); load(); }} />
    </>
  );
}
