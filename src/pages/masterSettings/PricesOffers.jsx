import { useState } from 'react';
import { ArrowLeft, History, IndianRupee, Tag } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Tabs from '@/components/inputs/Tabs';
import ToastStack from '@/pages/storeManagement/products/components/ToastStack';
import { useToasts } from '@/pages/storeManagement/products/utils/productUtils';
import AntdThemed from './components/AntdThemed';
import OfferForm from './components/OfferForm';
import PriceChangeForm from './components/PriceChangeForm';
import ChangeHistory from './components/ChangeHistory';

const TabLabel = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5">
    <Icon className="w-4 h-4" />
    {children}
  </span>
);

/**
 * Master Settings → Prices & Offers: dated selling prices (one or many products,
 * set / ±% / ±₹) and offers (% off, ₹ off, offer price) between two dates,
 * plus one product's price + offer history.
 */
export default function PricesOffers() {
  const { toasts, showToast } = useToasts();
  const [tab, setTab] = useState('price');
  const [historyKind, setHistoryKind] = useState('price');
  const [historyReloadKey, setHistoryReloadKey] = useState(0);

  // Reload the history when a change touched the product shown there.
  const onApplied = (productIds) => {
    if (productIds.length) setHistoryReloadKey((k) => k + 1);
  };

  return (
    <AntdThemed>
      <Card
          h1="Prices & Offers"
          description="Change selling prices from a chosen date, or run an offer between two dates. Bills dated before a change keep the old price."
          buttonName="Back"
          navigation="-1"
          buttonVariant="danger"
          buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          bodyClassName="p-4 sm:p-5"
        >
          <Tabs
            tabs={[
              { value: 'price', label: <TabLabel icon={IndianRupee}>Change price</TabLabel> },
              { value: 'offer', label: <TabLabel icon={Tag}>Add offer</TabLabel> },
              { value: 'history', label: <TabLabel icon={History}>Price & offer history</TabLabel> },
            ]}
            activeTab={tab}
            onChange={setTab}
          />
          {/* both stay mounted so switching tabs keeps what was typed */}
          <div className={tab === 'price' ? 'pt-3' : 'hidden'}>
            <PriceChangeForm notify={showToast} onApplied={onApplied} />
          </div>
          <div className={tab === 'offer' ? 'pt-3' : 'hidden'}>
            <OfferForm notify={showToast} onApplied={onApplied} />
          </div>
          <div className={tab === 'history' ? 'pt-3 flex flex-col gap-3' : 'hidden'}>
            <div className="inline-flex self-start rounded-lg border border-[var(--vs-border)] overflow-hidden h-9" role="group" aria-label="Show">
              {[
                { value: 'price', label: 'Price changes' },
                { value: 'offer', label: 'Offers' },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setHistoryKind(o.value)}
                  className={`px-4 text-xs font-semibold cursor-pointer ${historyKind === o.value ? 'bg-indigo-600 text-white' : 'text-[var(--vs-text-secondary)] hover:bg-[var(--vs-bg-secondary)]'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {historyKind === 'price' ? (
              <ChangeHistory key="price" kind="price" notify={showToast} reloadKey={historyReloadKey} />
            ) : (
              <ChangeHistory key="offer" kind="offer" notify={showToast} reloadKey={historyReloadKey} />
            )}
          </div>
        </Card>

      <ToastStack toasts={toasts} />
    </AntdThemed>
  );
}
