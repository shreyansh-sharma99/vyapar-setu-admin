import { CToaster, CToast, CToastBody } from '@coreui/react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

/** Toast list used by the product pages (pair with useToasts()). */
export default function ToastStack({ toasts = [] }) {
  return (
    <CToaster className="p-3 print:hidden" style={{ zIndex: 99999, position: 'fixed', bottom: '20px', right: '20px' }}>
      {toasts.map((t) => (
        <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2 shadow-lg">
          <div className="d-flex">
            <CToastBody className="flex items-center gap-2 font-semibold">
              {t.color === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              ) : t.color === 'info' ? (
                <Info className="w-4 h-4 text-white shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-white shrink-0" />
              )}
              <span>{t.message}</span>
            </CToastBody>
          </div>
        </CToast>
      ))}
    </CToaster>
  );
}
