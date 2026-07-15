import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AlignLeft, Clock3, Hash, Tag, ArrowLeft } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import StatusBadge from "../../Common/StatusBadge";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Button from "../../Common/Button";
import {
  RATION_CATEGORY_VIEW,
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

const ViewRationCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getCategory = async () => {
      setLoading(true);
      setError("");

      try {
        const instId = location.state?.institution_id || authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
        const response = await fetch(RATION_CATEGORY_VIEW, {
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
          setError(data.message || "Ration category fetch failed");
          return;
        }

        setCategory(data.data || null);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    getCategory();
  }, [id]);

  const details = category
    ? [
        {
          key: "name",
          label: "Category Name",
          value: category.category_name || "-",
          icon: Tag,
        },
        {
          key: "code",
          label: "Category Code",
          value: category.category_code || "-",
          icon: Hash,
        },
        {
          key: "description",
          label: "Description",
          value: category.description || "-",
          icon: AlignLeft,
        },
        {
          key: "created_at",
          label: "Created Date",
          value: formatDate(category.created_at),
          icon: Clock3,
        },
        {
          key: "updated_at",
          label: "Updated Date",
          value: formatDate(category.updated_at),
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
                    Category Details
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    View ration category master information
                  </p>
                </div>
                <Button
                  variant="secondary"
                  icon={ArrowLeft}
                  onClick={() => navigate("/ration-inventory/category-master")}
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
                category && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm grid gap-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-black text-slate-800">
                          {category.category_name}
                        </h2>
                        <p className="text-sm font-semibold text-slate-400 mt-1">
                          {category.category_code || "No Code"}
                        </p>
                      </div>

                      <StatusBadge label={category.status || "active"} />
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

export default ViewRationCategory;
