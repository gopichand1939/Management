import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, Mail, Phone, UserRound } from "lucide-react";

import Error from "../Common/Error";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import StatusBadge from "../Common/StatusBadge";
import {
  PG_ADMIN_VIEW,
  TOKEN_KEY,
} from "../../Utils/Constants";

const ViewPGAdmin = () => {
  const { id } = useParams();

  const [pgAdmin, setPgAdmin] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const getPgAdmin = async () => {
      try {
        const response = await fetch(PG_ADMIN_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "PG admin fetch failed");
          return;
        }

        setPgAdmin(data.pgAdmin);
      } catch (apiError) {
        setError(apiError.message);
      }
    };

    getPgAdmin();
  }, [id]);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-[480px] mx-auto w-full flex flex-col gap-6">
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  PG Admin Details
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  View institution admin information
                </p>
              </div>

              <Error message={error} />

              {pgAdmin && (
                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm grid gap-4">
                  <p className="text-slate-800 font-extrabold flex items-center gap-2">
                    <UserRound size={16} className="text-orange-500" />
                    {pgAdmin.pg_admin_name}
                  </p>
                  <p className="text-slate-600 font-medium flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    {pgAdmin.institution_name}
                  </p>
                  <p className="text-slate-600 font-medium flex items-center gap-2">
                    <Mail size={16} className="text-slate-400" />
                    {pgAdmin.email}
                  </p>
                  <p className="text-slate-600 font-medium flex items-center gap-2">
                    <Phone size={16} className="text-slate-400" />
                    {pgAdmin.phone || "-"}
                  </p>
                  <StatusBadge label={pgAdmin.status} />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewPGAdmin;
