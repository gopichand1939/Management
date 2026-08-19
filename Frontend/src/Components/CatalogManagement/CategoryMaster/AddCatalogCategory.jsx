import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { X, AlertCircle } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import CatalogCategoryForm from "./CatalogCategoryForm";
import {
  CATALOG_CATEGORY_CREATE,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const defaultFormData = {
  category_name: "",
  category_code: "",
  description: "",
  status: "active",
};

const AddCatalogCategory = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const showInstitutionField = authUser?.role === "super_admin" || !authUser?.institution_id;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [formData, setFormData] = useState({
    ...defaultFormData,
    institution_id: authUser?.institution_id 
      ? String(authUser.institution_id) 
      : (sessionStorage.getItem("selected_institution_id") || ""),
  });
  const [toast, setToast] = useState(null);

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

        const institutionList = data.institutions || data.data || [];
        setInstitutions(institutionList);

        if (!formData.institution_id && institutionList.length === 1) {
          setFormData((currentData) => ({
            ...currentData,
            institution_id: String(institutionList[0].id),
          }));
        }
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [showInstitutionField]);

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
    } else if (!formData.institution_id) {
      const savedInstId = sessionStorage.getItem("selected_institution_id");
      if (savedInstId) {
        setFormData((currentData) => ({
          ...currentData,
          institution_id: savedInstId,
        }));
      }
    }
  }, [authUser, formData.institution_id]);

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
        category_name: trimmedName,
        category_code: (formData.category_code || "").trim() || undefined,
        description: (formData.description || "").trim() || undefined,
        status: formData.status || "active",
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
      };

      const response = await fetch(CATALOG_CATEGORY_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || "Category create failed";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      navigate("/catalog-management/category-master", {
        state: { toastMessage: "Catalog category created successfully", toastType: "success" }
      });
    } catch (apiError) {
      const msg = apiError.message || "Category create failed";
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

        <main className="flex-1 p-6 md:p-8">
          {/* Toast Notification */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border transition-all duration-300 ${
              toast.type === "success" 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}>
              {toast.type === "error" && <AlertCircle size={18} />}
              <span className="text-sm font-semibold">{toast.message}</span>
              <button 
                onClick={() => setToast(null)}
                className="ml-2 hover:opacity-75"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mx-auto max-w-[1280px]">
            {/* Header section */}
            <div className="flex flex-col gap-1.5 mb-8 text-left">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Add Catalog Category
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Create a new category for your product catalog
              </p>
            </div>

            {error && <Error error={error} className="mb-6" />}

            {loading ? (
              <div className="flex justify-center py-12">
                <PageLoader />
              </div>
            ) : (
              <div className="flex justify-start">
                <CatalogCategoryForm
                  formData={formData}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  onCancel={() => navigate("/catalog-management/category-master")}
                  buttonText={loading ? "Creating..." : "Create Category"}
                  institutions={institutions}
                  showInstitutionField={showInstitutionField}
                  loadingInstitutions={loadingInstitutions}
                  disabled={loading}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddCatalogCategory;
