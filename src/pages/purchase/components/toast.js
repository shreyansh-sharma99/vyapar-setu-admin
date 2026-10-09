// Tiny toast store shared by the purchase pages. `notify()` can be called from
// anywhere (handlers, thunk callbacks, before navigating) and the message
// survives route changes because it lives outside React.

let toasts = [];
const listeners = new Set();
let seq = 0;

const emit = () => listeners.forEach((l) => l());

export const notify = (message, color = 'success') => {
  if (!message) return;
  seq += 1;
  const id = seq;
  toasts = [...toasts, { id, message, color }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3500);
};

export const notifyError = (message) => notify(message, 'danger');

export const subscribeToasts = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getToasts = () => toasts;
