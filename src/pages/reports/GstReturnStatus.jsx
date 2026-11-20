import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { CalendarClock, CheckCircle2, AlertTriangle, FileCheck2, LockOpen } from 'lucide-react';
import { Alert, Badge, Button, DataTable, Field, Input, Modal, PageHeader, Select, toast } from '@/components/ui';
import { isOwner } from '@/utility/shopPermissions';
import { getGstPeriodsApi, markGstFiledApi, reopenGstPeriodApi } from './services/reportService';
import { StatRow } from './components/ReportBits';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const currentFy = () => { const t = new Date(Date.now() + 330 * 60000); return t.getUTCMonth() >= 3 ? t.getUTCFullYear() : t.getUTCFullYear() - 1; };
const statusBadge = (r) => {
  if (r.status === 'filed') return <Badge tone="success">Filed</Badge>;
  if (r.overdue) return <Badge tone="danger">Overdue</Badge>;
  if (r.status === 'ready') return <Badge tone="warning">Ready to file</Badge>;
  return <Badge tone="neutral">Open</Badge>;
};

/** GST returns of a financial year: due dates, filed / ARN, and the lock after filing. */
export default function GstReturnStatus() {
  const { user } = useSelector((state) => state.auth || {});
  const owner = isOwner(user);
  const [thisFy] = useState(currentFy);
  const [today] = useState(todayIst);
  const [fy, setFy] = useState(thisFy);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [fileTarget, setFileTarget] = useState(null);
  const [reopenTarget, setReopenTarget] = useState(null);
  const [form, setForm] = useState({ arn: '', filedOn: today, reason: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getGstPeriodsApi({ fy })
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e?.response?.data?.message || 'Could not load the GST return status.'));
  }, [fy]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => data?.rows || [], [data]);
  const stats = useMemo(() => [
    { label: 'Filed', value: String(rows.filter((r) => r.status === 'filed').length), icon: CheckCircle2, tone: 'success' },
    { label: 'Ready to file', value: String(rows.filter((r) => r.status === 'ready' && !r.overdue).length), icon: FileCheck2, tone: 'warning' },
    { label: 'Overdue', value: String(rows.filter((r) => r.overdue && !r.optional).length), icon: AlertTriangle, tone: 'danger' },
    { label: 'Filing', value: data?.frequency === 'quarterly' ? 'Quarterly (QRMP)' : 'Monthly', icon: CalendarClock, tone: 'info' },
  ], [rows, data]);

  const submitFiled = async () => {
    setSaving(true);
    try {
      await markGstFiledApi({ returnType: fileTarget.returnType, period: fileTarget.period, arn: form.arn.trim(), filedOn: form.filedOn });
      toast.success(`${fileTarget.returnName} ${fileTarget.label} marked as filed`);
      setFileTarget(null); load();
    } catch (e) {
      toast.error(e?.response?.data?.errors?.[0] || e?.response?.data?.message || 'Could not save');
    } finally { setSaving(false); }
  };
  const submitReopen = async () => {
    setSaving(true);
    try {
      await reopenGstPeriodApi({ returnType: reopenTarget.returnType, period: reopenTarget.period, reason: form.reason.trim() });
      toast.success(`${reopenTarget.returnName} ${reopenTarget.label} reopened`);
      setReopenTarget(null); load();
    } catch (e) {
      toast.error(e?.response?.data?.errors?.[0] || e?.response?.data?.message || 'Could not reopen');
    } finally { setSaving(false); }
  };

  const columns = [
    { key: 'returnName', header: 'Return', render: (r) => <span className="text-xs font-semibold">{r.returnName}{r.optional ? <span className="ml-1 font-normal text-ink-muted">(optional)</span> : null}</span> },
    { key: 'label', header: 'Period', render: (r) => <span className="text-xs">{r.label}</span> },
    { key: 'dueDate', header: 'Due date', render: (r) => <span className={`text-xs ${r.overdue ? 'font-semibold text-danger' : ''}`}>{fmtDay(r.dueDate)}</span> },
    { key: 'status', header: 'Status', render: statusBadge },
    { key: 'arn', header: 'ARN', render: (r) => <span className="font-mono text-xs">{r.arn || '—'}</span> },
    { key: 'filedOn', header: 'Filed on', render: (r) => <span className="text-xs">{fmtDay(r.filedOn)}</span> },
  ];
  const ended = (r) => new Date(r.to) < new Date();
  const rowActions = (r) => (owner ? [
    r.status !== 'filed' && ended(r) && { label: 'Mark as filed', icon: FileCheck2, onClick: () => { setForm({ arn: '', filedOn: today, reason: '' }); setFileTarget(r); } },
    r.status === 'filed' && { label: 'Reopen', icon: LockOpen, onClick: () => { setForm((f) => ({ ...f, reason: '' })); setReopenTarget(r); } },
  ] : []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="GST Return Status"
        description="Every GSTR-1 and GSTR-3B of the year with its due date. Mark a return as filed after you file it on the GST portal — sales, returns and credit notes dated in a filed period are then locked."
        actions={
          <div className="w-40">
            <Select
              aria-label="Financial year"
              options={[thisFy, thisFy - 1, thisFy - 2].map((y) => ({ value: String(y), label: `FY ${y}-${String(y + 1).slice(2)}` }))}
              value={String(fy)}
              onChange={(v) => setFy(Number(v) || thisFy)}
            />
          </div>
        }
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {data && !data.gstin && <Alert tone="warning">No GSTIN in Invoice Settings yet — add it there (with the state) to use GST returns.</Alert>}
      <StatRow stats={stats} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => `${r.returnType}-${r.period}`}
        loading={!data && !error}
        rowActions={owner ? rowActions : undefined}
        empty={{ icon: CalendarClock, title: 'No return periods.' }}
      />

      <Modal open={!!fileTarget} onClose={() => setFileTarget(null)} title="Mark as filed" subtitle={fileTarget ? `${fileTarget.returnName} · ${fileTarget.label}` : ''}>
        <div className="flex flex-col gap-4">
          <Field label="ARN" required hint="The acknowledgement number the GST portal shows after filing.">
            <Input value={form.arn} onChange={(e) => setForm((f) => ({ ...f, arn: e.target.value.toUpperCase() }))} placeholder="AA240926000001X" className="font-mono uppercase" maxLength={20} />
          </Field>
          <Field label="Filed on" required>
            <Input type="date" value={form.filedOn} max={today} onChange={(e) => setForm((f) => ({ ...f, filedOn: e.target.value }))} />
          </Field>
          <Alert tone="warning">After this, invoices, returns and credit notes dated in {fileTarget?.label} can&apos;t be changed. Corrections go on a credit note dated today.</Alert>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFileTarget(null)}>Cancel</Button>
            <Button loading={saving} disabled={!form.arn.trim() || !form.filedOn} onClick={submitFiled}>Mark as filed</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!reopenTarget} onClose={() => setReopenTarget(null)} title="Reopen period" subtitle={reopenTarget ? `${reopenTarget.returnName} · ${reopenTarget.label} · ARN ${reopenTarget.arn}` : ''}>
        <div className="flex flex-col gap-4">
          <Field label="Reason" required hint="For example: the ARN was entered for the wrong month.">
            <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} maxLength={300} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReopenTarget(null)}>Cancel</Button>
            <Button loading={saving} disabled={form.reason.trim().length < 3} onClick={submitReopen}>Reopen</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
