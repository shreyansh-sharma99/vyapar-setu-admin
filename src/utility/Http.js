import axios from 'axios';
import CryptoJS from 'crypto-js';
import { encryptData, decryptData } from './crypto';

const IS_ENCRYPTION = import.meta.env.VITE_IS_ENCRYPTION === 'true';
const HEX_KEY = import.meta.env.VITE_ENCRYPTION_KEY || '';

if (IS_ENCRYPTION && (!HEX_KEY || HEX_KEY.length !== 64)) {
  console.warn(
    '[ApiClient] Encryption is enabled, but VITE_ENCRYPTION_KEY is missing or invalid. ' +
    'Set VITE_ENCRYPTION_KEY to a 64 hex char string.'
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

/**
 * Unwrap a response data field if it is encrypted.
 */
export const parseResponse = (responseData) => {
  if (responseData?.isEncrypted && responseData?.encryptedPayload) {
    return _decrypt(responseData.encryptedPayload);
  }
  return responseData;
};

// ─── Axios Instance Setup ─────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Request Interceptor: Attach token & Encrypt body
apiClient.interceptors.request.use(
  (config) => {
    const encryptedToken = localStorage.getItem('_v_at');
    const token = encryptedToken ? decryptData(encryptedToken) : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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

// Response Interceptor: Decrypt body & Handle Refresh Token
apiClient.interceptors.response.use(
  (response) => {
    if (response.data?.data) {
      response.data.data = parseResponse(response.data.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Token Expiry)
    const isAuthRequest = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const encryptedRefreshToken = localStorage.getItem('_v_rt');
        const decryptedRefreshToken = encryptedRefreshToken ? decryptData(encryptedRefreshToken) : '';

        const refreshUrl = apiClient.defaults.baseURL?.endsWith('/admin')
          ? '/auth/refresh'
          : '/admin/auth/refresh';

        const { data } = await apiClient.post(refreshUrl, {
          refreshToken: decryptedRefreshToken || ''
        });
        const responseData = data?.data || data;
        const newToken = responseData?.accessToken;
        const newRefreshToken = responseData?.refreshToken;
        const userType = responseData?.userType;

        if (newToken) {
          localStorage.setItem('_v_at', encryptData(newToken));
        }
        if (newRefreshToken) {
          localStorage.setItem('_v_rt', encryptData(newRefreshToken));
        }
        if (userType) {
          localStorage.setItem('userType', userType);
        }
        apiClient.defaults.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (refreshError?.response?.status === 401) {
          localStorage.clear();
        } else {
          localStorage.removeItem('_v_at');
          localStorage.removeItem('_v_rt');
        }
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

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

export default apiClient;
