import { useSyncExternalStore } from 'react';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import { subscribeToasts, getToasts } from './toast';

export default function PurchaseToaster() {
  const list = useSyncExternalStore(subscribeToasts, getToasts);
  return (
    <CToaster className="p-3 print:hidden" style={{ zIndex: 100010, position: 'fixed', bottom: '20px', right: '20px' }}>
      {list.map((t) => (
        <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2 shadow-lg">
          <div className="d-flex">
            <CToastBody className="font-semibold">{t.message}</CToastBody>
          </div>
        </CToast>
      ))}
    </CToaster>
  );
}
