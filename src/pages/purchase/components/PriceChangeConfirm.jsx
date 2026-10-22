import { ArrowRight, IndianRupee } from 'lucide-react';
import ConfirmDialog from '@/pages/storeManagement/products/components/ConfirmDialog';
import { formatINR } from './helpers';

/**
 * "Make ₹B the default price from today?" before saving a GRN, purchase bill or
 * opening stock where "Also make default price" is ticked. Cancel returns to the form.
 * changes = [{ key, name, oldPrice, newPrice }]
 */
export default function PriceChangeConfirm({ changes = [], onConfirm, onClose, isLoading = false }) {
  return (
    <ConfirmDialog
      isOpen={changes.length > 0}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      icon={<IndianRupee className="w-6 h-6" />}
      title={`Change the default price of ${changes.length} product${changes.length === 1 ? '' : 's'}?`}
      message={
        <div className="flex flex-col gap-2 text-left">
          <p className="m-0">From today new batches get this price. Stock already on the shelf keeps its own price; bills already saved do not change.</p>
          <ul className="list-none m-0 p-0 max-h-56 overflow-y-auto divide-y divide-[var(--vs-border)] rounded-lg border border-[var(--vs-border)]">
            {changes.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="font-medium text-[var(--vs-text-primary)] break-words min-w-0">{c.name}</span>
                <span className="flex items-center gap-1 font-mono whitespace-nowrap">
                  {Number(c.oldPrice) > 0 ? formatINR(c.oldPrice) : 'Not set'} <ArrowRight className="w-3 h-3" />
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatINR(c.newPrice)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      }
      confirmText="Yes, make default"
      loadingText="Saving..."
    />
  );
}
