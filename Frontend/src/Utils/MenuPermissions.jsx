export const MENU_ACTIONS = {
  CREATE: "create",
  EDIT: "edit",
  VIEW: "view",
  DELETE: "delete",
  LIST: "list",
  APPROVE: "approve",
  REJECT: "reject",
};

const MENU_CONFIG_BY_ID = {
  1: { route_path: "/dashboard", icon_key: "dashboard" },
  2: { route_path: "/super-admins", icon_key: "super_admin" },
  3: { route_path: "/institutions", icon_key: "institutions" },
  4: { route_path: "/pg-admins", icon_key: "pg_admin" },
  5: { route_path: null, icon_key: "user_management" },
  6: { route_path: null, icon_key: "institutions" },
  8: { route_path: null, icon_key: "tenant_management" },
  9: { route_path: "/tenant/onboarding", icon_key: "tenant_onboarding" },
  10: { route_path: "/tenant/active", icon_key: "tenant_management" },
  11: { route_path: "/tenant/vacant-beds", icon_key: "tenant_vacant_beds" },
  12: { route_path: "/tenant/payments", icon_key: "tenant_payments" },
  13: { route_path: "/tenant/vacated", icon_key: "tenant_vacated" },
  14: { route_path: "/tenant/history", icon_key: "tenant_history" },
  15: { route_path: "/tenant/payment-reminders", icon_key: "payment_reminders" },
  100: { route_path: null, icon_key: "expense_management" },
  101: { route_path: "/expenses/daily", icon_key: "daily_expenses" },
  104: { route_path: "/expense/meal-type-master", icon_key: "meal_type_master" },
  105: { route_path: "/expense/weekly-food-menu", icon_key: "weekly_food_menu" },
  102: { route_path: null, icon_key: "inventory_management" },
  103: { route_path: "/inventory", icon_key: "inventory_management" },
  200: { route_path: null, icon_key: "ration_inventory" },
  201: { route_path: "/ration-inventory/category-master", icon_key: "category_master" },
  202: { route_path: "/ration-inventory/item-master", icon_key: "item_master" },
  203: { route_path: "/ration-inventory/unit-master", icon_key: "unit_master" },
  204: { route_path: "/ration-inventory/supplier-master", icon_key: "supplier_master" },
  205: { route_path: "/ration-inventory/purchases", icon_key: "purchases" },
  206: { route_path: "/ration-inventory/current-stock", icon_key: "current_stock" },
  207: { route_path: "/ration-inventory/kitchen-request", icon_key: "kitchen_request" },
  208: { route_path: "/ration-inventory/stock-issue", icon_key: "stock_issue" },
  209: { route_path: "/ration-inventory/stock-adjustment", icon_key: "stock_adjustment" },
  210: { route_path: "/ration-inventory/stock-audit", icon_key: "stock_audit" },
  211: { route_path: "/ration-inventory/inventory-dashboard", icon_key: "inventory_dashboard" },
  212: { route_path: "/ration-inventory/qr-labels", icon_key: "qr_labels" },
};

const MENU_CONFIG_BY_NAME = {
  "ration management": { route_path: "/ration-management", icon_key: "ration_management" },
  dashboard: { route_path: "/dashboard", icon_key: "dashboard" },
  "super admin": { route_path: "/super-admins", icon_key: "super_admin" },
  institutions: { route_path: "/institutions", icon_key: "institutions" },
  institutionmanagement: { route_path: null, icon_key: "institutions" },
  "institution management": { route_path: null, icon_key: "institutions" },
  "institution master": { route_path: "/institutions", icon_key: "institutions" },
  "pg admin": { route_path: "/pg-admins", icon_key: "pg_admin" },
  tenantmanagement: { route_path: null, icon_key: "tenant_management" },
  "tenant management": { route_path: null, icon_key: "tenant_management" },
  "tenant onboarding": { route_path: "/tenant/onboarding", icon_key: "tenant_onboarding" },
  "active tenants": { route_path: "/tenant/active", icon_key: "tenant_management" },
  "vacant beds": { route_path: "/tenant/vacant-beds", icon_key: "tenant_vacant_beds" },
  payments: { route_path: "/tenant/payments", icon_key: "tenant_payments" },
  "payment reminders": { route_path: "/tenant/payment-reminders", icon_key: "payment_reminders" },
  "vacated history": { route_path: "/tenant/vacated", icon_key: "tenant_vacated" },
  "tenant history": { route_path: "/tenant/history", icon_key: "tenant_history" },
  usermanagement: { route_path: null, icon_key: "user_management" },
  "user management": { route_path: null, icon_key: "user_management" },
  expensemanagement: { route_path: null, icon_key: "expense_management" },
  "expense management": { route_path: null, icon_key: "expense_management" },
  "daily expenses": { route_path: "/expenses/daily", icon_key: "daily_expenses" },
  "meal type master": { route_path: "/expense/meal-type-master", icon_key: "meal_type_master" },
  "weekly food menu configuration": { route_path: "/expense/weekly-food-menu", icon_key: "weekly_food_menu" },
  inventorymanagement: { route_path: null, icon_key: "inventory_management" },
  "inventory management": { route_path: null, icon_key: "inventory_management" },
  "inventory master": { route_path: "/inventory", icon_key: "inventory_management" },
  "ration inventory": { route_path: null, icon_key: "ration_inventory" },
  "category master": { route_path: "/ration-inventory/category-master", icon_key: "category_master" },
  "item master": { route_path: "/ration-inventory/item-master", icon_key: "item_master" },
  "unit master": { route_path: "/ration-inventory/unit-master", icon_key: "unit_master" },
  "supplier master": { route_path: "/ration-inventory/supplier-master", icon_key: "supplier_master" },
  "purchases": { route_path: "/ration-inventory/purchases", icon_key: "purchases" },
  "current stock": { route_path: "/ration-inventory/current-stock", icon_key: "current_stock" },
  "kitchen request": { route_path: "/ration-inventory/kitchen-request", icon_key: "kitchen_request" },
  "stock issue": { route_path: "/ration-inventory/stock-issue", icon_key: "stock_issue" },
  "stock adjustment": { route_path: "/ration-inventory/stock-adjustment", icon_key: "stock_adjustment" },
  "stock audit": { route_path: "/ration-inventory/stock-audit", icon_key: "stock_audit" },
  "inventory dashboard": { route_path: "/ration-inventory/inventory-dashboard", icon_key: "inventory_dashboard" },
  "qr labels": { route_path: "/ration-inventory/qr-labels", icon_key: "qr_labels" },
};

const normalizeMenuName = (menuName) => {
  return String(menuName || "").trim().toLowerCase();
};

const MENU_LABEL_KEYS_BY_NAME = {
  dashboard: "menu.dashboard",
  institutionmanagement: "menu.institutionManagement",
  "institution management": "menu.institutionManagement",
  "institution master": "menu.institutionMaster",
  "pg admin": "menu.pgAdmin",
  "super admin": "menu.superAdmin",
  tenantmanagement: "menu.tenantManagement",
  "tenant management": "menu.tenantManagement",
  "tenant onboarding": "menu.tenantOnboarding",
  "active tenants": "menu.activeTenants",
  "vacant beds": "menu.vacantBeds",
  payments: "menu.payments",
  "payment reminders": "menu.paymentReminders",
  "vacated history": "menu.vacatedHistory",
  "tenant history": "menu.tenantHistory",
  usermanagement: "menu.userManagement",
  "user management": "menu.userManagement",
  expensemanagement: "menu.expenseManagement",
  "expense management": "menu.expenseManagement",
  "daily expenses": "menu.dailyExpenses",
  "meal type master": "menu.mealTypeMaster",
  "weekly food menu configuration": "menu.weeklyFoodMenu",
  inventorymanagement: "menu.inventoryManagement",
  "inventory management": "menu.inventoryManagement",
  "inventory master": "menu.inventoryMaster",
  "ration inventory": "menu.rationInventory",
  "category master": "menu.categoryMaster",
  "item master": "menu.itemMaster",
  "unit master": "menu.unitMaster",
  "supplier master": "menu.supplierMaster",
  "purchases": "menu.purchases",
  "current stock": "menu.currentStock",
  "kitchen request": "menu.kitchenRequest",
  "stock issue": "menu.stockIssue",
  "stock adjustment": "menu.stockAdjustment",
  "stock audit": "menu.stockAudit",
  "inventory dashboard": "menu.inventoryDashboard",
  "qr labels": "menu.qrLabels",
};

export const getMenuMeta = (menu) => {
  return (
    MENU_CONFIG_BY_ID[menu?.menu_id] ||
    MENU_CONFIG_BY_NAME[normalizeMenuName(menu?.menu_name)] ||
    { route_path: null, icon_key: "dashboard" }
  );
};

export const getMenuLabelKey = (menu) => {
  return MENU_LABEL_KEYS_BY_NAME[normalizeMenuName(menu?.menu_name)] || null;
};

export const getUserMenus = (user) => {
  return [...(user?.menus || [])]
    .map((menu) => ({
      ...menu,
      ...getMenuMeta(menu),
    }))
    .sort((firstMenu, secondMenu) => {
      return (firstMenu.priority || 0) - (secondMenu.priority || 0);
    });
};

export const getDefaultRoute = (user) => {
  console.log("getDefaultRoute input user:", user);
  const menus = getUserMenus(user);
  console.log("getDefaultRoute getUserMenus result:", menus);
  const hasDashboard = menus.some((menu) => menu.route_path === "/dashboard");
  console.log("getDefaultRoute hasDashboard:", hasDashboard);
  if (hasDashboard) {
    console.log("getDefaultRoute returning /dashboard");
    return "/dashboard";
  }

  const firstMenu = menus.find((menu) => menu.route_path);
  console.log("getDefaultRoute returning firstMenu path:", firstMenu?.route_path);

  return firstMenu?.route_path || "/dashboard";
};

export const getSidebarMenuTree = (user) => {
  const menus = getUserMenus(user);
  if (user?.role === "super_admin") {
    menus.push({
      menu_id: "menu-restrictions",
      menu_name: "Restrictions",
      route_path: "/restriction/menu-permissions",
      icon_key: "super_admin",
      priority: 998
    });
  }
  
  // Inject QR Labels sub-menu dynamically if Ration Inventory parent is present and QR Labels is allowed
  const hasRation = menus.some(m => m.menu_id === 200);
  const wasQrLabelsAllowed = menus.some(m => m.menu_id === 212);
  if (hasRation && wasQrLabelsAllowed) {
    menus.push({
      menu_id: 212,
      menu_name: "QR Labels",
      parent_menu_id: 200,
      route_path: "/ration-inventory/qr-labels",
      icon_key: "qr_labels",
      priority: 12
    });
  }
  const menuMap = new Map();

  for (const menu of menus) {
    menuMap.set(menu.menu_id, {
      ...menu,
      children: [],
    });
  }

  const rootMenus = [];

  for (const menu of menuMap.values()) {
    if (menu.parent_menu_id && menuMap.has(menu.parent_menu_id)) {
      menuMap.get(menu.parent_menu_id).children.push(menu);
      continue;
    }

    rootMenus.push(menu);
  }

  const sortMenus = (items) => {
    return items
      .sort((firstMenu, secondMenu) => {
        return (firstMenu.priority || 0) - (secondMenu.priority || 0);
      })
      .map((menu) => ({
        ...menu,
        children: sortMenus(menu.children || []),
      }));
  };

  return sortMenus(rootMenus);
};

const normalizeActionName = (actionName) => {
  return String(actionName || "").trim().toLowerCase();
};

export const getMenuByRoute = (user, pathname) => {
  let lookupPath = pathname;
  if (pathname.startsWith("/tenant/profile/") || pathname.startsWith("/tenant/edit/")) {
    lookupPath = "/tenant/active";
  }

  const menus = getUserMenus(user).filter((menu) => menu.route_path);

  return menus
    .sort((firstMenu, secondMenu) => {
      return secondMenu.route_path.length - firstMenu.route_path.length;
    })
    .find((menu) => {
      return (
        lookupPath === menu.route_path ||
        lookupPath.startsWith(`${menu.route_path}/`)
      );
    });
};

export const hasMenuAccess = (user, routePath) => {
  return getUserMenus(user).some((menu) => menu.route_path === routePath);
};

export const hasMenuAction = (user, routePath, actionName) => {
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

export const getRequiredActionForPath = (pathname) => {
  if (pathname === "/dashboard") {
    return MENU_ACTIONS.VIEW;
  }

  if (pathname.endsWith("/add")) {
    return MENU_ACTIONS.CREATE;
  }

  if (pathname.includes("/edit/")) {
    return MENU_ACTIONS.EDIT;
  }

  if (pathname.includes("/view/") || pathname.includes("/profile/") || pathname.includes("/history/")) {
    return MENU_ACTIONS.VIEW;
  }

  return MENU_ACTIONS.LIST;
};

export const isPathAllowedForUser = (user, pathname) => {
  if (pathname === "/ration-management" || pathname === "/restriction/menu-permissions") return true;
  const menu = getMenuByRoute(user, pathname);

  if (!menu) {
    return false;
  }

  return hasMenuAction(user, menu.route_path, getRequiredActionForPath(pathname));
};
