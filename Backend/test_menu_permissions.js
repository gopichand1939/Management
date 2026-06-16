const pool = require("./Config/Database");
const { getMenusByRole } = require("./Menu/MenuModel");

// Mock MenuPermissions.jsx helpers
const MENU_CONFIG_BY_ID = {
  1: { route_path: "/dashboard", icon_key: "dashboard" },
  2: { route_path: "/super-admins", icon_key: "super_admin" },
  3: { route_path: "/institutions", icon_key: "institutions" },
  4: { route_path: "/pg-admins", icon_key: "pg_admin" },
  5: { route_path: null, icon_key: "user_management" },
  6: { route_path: null, icon_key: "institutions" },
  7: { route_path: null, icon_key: "institutions" },
  8: { route_path: null, icon_key: "tenant_management" },
  9: { route_path: "/tenant/onboarding", icon_key: "tenant_onboarding" },
  10: { route_path: "/tenant/active", icon_key: "tenant_management" },
  11: { route_path: "/tenant/vacant-beds", icon_key: "tenant_vacant_beds" },
  12: { route_path: "/tenant/payments", icon_key: "tenant_payments" },
  13: { route_path: "/tenant/vacated", icon_key: "tenant_vacated" },
  14: { route_path: "/tenant/history", icon_key: "tenant_history" },
  100: { route_path: null, icon_key: "expense_management" },
  101: { route_path: "/expenses/daily", icon_key: "daily_expenses" },
};

const MENU_CONFIG_BY_NAME = {
  dashboard: { route_path: "/dashboard", icon_key: "dashboard" },
  "super admin": { route_path: "/super-admins", icon_key: "super_admin" },
  institutions: { route_path: "/institutions", icon_key: "institutions" },
  institutionmanagement: { route_path: null, icon_key: "institutions" },
  "institution management": { route_path: null, icon_key: "institutions" },
  "institution master": { route_path: "/institutions", icon_key: "institutions" },
  "institution availability": { route_path: null, icon_key: "institutions" },
  "pg admin": { route_path: "/pg-admins", icon_key: "pg_admin" },
  tenantmanagement: { route_path: null, icon_key: "tenant_management" },
  "tenant management": { route_path: null, icon_key: "tenant_management" },
  "tenant onboarding": { route_path: "/tenant/onboarding", icon_key: "tenant_onboarding" },
  "active tenants": { route_path: "/tenant/active", icon_key: "tenant_management" },
  "vacant beds": { route_path: "/tenant/vacant-beds", icon_key: "tenant_vacant_beds" },
  payments: { route_path: "/tenant/payments", icon_key: "tenant_payments" },
  "vacated history": { route_path: "/tenant/vacated", icon_key: "tenant_vacated" },
  "tenant history": { route_path: "/tenant/history", icon_key: "tenant_history" },
  usermanagement: { route_path: null, icon_key: "user_management" },
  "user management": { route_path: null, icon_key: "user_management" },
  expensemanagement: { route_path: null, icon_key: "expense_management" },
  "expense management": { route_path: null, icon_key: "expense_management" },
  "daily expenses": { route_path: "/expenses/daily", icon_key: "daily_expenses" },
};

const normalizeMenuName = (menuName) => {
  return String(menuName || "").trim().toLowerCase();
};

const normalizeActionName = (actionName) => {
  return String(actionName || "").trim().toLowerCase();
};

const getMenuMeta = (menu) => {
  return (
    MENU_CONFIG_BY_ID[menu?.menu_id] ||
    MENU_CONFIG_BY_NAME[normalizeMenuName(menu?.menu_name)] ||
    { route_path: null, icon_key: "dashboard" }
  );
};

const getUserMenus = (user) => {
  return [...(user?.menus || [])]
    .map((menu) => ({
      ...menu,
      ...getMenuMeta(menu),
    }))
    .sort((firstMenu, secondMenu) => {
      return (firstMenu.priority || 0) - (secondMenu.priority || 0);
    });
};

const getDefaultRoute = (user) => {
  const menus = getUserMenus(user);
  const hasDashboard = menus.some((menu) => menu.route_path === "/dashboard");
  if (hasDashboard) {
    return "/dashboard";
  }
  const firstMenu = menus.find((menu) => menu.route_path);
  return firstMenu?.route_path || "/dashboard";
};

const getRequiredActionForPath = (pathname) => {
  if (pathname === "/dashboard") {
    return "view";
  }
  if (pathname.endsWith("/add")) {
    return "create";
  }
  if (pathname.includes("/edit/")) {
    return "edit";
  }
  if (pathname.includes("/view/")) {
    return "view";
  }
  return "list";
};

const getMenuByRoute = (user, pathname) => {
  const menus = getUserMenus(user).filter((menu) => menu.route_path);
  return menus
    .sort((firstMenu, secondMenu) => {
      return secondMenu.route_path.length - firstMenu.route_path.length;
    })
    .find((menu) => {
      return (
        pathname === menu.route_path ||
        pathname.startsWith(`${menu.route_path}/`)
      );
    });
};

const hasMenuAction = (user, routePath, actionName) => {
  const menu = getUserMenus(user).find((menuItem) => {
    return menuItem.route_path === routePath;
  });
  if (!menu) {
    return false;
  }
  return menu.actions?.some((action) => {
    return normalizeActionName(action.action_name) === normalizeActionName(actionName);
  });
};

const isPathAllowedForUser = (user, pathname) => {
  const menu = getMenuByRoute(user, pathname);
  if (!menu) {
    return false;
  }
  return hasMenuAction(user, menu.route_path, getRequiredActionForPath(pathname));
};

const runTest = async () => {
    const menus = await getMenusByRole("super_admin");
    const user = { role: "super_admin", menus };

    console.log("=== TEST RESULTS ===");
    const defaultRoute = getDefaultRoute(user);
    console.log("getDefaultRoute(user) result:", defaultRoute);

    const isDashboardAllowed = isPathAllowedForUser(user, "/dashboard");
    console.log("isPathAllowedForUser(user, '/dashboard') result:", isDashboardAllowed);

    const isSuperAdminAllowed = isPathAllowedForUser(user, "/super-admins");
    console.log("isPathAllowedForUser(user, '/super-admins') result:", isSuperAdminAllowed);

    pool.end();
};

runTest().catch(err => {
    console.error(err);
    pool.end();
});
