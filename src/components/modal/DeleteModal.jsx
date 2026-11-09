// Old API kept for existing pages (removed in U8); renders the Soft UI ConfirmDialog.
import { ConfirmDialog } from '@/components/ui/Overlay';

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  isLoading = false,
}) {
  return (
    <ConfirmDialog
      open={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmLabel="Delete"
      loadingLabel="Deleting..."
      loading={isLoading}
    />
  );
}
