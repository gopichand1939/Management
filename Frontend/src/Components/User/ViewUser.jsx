import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Mail, Phone, Shield, UserRound } from "lucide-react";

import StatusBadge from "../Common/StatusBadge";

const ViewUser = () => {
  const { id } = useParams();
  const { users } = useSelector((state) => state.user);
  const user = users.find((item) => String(item.id) === id);

  if (!user) {
    return (
      <div
        className={`
          rounded-xl
          border
          border-red-100
          bg-red-50
          p-4
          text-red-600
          text-sm
          font-semibold
        `}
      >
        User not found
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white
        border
        border-slate-100
        rounded-2xl
        w-full
        max-w-[440px]
        p-8
        shadow-sm
        animate-[floatIn_480ms_ease]
      `}
    >
      <div
        className={`
          grid
          gap-4
        `}
      >
        <div>
          <span
            className={`
              text-xs
              font-bold
              text-slate-400
              uppercase
              tracking-wider
            `}
          >
            Name
          </span>
          <p
            className={`
              text-slate-800
              font-extrabold
              flex
              items-center
              gap-2
              mt-1
            `}
          >
            <UserRound size={16} className="text-orange-500" /> {user.name}
          </p>
        </div>
        <div>
          <span
            className={`
              text-xs
              font-bold
              text-slate-400
              uppercase
              tracking-wider
            `}
          >
            Email
          </span>
          <p
            className={`
              text-slate-600
              font-medium
              flex
              items-center
              gap-2
              mt-1
            `}
          >
            <Mail size={16} className="text-slate-400" /> {user.email}
          </p>
        </div>
        <div>
          <span
            className={`
              text-xs
              font-bold
              text-slate-400
              uppercase
              tracking-wider
            `}
          >
            Phone
          </span>
          <p
            className={`
              text-slate-600
              font-medium
              flex
              items-center
              gap-2
              mt-1
            `}
          >
            <Phone size={16} className="text-slate-400" /> {user.phone}
          </p>
        </div>
        <div>
          <span
            className={`
              text-xs
              font-bold
              text-slate-400
              uppercase
              tracking-wider
            `}
          >
            Role
          </span>
          <p
            className={`
              text-slate-600
              font-medium
              flex
              items-center
              gap-2
              mt-1
            `}
          >
            <Shield size={16} className="text-slate-400" /> {user.role}
          </p>
        </div>
        <div className="mt-2">
          <StatusBadge label={user.status} />
        </div>
      </div>
    </div>
  );
};

export default ViewUser;
