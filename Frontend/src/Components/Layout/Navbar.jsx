import { useState, useEffect } from "react";
import { Bell, ChevronDown, Menu, Search, Sun, Maximize, Minimize } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../Redux/User/UserSlice";

const Navbar = () => {
  const dispatch = useDispatch();
  const { authUser } = useSelector((state) => state.user);

  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    }
  };


  return (
    <div
      className={`
        sticky
        top-0
        z-40
        w-full
        shrink-0
        border-b
        border-slate-100
        bg-white/95
        backdrop-blur-xl
        px-6
        py-3
        shadow-sm
      `}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-1 items-center gap-5">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="text-slate-500 transition-colors hover:text-slate-900 lg:hidden cursor-pointer"
            type="button"
          >
            <Menu size={20} />
          </button>

          <div className="relative w-full max-w-[360px]">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <Search size={16} />
            </span>

            <input
              className={`
                h-10
                w-full
                rounded-lg
                border
                border-slate-200
                bg-slate-50
                pl-11
                pr-12
                text-sm
                text-slate-700
                outline-none
                transition-all
                placeholder:text-slate-400
                focus:border-slate-300
                focus:bg-white
                focus:ring-2
                focus:ring-slate-100
              `}
              placeholder="Search anything..."
              type="text"
            />

            <span className="absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-slate-400">
              Ctrl K
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button
            className="text-slate-500 transition-colors hover:text-slate-900 cursor-pointer"
            type="button"
          >
            <Sun size={19} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="text-slate-500 transition-colors hover:text-slate-900 cursor-pointer"
            type="button"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
          </button>


          <button
            className="relative text-slate-500 transition-colors hover:text-slate-900"
            type="button"
          >
            <Bell size={19} />
            <span
              className={`
                absolute
                -right-1
                -top-1
                grid
                h-4
                min-w-4
                place-items-center
                rounded-full
                bg-red-500
                px-1
                text-[10px]
                font-bold
                text-white
              `}
            >
              3
            </span>
          </button>

          <div className="flex items-center gap-3">
            <span
              className={`
                grid
                h-9
                w-9
                place-items-center
                rounded-full
                bg-orange-100
                text-sm
                font-bold
                text-orange-600
              `}
            >
              {authUser?.name?.charAt(0)?.toUpperCase() || "A"}
            </span>

            <div className="hidden text-left sm:block">
              <p className="m-0 text-sm font-bold leading-5 text-slate-900">
                {authUser?.name || "Admin User"}
              </p>
              <p className="m-0 text-xs leading-4 text-slate-400">
                {authUser?.email || "admin@company.com"}
              </p>
            </div>

            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
