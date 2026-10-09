import useApi from './useApi';
import { getSupplierApi } from './lookupService';

/** Full supplier (with payableBalance, terms, state) for the given id. */
export default function useSupplierInfo(supplierId) {
  const { data, loading, lastData } = useApi(supplierId ? `supplier:${supplierId}` : null, () => getSupplierApi(supplierId));
  const info = data || (lastData && lastData._id === supplierId ? lastData : null);
  return { info, loading };
}
