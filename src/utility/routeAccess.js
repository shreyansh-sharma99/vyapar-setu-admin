import { createContext, useContext } from 'react';

/**
 * Set by PrivateRoute: `{ allowed, homePath }` for the current location.
 * Layout reads it and shows the "no access" view in place of the page, so the
 * sidebar and header stay visible.
 */
export const RouteAccessContext = createContext(null);

export const useRouteAccess = () => useContext(RouteAccessContext);
