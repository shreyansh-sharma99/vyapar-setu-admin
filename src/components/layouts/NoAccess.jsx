import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button, Card, EmptyState } from '@/components/ui';

/** Shown instead of a page the logged-in staff member is not allowed to open. */
export default function NoAccess({ homePath = '/' }) {
  const isDashboard = homePath === '/';
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card padding="none" className="w-full max-w-md">
        <EmptyState
          icon={ShieldAlert}
          title="You don't have access to this page"
          text="Your role does not include permission for this section. If you need it, please ask the shop owner to update your access."
          action={
            <Button as={Link} to={homePath} startIcon={<ArrowLeft />}>
              {isDashboard ? 'Go to Dashboard' : 'Go to my home page'}
            </Button>
          }
        />
      </Card>
    </div>
  );
}
