import { lazy, Suspense } from "react";

import PageLoader from "../Components/Common/PageLoader";

const Dashboard = lazy(() => import("../Pages/Dashboard/Dashboard"));
const LoginPage = lazy(() => import("../Pages/Login/LoginPage"));
const RegisterPage = lazy(() => import("../Pages/Register/RegisterPage"));
const AddSuperAdmin = lazy(() => {
  return import("../Components/SuperAdmin/AddSuperAdmin");
});
const EditSuperAdmin = lazy(() => {
  return import("../Components/SuperAdmin/EditSuperAdmin");
});
const SuperAdmin = lazy(() => {
  return import("../Components/SuperAdmin/SuperAdmin");
});
const ViewSuperAdmin = lazy(() => {
  return import("../Components/SuperAdmin/ViewSuperAdmin");
});
const AddInstitution = lazy(() => {
  return import("../Components/Institution/AddInstitution");
});
const EditInstitution = lazy(() => {
  return import("../Components/Institution/EditInstitution");
});
const Institution = lazy(() => {
  return import("../Components/Institution/Institution");
});
const ViewInstituion = lazy(() => {
  return import("../Components/Institution/ViewInstituion");
});
const AddPGAdmin = lazy(() => {
  return import("../Components/PGAdmin/AddPGAdmin");
});
const EditPGAdmin = lazy(() => {
  return import("../Components/PGAdmin/EditPGAdmin");
});
const PGAdmin = lazy(() => {
  return import("../Components/PGAdmin/PGAdmin");
});
const ViewPGAdmin = lazy(() => {
  return import("../Components/PGAdmin/ViewPGAdmin");
});

const withSuspense = (component) => {
  return (
    <Suspense fallback={<PageLoader />}>
      {component}
    </Suspense>
  );
};

export const loginRoute = withSuspense(<LoginPage />);

export const registerRoute = withSuspense(<RegisterPage />);

export const superAdminRoutes = [
  {
    path: "/super-admins",
    element: withSuspense(<SuperAdmin />),
  },
  {
    path: "/super-admins/add",
    element: withSuspense(<AddSuperAdmin />),
  },
  {
    path: "/super-admins/edit/:id",
    element: withSuspense(<EditSuperAdmin />),
  },
  {
    path: "/super-admins/view/:id",
    element: withSuspense(<ViewSuperAdmin />),
  },
];

export const institutionRoutes = [
  {
    path: "/institutions",
    element: withSuspense(<Institution />),
  },
  {
    path: "/institutions/add",
    element: withSuspense(<AddInstitution />),
  },
  {
    path: "/institutions/edit/:id",
    element: withSuspense(<EditInstitution />),
  },
  {
    path: "/institutions/view/:id",
    element: withSuspense(<ViewInstituion />),
  },
];

export const pgAdminRoutes = [
  {
    path: "/pg-admins",
    element: withSuspense(<PGAdmin />),
  },
  {
    path: "/pg-admins/add",
    element: withSuspense(<AddPGAdmin />),
  },
  {
    path: "/pg-admins/edit/:id",
    element: withSuspense(<EditPGAdmin />),
  },
  {
    path: "/pg-admins/view/:id",
    element: withSuspense(<ViewPGAdmin />),
  },
];

export const applicationRoutes = [
  {
    path: "/dashboard",
    element: withSuspense(<Dashboard />),
  },

  ...institutionRoutes,
  ...pgAdminRoutes,
  ...superAdminRoutes,
];
