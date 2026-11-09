import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, IndianRupee, Tag } from 'lucide-react';
import { Button, PageHeader, Segmented, ToastStack } from '@/components/ui';
import { useToasts } from '@/pages/storeManagement/products/utils/productUtils';
import OfferForm from './components/OfferForm';
import PriceChangeForm from './components/PriceChangeForm';
import ChangeHistory from './components/ChangeHistory';

/**
 * Master Settings → Prices & Offers: dated selling prices (one or many products,
 * set / ±% / ±₹) and offers (% off, ₹ off, offer price) between two dates,
 * plus one product's price + offer history.
 */
export default function PricesOffers() {
  const navigate = useNavigate();
  const { toasts, showToast } = useToasts();
  const [tab, setTab] = useState('price');
  const [historyKind, setHistoryKind] = useState('price');
  const [historyReloadKey, setHistoryReloadKey] = useState(0);

  // Reload the history when a change touched the product shown there.
  const onApplied = (productIds) => {
    if (productIds.length) setHistoryReloadKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Prices & Offers"
        description="Change selling prices from a chosen date, or run an offer between two dates. Bills dated before a change keep the old price."
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <div className="overflow-x-auto">
        <Segmented
          aria-label="Prices and offers view"
          options={[
            { value: 'price', label: 'Change price', icon: IndianRupee },
            { value: 'offer', label: 'Add offer', icon: Tag },
            { value: 'history', label: 'Price & offer history', icon: History },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {/* both stay mounted so switching tabs keeps what was typed */}
      <div className={tab === 'price' ? '' : 'hidden'}>
        <PriceChangeForm notify={showToast} onApplied={onApplied} />
      </div>
      <div className={tab === 'offer' ? '' : 'hidden'}>
        <OfferForm notify={showToast} onApplied={onApplied} />
      </div>
      <div className={tab === 'history' ? 'flex flex-col gap-3' : 'hidden'}>
        <Segmented
          size="sm"
          aria-label="Show"
          className="self-start"
          options={[
            { value: 'price', label: 'Price changes' },
            { value: 'offer', label: 'Offers' },
          ]}
          value={historyKind}
          onChange={setHistoryKind}
        />
        {historyKind === 'price' ? (
          <ChangeHistory key="price" kind="price" notify={showToast} reloadKey={historyReloadKey} />
        ) : (
          <ChangeHistory key="offer" kind="offer" notify={showToast} reloadKey={historyReloadKey} />
        )}
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}
