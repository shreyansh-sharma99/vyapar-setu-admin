import createDocSlice from '../../components/createDocSlice';
import {
  getSuppliersApi,
  getSupplierByIdApi,
  createSupplierApi,
  updateSupplierApi,
  setSupplierStatusApi,
  deleteSupplierApi,
} from './supplierService';

const supplier = createDocSlice('supplier', {
  list: getSuppliersApi,
  get: getSupplierByIdApi,
  actions: {
    create: createSupplierApi,
    update: ({ id, payload }) => updateSupplierApi(id, payload),
    setStatus: ({ id, isActive }) => setSupplierStatusApi(id, isActive),
    remove: deleteSupplierApi,
  },
});

export const fetchSuppliers = supplier.fetchList;
export const fetchSupplier = supplier.fetchOne;
export const {
  create: createSupplier,
  update: updateSupplier,
  setStatus: setSupplierStatus,
  remove: deleteSupplier,
} = supplier.thunks;
export const { clearCurrent: clearCurrentSupplier } = supplier.actions;

export default supplier.reducer;
