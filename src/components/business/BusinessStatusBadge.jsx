import { Badge } from '@/components/ui';

const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** "Read-only till 22 Nov" / "Locked" for a business that the plan no longer covers. */
export default function BusinessStatusBadge({ business }) {
  if (business.access === 'readOnly') return <Badge tone="warning" size="xs">Read-only till {shortDate(business.readOnlyUntil)}</Badge>;
  if (business.access === 'locked') return <Badge tone="danger" size="xs">Locked</Badge>;
  return null;
}
