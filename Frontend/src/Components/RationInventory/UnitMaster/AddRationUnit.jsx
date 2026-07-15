import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { X, AlertCircle } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import RationUnitForm from "./RationUnitForm";
import {
  RATION_UNIT_CREATE,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const defaultFormData = {
  unit_name: "",
  unit_code: "",
  allow_decimal: "true",
  description: "",
  status: "active",
};

const AddRationUnit = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin";
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

    if (name === "unit_code") {
      setFormData((currentData) => ({
        ...currentData,
        unit_code: value.toUpperCase(),
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

    const trimmedName = (formData.unit_name || "").trim();
    if (!trimmedName) {
      const msg = "Unit Name is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }

    const trimmedCode = (formData.unit_code || "").trim();
    if (!trimmedCode) {
      const msg = "Unit Code is required";
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
        unit_name: trimmedName,
        unit_code: trimmedCode,
        allow_decimal: formData.allow_decimal === "true",
        description: (formData.description || "").trim() || undefined,
        status: formData.status || "active",
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
      };

      const response = await fetch(RATION_UNIT_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || "Unit create failed";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      navigate("/ration-inventory/unit-master", {
        state: { toastMessage: "Ration unit created successfully", toastType: "success" }
      });
    } catch (apiError) {
      const msg = apiError.message || "Unit create failed";
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
                  Add Unit
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Create a new ration unit master record
                </p>
              </div>

              <Error message={error} />

              <RationUnitForm
                formData={formData}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onCancel={() => navigate("/ration-inventory/unit-master")}
                buttonText={loading ? "Saving..." : "Save Unit"}
                institutions={institutions}
                showInstitutionField={showInstitutionField}
                loadingInstitutions={loadingInstitutions}
                disabled={loading}
              />
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

export default AddRationUnit;
