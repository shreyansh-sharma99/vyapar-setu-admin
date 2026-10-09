import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { canAccessPath, getHomePath } from "./shopPermissions";
import { RouteAccessContext, useRouteAccess } from "./routeAccess";
import { fetchUserProfile } from "@/pages/login/services/userSlice";
import NoAccess from "@/components/layouts/NoAccess";

// Refresh the profile once per page load so role / permission / store changes made by
// the owner apply without logging out.
let profileRefreshRequested = false;

const PrivateRoute = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const parentAccess = useRouteAccess();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !profileRefreshRequested) {
      profileRefreshRequested = true;
      dispatch(fetchUserProfile());
    }
  }, [isAuthenticated, dispatch]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const allowed = canAccessPath(user, location.pathname);
  const homePath = getHomePath(user);

  // Nested use (PrivateRoute around a single page inside the layout): render the view here.
  if (parentAccess && !allowed) {
    return <NoAccess homePath={homePath} />;
  }

  // Top level (around Layout): Layout shows <NoAccess /> in place of the page, keeping
  // the sidebar and header.
  return (
    <RouteAccessContext.Provider value={{ allowed, homePath }}>
      {children}
    </RouteAccessContext.Provider>
  );
};

export default PrivateRoute;
