/** GSTIN checks, the same rules as the backend (utils/gst.js). */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const CH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The 15th character is a mod-36 check digit of the first 14. */
export const hasValidGstinChecksum = (gstin) => {
  const g = String(gstin || '').toUpperCase();
  if (!GSTIN_REGEX.test(g)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const p = CH.indexOf(g[i]) * (i % 2 ? 2 : 1);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return CH[(36 - (sum % 36)) % 36] === g[14];
};

/** Empty string when fine, else what is wrong. */
export const gstinProblem = (gstin) => {
  const g = String(gstin || '').trim().toUpperCase();
  if (!g) return '';
  if (!GSTIN_REGEX.test(g)) return 'Enter a valid 15-character GSTIN';
  if (!hasValidGstinChecksum(g)) return 'This GSTIN has a wrong check digit — please re-check it';
  return '';
};
