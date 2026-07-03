import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { AlignLeft, Building2, Clock3, Hash, ListOrdered, Tag } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import StatusBadge from "../../Common/StatusBadge";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import {
  MEAL_TYPE_VIEW,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const normalizedValue = String(value).slice(0, 5);
  const [hours, minutes] = normalizedValue.split(":");
  const parsedHours = Number(hours);

  if (Number.isNaN(parsedHours)) {
    return normalizedValue;
  }

  const suffix = parsedHours >= 12 ? "PM" : "AM";
  const displayHours = parsedHours % 12 || 12;

  return `${displayHours}:${minutes} ${suffix}`;
};

const ViewMealType = () => {
  const { id } = useParams();
  const { authUser } = useSelector((state) => state.user);
  const [mealType, setMealType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getMealType = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(MEAL_TYPE_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            institution_id: authUser?.institution_id || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Meal type fetch failed");
          return;
        }

        setMealType(data.mealType || null);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    getMealType();
  }, [authUser?.institution_id, id]);

  const details = mealType ? [
    {
      key: "institution",
      label: "Institution Id",
      value: mealType.institution_id || "-",
      icon: Building2,
    },
    {
      key: "name",
      label: "Meal Type Name",
      value: mealType.meal_type_name || "-",
      icon: Tag,
    },
    {
      key: "code",
      label: "Meal Type Code",
      value: mealType.meal_type_code || "-",
      icon: Hash,
    },
    {
      key: "order",
      label: "Display Order",
      value: mealType.display_order ?? "-",
      icon: ListOrdered,
    },
    {
      key: "start",
      label: "Start Time",
      value: formatTime(mealType.start_time),
      icon: Clock3,
    },
    {
      key: "end",
      label: "End Time",
      value: formatTime(mealType.end_time),
      icon: Clock3,
    },
    {
      key: "description",
      label: "Description",
      value: mealType.description || "-",
      icon: AlignLeft,
    },
  ] : [];

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-[720px] mx-auto w-full flex flex-col gap-6">
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Meal Type Details
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  View meal type master information
                </p>
              </div>

              <Error message={error} />

              {loading ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                mealType && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm grid gap-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-black text-slate-800">
                          {mealType.meal_type_name}
                        </h2>
                        <p className="text-sm font-semibold text-slate-400 mt-1">
                          {mealType.meal_type_code}
                        </p>
                      </div>

                      <StatusBadge label={mealType.is_active ? "active" : "inactive"} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {details.map((detail) => {
                        const Icon = detail.icon;

                        return (
                          <div
                            key={detail.key}
                            className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                          >
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                              <Icon size={14} className="text-orange-500" />
                              {detail.label}
                            </span>
                            <p className="mt-2 text-sm font-semibold text-slate-700 break-words">
                              {detail.value}
                            </p>
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

export default ViewMealType;
