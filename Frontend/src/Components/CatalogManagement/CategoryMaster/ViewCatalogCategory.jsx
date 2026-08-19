import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit2, Calendar, Tag, Hash, Eye, EyeOff, FileText } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Button from "../../Common/Button";
import { CATALOG_CATEGORY_VIEW, TOKEN_KEY } from "../../../Utils/Constants";

const ViewCatalogCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    const fetchCategoryDetails = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(CATALOG_CATEGORY_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: Number(id) }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Failed to load category details");
          return;
        }

        setCategory(data.data);
      } catch (apiError) {
        setError(apiError.message || "Failed to load category details");
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryDetails();
  }, [id]);

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

        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-[1280px]">
            {/* Navigation and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <button
                onClick={() => navigate("/catalog-management/category-master")}
                className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft size={16} />
                Back to List
              </button>

              {category && (
                <Button
                  onClick={() => navigate(`/catalog-management/category-master/edit/${category.id}`)}
                  className="flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit Category
                </Button>
              )}
            </div>

            {error && <Error error={error} className="mb-6" />}

            {loading ? (
              <div className="flex justify-center py-12">
                <PageLoader />
              </div>
            ) : category ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm max-w-[800px] text-left">
                {/* Title and Status */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{category.category_name}</h2>
                    <span className="text-sm font-semibold text-slate-400 mt-1 block">
                      Category ID: #{category.id}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    category.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {category.status === "active" ? <Eye size={12} /> : <EyeOff size={12} />}
                    {category.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Attribute Cards */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex gap-3.5">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Tag size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Category Name</span>
                      <span className="text-sm font-semibold text-slate-800 mt-0.5 block">{category.category_name}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex gap-3.5">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Hash size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Category Code</span>
                      <span className="text-sm font-semibold text-slate-800 mt-0.5 block">{category.category_code || "N/A"}</span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 bg-slate-50/50 border border-slate-100 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={16} className="text-orange-500" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                      {category.description || "No description provided."}
                    </p>
                  </div>

                  <div className="sm:col-span-2 bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4 text-xs font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      Created: {new Date(category.created_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      Last Updated: {new Date(category.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 font-medium">
                Category details not found.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewCatalogCategory;
