import createDocSlice from '../../components/createDocSlice';
import {
  getGoodsReceiptsApi,
  getGoodsReceiptByIdApi,
  createGoodsReceiptApi,
  updateGoodsReceiptApi,
  postGoodsReceiptApi,
  cancelGoodsReceiptApi,
  deleteGoodsReceiptApi,
} from './goodsReceiptService';

const goodsReceipt = createDocSlice('goodsReceipt', {
  list: getGoodsReceiptsApi,
  get: getGoodsReceiptByIdApi,
  actions: {
    create: createGoodsReceiptApi,
    update: ({ id, payload }) => updateGoodsReceiptApi(id, payload),
    post: postGoodsReceiptApi,
    cancel: ({ id, reason }) => cancelGoodsReceiptApi(id, reason),
    remove: deleteGoodsReceiptApi,
  },
});

export const fetchGoodsReceipts = goodsReceipt.fetchList;
export const fetchGoodsReceipt = goodsReceipt.fetchOne;
export const {
  create: createGoodsReceipt,
  update: updateGoodsReceipt,
  post: postGoodsReceipt,
  cancel: cancelGoodsReceipt,
  remove: deleteGoodsReceipt,
} = goodsReceipt.thunks;
export const { clearCurrent: clearCurrentGoodsReceipt } = goodsReceipt.actions;

export default goodsReceipt.reducer;
