import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ShieldCheck } from "lucide-react";

import {
  setUserProfile,
} from "../../Redux/User/UserSlice";
import {
  TOKEN_KEY,
  USER_PROFILE,
} from "../../Utils/Constants";

const AuthSuperAdmin = () => {
  const dispatch = useDispatch();
  const { authUser } = useSelector((state) => state.user);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const response = await fetch(USER_PROFILE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();

        if (!response.ok) {
          return;
        }

        dispatch(setUserProfile(data.user));
      } catch {
        return;
      }
    };

    getProfile();
  }, [dispatch]);

  return (
    <div
      className={`
        bg-white
        border
        border-slate-100
        rounded-2xl
        p-5
        shadow-sm
        flex
        items-center
        gap-4
        hover:shadow-md
        hover:-translate-y-0.5
        transition-all
        duration-200
        font-satoshi
      `}
    >
      <div
        className={`
          w-12
          h-12
          rounded-xl
          bg-orange-50
          flex
          items-center
          justify-center
          text-orange-500
        `}
      >
        <ShieldCheck size={20} />
      </div>

      <div className="flex-1 text-left">
        <span
          className={`
            text-[10px]
            font-extrabold
            text-slate-400
            uppercase
            tracking-wider
          `}
        >
          Logged In Admin
        </span>
        <strong
          className={`
            block
            text-xl
            font-black
            text-slate-800
            mt-0.5
          `}
        >
          {authUser?.name || "Admin User"}
        </strong>
        <span
          className={`
            text-[10px]
            text-slate-500
            font-bold
            mt-0.5
            block
          `}
        >
          {authUser?.email || "admin@company.com"}
        </span>
      </div>
    </div>
  );
};

export default AuthSuperAdmin;
