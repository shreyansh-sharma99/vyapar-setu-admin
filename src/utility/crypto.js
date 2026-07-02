import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.SECRET_KEY || "default_secret_key";


export const encryptData = (data) => {
  if (!data) return '';
  const cipher = CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
  // Return URL-safe base64
  return cipher.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};


export const decryptData = (cipherText) => {
  try {
    if (!cipherText) return null;
    // Restore standard base64 from URL-safe format
    let base64 = cipherText.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += '='.repeat(4 - pad);
    }
    const bytes = CryptoJS.AES.decrypt(base64, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8) || null;
  } catch (error) {
    return null;
  }
};
