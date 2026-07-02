import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, ShieldAlert, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { decryptData, encryptData } from '@/utility/crypto';
import { getCustomerById, clearCurrentCustomer } from './services/customerSlice';

export default function CustomerDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentCustomer, loading, error } = useSelector((state) => state.customer);

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

  if (loading) {
    return (
      <Card
        h1="Customer Details"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      ><Loader className="mb-4" /></Card>
    );
  }

  if (!currentCustomer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[var(--vs-bg-primary)] rounded-2xl border border-[var(--vs-border)] max-w-md mx-auto my-12">
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-full text-rose-500 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-[var(--vs-text-primary)]">Customer Not Found</h2>
        <p className="text-sm text-[var(--vs-text-secondary)] mt-2">
          The customer details you are trying to view are not available.
        </p>
        <Button onClick={() => navigate('/customers')} className="mt-6" variant="primary">
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col mx-auto">
      <Card
        h1="Customer Details"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-0"
      >
        <div className="flex flex-col">

          {/* ── Profile Header ── */}
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 border-b border-[var(--vs-border)] bg-[var(--vs-bg-secondary)] overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-indigo-400" />

            <div className="flex items-center gap-3 pl-2">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20 uppercase ring-3 ring-indigo-100 dark:ring-indigo-950/50">
                {currentCustomer.firstName?.[0] || ''}{currentCustomer.lastName?.[0] || ''}
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--vs-text-primary)] leading-tight">
                  {currentCustomer.firstName} {currentCustomer.lastName}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-[11px] font-semibold ${currentCustomer.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentCustomer.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {currentCustomer.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              startIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={handleEditClick}
            >
              Edit Profile
            </Button>
          </div>

          {/* ── Info Cards Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 mt-2">

            {/* ── Contact Information Card ── */}
            <div className="md:col-span-1 bg-[var(--vs-bg-primary)] overflow-hidden border-r border-[var(--vs-border)]">
              {/* Card Header */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--vs-bg-secondary)] border-b border-[var(--vs-border)]">
                <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[13px] font-bold text-[var(--vs-active-text)]">
                  Contact Information
                </h3>
              </div>

              {/* Card Body */}
              <div className="px-4 py-3 flex flex-col">
                {/* Email */}
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-[var(--vs-text-secondary)] uppercase tracking-wider leading-none">Email Address</p>
                    <p className="text-[13px] font-semibold text-[var(--vs-text-primary)] truncate leading-tight mt-px">{currentCustomer.email}</p>
                  </div>
                </div>

                <div className="border-t border-dashed border-[var(--vs-border)] my-2.5" />

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-[var(--vs-text-secondary)] uppercase tracking-wider leading-none">Phone Number</p>
                    <p className="text-[13px] font-semibold text-[var(--vs-text-primary)] leading-tight mt-px">{currentCustomer.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Address Directory Card ── */}
            <div className="md:col-span-2 bg-[var(--vs-bg-primary)] overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--vs-bg-secondary)] border-b border-[var(--vs-border)]">
                <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[13px] font-bold text-[var(--vs-active-text)]">
                  Address Directory
                </h3>
              </div>

              {/* Card Body */}
              <div className="px-4 py-3">
                {!currentCustomer.addresses || currentCustomer.addresses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed border-[var(--vs-border)] rounded-lg bg-[var(--vs-bg-secondary)]/30">
                    <MapPin className="w-6 h-6 text-[var(--vs-text-secondary)] opacity-40 mb-1" />
                    <p className="text-xs font-medium text-[var(--vs-text-secondary)]">No addresses listed for this customer.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {currentCustomer.addresses.map((addr, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]/40 hover:bg-[var(--vs-bg-secondary)] transition-colors duration-150">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-bold text-[var(--vs-text-primary)] capitalize leading-none">{addr.type} Address</span>
                            {addr.isDefault && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/50">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Default
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-[var(--vs-text-primary)] font-medium leading-tight mt-px">{addr.street}</p>
                          <p className="text-xs text-[var(--vs-text-secondary)] leading-tight mt-px">{addr.city}, {addr.state} - {addr.pincode}</p>
                          <p className="text-[11px] text-[var(--vs-text-secondary)] uppercase font-semibold leading-tight mt-px tracking-wider">{addr.country}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </Card>
    </div>
  );
}
