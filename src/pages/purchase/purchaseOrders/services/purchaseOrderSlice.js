import createDocSlice from '../../components/createDocSlice';
import {
  getPurchaseOrdersApi,
  getPurchaseOrderByIdApi,
  createPurchaseOrderApi,
  updatePurchaseOrderApi,
  setPurchaseOrderStatusApi,
  cancelPurchaseOrderApi,
  deletePurchaseOrderApi,
} from './purchaseOrderService';

const purchaseOrder = createDocSlice('purchaseOrder', {
  list: getPurchaseOrdersApi,
  get: getPurchaseOrderByIdApi,
  actions: {
    create: createPurchaseOrderApi,
    update: ({ id, payload }) => updatePurchaseOrderApi(id, payload),
    setStatus: ({ id, status }) => setPurchaseOrderStatusApi(id, status),
    cancel: ({ id, reason }) => cancelPurchaseOrderApi(id, reason),
    remove: deletePurchaseOrderApi,
  },
});

export const fetchPurchaseOrders = purchaseOrder.fetchList;
export const fetchPurchaseOrder = purchaseOrder.fetchOne;
export const {
  create: createPurchaseOrder,
  update: updatePurchaseOrder,
  setStatus: setPurchaseOrderStatus,
  cancel: cancelPurchaseOrder,
  remove: deletePurchaseOrder,
} = purchaseOrder.thunks;
export const { clearCurrent: clearCurrentPurchaseOrder } = purchaseOrder.actions;

export default purchaseOrder.reducer;
