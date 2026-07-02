import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Button from '@/components/inputs/Button';

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  isLoading = false
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setIsClosing(false);
    } else if (isMounted) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMounted]);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    onClose();
  }, [isLoading, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  if (!isMounted && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${isClosing ? 'modal-content-exit' : 'modal-content-enter'}`}
        style={{
          background: 'var(--vs-bg-primary)',
          border: '1px solid var(--vs-border)',
        }}
      >
        <div className="p-6 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--vs-text-primary)' }}>
            {title}
          </h2>
          <p className="text-sm" style={{ color: 'var(--vs-text-secondary)' }}>
            {message}
          </p>
        </div>

        <div
          className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-50 dark:bg-white/5"
          style={{ borderTop: '1px solid var(--vs-border)' }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
            startIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
