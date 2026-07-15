import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AlignLeft, Clock3, Hash, Tag, ArrowLeft, Scale } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import StatusBadge from "../../Common/StatusBadge";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Button from "../../Common/Button";
import {
  RATION_UNIT_VIEW,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const formatDate = (value) => {
  if (!value) {
    return "-";
  }
  try {
    return new Date(value).toLocaleString();
  } catch (e) {
    return String(value);
  }
};

const ViewRationUnit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getUnit = async () => {
      setLoading(true);
      setError("");

      try {
        const instId = location.state?.institution_id || authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
        const response = await fetch(RATION_UNIT_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            institution_id: instId ? Number(instId) : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Ration unit fetch failed");
          return;
        }

        setUnit(data.data || null);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    getUnit();
  }, [id]);

  const details = unit
    ? [
        {
          key: "name",
          label: "Unit Name",
          value: unit.unit_name || "-",
          icon: Tag,
        },
        {
          key: "code",
          label: "Unit Code",
          value: unit.unit_code || "-",
          icon: Hash,
        },
        {
          key: "allow_decimal",
          label: "Allow Decimal",
          value: unit.allow_decimal ? "Yes" : "No",
          icon: Scale,
        },
        {
          key: "description",
          label: "Description",
          value: unit.description || "-",
          icon: AlignLeft,
        },
        {
          key: "created_at",
          label: "Created Date",
          value: formatDate(unit.created_at),
          icon: Clock3,
        },
        {
          key: "updated_at",
          label: "Updated Date",
          value: formatDate(unit.updated_at),
          icon: Clock3,
        },
      ]
    : [];

  if (!authUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <PageLoader />
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
            <div className="max-w-[720px] mx-auto w-full flex flex-col gap-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    Unit Details
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    View ration unit master information
                  </p>
                </div>
                <Button
                  variant="secondary"
                  icon={ArrowLeft}
                  onClick={() => navigate("/ration-inventory/unit-master")}
                >
                  Back to List
                </Button>
              </div>

              <Error message={error} />

              {loading ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                unit && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                      <div className="text-left">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Unit ID: {unit.id}
                        </span>
                        <h2 className="text-lg font-bold text-slate-800 mt-0.5">
                          {unit.unit_name}
                        </h2>
                      </div>
                      <StatusBadge label={unit.status || "active"} />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 mt-6">
                      {details.map((detail) => {
                        const IconComponent = detail.icon;
                        return (
                          <div
                            key={detail.key}
                            className="flex items-start gap-3.5 text-left"
                          >
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400">
                              <IconComponent size={18} />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {detail.label}
                              </span>
                              <p className="text-sm font-semibold text-slate-700 mt-0.5 leading-relaxed">
                                {detail.value}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewRationUnit;
