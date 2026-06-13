export const MENU_ACTIONS = {
  CREATE: "create",
  EDIT: "edit",
  VIEW: "view",
  DELETE: "delete",
  LIST: "list",
};

const MENU_CONFIG_BY_ID = {
  1: { route_path: "/dashboard", icon_key: "dashboard" },
  2: { route_path: "/super-admins", icon_key: "super_admin" },
  3: { route_path: "/institutions", icon_key: "institutions" },
  4: { route_path: "/pg-admins", icon_key: "pg_admin" },
  5: { route_path: null, icon_key: "user_management" },
  6: { route_path: null, icon_key: "institutions" },
  7: { route_path: null, icon_key: "institutions" },
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
  usermanagement: { route_path: null, icon_key: "user_management" },
  "user management": { route_path: null, icon_key: "user_management" },
};

const normalizeMenuName = (menuName) => {
  return String(menuName || "").trim().toLowerCase();
};

const MENU_LABEL_KEYS_BY_NAME = {
  dashboard: "menu.dashboard",
  institutionmanagement: "menu.institutionManagement",
  "institution management": "menu.institutionManagement",
  "institution master": "menu.institutionMaster",
  "institution availability": "menu.institutionAvailability",
  "pg admin": "menu.pgAdmin",
  "super admin": "menu.superAdmin",
  usermanagement: "menu.userManagement",
  "user management": "menu.userManagement",
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
  const firstMenu = getUserMenus(user).find((menu) => menu.route_path);

  return firstMenu?.route_path || "/dashboard";
};

export const getSidebarMenuTree = (user) => {
  const menus = getUserMenus(user);
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

  if (pathname.includes("/view/")) {
    return MENU_ACTIONS.VIEW;
  }

  return MENU_ACTIONS.LIST;
};

export const isPathAllowedForUser = (user, pathname) => {
  const menu = getMenuByRoute(user, pathname);

  if (!menu) {
    return false;
  }

  return hasMenuAction(user, menu.route_path, getRequiredActionForPath(pathname));
};
