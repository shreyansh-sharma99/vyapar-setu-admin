import { useEffect, useState } from 'react';
import apiClient from '@/utility/Http';

/*
 * The GST % rates a shop may choose — set by the platform in
 * Admin Owner → Master → Settings → GST Rates. GET /lookups/gst-rates → { rates }.
 * Loaded once per page load and shared by every screen that offers a GST %.
 */
let shared = null; // Promise<number[]>

const loadRates = () => {
  if (!shared) {
    shared = apiClient
      .get('/lookups/gst-rates')
      .then((res) => (Array.isArray(res.data?.data?.rates) ? res.data.data.rates.map(Number) : []))
      .catch((e) => {
        shared = null; // try again next time
        throw e;
      });
  }
  return shared;
};

/** @returns {{ rates: number[], options: { value: number, label: string }[], loading: boolean, error: string }} */
export default function useGstRates() {
  const [state, setState] = useState({ rates: [], loading: true, error: '' });
  useEffect(() => {
    let alive = true;
    loadRates()
      .then((rates) => alive && setState({ rates, loading: false, error: '' }))
      .catch(() => alive && setState({ rates: [], loading: false, error: 'Could not load the GST rates.' }));
    return () => {
      alive = false;
    };
  }, []);
  return { ...state, options: state.rates.map((r) => ({ value: r, label: `${r}%` })) };
}
