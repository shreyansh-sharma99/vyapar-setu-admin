import createDocSlice from '../../components/createDocSlice';
import {
  getPurchaseReturnsApi,
  getPurchaseReturnByIdApi,
  createPurchaseReturnApi,
  updatePurchaseReturnApi,
  confirmPurchaseReturnApi,
  cancelPurchaseReturnApi,
  deletePurchaseReturnApi,
} from './purchaseReturnService';

const purchaseReturn = createDocSlice('purchaseReturn', {
  list: getPurchaseReturnsApi,
  get: getPurchaseReturnByIdApi,
  actions: {
    create: createPurchaseReturnApi,
    update: ({ id, payload }) => updatePurchaseReturnApi(id, payload),
    confirm: confirmPurchaseReturnApi,
    cancel: ({ id, reason }) => cancelPurchaseReturnApi(id, reason),
    remove: deletePurchaseReturnApi,
  },
});

export const fetchPurchaseReturns = purchaseReturn.fetchList;
export const fetchPurchaseReturn = purchaseReturn.fetchOne;
export const {
  create: createPurchaseReturn,
  update: updatePurchaseReturn,
  confirm: confirmPurchaseReturn,
  cancel: cancelPurchaseReturn,
  remove: deletePurchaseReturn,
} = purchaseReturn.thunks;
export const { clearCurrent: clearCurrentPurchaseReturn } = purchaseReturn.actions;

export default purchaseReturn.reducer;
