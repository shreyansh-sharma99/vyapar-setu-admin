import { useEffect, useMemo, useState } from 'react';
import { Receipt, ShieldCheck, Wallet } from 'lucide-react';
import { Alert, Checkbox, DataTable, PageHeader, Section, Segmented } from '@/components/ui';
import { getGstr3bApi } from './services/reportService';
import { DateFilterBar, ReportError, StatRow } from './components/ReportBits';

// default: last month (IST)
const lastMonthRange = () => {
  const t = new Date(Date.now() + 330 * 60000); t.setUTCDate(1); t.setUTCMonth(t.getUTCMonth() - 1);
  const y = t.getUTCFullYear(); const m = t.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const mm = String(m + 1).padStart(2, '0');
  return { dateFrom: `${y}-${mm}-01`, dateTo: `${y}-${mm}-${last}` };
};
const inr = (v) => (Number(v) ? `${Number(v) < 0 ? '−' : ''}₹${Math.abs(Number(v)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—');
const cell = (v, bold = false) => <span className={`text-xs tabular-nums ${bold ? 'font-semibold' : ''} ${Number(v) < 0 ? 'text-danger' : ''}`}>{inr(v)}</span>;
const TAX_COLS = [
  { key: 'taxable', header: 'Taxable value', type: 'money', render: (r) => cell(r.taxable, true) },
  { key: 'igst', header: 'IGST', type: 'money', render: (r) => cell(r.igst) },
  { key: 'cgst', header: 'CGST', type: 'money', render: (r) => cell(r.cgst) },
  { key: 'sgst', header: 'SGST', type: 'money', render: (r) => cell(r.sgst) },
  { key: 'cess', header: 'Cess', type: 'money', render: (r) => cell(r.cess) },
];
const label = { key: 'label', header: 'Nature of supply', render: (r) => <span className="text-xs">{r.label}</span> };

/** GSTR-3B draft: output tax from GSTR-1, ITC from GSTR-2B (or the books), and the cash to pay. */
export default function Gstr3bSummary() {
  const [defaults] = useState(lastMonthRange);
  const [range, setRange] = useState(defaults);
  const [itcSource, setItcSource] = useState('2b');
  const [includeOnly2b, setIncludeOnly2b] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const params = useMemo(() => ({ ...range, itcSource, includeOnly2b: String(includeOnly2b) }), [range, itcSource, includeOnly2b]);

  useEffect(() => {
    let alive = true;
    getGstr3bApi(params)
      .then((d) => { if (alive) { setData(d); setError(''); } })
      .catch((e) => alive && setError(e?.response?.data?.message || 'Could not work out GSTR-3B.'));
    return () => { alive = false; };
  }, [params]);

  const stats = [
    { label: 'Output tax', value: inr(data?.totals?.outputTax), icon: Receipt, tone: 'warning' },
    { label: 'Net ITC', value: inr(data?.totals?.netItc), icon: ShieldCheck, tone: 'success' },
    { label: 'Pay in cash', value: inr(data?.totals?.cash), icon: Wallet, tone: 'primary' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="GSTR-3B Summary"
        description="Draft for you / your CA — type these figures into GSTR-3B on the GST portal. Output tax comes from GSTR-1, input tax credit from GSTR-2B (or your purchase bills)."
      />
      <Alert tone="info">This is a draft. File GSTR-3B on the GST portal. Choose a month, or the 3 months of a quarter if you file quarterly (QRMP).</Alert>
      <DateFilterBar idPrefix="gstr3b" value={range} defaults={defaults} onApply={setRange} onReset={() => setRange(defaults)}>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented aria-label="ITC from" size="sm" value={itcSource} onChange={setItcSource} options={[{ label: 'ITC from GSTR-2B', value: '2b' }, { label: 'ITC from my books', value: 'books' }]} />
          {itcSource === '2b' && <Checkbox checked={includeOnly2b} onChange={setIncludeOnly2b} label='Also count invoices "Only in 2B"' />}
        </div>
      </DateFilterBar>
      {error && <ReportError message={error} />}
      <StatRow stats={stats} />
      {data?.notes?.map((n) => <Alert key={n} tone="warning">{n}</Alert>)}

      <Section title="3.1 Outward supplies">
        <DataTable columns={[label, ...TAX_COLS]} rows={data?.outward || []} rowKey={(r) => r.label} loading={!data && !error} />
      </Section>
      <Section title="3.2 Inter-state supplies to unregistered persons" description="By place of supply (B2CL and inter-state B2C sales)">
        <DataTable
          columns={[{ key: 'placeOfSupply', header: 'Place of supply', render: (r) => <span className="text-xs">{r.placeOfSupply}</span> }, TAX_COLS[0], TAX_COLS[1]]}
          rows={data?.interUnreg || []}
          rowKey={(r) => r.placeOfSupply}
          empty={{ title: 'No inter-state sales to unregistered buyers.' }}
        />
      </Section>
      <Section title="4 Eligible ITC" description={data?.itc?.note}>
        <DataTable columns={[{ ...label, header: 'Details' }, ...TAX_COLS.slice(1)]} rows={data?.itc?.rows || []} rowKey={(r) => r.label} />
      </Section>
      <Section title="5 Exempt, nil-rated and non-GST inward supplies">
        <DataTable
          columns={[label, { key: 'interState', header: 'Inter-state', type: 'money', render: (r) => cell(r.interState) }, { key: 'intraState', header: 'Intra-state', type: 'money', render: (r) => cell(r.intraState) }]}
          rows={data?.inward || []}
          rowKey={(r) => r.label}
        />
      </Section>
      <Section title="6.1 Payment of tax" description="ITC is used in the GST order: IGST credit first (IGST, then CGST, then SGST); CGST and SGST credit never pay each other.">
        <DataTable
          columns={[
            { key: 'head', header: 'Tax', render: (r) => <span className="text-xs font-semibold">{r.head}</span> },
            { key: 'payable', header: 'Payable', type: 'money', render: (r) => cell(r.payable, true) },
            { key: 'paidIgst', header: 'Paid by IGST credit', type: 'money', render: (r) => cell(r.paidIgst) },
            { key: 'paidCgst', header: 'Paid by CGST credit', type: 'money', render: (r) => cell(r.paidCgst) },
            { key: 'paidSgst', header: 'Paid by SGST credit', type: 'money', render: (r) => cell(r.paidSgst) },
            { key: 'cash', header: 'Pay in cash', type: 'money', render: (r) => cell(r.cash, true) },
            { key: 'creditLeft', header: 'Credit left', type: 'money', render: (r) => cell(r.creditLeft) },
          ]}
          rows={data?.payment || []}
          rowKey={(r) => r.head}
        />
      </Section>
    </div>
  );
}
