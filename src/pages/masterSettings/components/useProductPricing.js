import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/pages/storeManagement/products/utils/productUtils';
import { getProductPricingApi } from '../services/priceMasterService';

/**
 * Price timeline + offers of one product (GET /products/:id/prices).
 * Bump `reloadKey` (or call `reload`) to fetch again.
 * @returns {{ data, loading, error, reload }}
 */
export default function useProductPricing(productId, reloadKey = 0) {
  const [localKey, setLocalKey] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: '' });
  const loadKey = `${productId}:${reloadKey}:${localKey}`;

  useEffect(() => {
    if (!productId) return undefined;
    let cancelled = false;
    getProductPricingApi(productId)
      .then((res) => {
        if (!cancelled) setState({ key: loadKey, data: res?.data || null, error: '' });
      })
      .catch(async (err) => {
        const message = await getApiErrorMessage(err, 'Could not load the prices');
        if (!cancelled) setState({ key: loadKey, data: null, error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [productId, loadKey]);

  const reload = useCallback(() => setLocalKey((k) => k + 1), []);
  // Data from an earlier product is never shown for a new one.
  const sameProduct = state.key && state.key.startsWith(`${productId}:`);
  return {
    data: sameProduct ? state.data : null,
    loading: !!productId && state.key !== loadKey,
    error: sameProduct ? state.error : '',
    reload,
  };
}
