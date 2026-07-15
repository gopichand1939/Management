import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { X, AlertCircle } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import RationCategoryForm from "./RationCategoryForm";
import {
  RATION_CATEGORY_EDIT,
  RATION_CATEGORY_VIEW,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const EditRationCategory = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin";
  const showInstitutionField = authUser?.role === "super_admin" || !authUser?.institution_id;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [formData, setFormData] = useState({
    category_name: "",
    category_code: "",
    description: "",
    status: "active",
    institution_id: "",
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (authUser?.institution_id && !formData.institution_id) {
      setFormData((currentData) => ({
        ...currentData,
        institution_id: String(authUser.institution_id),
      }));
    }
  }, [authUser, formData.institution_id]);

  useEffect(() => {
    const getInstitutions = async () => {
      if (!showInstitutionField) {
        return;
      }

      setLoadingInstitutions(true);
      setError("");

      try {
        const response = await fetch(GET_INSTITUTION_LIST, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Institution list failed");
          return;
        }

        setInstitutions(data.institutions || data.data || []);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [showInstitutionField]);

  useEffect(() => {
    const getCategory = async () => {
      setLoadingPage(true);
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

        const category = data.data;
        if (category) {
          setFormData({
            category_name: category.category_name || "",
            category_code: category.category_code || "",
            description: category.description || "",
            status: category.status || "active",
            institution_id: category.institution_id ? String(category.institution_id) : "",
          });
        }
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingPage(false);
      }
    };

    getCategory();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "category_code") {
      setFormData((currentData) => ({
        ...currentData,
        category_code: value.toUpperCase(),
      }));
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedName = (formData.category_name || "").trim();
    if (!trimmedName) {
      const msg = "Category Name is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }

    if (showInstitutionField && !formData.institution_id) {
      const msg = "Institution is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        id,
        category_name: trimmedName,
        category_code: (formData.category_code || "").trim() || undefined,
        description: (formData.description || "").trim() || undefined,
        status: formData.status || "active",
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
      };

      const response = await fetch(RATION_CATEGORY_EDIT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || "Category update failed";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      navigate("/ration-inventory/category-master", {
        state: { toastMessage: "Ration category updated successfully", toastType: "success" }
      });
    } catch (apiError) {
      const msg = apiError.message || "Category update failed";
      setError(msg);
      setToast({ message: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

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
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Edit Category
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Update ration category master details
                </p>
              </div>

              <Error message={error} />

              {loadingPage ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                <RationCategoryForm
                  formData={formData}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  onCancel={() => navigate("/ration-inventory/category-master")}
                  buttonText={loading ? "Saving..." : "Update Category"}
                  institutions={institutions}
                  showInstitutionField={showInstitutionField}
                  loadingInstitutions={loadingInstitutions}
                  disabled={loading}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex w-[360px] items-center gap-3 rounded-xl border bg-white p-4 shadow-2xl ${
          toast.type === "success" ? "border-l-4 border-l-emerald-500 border-slate-100" : "border-l-4 border-l-red-500 border-slate-100"
        }`}>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-50 text-red-500">
            <AlertCircle size={18} className="stroke-[2.5]" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-bold text-slate-850 leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-650">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default EditRationCategory;
