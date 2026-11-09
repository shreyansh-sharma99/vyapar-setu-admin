import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit2, ShieldAlert, MapPin, History } from 'lucide-react';
import {
  Badge, Button, Card, DetailList, EmptyState, PageHeader, PartyCard, Section, SkeletonRows, StatusBadge,
} from '@/components/ui';
import { decryptData, encryptData } from '@/utility/crypto';
import { can } from '@/utility/shopPermissions';
import { getCustomerById, clearCurrentCustomer } from './services/customerSlice';


export default function CustomerDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentCustomer, loading, error } = useSelector((state) => state.customer);
  const { user } = useSelector((state) => state.auth || {});
  const canSeeLedger = can(user, 'sales', 'view');

  useEffect(() => {
    if (id) {
      dispatch(getCustomerById(id));
    }
    return () => {
      dispatch(clearCurrentCustomer());
    };
  }, [dispatch, id]);

  const handleEditClick = () => {
    if (currentCustomer?._id) {
      const encrypted = encodeURIComponent(encryptData(currentCustomer._id));
      navigate(`/customers/edit/${encrypted}`);
    }
  };

  const handleLedgerClick = () => {
    if (currentCustomer?._id) {
      navigate('/customers/ledger/' + encodeURIComponent(encryptData(currentCustomer._id)));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Customer details" />
        <Card>
          <SkeletonRows rows={5} cols={3} />
        </Card>
      </div>
    );
  }

  if (!currentCustomer) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Customer details" />
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="Customer Not Found"
            text="The customer details you are trying to view are not available."
            action={<Button onClick={() => navigate('/customers')}>Back to Customers</Button>}
          />
        </Card>
      </div>
    );
  }

  const fullName = `${currentCustomer.firstName || ''} ${currentCustomer.lastName || ''}`.trim();
  const addresses = currentCustomer.addresses || [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={fullName || 'Customer details'}
        actions={
          <>
            <StatusBadge status={currentCustomer.status === 'active' ? 'active' : 'inactive'} size="md" />
            {canSeeLedger && (
              <Button variant="secondary" startIcon={<History />} onClick={handleLedgerClick}>
                Ledger
              </Button>
            )}
            <Button startIcon={<Edit2 />} onClick={handleEditClick}>
              Edit Profile
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Profile">
          <div className="flex flex-col gap-5">
            <PartyCard
              name={fullName || '—'}
              sub={currentCustomer.gstin ? `GSTIN ${currentCustomer.gstin}` : 'No GSTIN'}
              meta={{ label: 'Opening balance', value: `₹${(currentCustomer.openingBalance ?? 0).toLocaleString('en-IN')}` }}
            />
            <DetailList
              cols={2}
              items={[
                { label: 'Email address', value: currentCustomer.email },
                { label: 'Phone number', value: currentCustomer.phone, mono: true },
              ]}
            />
          </div>
        </Section>

        <Section title="Tax & credit">
          <DetailList
            cols={2}
            items={[
              { label: 'GSTIN', value: currentCustomer.gstin || 'Not Provided', mono: !!currentCustomer.gstin },
              { label: 'State code', value: currentCustomer.stateCode || 'Not Provided' },
              { label: 'Credit limit', value: `₹${(currentCustomer.creditLimit ?? 0).toLocaleString('en-IN')}` },
              { label: 'Opening balance', value: `₹${(currentCustomer.openingBalance ?? 0).toLocaleString('en-IN')}` },
            ]}
          />
        </Section>
      </div>

      <Section title="Address directory" description={addresses.length ? `${addresses.length} saved` : undefined}>
        {addresses.length === 0 ? (
          <EmptyState icon={MapPin} title="No addresses" text="No addresses listed for this customer." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {addresses.map((addr, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-control bg-fill p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-brand-soft text-brand-ink">
                  <MapPin className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold capitalize text-ink">{addr.type} Address</span>
                    {addr.isDefault && <Badge tone="primary">Default</Badge>}
                  </div>
                  <p className="m-0 mt-1 text-sm font-medium text-ink">{addr.street}</p>
                  <p className="m-0 text-xs text-ink-muted">{addr.city}, {addr.state} - {addr.pincode}</p>
                  <p className="m-0 mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{addr.country}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
