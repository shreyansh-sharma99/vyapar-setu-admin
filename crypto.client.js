/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend Crypto Client  (CryptoJS — AES-256-CBC)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW IT WORKS
 * ─────────────
 * The encryption flag and key are read directly from your frontend environment
 * variables. No network requests are made to fetch configuration.
 *
 * INSTALL
 * ────────
 *   npm install crypto-js axios
 *
 * FRONTEND .env
 * ──────────────
 *   # Whether encryption is enabled (true/false)
 *   VITE_IS_ENCRYPTION=true                 ← Vite
 *   REACT_APP_IS_ENCRYPTION=true            ← CRA
 *
 *   # Same 64-char hex key as backend ENCRYPTION_KEY
 *   VITE_ENCRYPTION_KEY=<64-char-hex>       ← Vite
 *   REACT_APP_ENCRYPTION_KEY=<64-char-hex>  ← CRA
 *
 * USAGE (Vite / React / Next.js)
 * ──────────────────────────────
 *   // main.jsx or _app.jsx — run once at startup
 *   import { setupAxiosInterceptors } from './crypto.client';
 *   import axios from 'axios';
 *
 *   // Attach interceptors so axios handles encryption silently
 *   setupAxiosInterceptors(axios);
 *
 *   // Now just use axios normally — encryption is invisible
 *   const res = await axios.post('/api/v1/auth/login', { email, password });
 *   console.log(res.data.data); // already decrypted
 * ─────────────────────────────────────────────────────────────────────────────
 */

import CryptoJS from 'crypto-js';

// ─── Environment Setup ────────────────────────────────────────────────────────
const IS_ENCRYPTION =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_IS_ENCRYPTION === 'true') ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_IS_ENCRYPTION === 'true') ||
  false;

const HEX_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENCRYPTION_KEY) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_ENCRYPTION_KEY) ||
  '';

if (IS_ENCRYPTION && (!HEX_KEY || HEX_KEY.length !== 64)) {
  console.warn(
    '[CryptoClient] Encryption is enabled, but ENCRYPTION_KEY is missing or invalid. ' +
    'Set VITE_ENCRYPTION_KEY (Vite) or REACT_APP_ENCRYPTION_KEY (CRA) to a 64 hex char string.'
  );
}

const KEY = HEX_KEY && HEX_KEY.length === 64 ? CryptoJS.enc.Hex.parse(HEX_KEY) : null;

// ─── Core encrypt / decrypt ───────────────────────────────────────────────────

/**
 * Encrypt any JS value → "<iv_hex>:<ciphertext_base64>"
 */
const _encrypt = (payload) => {
  if (!KEY) throw new Error('Cannot encrypt: Key is missing.');
  
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), KEY, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.ciphertext.toString(CryptoJS.enc.Base64)}`;
};

/**
 * Decrypt "<iv_hex>:<ciphertext_base64>" → original JS value
 */
const _decrypt = (encryptedString) => {
  if (!KEY) throw new Error('Cannot decrypt: Key is missing.');

  const [ivHex, ciphertextBase64] = encryptedString.split(':');

  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertext = CryptoJS.enc.Base64.parse(ciphertextBase64);

  const decrypted = CryptoJS.AES.decrypt({ ciphertext }, KEY, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
};

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Wrap a request payload if encryption is enabled in frontend env.
 */
export const buildRequest = (payload) => {
  if (!IS_ENCRYPTION) {
    return payload;
  }
  return { encryptedPayload: _encrypt(payload) };
};

/**
 * Unwrap a response data field if it is encrypted.
 */
export const parseResponse = (responseData) => {
  if (responseData?.isEncrypted && responseData?.encryptedPayload) {
    return _decrypt(responseData.encryptedPayload);
  }
  return responseData;
};

// ─── Axios Interceptors (recommended) ────────────────────────────────────────

/**
 * Attach request + response interceptors to an axios instance.
 */
export const setupAxiosInterceptors = (axiosInstance) => {
  // ── Request: encrypt body ──────────────────────────────────────────────────
  axiosInstance.interceptors.request.use(
    (config) => {
      if (
        IS_ENCRYPTION &&
        config.data &&
        typeof config.data === 'object' &&
        Object.keys(config.data).length > 0
      ) {
        config.data = { encryptedPayload: _encrypt(config.data) };
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // ── Response: decrypt data ─────────────────────────────────────────────────
  axiosInstance.interceptors.response.use(
    (response) => {
      if (response.data?.data) {
        response.data.data = parseResponse(response.data.data);
      }
      return response;
    },
    (error) => {
      // Attempt to decrypt error response data if encrypted
      if (error.response?.data?.data) {
        try {
          error.response.data.data = parseResponse(error.response.data.data);
        } catch {
          // leave as-is if decryption fails
        }
      }
      return Promise.reject(error);
    }
  );
};
