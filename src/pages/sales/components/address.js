/**
 * One line for an address snapshot: "street, city, state - pincode".
 * Empty parts are skipped; country only when it is not India. '' when nothing is filled.
 */
export const formatAddress = (addr) => {
  if (!addr) return '';
  const part = (v) => String(v || '').trim();
  const head = [addr.street, addr.city, addr.state].map(part).filter(Boolean).join(', ');
  const pin = part(addr.pincode);
  let line = pin ? (head ? `${head} - ${pin}` : pin) : head;
  const country = part(addr.country);
  if (line && country && country.toLowerCase() !== 'india') line += `, ${country}`;
  return line;
};

/** First address with something in it (snapshot first, then fallbacks). */
export const firstAddress = (...addrs) => addrs.map(formatAddress).find(Boolean) || '';

/** A customer's saved address (default one first). */
export const customerAddress = (customer) => {
  const list = Array.isArray(customer?.addresses) ? customer.addresses : [];
  return list.find((a) => a?.isDefault) || list[0] || null;
};
