import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, FileSpreadsheet, ShieldCheck, Undo2, Ban, Wallet } from 'lucide-react';
import { Button, PageHeader, Segmented, toast } from '@/components/ui';
import { downloadGstr2Api, getGstr2Api, getGstr2TableApi } from './services/reportService';
import { DateFilterBar, ReportError, StatRow } from './components/ReportBits';
import GstServerTable from './components/GstServerTable';

const TABS = [
  { label: 'B2B purchases', value: 'b2b' },
  { label: 'Unregistered / composition', value: 'unreg' },
  { label: 'Debit notes', value: 'cdn' },
  { label: 'Nil / Exempt', value: 'nil' },
  { label: 'HSN', value: 'hsn' },
  { label: 'ITC summary', value: 'itc' },
];
const EMPTY = {
  b2b: 'No bills from GST-registered suppliers in these dates.',
  unreg: 'No bills from unregistered or composition suppliers.',
  cdn: 'No purchase returns (debit notes) in these dates.',
};
const FY = { dateFrom: '2026-04-01', dateTo: '2027-03-31' };
const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const taxOf = (t = {}) => Number(t.igst || 0) + Number(t.cgst || 0) + Number(t.sgst || 0) + Number(t.cess || 0);

/** GSTR-2: the purchase side of GST, from the shop's own bills (ITC you can claim). */
export default function Gstr2Report() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [range, setRange] = useState(() => ({ dateFrom: searchParams.get('dateFrom') || FY.dateFrom, dateTo: searchParams.get('dateTo') || FY.dateTo }));
  const [tab, setTab] = useState('b2b');
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');
  const params = useMemo(() => ({ dateFrom: range.dateFrom, dateTo: range.dateTo }), [range]);

  useEffect(() => {
    let alive = true;
    getGstr2Api(params)
      .then((d) => { if (alive) { setSummary(d); setError(''); } })
      .catch((e) => alive && setError(e?.response?.data?.message || 'Could not load GSTR-2.'));
    return () => { alive = false; };
  }, [params]);

  const apply = (r) => { setRange(r); setSearchParams(r); };
  const download = async (format) => {
    setDownloading(format);
    try {
      await downloadGstr2Api({ ...params, format, ...(format === 'csv' ? { name: tab } : {}) });
    } catch {
      toast.error('Could not download the GSTR-2 file');
    } finally {
      setDownloading('');
    }
  };

  const t = summary?.totals || {};
  const stats = [
    { label: 'ITC available', value: inr(taxOf(t.itcAvailable)), icon: ShieldCheck, tone: 'success' },
    { label: 'Reversed (debit notes)', value: inr(taxOf(t.itcReversed)), icon: Undo2, tone: 'warning' },
    { label: 'Net ITC', value: inr(taxOf(t.netItc)), icon: Wallet, tone: 'primary' },
    { label: 'Not eligible', value: inr(taxOf(t.notEligible)), icon: Ban, tone: 'neutral' },
  ];
  const tabs = TABS.map((x) => ({ ...x, count: summary?.counts?.[x.value] }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="GSTR-2 (Purchases)"
        description="GST on your purchases, from your own bills: the input tax credit (ITC) you can claim. Not filed — use it with GSTR-2B matching and GSTR-3B."
        actions={
          <>
            <Button variant="secondary" size="sm" startIcon={<Download />} loading={downloading === 'csv'} onClick={() => download('csv')}>Download CSV</Button>
            <Button variant="secondary" size="sm" startIcon={<FileSpreadsheet />} loading={downloading === 'xlsx'} onClick={() => download('xlsx')}>Excel (all tables)</Button>
          </>
        }
      />
      <DateFilterBar idPrefix="gstr2" value={range} defaults={FY} onApply={apply} onReset={() => apply(FY)} />
      {error && <ReportError message={error} />}
      <StatRow stats={stats} />
      <div className="max-w-full overflow-x-auto">
        <Segmented aria-label="GSTR-2 tables" options={tabs} value={tab} onChange={setTab} size="sm" />
      </div>
      <GstServerTable key={tab} name={tab} params={params} fetchPage={getGstr2TableApi} empty={EMPTY[tab]} />
    </div>
  );
}
