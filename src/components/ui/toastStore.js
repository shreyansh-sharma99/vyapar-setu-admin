// App-wide toast queue. <Toaster /> (mounted once in main.jsx) renders it.
//   import { toast } from '@/components/ui';
//   toast.success('Purchase order saved');  toast.error(err.message);

let items = [];
let seq = 0;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function subscribeToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts() {
  return items;
}

function dismiss(id) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function show(message, { tone = 'success', duration = 3500 } = {}) {
  seq += 1;
  const id = seq;
  items = [...items, { id, message, tone }];
  emit();
  if (duration) setTimeout(() => dismiss(id), duration);
  return id;
}

export const toast = {
  show,
  dismiss,
  success: (message, opts) => show(message, { ...opts, tone: 'success' }),
  error: (message, opts) => show(message, { ...opts, tone: 'danger' }),
  warning: (message, opts) => show(message, { ...opts, tone: 'warning' }),
  info: (message, opts) => show(message, { ...opts, tone: 'info' }),
};
