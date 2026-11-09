import { useSyncExternalStore } from 'react';
import { ToastStack } from '@/components/ui';
import { subscribeToasts, getToasts } from './toast';

export default function PurchaseToaster() {
  const list = useSyncExternalStore(subscribeToasts, getToasts);
  return (
    <ToastStack toasts={list} />
  );
}
