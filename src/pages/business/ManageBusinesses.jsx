import { useCallback, useEffect, useState } from 'react';
import { Archive, ArchiveRestore, ArrowRightLeft, Building2, Plus } from 'lucide-react';
import { Alert, Avatar, Badge, Button, ConfirmDialog, EmptyState, PageHeader, Section, Spinner, toast } from '@/components/ui';
import { archiveBusinessApi, listBusinessesApi, restoreBusinessApi } from './services/businessService';
import { switchBusiness } from '@/utility/switchBusiness';
import CreateBusinessModal from '@/components/business/CreateBusinessModal';
import BusinessStatusBadge from '@/components/business/BusinessStatusBadge';
import { openUpgrade } from '@/utility/upgradeEvents';

const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** The login's businesses: open one, archive one to free a plan slot, or restore it. */
export default function ManageBusinesses() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => listBusinessesApi().then(setData).catch((e) => toast.error(e.response?.data?.message || 'Could not load businesses')), []);
  useEffect(() => { load(); }, [load]);

  const act = async (id, fn, done) => {
    setBusy(id);
    try {
      await fn(id);
      toast.success(done);
      await load();
    } catch (err) {
      const d = err.response?.data || {};
      if (d.code !== 'PLAN_LIMIT_REACHED') toast.error(d.message || 'Something went wrong'); // the limit opens the upgrade pop-up (Http.js)
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const open = async (b) => {
    setBusy(b._id);
    try { await switchBusiness(b._id); } catch (err) { setBusy(null); toast.error(err.response?.data?.message || 'Could not open that business'); }
  };

  if (!data) return <div className="grid place-items-center p-16"><Spinner label="Loading businesses" /></div>;
  const over = data.limit !== null && data.used > data.limit;

  const row = (b) => (
    <li key={b._id} className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:px-6">
      <Avatar name={b.name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-ink">{b.name}</span>
          {b.isMain && <Badge tone="primary" size="xs">Main</Badge>}
          {b.isCurrent && <Badge tone="success" size="xs">Open now</Badge>}
          <BusinessStatusBadge business={b} />
        </div>
        <div className="mt-0.5 text-xs text-ink-muted">
          {[b.state, b.gstin, b.phone].filter(Boolean).join(' · ') || 'No GSTIN'} · created {day(b.createdAt)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {b.status === 'archived' ? (
          <Button size="sm" variant="secondary" startIcon={<ArchiveRestore />} loading={busy === b._id} onClick={() => act(b._id, restoreBusinessApi, `${b.name} restored`)}>Restore</Button>
        ) : (
          <>
            {!b.isCurrent && <Button size="sm" variant="secondary" startIcon={<ArrowRightLeft />} loading={busy === b._id} onClick={() => open(b)}>Open</Button>}
            {!b.isMain && !b.isCurrent && <Button size="sm" variant="ghost" startIcon={<Archive />} onClick={() => setConfirm(b)}>Archive</Button>}
          </>
        )}
      </div>
    </li>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Businesses"
        description={`One login, separate businesses: each has its own products, stock, customers, bills, GST and reports. ${data.used} of ${data.limit ?? 'unlimited'} in use.`}
        actions={<Button startIcon={<Plus />} onClick={() => (data.canCreate ? setCreating(true) : openUpgrade({ limit: data.limit, currentCount: data.used }))}>Create new business</Button>}
      />
      {over && (
        <Alert tone="warning" title="Your plan allows fewer businesses">
          Your plan covers {data.limit} business{data.limit === 1 ? '' : 'es'} but {data.used} are in use. The newest ones are read-only for now and then lock.
          Upgrade, or archive one you don&apos;t need.
        </Alert>
      )}
      <Section title="Your businesses" bodyClassName="p-0">
        <ul className="m-0 list-none p-0">{data.businesses.map(row)}</ul>
      </Section>
      <Section title="Archived" description="Archived businesses keep all their data and don't count towards your plan." bodyClassName="p-0">
        {data.archived.length
          ? <ul className="m-0 list-none p-0">{data.archived.map(row)}</ul>
          : <EmptyState icon={Building2} title="No archived businesses" />}
      </Section>
      <CreateBusinessModal open={creating} onClose={() => { setCreating(false); load(); }} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => act(confirm._id, archiveBusinessApi, `${confirm.name} archived`)}
        title={`Archive ${confirm?.name || 'business'}?`}
        message="Nothing is deleted. It frees a slot on your plan and can be restored later while a slot is free."
        confirmLabel="Archive"
        tone="primary"
        loading={busy === confirm?._id}
      />
    </div>
  );
}
