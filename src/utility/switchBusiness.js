import apiClient from '@/utility/Http';
import { encryptData } from '@/utility/crypto';
import { normalizeUser, persistUser } from '@/pages/login/services/authSlice';
import { switchBusinessApi } from '@/pages/business/services/businessService';
import { getHomePath } from '@/utility/shopPermissions';

/**
 * Open another business of this login. Stores its tokens and session like a login, then
 * reloads the app so every Redux slice and module cache starts clean for that business.
 */
export async function switchBusiness(businessId) {
  const res = await switchBusinessApi(businessId);
  const user = normalizeUser(res.data);
  localStorage.setItem('_v_at', encryptData(res.accessToken));
  localStorage.setItem('_v_rt', encryptData(res.refreshToken));
  persistUser(user);
  delete apiClient.defaults.headers.Authorization; // set by an earlier token refresh
  window.location.assign(getHomePath(user));
}
