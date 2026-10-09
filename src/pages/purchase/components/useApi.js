import { useEffect, useRef, useState } from 'react';
import { errMsg } from './helpers';

/**
 * Loads data for a key. A `null` key skips loading. When the key changes the
 * fetcher runs again; `reload()` re-runs it for the same key.
 */
export default function useApi(key, fetcher) {
  const [nonce, setNonce] = useState(0);
  const fullKey = key === null || key === undefined ? null : `${key}#${nonce}`;
  const [state, setState] = useState({ key: null, data: null, error: null });
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (fullKey === null) return undefined;
    let alive = true;
    Promise.resolve()
      .then(() => fetcherRef.current())
      .then((data) => {
        if (alive) setState({ key: fullKey, data, error: null });
      })
      .catch((e) => {
        if (alive) setState({ key: fullKey, data: null, error: errMsg(e) });
      });
    return () => {
      alive = false;
    };
  }, [fullKey]);

  const fresh = state.key === fullKey;
  return {
    data: fresh ? state.data : null,
    lastData: state.data,
    error: fresh ? state.error : null,
    loading: fullKey !== null && !fresh,
    reload: () => setNonce((n) => n + 1),
  };
}
