import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Settings, Loader2, X } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import { fetchSettings, updateSettings } from '../services/settingsSlice';
import Switch from '@/components/inputs/Switch';
import { Label } from '@/components/inputs/Label';
import Loader from '@/components/loader/loader';
import { formatDateWithTiming } from '@/utility/dateTiming';

export default function SettingsModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { settings, loading, updateLoading } = useSelector((state) => state.settings);
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Form State
  const [lowStockAlertThreshold, setLowStockAlertThreshold] = useState(10);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');
  const [blockInvoiceOnCreditLimit, setBlockInvoiceOnCreditLimit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setIsClosing(false);
      dispatch(fetchSettings());
    } else if (isMounted) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMounted, dispatch]);

  useEffect(() => {
    if (settings) {
      setLowStockAlertThreshold(settings.lowStockAlertThreshold || 10);
      setRazorpayKeyId(settings.razorpayKeyId || '');
      setRazorpayKeySecret(settings.razorpayKeySecret || '');
      setRazorpayWebhookSecret(settings.razorpayWebhookSecret || '');
      setBlockInvoiceOnCreditLimit(settings.blockInvoiceOnCreditLimit || false);
    }
  }, [settings]);

  const handleClose = useCallback(() => {
    if (updateLoading) return;
    onClose();
  }, [updateLoading, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  const handleSave = async () => {
    const payload = {
      lowStockAlertThreshold: Number(lowStockAlertThreshold),
      razorpayKeyId,
      razorpayKeySecret,
      razorpayWebhookSecret,
      blockInvoiceOnCreditLimit,
    };
    await dispatch(updateSettings(payload));
    handleClose();
  };

  if (!isMounted && !isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[999999] flex items-center justify-center p-4 ${isClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isClosing ? 'modal-content-exit' : 'modal-content-enter'}`}
        style={{
          background: 'var(--vs-bg-primary)',
          border: '1px solid var(--vs-border)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--vs-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-indigo-500" />
            </div>
            <h1 className="!text-md font-semibold !text-blue-600 dark:text-blue-400 m-0">
              Settings
            </h1>
          </div>
          <button onClick={handleClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
            <X className="w-5 h-5 text-red-500 transition-colors" />
          </button>
        </div>

        <div className="px-6 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <Label className="block mb-1">
                    Low Stock Alert Threshold
                  </Label>
                  <Input
                    type="number"
                    value={lowStockAlertThreshold}
                    onChange={(e) => setLowStockAlertThreshold(e.target.value)}
                    placeholder="Enter threshold"
                  />
                </div>

                <div>
                  <Label className="block mb-1">
                    Razorpay Key ID
                  </Label>
                  <Input
                    type="text"
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    placeholder="Enter Key ID"
                  />
                </div>

                <div>
                  <Label className="block mb-1">
                    Razorpay Key Secret
                  </Label>
                  <Input
                    type="text"
                    value={razorpayKeySecret}
                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                    placeholder="Enter Key Secret"
                  />
                </div>

                <div>
                  <Label className="block mb-1">
                    Razorpay Webhook Secret
                  </Label>
                  <Input
                    type="text"
                    value={razorpayWebhookSecret}
                    onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                    placeholder="Enter Webhook Secret"
                  />
                </div>

                <div className="col-span-2 flex items-center justify-between mt-2 p-3 rounded-xl border" style={{ borderColor: 'var(--vs-border)', backgroundColor: 'var(--vs-bg-secondary)' }}>
                  <Label>
                    Block Invoice On Credit Limit
                  </Label>
                  <Switch
                    checked={blockInvoiceOnCreditLimit}
                    onChange={(val) => setBlockInvoiceOnCreditLimit(val)}
                  />
                </div>
              </div>

              {settings?.createdAt && (
                <div className="flex justify-between items-center text-xs mt-4 pt-4 border-t -mx-6 px-6" style={{ borderColor: 'var(--vs-border)', color: 'var(--vs-text-secondary)' }}>
                  <p>Created At: {formatDateWithTiming(settings.createdAt)}</p>
                  <p>Updated At: {formatDateWithTiming(settings.updatedAt)}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-white/5"
          style={{ borderTop: '1px solid var(--vs-border)' }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={updateLoading || loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={updateLoading || loading}
            startIcon={updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          >
            {updateLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
