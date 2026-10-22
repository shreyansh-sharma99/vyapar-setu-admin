import { encId } from '@/pages/purchase/components/helpers';

export const OPENING_PATH = '/inventory/opening-stock';
export const openingViewPath = (id) => `${OPENING_PATH}/view/${encId(id)}`;
export const openingEditPath = (id) => `${OPENING_PATH}/edit/${encId(id)}`;
