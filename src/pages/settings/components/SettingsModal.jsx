import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Settings, Eye, EyeOff } from 'lucide-react';
import { Alert, Button, Field, FormGrid, Input, Modal, Section, SettingRow, Spinner, Switch } from '@/components/ui';
import { fetchSettings, updateSettings } from '../services/settingsSlice';
import { formatDateWithTiming } from '@/utility/dateTiming';

/** Password-style input with a show / hide toggle, for secrets. */
function SecretInput({ value, onChange, placeholder, label, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete="new-password"
      spellCheck={false}
      className="pr-12"
      endIcon={
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          title={visible ? 'Hide' : 'Show'}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      }
    />
  );
}

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
  const [salesReturnWindowDays, setSalesReturnWindowDays] = useState(7);
  const [barcodeHoldDays, setBarcodeHoldDays] = useState(20);

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
      setSalesReturnWindowDays(settings.salesReturnWindowDays ?? 7);
      setBarcodeHoldDays(settings.barcodeHoldDays ?? 20);
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

  // Barcode hold days can never be less than Sales return days (the server checks the same).
  const returnDaysNum = Number(salesReturnWindowDays);
  const holdDaysNum = Number(barcodeHoldDays);
  const daysError = !Number.isInteger(returnDaysNum) || returnDaysNum < 0 || returnDaysNum > 365
    ? 'Sales return days must be a whole number from 0 to 365.'
    : !Number.isInteger(holdDaysNum) || holdDaysNum < 1 || holdDaysNum > 365
      ? 'Barcode hold days must be a whole number from 1 to 365.'
      : holdDaysNum < returnDaysNum
        ? `Barcode hold days (${holdDaysNum}) cannot be less than Sales return days (${returnDaysNum}).`
        : '';

  const handleSave = async () => {
    if (daysError) return;
    const payload = {
      lowStockAlertThreshold: Number(lowStockAlertThreshold),
      razorpayKeyId,
      razorpayKeySecret,
      razorpayWebhookSecret,
      blockInvoiceOnCreditLimit,
      salesReturnWindowDays: returnDaysNum,
      barcodeHoldDays: holdDaysNum,
    };
    await dispatch(updateSettings(payload));
    handleClose();
  };

  if (!isMounted && !isOpen) return null;

  return (
    <Modal
      open={isMounted || isOpen}
      onClose={handleClose}
      size="lg"
      className={isClosing ? 'modal-content-exit' : undefined}
      bodyClassName="bg-page"
      title={
        <span className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-control bg-brand-soft text-brand-ink">
            <Settings className="size-5" />
          </span>
          Settings
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={updateLoading || loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !!daysError} loading={updateLoading}>
            {updateLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner label="Loading settings…" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Section title="Stock">
            <FormGrid cols={2}>
              <Field label="Low Stock Alert Threshold">
                <Input
                  type="number"
                  value={lowStockAlertThreshold}
                  onChange={(e) => setLowStockAlertThreshold(e.target.value)}
                  placeholder="Enter threshold"
                />
              </Field>
            </FormGrid>
          </Section>

          <Section title="Returns & barcodes">
            <FormGrid cols={2}>
              <Field label="Sales return days" hint="A sale can be returned (or voided) for this many days after the invoice date.">
                <Input type="number" min="0" max="365" step="1" value={salesReturnWindowDays} onChange={(e) => setSalesReturnWindowDays(e.target.value)} invalid={!!daysError} />
              </Field>
              <Field label="Barcode hold days" hint="After a barcode's stock is fully 0, it stays blocked for other products this many days. Cannot be less than Sales return days.">
                <Input type="number" min="1" max="365" step="1" value={barcodeHoldDays} onChange={(e) => setBarcodeHoldDays(e.target.value)} invalid={!!daysError} />
              </Field>
            </FormGrid>
            {daysError && <Alert tone="danger" className="mt-4">{daysError}</Alert>}
          </Section>

          <Section title="Razorpay">
            <FormGrid cols={2}>
              <Field label="Razorpay Key ID" className="md:col-span-2">
                <Input
                  type="text"
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="Enter Key ID"
                />
              </Field>
              <Field label="Razorpay Key Secret">
                <SecretInput
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  placeholder="Enter Key Secret"
                  label="key secret"
                />
              </Field>
              <Field label="Razorpay Webhook Secret">
                <SecretInput
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  placeholder="Enter Webhook Secret"
                  label="webhook secret"
                />
              </Field>
            </FormGrid>
          </Section>

          <Section title="Credit">
            <SettingRow title="Block Invoice On Credit Limit">
              <Switch
                checked={blockInvoiceOnCreditLimit}
                onChange={(val) => setBlockInvoiceOnCreditLimit(val)}
              />
            </SettingRow>
          </Section>

          {settings?.createdAt && (
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-ink-subtle">
              <span>Created At: {formatDateWithTiming(settings.createdAt)}</span>
              <span>Updated At: {formatDateWithTiming(settings.updatedAt)}</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
