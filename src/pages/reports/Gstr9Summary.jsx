import { useEffect, useState } from 'react';
import { Alert, DataTable, PageHeader, Section, Select } from '@/components/ui';
import { getGstr9Api } from './services/reportService';
import { ReportError } from './components/ReportBits';

const currentFy = () => { const t = new Date(Date.now() + 330 * 60000); return t.getUTCMonth() >= 3 ? t.getUTCFullYear() : t.getUTCFullYear() - 1; };
const inr = (v) => (Number(v) ? `${Number(v) < 0 ? '−' : ''}₹${Math.abs(Number(v)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—');
const cell = (v, bold = false) => <span className={`text-xs tabular-nums ${bold ? 'font-semibold' : ''} ${Number(v) < 0 ? 'text-danger' : ''}`}>{inr(v)}</span>;
const label = { key: 'label', header: 'Details', render: (r) => <span className="text-xs">{r.label}</span> };
const TAX = ['taxable', 'igst', 'cgst', 'sgst', 'cess'].map((k, i) => ({ key: k, header: ['Taxable value', 'IGST', 'CGST', 'SGST', 'Cess'][i], type: 'money', render: (r) => cell(r[k], k === 'taxable') }));
const HSN_COLS = [
  { key: 'hsn', header: 'HSN', render: (r) => <span className="font-mono text-xs">{r.hsn}</span> },
  { key: 'uqc', header: 'UQC', render: (r) => <span className="text-xs">{r.uqc}</span> },
  { key: 'rate', header: 'Rate', render: (r) => <span className="font-mono text-xs font-bold">{r.rate}%</span> },
  { key: 'qty', header: 'Qty', type: 'number', render: (r) => <span className="text-xs tabular-nums">{r.qty}</span> },
  ...TAX,
];

/** GSTR-9 annual summary: the year's GSTR-1, GSTR-2 and HSN totals for the CA. */
export default function Gstr9Summary() {
  const [thisFy] = useState(currentFy);
  const [fy, setFy] = useState(thisFy);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getGstr9Api({ fy })
      .then((d) => { if (alive) { setData(d); setError(''); } })
      .catch((e) => alive && setError(e?.response?.data?.message || 'Could not build GSTR-9.'));
    return () => { alive = false; };
  }, [fy]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="GSTR-9 Annual Summary"
        description="The financial year's sales, purchases and HSN totals from your books — a starting point for the annual return. Your CA files GSTR-9 on the portal."
        actions={
          <div className="w-40">
            <Select aria-label="Financial year" options={[thisFy, thisFy - 1, thisFy - 2].map((y) => ({ value: String(y), label: `FY ${y}-${String(y + 1).slice(2)}` }))} value={String(fy)} onChange={(v) => setFy(Number(v) || thisFy)} />
          </div>
        }
      />
      <Alert tone="info">Draft from your books. Compare with the GSTR-1 and GSTR-3B you actually filed before using it.</Alert>
      {error && <ReportError message={error} />}
      <Section title="4 Outward supplies on which tax is payable">
        <DataTable columns={[label, ...TAX]} rows={data?.outward || []} rowKey={(r) => r.label} loading={!data && !error} />
      </Section>
      <Section title="5 Outward supplies with no tax">
        <DataTable columns={[label, TAX[0]]} rows={data?.exempt || []} rowKey={(r) => r.label} />
      </Section>
      <Section title="6 & 7 Input tax credit">
        <DataTable columns={[label, ...TAX]} rows={data?.itc || []} rowKey={(r) => r.label} />
      </Section>
      <Section title="17 HSN summary of outward supplies">
        <DataTable columns={HSN_COLS} rows={data?.hsnOutward || []} rowKey={(r) => `${r.hsn}-${r.rate}-${r.uqc}`} empty={{ title: 'No sales this year.' }} />
      </Section>
      <Section title="18 HSN summary of inward supplies">
        <DataTable columns={HSN_COLS} rows={data?.hsnInward || []} rowKey={(r) => `${r.hsn}-${r.rate}-${r.uqc}`} empty={{ title: 'No purchases this year.' }} />
      </Section>
    </div>
  );
}
