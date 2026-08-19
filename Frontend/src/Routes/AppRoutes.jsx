import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoutes from "./ProtectedRoutes";
import {
  applicationRoutes,
  loginRoute,
  registerRoute,
  publicSupportCreateRoute,
  publicSupportChatRoute,
  tenantMealTrackerRoute,
} from "./index";

const appRouter = createBrowserRouter([
  {
    path: "/",
    element: loginRoute,
  },
  {
    path: "/login",
    element: <Navigate to="/" replace />,
  },
  {
    path: "/register",
    element: registerRoute,
  },
  {
    path: "/support/new",
    element: publicSupportCreateRoute,
  },
  {
    path: "/support/chat/:userId",
    element: publicSupportChatRoute,
  },
  {
    path: "/meals",
    element: tenantMealTrackerRoute,
  },
  {
    element: <ProtectedRoutes />,
    children: applicationRoutes,
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default appRouter;
