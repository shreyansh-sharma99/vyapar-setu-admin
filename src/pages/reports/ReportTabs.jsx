import { useNavigate, useLocation } from 'react-router-dom';
import Tabs from '@/components/inputs/Tabs';

const reportTabs = [
  { label: 'Sales Register', value: '/reports/sales-register' },
  { label: 'GSTR-1 Summary', value: '/reports/gstr1' },
  { label: 'HSN Summary', value: '/reports/hsn-summary' },
  { label: 'Accounts Ageing', value: '/reports/ageing' },
  { label: 'Profit', value: '/reports/profit' },
  { label: 'Batch-wise Sales', value: '/reports/batch-sales' },
  { label: 'Price History', value: '/reports/price-history' },
  { label: 'Price Overrides', value: '/reports/price-overrides' },
];

export default function ReportTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="mb-4">
      <Tabs
        tabs={reportTabs}
        activeTab={location.pathname}
        onChange={(val) => navigate(val)}
      />
    </div>
  );
}
