import createDocSlice from '../../components/createDocSlice';
import { getPaymentsOutApi, getPaymentOutByIdApi, createPaymentOutApi, cancelPaymentOutApi } from './paymentOutService';

const paymentOut = createDocSlice('paymentOut', {
  list: getPaymentsOutApi,
  get: getPaymentOutByIdApi,
  actions: {
    create: createPaymentOutApi,
    cancel: ({ id, reason }) => cancelPaymentOutApi(id, reason),
  },
});

export const fetchPaymentsOut = paymentOut.fetchList;
export const fetchPaymentOut = paymentOut.fetchOne;
export const { create: createPaymentOut, cancel: cancelPaymentOut } = paymentOut.thunks;
export const { clearCurrent: clearCurrentPaymentOut } = paymentOut.actions;

export default paymentOut.reducer;
