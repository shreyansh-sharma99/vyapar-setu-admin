import { useState } from 'react';
import { Badge, Button, PartyCard } from '@/components/ui';
import AsyncSelect from './AsyncSelect';
import { supplierOptionsLoader } from './lookupService';
import { formatINR, num, stateName } from './helpers';

/**
 * Supplier search; once picked, a party card (GSTIN, state, credit days, amount owed) with a Change button.
 * `value` = { value, label } | null, `info` = full supplier from GET /suppliers/:id (optional).
 */
export default function SupplierPicker({ value, onChange, info, infoLoading, error, disabled }) {
  const [changing, setChanging] = useState(false);
  const label = value?.label || info?.name || (value?.value ? 'Loading...' : '');

  if (value?.value && !changing) {
    const sub = info
      ? [
          info.gstin || 'Unregistered (no input tax credit)',
          info.stateCode ? stateName(info.stateCode) || info.stateCode : '',
          `Credit ${num(info.paymentTermsDays) ? `${info.paymentTermsDays} days` : 'on receipt'}`,
        ].filter(Boolean).join(' · ')
      : '';
    return (
      <PartyCard
        name={label}
        sub={sub}
        loading={infoLoading && !info}
        meta={info ? { label: 'You owe', value: formatINR(info.payableBalance), tone: num(info.payableBalance) > 0 ? 'danger' : undefined } : undefined}
        actions={!disabled && <Button variant="secondary" size="sm" onClick={() => setChanging(true)}>Change</Button>}
      >
        {info?.isActive === false && <Badge tone="danger">Inactive supplier</Badge>}
      </PartyCard>
    );
  }

  return (
    <AsyncSelect
      value={value?.value ? { value: value.value, label } : null}
      onChange={(opt) => {
        setChanging(false);
        onChange(opt);
      }}
      loadOptions={supplierOptionsLoader}
      placeholder="Search supplier by name, phone or GSTIN"
      error={error}
      disabled={disabled}
      emptyText="No active supplier found"
    />
  );
}
