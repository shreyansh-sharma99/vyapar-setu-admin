import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Input, Modal, Section, SkeletonRows } from '@/components/ui';
import { formatDate } from '@/utility/dateTiming';
import { inr } from '@/pages/Invoices/invoiceLayout/components/invoiceDoc';
import { getCustomerHistoryApi } from '../services/customerService';

/** One past visit: date, bill no., what was done, the bill's details and the next visit. */
function Visit({ visit, onAddService }) {
  // A date field (e.g. Next service date) reads as a date
  const shown = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? formatDate(v) : v);
  const fields = (visit.fields || []).map((f) => `${f.label}: ${shown(f.value)}`).join(' · ');
  return (
    <li className="flex flex-col gap-1 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-ink">
          {formatDate(visit.invoiceDate)} <span className="ml-1 font-mono text-xs font-medium text-ink-muted">{visit.invoiceNumber}</span>
        </span>
        <span className="text-sm font-semibold tabular-nums text-ink">{inr(visit.totalAmount)}</span>
      </div>
      {(visit.serviceItems || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {visit.serviceItems.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-chip bg-brand-soft py-0.5 pl-2.5 pr-1 text-xs font-semibold text-brand-ink">
              {s.productName}
              {onAddService ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onAddService(s.productId)}
                  className="!size-5 !rounded-full text-brand-ink hover:bg-surface"
                  title={`Add ${s.productName} to this bill`}
                  aria-label={`Add ${s.productName} to this bill`}
                >
                  <Plus className="!size-3.5" />
                </Button>
              ) : <span className="w-1.5" />}
            </span>
          ))}
        </div>
      )}
      {(visit.products || []).length > 0 && <div className="text-xs text-ink-muted">{visit.products.join(', ')}</div>}
      {fields && <div className="text-xs text-ink-muted">{fields}</div>}
    </li>
  );
}

/** Loads a page of a customer's visits; waits a moment after the vehicle number is typed. */
function useHistory(customerId, { groupValue = '', limit, page = 1 }) {
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    if (!customerId) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, loading: true }));
      getCustomerHistoryApi(customerId, { limit, page, groupValue: groupValue || undefined })
        .then((data) => alive && setState({ loading: false, data }))
        .catch(() => alive && setState({ loading: false, data: { items: [], total: 0 } }));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [customerId, groupValue, limit, page]);
  return state;
}

function VisitList({ items, onAddService }) {
  return (
    <ul className="m-0 list-none divide-y divide-line p-0">
      {items.map((v) => <Visit key={v._id} visit={v} onAddService={onAddService} />)}
    </ul>
  );
}

const PAGE = 10;

/** Every visit, a page at a time, with a filter by the "Group history by" field (e.g. vehicle). */
function FullHistory({ customerId, initialGroupValue = '', onAddService }) {
  const [groupValue, setGroupValue] = useState(initialGroupValue);
  const [page, setPage] = useState(1);
  const { loading, data } = useHistory(customerId, { groupValue, limit: PAGE, page });
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <div className="flex flex-col gap-3">
      {data?.groupLabel && (
        <Input
          value={groupValue}
          onChange={(e) => { setGroupValue(e.target.value); setPage(1); }}
          placeholder={`Filter by ${data.groupLabel.toLowerCase()}`}
          aria-label={`Filter by ${data.groupLabel}`}
          className="max-w-xs"
        />
      )}
      {loading && !data ? <SkeletonRows rows={3} /> : total === 0 ? (
        <p className="m-0 text-sm text-ink-muted">No visits yet.</p>
      ) : (
        <VisitList items={data.items} onAddService={onAddService} />
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-ink-muted">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span>Page {page} of {pages}</span>
          <Button variant="secondary" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

/**
 * Invoice form: the customer's last 3 visits (of this vehicle once its number is typed),
 * with "+" to bill a service again and "View all" for the rest.
 */
export function PastVisits({ customerId, groupValue = '', onAddService }) {
  const [open, setOpen] = useState(false);
  const { loading, data } = useHistory(customerId, { groupValue, limit: 3 });
  if (!customerId || (!loading && !data?.total)) return null;
  const forGroup = data?.groupLabel && groupValue ? ` · ${data.groupLabel} ${groupValue}` : '';
  return (
    <div className="rounded-control bg-fill px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm font-semibold text-ink">
          Past visits{data ? ` (${data.total})` : ''}<span className="font-normal text-ink-muted">{forGroup}</span>
        </p>
        {data?.total > 3 && <Button variant="link" size="xs" onClick={() => setOpen(true)} className="font-semibold">View all</Button>}
      </div>
      {loading && !data ? <SkeletonRows rows={2} /> : <VisitList items={data?.items || []} onAddService={onAddService} />}
      <Modal open={open} onClose={() => setOpen(false)} size="lg" title="Past visits" footer={<Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>}>
        {open && <FullHistory customerId={customerId} initialGroupValue={groupValue} onAddService={(id) => { onAddService?.(id); setOpen(false); }} />}
      </Modal>
    </div>
  );
}

/** Customer page: every visit. */
export default function VisitHistory({ customerId }) {
  return (
    <Section title="History" description="Confirmed bills, newest first">
      <FullHistory customerId={customerId} />
    </Section>
  );
}
