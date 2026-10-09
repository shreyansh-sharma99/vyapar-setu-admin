import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

/** Shown instead of a page the logged-in staff member is not allowed to open. */
export default function NoAccess({ homePath = '/' }) {
  const isDashboard = homePath === '/';
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md text-center rounded-2xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] shadow-sm px-6 py-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
          <ShieldAlert className="h-7 w-7 text-amber-500" />
        </div>
        <h2 className="!text-lg font-bold text-[var(--vs-text-primary)] mb-2">
          You don&apos;t have access to this page
        </h2>
        <p className="text-sm text-[var(--vs-text-secondary)] mb-6">
          Your role does not include permission for this section. If you need it, please ask the shop owner to
          update your access.
        </p>
        <Link
          to={homePath}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all no-underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {isDashboard ? 'Go to Dashboard' : 'Go to my home page'}
        </Link>
      </div>
    </div>
  );
}
