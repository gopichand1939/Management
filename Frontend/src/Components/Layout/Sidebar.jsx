import {
  BedDouble,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Shield,
  UserPlus,
  UserCog,
  Users,
  UserRoundCog,
  History,
  Wallet,
  Coins,
} from "lucide-react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { logoutUser } from "../../Redux/User/UserSlice";
import { useTranslation } from "../../Services/I18n/I18nService";
import {
  getMenuLabelKey,
  getMenuMeta,
  getSidebarMenuTree,
} from "../../Utils/MenuPermissions";

const menuIcons = {
  dashboard: LayoutDashboard,
  institutions: Building2,
  pg_admin: UserRoundCog,
  super_admin: UserCog,
  user_management: UserCog,
  tenant_management: Users,
  tenant_onboarding: UserPlus,
  tenant_vacant_beds: BedDouble,
  tenant_payments: ReceiptText,
  tenant_vacated: Users,
  tenant_history: History,
  expense_management: Wallet,
  daily_expenses: Coins,
};

const MENU_ICON_SIZE = 18;

const Sidebar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { authUser } = useSelector((state) => state.user);
  const menuTree = getSidebarMenuTree(authUser);
  const [expandedMenus, setExpandedMenus] = useState({});

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  const isRouteActive = (routePath) => {
    return (
      routePath &&
      (location.pathname === routePath ||
        location.pathname.startsWith(`${routePath}/`))
    );
  };

  const hasActiveDescendant = (menu) => {
    return menu.children?.some((childMenu) => {
      return isRouteActive(childMenu.route_path) || hasActiveDescendant(childMenu);
    });
  };

  const isMenuExpanded = (menu) => {
    if (Object.prototype.hasOwnProperty.call(expandedMenus, menu.menu_id)) {
      return expandedMenus[menu.menu_id];
    }

    return hasActiveDescendant(menu);
  };

  const toggleMenu = (menu) => {
    setExpandedMenus((currentState) => ({
      ...currentState,
      [menu.menu_id]: !isMenuExpanded(menu),
    }));
  };

  const renderMenuItem = (menu, isChild = false) => {
    const { route_path, icon_key } = getMenuMeta(menu);
    const translatedLabel = t(getMenuLabelKey(menu), menu.menu_name);
    const Icon = menuIcons[icon_key] || Shield;
    const hasChildren = Boolean(menu.children?.length);
    const expanded = hasChildren ? isMenuExpanded(menu) : false;
    const childActive = hasChildren ? hasActiveDescendant(menu) : false;
    const parentActive = hasChildren ? expanded && !childActive : false;

    if (hasChildren) {
      return (
        <div key={menu.menu_id} className="flex flex-col gap-2">
          <button
            className={`
              flex
              items-center
              gap-3
              rounded-xl
              px-4
              py-3
              text-sm
              font-semibold
              transition-all
              duration-200
              ${
                parentActive
                  ? "border border-slate-700/60 bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }
            `}
            type="button"
            onClick={() => toggleMenu(menu)}
          >
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              <Icon
                size={MENU_ICON_SIZE}
                className={parentActive ? "text-orange-500" : "text-slate-400"}
              />
            </span>
            <span className="flex-1 text-left">{translatedLabel}</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          {expanded && (
            <div className="ml-4 flex flex-col gap-2 border-l border-slate-800 pl-3">
              {menu.children.map((childMenu) => renderMenuItem(childMenu, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={menu.menu_id}
        to={route_path}
        className={({ isActive }) => `
          flex
          items-center
          gap-3
          rounded-xl
          px-4
          py-3
          text-sm
          font-semibold
          transition-all
          duration-200
          ${
            isChild ? "ml-1 py-2.5 text-[13px]" : ""
          }
          ${
            isActive
              ? "border border-slate-700/60 bg-slate-800 text-white"
              : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
          }
        `}
      >
        {({ isActive }) => (
          <>
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              <Icon
                size={MENU_ICON_SIZE}
                className={isActive ? "text-orange-500" : "text-slate-400"}
              />
            </span>
            <span>{translatedLabel}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={`
        sticky
        top-0
        hidden
        h-screen
        max-h-screen
        overflow-hidden
        w-[270px]
        border-r
        border-slate-800
        bg-[#111827]
        p-6
        shadow-xl
        lg:flex
        lg:flex-col
      `}
    >
      <div className="mb-10 flex items-center gap-3 px-2">
        <span
          className={`
            grid
            h-11
            w-11
            place-items-center
            rounded-xl
            bg-orange-500/10
            text-orange-500
          `}
        >
          <Shield size={20} className="fill-orange-500" />
        </span>

        <span className="text-xl font-bold tracking-tight text-white">
          BLR Stay
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto min-h-0 no-scrollbar">
        {menuTree.map((menu) => renderMenuItem(menu))}
      </nav>

      <button
        className={`
          mt-auto
          flex
          w-full
          items-center
          gap-3
          rounded-xl
          border
          border-red-500/20
          bg-red-500/10
          px-4
          py-3
          text-sm
          font-semibold
          text-red-200
          transition-all
          duration-200
          hover:bg-red-500/20
          hover:text-white
        `}
        type="button"
        onClick={handleLogout}
      >
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;
