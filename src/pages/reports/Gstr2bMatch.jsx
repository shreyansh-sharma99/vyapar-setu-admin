import { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CheckCircle2, AlertTriangle, CalendarX2, FileQuestion, BookX, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { Alert, Button, Field, Input, PageHeader, Segmented, toast } from '@/components/ui';
import { isOwner } from '@/utility/shopPermissions';
import { downloadGstr2bMatchApi, getGstr2bMatchApi, importGstr2bApi } from './services/reportService';
import { StatRow } from './components/ReportBits';
import GstServerTable from './components/GstServerTable';

const lastMonth = () => { const t = new Date(Date.now() + 330 * 60000); t.setUTCDate(1); t.setUTCMonth(t.getUTCMonth() - 1); return t.toISOString().slice(0, 7); };
const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Amount differs', value: 'amount' },
  { label: 'Only in 2B', value: 'only2b' },
  { label: 'Only in books', value: 'onlyBooks' },
  { label: 'Date differs', value: 'date' },
  { label: 'Matched', value: 'matched' },
];
const COUNT_KEY = { amount: 'amountDiffers', only2b: 'only2b', onlyBooks: 'onlyBooks', date: 'dateDiffers', matched: 'matched' };
const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** GSTR-2B matching: the portal's ITC statement against your purchase bills, month by month. */
export default function Gstr2bMatch() {
  const { user } = useSelector((state) => state.auth || {});
  const owner = isOwner(user);
  const [period, setPeriod] = useState(lastMonth);
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState('');
  const fileRef = useRef(null);
  const params = useMemo(() => ({ period, ...(status ? { status } : {}) }), [period, status]);

  // the table's fetcher also keeps the summary cards in step
  const fetchPage = useCallback((p) => getGstr2bMatchApi(p).then((d) => { setSummary(d.summary || null); return d; }), []);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    try {
      const file = JSON.parse(await f.text());
      const r = await importGstr2bApi({ period, fileName: f.name, file });
      toast.success(r.message || 'GSTR-2B saved');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof SyntaxError ? 'This file is not JSON. Download GSTR-2B as JSON from the GST portal.' : (err?.response?.data?.errors?.[0] || err?.response?.data?.message || 'Could not read this file'));
    } finally {
      setUploading(false);
    }
  };
  const download = async (format) => {
    setDownloading(format);
    try { await downloadGstr2bMatchApi({ period, format }); } catch { toast.error('Could not download'); } finally { setDownloading(''); }
  };

  const c = summary?.counts || {};
  const stats = [
    { label: 'Matched', value: String((c.matched || 0) + (c.dateDiffers || 0)), icon: CheckCircle2, tone: 'success' },
    { label: 'Amount differs', value: String(c.amountDiffers || 0), icon: AlertTriangle, tone: 'danger' },
    { label: 'Date differs', value: String(c.dateDiffers || 0), icon: CalendarX2, tone: 'warning' },
    { label: 'Only in 2B', value: String(c.only2b || 0), icon: FileQuestion, tone: 'warning' },
    { label: 'Only in books', value: String(c.onlyBooks || 0), icon: BookX, tone: 'danger' },
  ];
  const filters = FILTERS.map((f) => ({ ...f, count: f.value ? c[COUNT_KEY[f.value]] : undefined }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="GSTR-2B Matching"
        description="Download GSTR-2B (JSON) for a month from the GST portal and upload it here. Each supplier invoice is matched with your purchases — so you claim only the ITC your suppliers have filed."
        actions={
          <>
            <Button variant="secondary" size="sm" startIcon={<Download />} loading={downloading === 'csv'} onClick={() => download('csv')}>Download CSV</Button>
            <Button variant="secondary" size="sm" startIcon={<FileSpreadsheet />} loading={downloading === 'xlsx'} onClick={() => download('xlsx')}>Excel</Button>
          </>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Month">
          <Input type="month" value={period} onChange={(e) => { if (e.target.value) { setPeriod(e.target.value); setSummary(null); } }} />
        </Field>
        {owner && (
          <>
            <Input ref={fileRef} type="file" accept=".json,application/json" wrapperClassName="hidden" className="hidden" onChange={onFile} />
            <Button startIcon={<Upload />} loading={uploading} onClick={() => fileRef.current?.click()}>Upload GSTR-2B (JSON)</Button>
          </>
        )}
      </div>
      {summary && !summary.uploaded && (
        <Alert tone="info">No GSTR-2B uploaded for this month yet — every bill shows as "Only in books" until you upload it.</Alert>
      )}
      {summary?.uploaded && (
        <Alert tone="success">GSTR-2B {summary.fileName ? `(${summary.fileName}) ` : ''}uploaded · ITC in 2B {inr(summary.itc2b)} · in your books {inr(summary.itcBooks)} · matched {inr(summary.itcMatched)}</Alert>
      )}
      <StatRow stats={stats} />
      <div className="max-w-full overflow-x-auto">
        <Segmented aria-label="Match result" options={filters} value={status} onChange={setStatus} size="sm" />
      </div>
      <GstServerTable name="match" params={params} fetchPage={fetchPage} reloadKey={reloadKey} empty="Nothing to show for this month." />
    </div>
  );
}
