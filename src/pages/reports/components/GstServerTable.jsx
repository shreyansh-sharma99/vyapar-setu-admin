import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { Alert, Badge, DataTable } from '@/components/ui';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const MONEY = 'text-xs tabular-nums';
// minus amounts (debit notes, returns) in red; 0 shows as —
const money = (v, cls = '') => (Number(v) ? <span className={`${MONEY} ${cls} ${Number(v) < 0 ? 'text-danger' : ''}`}>{Number(v) < 0 ? '−' : ''}₹{Math.abs(Number(v)).toFixed(2)}</span> : <span className={MONEY}>—</span>);
const TONE = { Yes: 'success', Matched: 'success', Reversed: 'warning', No: 'neutral', Composition: 'warning', Unregistered: 'neutral' };

/** Server column { key, header, type } → DataTable column (same look as the GSTR-1 page). */
const toColumn = (c) => {
  const base = { key: c.key, header: c.header };
  switch (c.type) {
    case 'money': return { ...base, type: 'money', render: (r) => money(r[c.key], c.key === 'taxable' ? 'font-semibold' : '') };
    case 'date': return { ...base, render: (r) => <span className="text-xs">{fmtDay(r[c.key])}</span> };
    case 'rate': return { ...base, render: (r) => <span className="font-mono text-xs font-bold">{Number(r[c.key]) || 0}%</span> };
    case 'number': return { ...base, type: 'number', render: (r) => <span className="text-xs font-semibold tabular-nums">{Number(r[c.key]) || 0}</span> };
    case 'mono': return { ...base, render: (r) => <span className="font-mono text-xs">{r[c.key] || '—'}</span> };
    case 'badge': return { ...base, render: (r) => (r[c.key] ? <Badge tone={TONE[r[c.key]] || 'neutral'}>{r[c.key]}</Badge> : '—') };
    default:
      return ['itc', 'type'].includes(c.key)
        ? { ...base, render: (r) => (r[c.key] ? <Badge tone={TONE[r[c.key]] || 'primary'}>{r[c.key]}</Badge> : '—') }
        : { ...base, render: (r) => <span className="text-xs">{r[c.key] || '—'}</span> };
  }
};

/**
 * One server-paged GST table. fetchPage({ name, page, limit, ...params }) → { rows, total, columns }.
 * `params` (dates, filters) must be memoised by the caller.
 */
export default function GstServerTable({ name, params, fetchPage, empty = 'Nothing in these dates.', reloadKey = 0 }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [state, setState] = useState({ key: '', rows: [], total: 0, columns: [], error: '' });
  const key = `${name}|${JSON.stringify(params)}|${page}|${pageSize}|${reloadKey}`;

  useEffect(() => {
    let alive = true;
    fetchPage({ name, page, limit: pageSize, ...params })
      .then((d) => alive && setState({ key, rows: d.rows || [], total: d.total || 0, columns: d.columns || [], error: '' }))
      .catch((e) => alive && setState({ key, rows: [], total: 0, columns: [], error: e?.response?.data?.message || 'Could not load this table.' }));
    return () => { alive = false; };
  }, [key, name, page, pageSize, params, fetchPage]);

  const columns = useMemo(() => state.columns.map(toColumn), [state.columns]);
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  return (
    <DataTable
      columns={columns}
      rows={state.rows}
      rowKey={(r, i) => `${page}-${i}`}
      loading={state.key !== key}
      pagination={{ page, pageSize, total: state.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } }}
      pageSizeOptions={[10, 20, 50, 100]}
      empty={{ icon: FileText, title: empty }}
    />
  );
}
