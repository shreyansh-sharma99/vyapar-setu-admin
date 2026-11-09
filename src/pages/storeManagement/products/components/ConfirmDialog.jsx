import { useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

// Old max-w-* prop → ui Modal width.
const SIZE_FOR_WIDTH = { 'max-w-xs': 'sm', 'max-w-sm': 'sm', 'max-w-md': 'md', 'max-w-lg': 'md', 'max-w-xl': 'lg', 'max-w-2xl': 'lg' };

/**
 * Confirm modal with an icon and a free-form message (string or JSX), on the ui Modal.
 * Props unchanged: isOpen, onClose, onConfirm, title, message, confirmText, loadingText, isLoading, icon (element), maxWidth.
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  loadingText = 'Working...',
  isLoading = false,
  icon,
  maxWidth = 'max-w-sm', // wider for dialogs with a list
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isLoading, onClose]);

  const close = () => {
    if (!isLoading) onClose();
  };

  return (
    <Modal
      open={!!isOpen}
      onClose={close}
      size={SIZE_FOR_WIDTH[maxWidth] ?? 'lg'}
      hideClose
      closeOnBackdrop={!isLoading}
      className="print:hidden"
      bodyClassName="pt-6"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1" data-autofocus>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={isLoading} className="flex-1">
            {isLoading ? loadingText : confirmText}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <span className="mb-4 grid size-12 place-items-center rounded-full bg-brand-soft text-brand-ink [&_svg]:size-6">
          {icon || <HelpCircle className="w-6 h-6" />}
        </span>
        <h2 className="m-0 mb-2 !text-lg !font-extrabold text-ink">{title}</h2>
        {message && <div className="w-full text-sm text-ink-muted">{message}</div>}
      </div>
    </Modal>
  );
}
