import AsyncSelect from './AsyncSelect';
import { supplierOptionsLoader } from './lookupService';
import { formatINR, num, stateName } from './helpers';

/**
 * Supplier select + a short summary of the chosen supplier.
 * `value` = { value, label } | null, `info` = full supplier from GET /suppliers/:id (optional).
 */
export default function SupplierPicker({ value, onChange, info, infoLoading, error, disabled }) {
  const label = value?.label || info?.name || (value?.value ? 'Loading...' : '');
  return (
    <div className="flex flex-col gap-2">
      <AsyncSelect
        value={value?.value ? { value: value.value, label } : null}
        onChange={onChange}
        loadOptions={supplierOptionsLoader}
        placeholder="Search supplier by name, phone or GSTIN"
        error={error}
        disabled={disabled}
        emptyText="No active supplier found"
      />
      {value?.value && (info || infoLoading) && (
        <div className="rounded-lg bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)] px-3 py-2 text-xs text-[var(--vs-text-secondary)] flex flex-wrap gap-x-4 gap-y-1">
          {infoLoading && !info ? (
            <span>Loading supplier...</span>
          ) : (
            <>
              <span>{info.gstin ? <>GSTIN <strong className="font-mono text-[var(--vs-text-primary)]">{info.gstin}</strong></> : 'Unregistered (no input tax credit)'}</span>
              {info.stateCode && <span>State {stateName(info.stateCode) || info.stateCode}</span>}
              <span>Credit {num(info.paymentTermsDays) ? `${info.paymentTermsDays} days` : 'on receipt'}</span>
              <span>
                Payable <strong className={num(info.payableBalance) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--vs-text-primary)]'}>{formatINR(info.payableBalance)}</strong>
              </span>
              {info.isActive === false && <span className="text-rose-600 dark:text-rose-400 font-semibold">Inactive supplier</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
