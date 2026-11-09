import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { PieChart, IndianRupee, Landmark, Calculator, FileText, Download, FileSpreadsheet } from 'lucide-react';
import { Alert, Badge, Button, DataTable, PageHeader, Segmented, toast } from '@/components/ui';
import { downloadGstr1Api, getGstr1TableApi } from './services/reportService';
import { getGstr1 } from './services/reportSlice';
import { DateFilterBar, StatRow } from './components/ReportBits';

// One tab = one table. Rows come page by page from the server; "Download CSV" gives the same
// table with the same columns and every row (the server builds both from one column list).
const GSTR1_SUB_TABS = [
  { label: 'Summary (B2B / B2C)', value: 'byType' },
  { label: 'By tax rate', value: 'byRate' },
  { label: 'B2B', value: 'b2b' },
  { label: 'B2CL', value: 'b2cl' },
  { label: 'B2CS', value: 'b2cs' },
  { label: 'CDNR', value: 'cdnr' },
  { label: 'CDNUR', value: 'cdnur' },
  { label: 'HSN B2B', value: 'hsnB2B' },
  { label: 'HSN B2C', value: 'hsnB2C' },
  { label: 'Documents', value: 'docs' },
];
const EMPTY = {
  byType: 'No invoices in these dates.',
  b2b: 'No B2B invoices (buyer with a GSTIN) in these dates.',
  b2cl: 'No B2CL invoices (inter-state, unregistered buyer, above ₹1,00,000).',
  b2cs: 'No B2C sales in these dates.',
  cdnr: 'No credit notes / returns to buyers with a GSTIN.',
  cdnur: 'No credit notes / returns against B2CL invoices. (Returns on ordinary B2C sales are taken off inside B2CS.)',
};

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const MONEY = 'text-xs tabular-nums';
// credit notes / returns are minus (red); 0 shows as —
const money = (v, cls = '') => (Number(v) ? <span className={`${MONEY} ${cls} ${Number(v) < 0 ? 'text-danger' : ''}`}>{Number(v) < 0 ? '−' : ''}₹{Math.abs(Number(v)).toFixed(2)}</span> : <span className={MONEY}>—</span>);

/** Server column { key, header, type } → DataTable column. */
const toColumn = (c) => {
  const base = { key: c.key, header: c.header };
  switch (c.type) {
    case 'money': return { ...base, type: 'money', render: (r) => money(r[c.key], c.key === 'taxable' ? 'font-semibold' : '') };
    case 'date': return { ...base, render: (r) => <span className="text-xs">{fmtDay(r[c.key])}</span> };
    case 'rate': return { ...base, render: (r) => <span className="font-mono text-xs font-bold">{Number(r[c.key]) || 0}%</span> };
    case 'number': return { ...base, type: 'number', render: (r) => <span className="text-xs font-semibold tabular-nums">{Number(r[c.key]) || 0}</span> };
    case 'mono': return { ...base, render: (r) => <span className="font-mono text-xs">{r[c.key] || '—'}</span> };
    default:
      return c.key === 'type'
        ? { ...base, render: (r) => <Badge tone={/Credit/.test(r.type) ? 'danger' : 'primary'}>{r.type || '—'}</Badge> }
        : { ...base, render: (r) => <span className="text-xs">{r[c.key] || '—'}</span> };
  }
};

/** One GSTR-1 table with server-side pages. */
function Gstr1Table({ name, range }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [state, setState] = useState({ key: '', rows: [], total: 0, columns: [], error: '' });
  const key = `${name}|${range.dateFrom}|${range.dateTo}|${page}|${pageSize}`;

  useEffect(() => {
    let alive = true;
    getGstr1TableApi({ name, page, limit: pageSize, ...range })
      .then((d) => alive && setState({ key, rows: d.rows || [], total: d.total || 0, columns: d.columns || [], error: '' }))
      .catch((e) => alive && setState({ key, rows: [], total: 0, columns: [], error: e?.response?.data?.message || 'Could not load this table.' }));
    return () => {
      alive = false;
    };
  }, [key, name, page, pageSize, range]);

  const columns = useMemo(() => state.columns.map(toColumn), [state.columns]);
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  return (
    <DataTable
      columns={columns}
      rows={state.rows}
      rowKey={(r, i) => `${page}-${i}`}
      loading={state.key !== key}
      pagination={{
        page,
        pageSize,
        total: state.total,
        onPageChange: setPage,
        onPageSizeChange: (s) => {
          setPageSize(s);
          setPage(1);
        },
      }}
      pageSizeOptions={[10, 20, 50, 100]}
      empty={{ icon: FileText, title: EMPTY[name] || 'Nothing in these dates.' }}
    />
  );
}

export default function Gstr1Report() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDateFrom = searchParams.get('dateFrom') || '2026-04-01';
  const initialDateTo = searchParams.get('dateTo') || '2027-03-31';

  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [activeSubTab, setActiveSubTab] = useState('byType');
  const [downloading, setDownloading] = useState('');
  const range = useMemo(() => ({ ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) }), [dateFrom, dateTo]);

  const download = async (format) => {
    setDownloading(format);
    try {
      await downloadGstr1Api({ ...range, format, ...(format === 'csv' ? { name: activeSubTab } : {}) });
    } catch {
      toast.error('Could not download the GSTR-1 file');
    } finally {
      setDownloading('');
    }
  };

  const { gstr1 } = useSelector((state) => ({ gstr1: state.reports.gstr1 }));

  const fetchReport = (from = dateFrom, to = dateTo) => {
    const params = {};
    if (from) params.dateFrom = from;
    if (to) params.dateTo = to;
    setSearchParams(params);
    dispatch(getGstr1(params));
  };

  useEffect(() => {
    fetchReport(initialDateFrom, initialDateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilter = ({ dateFrom: from, dateTo: to }) => {
    setDateFrom(from);
    setDateTo(to);
    fetchReport(from, to);
  };

  const handleResetFilters = () => {
    const defaultFrom = '2026-04-01';
    const defaultTo = '2027-03-31';
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    fetchReport(defaultFrom, defaultTo);
  };

  // net figures: invoices − credit notes / returns
  const overallStats = useMemo(() => {
    const net = gstr1?.net || {};
    const totalOf = (list) => (list || []).reduce((s, r) => s + Number(r.total || 0), 0);
    const grandTotal = totalOf(gstr1?.byType) - totalOf(gstr1?.creditNotes);
    const totalTax = Number(net.cgst || 0) + Number(net.sgst || 0) + Number(net.igst || 0) + Number(net.cess || 0);
    const inr = (v) => `₹${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    return [
      { label: 'Net taxable value', value: inr(net.taxable), icon: IndianRupee, tone: 'primary' },
      { label: 'Net tax', value: inr(totalTax), icon: Calculator, tone: 'warning' },
      { label: 'Grand Total Value', value: inr(grandTotal), icon: PieChart, tone: 'success' },
      { label: 'CGST', value: inr(net.cgst), icon: Landmark, tone: 'info' },
      { label: 'SGST', value: inr(net.sgst), icon: Landmark, tone: 'info' },
      { label: 'IGST', value: inr(net.igst), icon: Landmark, tone: 'neutral' },
    ];
  }, [gstr1]);

  const counts = gstr1?.counts || {};
  const tabs = GSTR1_SUB_TABS.map((t) => ({ ...t, count: counts[t.value] }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="GSTR-1 Summary Report"
        description="Outward supplies for the period — the GSTR-1 tables, net of sales returns and credit notes. Downloads match the tables on this page."
        actions={
          <>
            <Button variant="secondary" size="sm" startIcon={<Download />} loading={downloading === 'csv'} onClick={() => download('csv')}>
              Download CSV
            </Button>
            <Button variant="secondary" size="sm" startIcon={<FileSpreadsheet />} loading={downloading === 'xlsx'} onClick={() => download('xlsx')}>
              Excel (all tables)
            </Button>
          </>
        }
      />

      <DateFilterBar
        idPrefix="gstr1"
        value={{ dateFrom, dateTo }}
        defaults={{ dateFrom: '2026-04-01', dateTo: '2027-03-31' }}
        onApply={handleApplyFilter}
        onReset={handleResetFilters}
      />

      <StatRow stats={overallStats} />

      {gstr1?.shopStateMissing && (
        <Alert tone="warning">Your shop state is not set in Invoice Settings, so the place of supply of some walk-in sales may be blank.</Alert>
      )}

      <div className="max-w-full overflow-x-auto">
        <Segmented aria-label="GSTR-1 tables" options={tabs} value={activeSubTab} onChange={setActiveSubTab} size="sm" />
      </div>

      <Gstr1Table key={activeSubTab} name={activeSubTab} range={range} />
    </div>
  );
}
