import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';

/** Active stores for "deliver to / receive into" pickers. */
export default function useStores() {
  const dispatch = useDispatch();
  const stores = useSelector((state) => state.store?.stores);
  const loading = useSelector((state) => state.store?.loading);

  useEffect(() => {
    dispatch(getStores());
  }, [dispatch]);

  return useMemo(() => {
    const list = (stores || []).filter((s) => s.isActive !== false && s.status !== 'inactive');
    const options = list.map((s) => ({
      value: s._id,
      label: `${s.name}${s.code ? ` [${s.code}]` : ''}${s.isDefault ? ' (Default)' : ''}`,
    }));
    const defaultId = (list.find((s) => s.isDefault) || list[0])?._id || '';
    return { stores: list, options, defaultId, loading: !!loading };
  }, [stores, loading]);
}
