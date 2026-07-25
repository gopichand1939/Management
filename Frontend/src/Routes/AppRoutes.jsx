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
    element: <ProtectedRoutes />,
    children: applicationRoutes,
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default appRouter;
