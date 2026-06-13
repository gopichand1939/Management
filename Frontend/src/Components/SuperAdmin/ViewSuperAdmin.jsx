import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Mail, Phone, Shield, UserRound } from "lucide-react";

import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import StatusBadge from "../Common/StatusBadge";

const ViewSuperAdmin = () => {
  const { id } = useParams();
  const { users } = useSelector((state) => state.user);
  const user = users.find((item) => String(item.id) === id);

  if (!user) {
    return (
      <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
        <Sidebar />

        <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
          <Navbar />

          <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
            <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
              <div
                className={`
                  max-w-[440px]
                  mx-auto
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
                Super admin not found
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-[440px] mx-auto w-full flex flex-col gap-6 md:gap-8">
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Super Admin Details
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  View super admin profile info and active status
                </p>
              </div>

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
                <div className="grid gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Name
                    </span>
                    <p className="text-slate-800 font-extrabold flex items-center gap-2 mt-1">
                      <UserRound size={16} className="text-orange-500" />
                      {user.name}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Email
                    </span>
                    <p className="text-slate-600 font-medium flex items-center gap-2 mt-1">
                      <Mail size={16} className="text-slate-400" />
                      {user.email}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Phone
                    </span>
                    <p className="text-slate-600 font-medium flex items-center gap-2 mt-1">
                      <Phone size={16} className="text-slate-400" />
                      {user.phone}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Role
                    </span>
                    <p className="text-slate-600 font-medium flex items-center gap-2 mt-1">
                      <Shield size={16} className="text-slate-400" />
                      {user.role}
                    </p>
                  </div>

                  <div className="mt-2">
                    <StatusBadge label={user.status} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewSuperAdmin;
