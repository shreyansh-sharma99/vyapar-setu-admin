import { useEffect } from 'react';
import { HelpCircle, Loader2 } from 'lucide-react';
import Button from '@/components/inputs/Button';

/** Simple confirm modal in the same style as DeleteModal. */
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
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop-enter print:hidden"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden modal-content-enter"
        style={{ background: 'var(--vs-bg-primary)', border: '1px solid var(--vs-border)' }}
      >
        <div className="p-6 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-500">
            {icon || <HelpCircle className="w-6 h-6" />}
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--vs-text-primary)' }}>
            {title}
          </h2>
          {message && (
            <div className="text-sm" style={{ color: 'var(--vs-text-secondary)' }}>
              {message}
            </div>
          )}
        </div>
        <div
          className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-50 dark:bg-white/5"
          style={{ borderTop: '1px solid var(--vs-border)' }}
        >
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
            startIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          >
            {isLoading ? loadingText : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
