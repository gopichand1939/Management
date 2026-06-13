import { UserRound } from "lucide-react";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

import useAuthUser from "../../Hooks/useAuthUser";
import {
  TOKEN_KEY,
  USER_PROFILE,
} from "../../Utils/Constants";
import {
  setUserError,
  setUserProfile,
} from "../../Redux/User/UserSlice";

const AuthUser = () => {
  const dispatch = useDispatch();
  const { authUser, token } = useAuthUser();

  useEffect(() => {
    const getAuthUser = async () => {
      try {
        const response = await fetch(USER_PROFILE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const responseText = await response.text();

        if (responseText.startsWith("<")) {
          dispatch(setUserError("Profile API is not returning JSON"));
          return;
        }

        const data = JSON.parse(responseText);

        if (!response.ok) {
          dispatch(setUserError(data.message || "Profile failed"));
          return;
        }

        dispatch(setUserProfile(data.user));
      } catch (apiError) {
        dispatch(setUserError(apiError.message));
      }
    };

    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (token || savedToken) {
      getAuthUser();
    }
  }, [dispatch, token]);

  if (!authUser) {
    return null;
  }

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
      `}
    >
      <div
        className={`
          w-12
          h-12
          rounded-xl
          bg-blue-50
          flex
          items-center
          justify-center
          text-blue-500
        `}
      >
        <UserRound size={20} />
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
            text-lg
            font-extrabold
            text-slate-800
            mt-0.5
            max-w-xs
            truncate
          `}
        >
          {authUser.name}
        </strong>
        <span
          className={`
            text-[10px]
            text-slate-400
            font-bold
            mt-0.5
            block
            max-w-xs
            truncate
          `}
        >
          {authUser.email}
        </span>
      </div>
    </div>
  );
};

export default AuthUser;
