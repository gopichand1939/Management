import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import {
  getDefaultRoute,
  isPathAllowedForUser,
} from "../Utils/MenuPermissions";

const ProtectedRoutes = () => {
  const location = useLocation();
  const { authUser, token } = useSelector((state) => state.user);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (authUser && !isPathAllowedForUser(authUser, location.pathname)) {
    return <Navigate to={getDefaultRoute(authUser)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;
