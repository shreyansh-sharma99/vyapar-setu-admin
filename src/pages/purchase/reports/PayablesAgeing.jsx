import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, IndianRupee, RefreshCw, Users } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import TableInfoCard from '@/components/table/TableInfoCard';
import Loader from '@/components/loader/Loader';
import useApi from '../components/useApi';
import { PATHS, formatINR, num, viewPath } from '../components/helpers';
import { getPayablesAgeingApi } from '../suppliers/services/supplierService';

const BUCKETS = [
  { key: 'notDue', label: 'Not due yet', tone: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'd1_30', label: '1-30 days', tone: 'text-amber-600 dark:text-amber-400' },
  { key: 'd31_60', label: '31-60 days', tone: 'text-orange-600 dark:text-orange-400' },
  { key: 'd61_90', label: '61-90 days', tone: 'text-rose-600 dark:text-rose-400' },
  { key: 'd90plus', label: 'Over 90 days', tone: 'text-rose-700 dark:text-rose-300' },
];

export default function PayablesAgeing() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi('payables-ageing', getPayablesAgeingApi);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'total', dir: 'desc' });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data?.data || []).filter((r) => !q || String(r.name || '').toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      const av = sort.key === 'name' ? String(a.name || '') : num(a[sort.key]);
      const bv = sort.key === 'name' ? String(b.name || '') : num(b[sort.key]);
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, sort]);

  const totals = data?.totals || {};
  const overdue = num(totals.total) - num(totals.notDue);

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  const arrow = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');
  const th = 'py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] whitespace-nowrap cursor-pointer select-none';

  return (
    <div className="text-[var(--vs-text-primary)]">
      <Card
        h1="Payables Ageing"
        description="What you owe suppliers, grouped by how long bills have been past their due date"
        bodyClassName="px-4 pb-4 pt-3 flex flex-col gap-4"
        rightNode={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={reload} startIcon={<RefreshCw className="w-4 h-4" />}>
              Refresh
            </Button>
            <Button size="sm" onClick={() => navigate(`${PATHS.payments}/create`)}>
              Pay supplier
            </Button>
          </div>
        }
      >
        <TableInfoCard
          stats={[
            { label: 'Total payable', value: formatINR(totals.total), icon: <IndianRupee className="w-4 h-4 text-rose-500" />, colorClass: 'text-rose-600 dark:text-rose-400' },
            { label: 'Overdue', value: formatINR(overdue), icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, colorClass: 'text-amber-600 dark:text-amber-400' },
            { label: 'Over 90 days', value: formatINR(totals.d90plus), icon: <AlertTriangle className="w-4 h-4 text-rose-500" />, colorClass: 'text-rose-700 dark:text-rose-300' },
            { label: 'Suppliers', value: (data?.data || []).length, icon: <Users className="w-4 h-4 text-indigo-500" />, colorClass: 'text-indigo-600 dark:text-indigo-400' },
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--vs-text-secondary)]">Only confirmed bills with a balance are counted. Age is days past the due date (bill date when there is no due date).</p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier..."
            className="h-10 w-full sm:w-72 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loading && !data ? (
          <Loader className="my-10" />
        ) : error ? (
          <div className="p-6 text-center text-sm text-rose-600 dark:text-rose-400">{error}</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead className="bg-[var(--vs-bg-secondary)]">
                <tr>
                  <th className={`${th} text-left`} onClick={() => toggleSort('name')}>
                    Supplier{arrow('name')}
                  </th>
                  <th className={`${th} text-right`} onClick={() => toggleSort('bills')}>
                    Bills{arrow('bills')}
                  </th>
                  {BUCKETS.map((b) => (
                    <th key={b.key} className={`${th} text-right`} onClick={() => toggleSort(b.key)}>
                      {b.label}
                      {arrow(b.key)}
                    </th>
                  ))}
                  <th className={`${th} text-right`} onClick={() => toggleSort('total')}>
                    Total due{arrow('total')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={BUCKETS.length + 3} className="py-8 text-center text-[var(--vs-text-secondary)]">
                      {search ? 'No supplier matches your search.' : 'Nothing payable. All supplier bills are settled.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.supplierId} className="border-t border-[var(--vs-border)] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3">
                        <button type="button" onClick={() => navigate(viewPath('suppliers', r.supplierId))} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-left">
                          {r.name || 'Supplier'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right">{r.bills}</td>
                      {BUCKETS.map((b) => (
                        <td key={b.key} className={`py-2.5 px-3 text-right font-mono ${num(r[b.key]) > 0 ? b.tone : 'text-[var(--vs-text-secondary)]'}`}>
                          {num(r[b.key]) > 0 ? formatINR(r[b.key]) : '—'}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{formatINR(r.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-[var(--vs-bg-secondary)] font-bold">
                  <tr className="border-t-2 border-[var(--vs-border)]">
                    <td className="py-3 px-3">Total</td>
                    <td className="py-3 px-3 text-right">{(data?.data || []).reduce((s, r) => s + num(r.bills), 0)}</td>
                    {BUCKETS.map((b) => (
                      <td key={b.key} className={`py-3 px-3 text-right font-mono ${b.tone}`}>
                        {formatINR(totals[b.key])}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400">{formatINR(totals.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        {search && rows.length > 0 && <p className="text-[11px] text-[var(--vs-text-secondary)]">Totals row shows all suppliers, not just the search results.</p>}
      </Card>
    </div>
  );
}
