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
  Boxes,
  UtensilsCrossed,
  NotebookText,
  BellRing,
  CookingPot,
  X,
  Layers,
  Scale,
  Carrot,
  Truck,
  ShoppingCart,
  Warehouse,
  ChefHat,
  ArrowUpRight,
  Sliders,
  ClipboardCheck,
  PieChart,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { logoutUser, setSidebarOpen } from "../../Redux/User/UserSlice";
import { useTranslation } from "../../Services/I18n/I18nService";
import {
  getMenuLabelKey,
  getMenuMeta,
  getSidebarMenuTree,
} from "../../Utils/MenuPermissions";
import blrLogoCircular from "../../Assets/blr-logo-circular.png";

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
  payment_reminders: BellRing,
  tenant_vacated: Users,
  tenant_history: History,
  expense_management: Wallet,
  daily_expenses: Coins,
  meal_type_master: UtensilsCrossed,
  weekly_food_menu: NotebookText,
  inventory_management: Boxes,
  ration_management: CookingPot,
  ration_inventory: CookingPot,
  category_master: Layers,
  item_master: Carrot,
  unit_master: Scale,
  supplier_master: Truck,
  purchases: ShoppingCart,
  current_stock: Warehouse,
  kitchen_request: ChefHat,
  stock_issue: ArrowUpRight,
  stock_adjustment: Sliders,
  stock_audit: ClipboardCheck,
  inventory_dashboard: PieChart,
};

const MENU_ICON_SIZE = 18;

// Module-level variables to persist state across route-driven component remounts
let persistedScrollTop = 0;
let isInitialLoad = true;

const isElementVisibleInsideContainer = (element, container) => {
  if (!element || !container) return true;

  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return (
    elementRect.top >= containerRect.top &&
    elementRect.bottom <= containerRect.bottom
  );
};

const Sidebar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { authUser, isSidebarOpen } = useSelector((state) => state.user);

  // Ref for the scroll container and selection
  const sidebarScrollRef = useRef(null);
  const selectedMenuRef = useRef(null);

  // Memoize the menu tree building and sorting
  const menuTree = useMemo(() => {
    return getSidebarMenuTree(authUser);
  }, [authUser]);

  // Track expanded parent state (accordion logic) - initialized to active parent directly on load
  const [expandedParentId, setExpandedParentId] = useState(() => {
    let lookupPath = window.location.pathname;
    if (lookupPath.startsWith("/tenant/profile/") || lookupPath.startsWith("/tenant/edit/")) {
      lookupPath = "/tenant/active";
    }
    const findActiveParent = (menus) => {
      for (const menu of menus) {
        const meta = getMenuMeta(menu);
        if (meta && meta.route_path) {
          if (lookupPath === meta.route_path || (meta.route_path !== "/" && lookupPath.startsWith(`${meta.route_path}/`))) {
            return menu.parent_menu_id || null;
          }
        }
        if (menu.children && menu.children.length > 0) {
          const parent = findActiveParent(menu.children);
          if (parent) return parent;
        }
      }
      return null;
    };
    return findActiveParent(getSidebarMenuTree(authUser)) || null;
  });

  // Active route detection logic
  const activeMenu = useMemo(() => {
    const findActive = (menus) => {
      for (const menu of menus) {
        let lookupPath = location.pathname;
        if (lookupPath.startsWith("/tenant/profile/") || lookupPath.startsWith("/tenant/edit/")) {
          lookupPath = "/tenant/active";
        }
        
        const meta = getMenuMeta(menu);
        if (meta && meta.route_path) {
          if (lookupPath === meta.route_path || (meta.route_path !== "/" && lookupPath.startsWith(`${meta.route_path}/`))) {
            return menu;
          }
        }
        if (menu.children && menu.children.length > 0) {
          const activeChild = findActive(menu.children);
          if (activeChild) return activeChild;
        }
      }
      return null;
    };
    return findActive(menuTree);
  }, [menuTree, location.pathname]);

  // Sync expanded parent and collapse others when active child/route changes
  useEffect(() => {
    if (activeMenu) {
      setExpandedParentId(activeMenu.parent_menu_id || null);
    }
  }, [activeMenu]);

  // Handle parent menu accordion click
  const handleParentClick = useCallback((parentId) => {
    setExpandedParentId((currentId) =>
      currentId === parentId ? null : parentId
    );
  }, []);

  // Lock background body scroll when mobile drawer is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // Persist scroll position on user scroll
  const handleScroll = useCallback((e) => {
    persistedScrollTop = e.target.scrollTop;
    sessionStorage.setItem("sidebarScrollTop", persistedScrollTop);
  }, []);

  // Restore scroll position synchronously before paint
  useLayoutEffect(() => {
    const savedScrollTop = sessionStorage.getItem("sidebarScrollTop");
    const scrollTopToRestore = savedScrollTop !== null ? parseFloat(savedScrollTop) : persistedScrollTop;
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = scrollTopToRestore;
    }
  }, []);

  // Fallback scroll restoration in useEffect
  useEffect(() => {
    const savedScrollTop = sessionStorage.getItem("sidebarScrollTop");
    const scrollTopToRestore = savedScrollTop !== null ? parseFloat(savedScrollTop) : persistedScrollTop;
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = scrollTopToRestore;
    }
  }, []);

  // Direct page load or browser refresh scroll behavior - triggers ONLY ONCE on mount
  useEffect(() => {
    const isClickedMenu = sessionStorage.getItem("sidebarClickedMenu") === "true";

    if (!isClickedMenu && isInitialLoad) {
      requestAnimationFrame(() => {
        if (
          selectedMenuRef.current &&
          sidebarScrollRef.current &&
          !isElementVisibleInsideContainer(
            selectedMenuRef.current,
            sidebarScrollRef.current
          )
        ) {
          selectedMenuRef.current.scrollIntoView({
            behavior: "auto",
            block: "nearest",
          });
        }
      });
      isInitialLoad = false;
    }

    sessionStorage.removeItem("sidebarClickedMenu");
  }, []);

  // Manual navigation helper to capture and restore scroll position seamlessly
  const handleChildClick = useCallback((e, menu) => {
    e.preventDefault();
    const currentScrollTop = sidebarScrollRef.current?.scrollTop || 0;
    persistedScrollTop = currentScrollTop;
    sessionStorage.setItem("sidebarScrollTop", currentScrollTop);
    sessionStorage.setItem("sidebarClickedMenu", "true");

    dispatch(setSidebarOpen(false));

    navigate(menu.route_path);

    requestAnimationFrame(() => {
      if (sidebarScrollRef.current) {
        sidebarScrollRef.current.scrollTop = currentScrollTop;
      }
    });
  }, [navigate, dispatch]);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  const renderMenuItem = (menu, isChild = false) => {
    const { route_path, icon_key } = getMenuMeta(menu);
    const translatedLabel = t(getMenuLabelKey(menu), menu.menu_name);
    const Icon = menuIcons[icon_key] || Shield;
    const hasChildren = Boolean(menu.children?.length);
    const expanded = hasChildren ? expandedParentId === menu.menu_id : false;
    
    const hasActiveChild = hasChildren && menu.children.some(
      (child) => activeMenu?.menu_id === child.menu_id
    );

    if (hasChildren) {
      const isParentActive = hasActiveChild;
      return (
        <div key={menu.menu_id} className="flex flex-col gap-1.5">
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
              w-full
              cursor-pointer
              ${
                isParentActive
                  ? "border border-slate-800 bg-slate-800/40 text-slate-200"
                  : "border border-transparent text-slate-400"
              }
            `}
            type="button"
            onClick={() => handleParentClick(menu.menu_id)}
            aria-expanded={expanded}
          >
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              <Icon
                size={MENU_ICON_SIZE}
                className={isParentActive ? "text-orange-500" : "text-slate-400"}
              />
            </span>
            <span className="flex-1 text-left truncate">{translatedLabel}</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          {expanded && (
            <div className="ml-4 flex flex-col gap-1.5 border-l border-slate-800/80 pl-3">
              {menu.children.map((childMenu) => renderMenuItem(childMenu, true))}
            </div>
          )}
        </div>
      );
    }

    const isChildActive = activeMenu?.menu_id === menu.menu_id;

    return (
      <NavLink
        key={menu.menu_id}
        to={route_path}
        onClick={(e) => handleChildClick(e, menu)}
        ref={isChildActive ? (el) => {
          selectedMenuRef.current = el;
        } : undefined}
        aria-current={isChildActive ? "page" : undefined}
        className={`
          flex
          items-center
          gap-3
          rounded-xl
          py-3
          text-sm
          font-semibold
          transition-all
          duration-200
          w-full
          ${
            isChild 
              ? `ml-2 py-2.5 text-[13px] ${
                  isChildActive
                    ? "border border-orange-500/20 bg-orange-500/10 text-orange-400 pl-3 border-l-4 border-l-orange-500 pr-4"
                    : "border border-transparent border-l-4 border-l-transparent text-slate-400 pl-3 pr-4"
                }`
              : isChildActive
                ? "border border-slate-700/60 bg-slate-800 text-white px-4"
                : "border border-transparent text-slate-400 px-4"
          }
        `}
      >
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <Icon
            size={MENU_ICON_SIZE}
            className={isChildActive ? (isChild ? "text-orange-400" : "text-orange-500") : "text-slate-400"}
          />
        </span>
        <span className="truncate">{translatedLabel}</span>
      </NavLink>
    );
  };

  return (
    <>
      {/* Backdrop overlay for mobile screen sizes */}
      {isSidebarOpen && (
        <div
          onClick={() => dispatch(setSidebarOpen(false))}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden cursor-pointer"
        />
      )}

      <aside
        className={`
          sidebar
          fixed inset-y-0 left-0 z-50
          lg:sticky lg:top-0
          w-[270px]
          border-r border-slate-800 bg-[#111827] p-6 shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          lg:flex
        `}
      >
        <div className="mb-10 flex-shrink-0 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <img
              src={blrLogoCircular}
              alt="BLR Stay"
              className="h-14 w-14 rounded-full object-contain"
            />
            <span className="text-xl font-bold tracking-tight text-white">
              BLR Stay
            </span>
          </div>

          <button
            onClick={() => dispatch(setSidebarOpen(false))}
            className="text-slate-400 hover:text-white lg:hidden cursor-pointer flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-800/50"
            type="button"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav
          ref={sidebarScrollRef}
          onScroll={handleScroll}
          className="sidebar-menu-scroll flex flex-col gap-1.5"
        >
          {menuTree.map((menu) => renderMenuItem(menu))}
        </nav>

        <div className="flex-shrink-0 mt-auto pt-6 border-t border-slate-800/60">
          <button
            className={`
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
              cursor-pointer
            `}
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
