import { useEffect, useState } from 'react';
import apiClient from '@/utility/Http';

// ─── Dated pricing reports: batches, profit, price audit ─────────────────────

/** GET /reports/batch-sales?productId&storeId&dateFrom&dateTo → { product, rows, totals } */
export const getBatchSalesApi = async (params) => (await apiClient.get('/reports/batch-sales', { params })).data;

/** GET /reports/profit?groupBy=invoice|product|day&dateFrom&dateTo → { rows, totals, withoutCost } */
export const getProfitApi = async (params) => (await apiClient.get('/reports/profit', { params })).data;

/** GET /reports/price-history?productId&kind&dateFrom&dateTo → { rows, total, truncated } */
export const getPriceHistoryApi = async (params) => (await apiClient.get('/reports/price-history', { params })).data;

/** GET /reports/price-overrides?dateFrom&dateTo&by → { rows, people, totals } */
export const getPriceOverridesApi = async (params) => (await apiClient.get('/reports/price-overrides', { params })).data;

/** ₹1,234.50 */
export const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Current Indian financial year (1 Apr – 31 Mar) as YYYY-MM-DD strings. */
export const currentFy = () => {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { dateFrom: `${start}-04-01`, dateTo: `${start + 1}-03-31` };
};

/**
 * Loads a report for `params` (skipped while `params` is null).
 * @returns {{ data, loading, error }}
 */
export const useReportData = (fetcher, params) => {
  const key = params ? JSON.stringify(params) : null;
  const [state, setState] = useState({ key: null, data: null, error: '' });

  useEffect(() => {
    if (key === null) return undefined;
    let alive = true;
    fetcher(JSON.parse(key))
      .then((res) => {
        if (alive) setState({ key, data: res?.data || null, error: '' });
      })
      .catch((err) => {
        if (alive) setState({ key, data: null, error: err?.response?.data?.message || 'Could not load the report' });
      });
    return () => {
      alive = false;
    };
  }, [fetcher, key]);

  const fresh = state.key === key;
  return { data: state.data, loading: key !== null && !fresh, error: fresh ? state.error : '' };
};
