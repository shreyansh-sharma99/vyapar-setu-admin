import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Check, MessageCircle, Phone, RotateCcw, Search, Settings } from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, SkeletonRows, Switch, Textarea, toast,
} from '@/components/ui';
import { isOwner } from '@/utility/shopPermissions';
import { formatDate } from '@/utility/dateTiming';
import { encryptData } from '@/utility/crypto';
import {
  getFollowUpSettingsApi, getFollowUpsApi, getFollowUpSummaryApi, saveFollowUpSettingsApi, updateFollowUpApi,
} from './services/followUpService';

const PAGE = 20;
const DAY = 24 * 60 * 60 * 1000;
/** Today in India as YYYY-MM-DD (follow-up dates are whole days). */
const todayStr = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
const daysFromToday = (dueAt) => Math.round((new Date(String(dueAt).slice(0, 10)) - new Date(todayStr())) / DAY);

const REMINDER_OPTIONS = [
  { value: '0', label: 'Off' },
  { value: '1', label: '1 day before' },
  { value: '2', label: '2 days before' },
  { value: '3', label: '3 days before' },
];

function DueBadge({ dueAt }) {
  const d = daysFromToday(dueAt);
  if (d === 0) return <Badge tone="primary">Today</Badge>;
  if (d < 0) return <Badge tone="danger">{-d === 1 ? '1 day late' : `${-d} days late`}</Badge>;
  return <Badge tone="neutral">{d === 1 ? 'Tomorrow' : `In ${d} days`}</Badge>;
}

/** Move the date (and keep a note) — e.g. the customer asked for next week. */
// Opened with a key per follow-up, so the fields start from that follow-up.
function MoveModal({ followUp, onClose, onSaved }) {
  const [dueAt, setDueAt] = useState(followUp ? String(followUp.dueAt).slice(0, 10) : '');
  const [note, setNote] = useState(followUp?.note || '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await updateFollowUpApi(followUp._id, { dueAt, note });
      toast.success('Follow-up updated.');
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update the follow-up.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={!!followUp}
      onClose={onClose}
      size="sm"
      title="Move follow-up"
      subtitle={followUp?.customerName}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={!dueAt}>Save</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Next visit">
          <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </Field>
        <Field label="Note" hint="Only you and your staff see this.">
          <Textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called, will come on Monday" />
        </Field>
      </div>
    </Modal>
  );
}

/** Owner: email reminder days, the message, and the daily list by email. */
function SettingsModal({ open, onClose }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    getFollowUpSettingsApi()
      .then((s) => setForm({ reminderDays: String(s.reminderDays), message: s.message, ownerSummary: s.ownerSummary, defaultMessage: s.defaultMessage }))
      .catch(() => toast.error('Could not load the follow-up settings.'));
  }, [open]);
  const preview = (form?.message || '')
    .replace(/\{customer\}/g, 'Ravi')
    .replace(/\{shop\}/g, 'your shop')
    .replace(/\{service\}/g, 'Root canal')
    .replace(/\{date\}/g, '20 Nov 2026');
  const save = async () => {
    setBusy(true);
    try {
      await saveFollowUpSettingsApi({ reminderDays: Number(form.reminderDays), message: form.message, ownerSummary: form.ownerSummary });
      toast.success('Follow-up settings saved.');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save the settings.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Follow-up settings"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={!form}>Save</Button>
        </>
      }
    >
      {!form ? <SkeletonRows rows={3} /> : (
        <div className="flex flex-col gap-4">
          <Field label="Email the customer" hint="Only customers with an email get it.">
            <Select searchable={false} options={REMINDER_OPTIONS} value={form.reminderDays} onChange={(v) => setForm({ ...form, reminderDays: v })} />
          </Field>
          <Field label="Message" hint="Used in the email and the WhatsApp text. {customer}, {shop}, {service} and {date} are filled in.">
            <Textarea rows={3} maxLength={500} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-xs text-ink-muted">Preview: {preview}</p>
            {form.message !== form.defaultMessage && (
              <Button variant="link" size="xs" onClick={() => setForm({ ...form, message: form.defaultMessage })}>Use default</Button>
            )}
          </div>
          <Field label="Email me the day's list" hint="Every morning: today's and overdue follow-ups.">
            <Switch checked={form.ownerSummary} onChange={(v) => setForm({ ...form, ownerSummary: v })} aria-label="Email me the day's list" />
          </Field>
        </div>
      )}
    </Modal>
  );
}

/** Sales → Follow-ups: customers due for their next visit. */
export default function FollowUps() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);
  const [range, setRange] = useState('today');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [reload, setReload] = useState(0);
  const [counts, setCounts] = useState(null); // null until the server answers
  const [moving, setMoving] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getFollowUpsApi({ range, search: query || undefined, page, limit: PAGE }), getFollowUpSummaryApi()])
      .then(([list, summary]) => {
        if (!alive) return;
        setData(list);
        setCounts(summary);
      })
      .catch(() => alive && toast.error('Could not load the follow-ups.'));
    return () => {
      alive = false;
    };
  }, [range, query, page, reload]);
  const load = () => setReload((n) => n + 1);

  // search a moment after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const setStatus = async (f, status) => {
    setBusyId(f._id);
    try {
      await updateFollowUpApi(f._id, { status });
      toast.success(status === 'done' ? `${f.customerName || 'Follow-up'} marked done.` : 'Follow-up opened again.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update the follow-up.');
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { value: 'today', label: 'Today', count: counts?.today },
    { value: 'week', label: 'This week', count: counts?.week },
    { value: 'overdue', label: 'Overdue', count: counts?.overdue },
    { value: 'done', label: 'Done' },
    { value: 'all', label: 'All' },
  ];
  const items = data?.items || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const closed = range === 'done';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Follow-ups"
        description="Customers due for their next visit, from the Next visit date on their bills."
        actions={isOwner(user) && (
          <Button variant="secondary" startIcon={<Settings />} onClick={() => setSettingsOpen(true)}>Reminder settings</Button>
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented aria-label="Which follow-ups" options={tabs} value={range} onChange={(v) => { setRange(v); setPage(1); }} />
        <Input
          startIcon={<Search />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, vehicle..."
          aria-label="Search follow-ups"
          className="w-full sm:w-72"
        />
      </div>

      <Card padding="none">
        {!data ? (
          <div className="p-5"><SkeletonRows rows={4} /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={closed ? 'Nothing done yet' : 'No follow-ups here'}
            text="A follow-up is made when a confirmed bill has a Next visit date. Turn it on in Sales → Bill Fields."
          />
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {items.map((f) => {
              const isClosed = f.status !== 'pending';
              return (
              <li key={f._id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 py-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-ink">{f.customerName || 'Customer'}</span>
                    {f.phone && <span className="font-mono text-xs text-ink-muted">{f.phone}</span>}
                  </div>
                  <div className="text-sm text-ink">
                    {f.service || 'Visit'}
                    {f.groupValue && <span className="text-ink-muted"> · {f.groupLabel} {f.groupValue}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>Next visit {formatDate(f.dueAt)}</span>
                    {isClosed ? (
                      <Badge tone={f.status === 'done' ? 'success' : 'neutral'}>{f.status === 'done' ? 'Done' : 'Skipped'}</Badge>
                    ) : <DueBadge dueAt={f.dueAt} />}
                    <Button
                      variant="link"
                      size="xs"
                      className="font-mono"
                      onClick={() => navigate(`/sales/invoices/view/${encodeURIComponent(encryptData(f.invoiceId))}`)}
                    >
                      {f.invoiceNumber}
                    </Button>
                    {f.remindedAt && <span>· Email sent</span>}
                  </div>
                  {f.note && <div className="text-xs text-ink-muted">Note: {f.note}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isClosed ? (
                    <Button variant="secondary" size="sm" startIcon={<RotateCcw />} loading={busyId === f._id} onClick={() => setStatus(f, 'pending')}>Open again</Button>
                  ) : (
                    <>
                      {f.whatsappUrl && (
                        <Button variant="secondary" size="sm" startIcon={<MessageCircle />} onClick={() => window.open(f.whatsappUrl, '_blank', 'noopener')}>WhatsApp</Button>
                      )}
                      {f.phone && (
                        <Button variant="secondary" size="sm" startIcon={<Phone />} onClick={() => { window.location.href = `tel:${f.phone}`; }}>Call</Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => setMoving(f)}>Move</Button>
                      <Button size="sm" startIcon={<Check />} loading={busyId === f._id} onClick={() => setStatus(f, 'done')}>Done</Button>
                    </>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-ink-muted">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span>Page {page} of {pages}</span>
          <Button variant="secondary" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <MoveModal key={moving?._id || 'none'} followUp={moving} onClose={() => setMoving(null)} onSaved={() => { setMoving(null); load(); }} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
