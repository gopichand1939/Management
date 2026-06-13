import { LayoutDashboard, LogOut, Shield, Users } from "lucide-react";
import { useDispatch } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";

import { logoutUser } from "../../Redux/User/UserSlice";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <aside
      className={`
        sticky
        top-0
        hidden
        h-screen
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
          AdminPro
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        <NavLink
          to="/dashboard"
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
              isActive
                ? "border border-slate-700/60 bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            }
          `}
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard
                size={18}
                className={isActive ? "text-orange-500" : "text-slate-400"}
              />
              <span>Dashboard</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/users"
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
              isActive
                ? "border border-slate-700/60 bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            }
          `}
        >
          {({ isActive }) => (
            <>
              <Users
                size={18}
                className={isActive ? "text-orange-500" : "text-slate-400"}
              />
              <span>Users</span>
            </>
          )}
        </NavLink>
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
