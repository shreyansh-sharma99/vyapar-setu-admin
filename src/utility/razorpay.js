/** Razorpay Checkout: load the script once, open it, and resolve with the payment (or reject on close / failure). */
const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loading = null;

export const loadCheckout = () => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Payment window did not load')));
      s.onerror = () => { loading = null; reject(new Error('Could not load the payment window. Check your internet and try again.')); };
      document.body.appendChild(s);
    });
  }
  return loading;
};

/**
 * Open checkout for an order (card / netbanking) or a subscription (UPI re-mandate).
 * Resolves { razorpayOrderId, razorpayPaymentId, razorpaySignature, razorpaySubscriptionId }.
 */
export const payWithRazorpay = async ({ keyId, orderId, subscriptionId, amount, currency = 'INR', name, description, prefill }) => {
  const Razorpay = await loadCheckout();
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: keyId,
      ...(orderId ? { order_id: orderId, amount, currency } : { subscription_id: subscriptionId }),
      name,
      description,
      prefill,
      theme: { color: '#4f46e5' },
      handler: (r) => resolve({
        razorpayOrderId: r.razorpay_order_id,
        razorpayPaymentId: r.razorpay_payment_id,
        razorpaySignature: r.razorpay_signature,
        razorpaySubscriptionId: r.razorpay_subscription_id,
      }),
      modal: { ondismiss: () => reject(Object.assign(new Error('Payment cancelled'), { cancelled: true })) },
    });
    rzp.on?.('payment.failed', (e) => reject(new Error(e?.error?.description || 'Payment failed')));
    rzp.open();
  });
};
