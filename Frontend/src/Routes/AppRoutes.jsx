import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoutes from "./ProtectedRoutes";
import {
  applicationRoutes,
  loginRoute,
  registerRoute,
} from "./index";

const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: loginRoute,
  },
  {
    path: "/register",
    element: registerRoute,
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
