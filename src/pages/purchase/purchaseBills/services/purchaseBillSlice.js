import createDocSlice from '../../components/createDocSlice';
import {
  getPurchaseBillsApi,
  getPurchaseBillByIdApi,
  createPurchaseBillApi,
  updatePurchaseBillApi,
  confirmPurchaseBillApi,
  cancelPurchaseBillApi,
  deletePurchaseBillApi,
} from './purchaseBillService';

const purchaseBill = createDocSlice('purchaseBill', {
  list: getPurchaseBillsApi,
  get: getPurchaseBillByIdApi,
  actions: {
    create: createPurchaseBillApi,
    update: ({ id, payload }) => updatePurchaseBillApi(id, payload),
    confirm: confirmPurchaseBillApi,
    cancel: ({ id, reason }) => cancelPurchaseBillApi(id, reason),
    remove: deletePurchaseBillApi,
  },
});

export const fetchPurchaseBills = purchaseBill.fetchList;
export const fetchPurchaseBill = purchaseBill.fetchOne;
export const {
  create: createPurchaseBill,
  update: updatePurchaseBill,
  confirm: confirmPurchaseBill,
  cancel: cancelPurchaseBill,
  remove: deletePurchaseBill,
} = purchaseBill.thunks;
export const { clearCurrent: clearCurrentPurchaseBill } = purchaseBill.actions;

export default purchaseBill.reducer;
