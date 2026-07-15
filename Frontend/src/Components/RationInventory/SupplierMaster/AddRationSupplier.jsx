import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import RationSupplierForm from "./RationSupplierForm";
import {
  RATION_SUPPLIER_CREATE,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const defaultFormData = {
  supplier_name: "",
  supplier_code: "",
  contact_person: "",
  phone: "",
  alternate_phone: "",
  email: "",
  gst_number: "",
  pan_number: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  payment_terms: "",
  description: "",
  status: "active",
};

const AddRationSupplier = () => {
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
      const timer = setTimeout(() => setToast(null), 3050);
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

    if (name === "supplier_code") {
      setFormData((currentData) => ({
        ...currentData,
        supplier_code: value.toUpperCase(),
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

    const trimmedName = (formData.supplier_name || "").trim();
    const trimmedCode = (formData.supplier_code || "").trim();
    const trimmedPhone = (formData.phone || "").trim();

    if (!trimmedName) {
      const msg = "Supplier Name is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }

    if (!trimmedCode) {
      const msg = "Supplier Code is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }

    if (!trimmedPhone) {
      const msg = "Phone Number is required";
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
        ...formData,
        supplier_name: trimmedName,
        supplier_code: trimmedCode,
        phone: trimmedPhone,
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
      };

      const response = await fetch(RATION_SUPPLIER_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || "Supplier create failed";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      navigate("/ration-inventory/supplier-master", {
        state: { toastMessage: "Ration supplier created successfully", toastType: "success" }
      });
    } catch (apiError) {
      const msg = apiError.message || "Supplier create failed";
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
                  Add Supplier
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Create a new ration supplier master record
                </p>
              </div>

              <Error message={error} />

              <RationSupplierForm
                formData={formData}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onCancel={() => navigate("/ration-inventory/supplier-master")}
                buttonText={loading ? "Saving..." : "Save Supplier"}
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
        <div className={`fixed bottom-6 right-6 z-[9999] flex w-[360px] items-center gap-3.5 rounded-2xl border bg-white/95 p-4.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] backdrop-blur-md ${
          toast.type === "success"
            ? "border-emerald-100 border-l-4 border-l-emerald-500"
            : "border-red-100 border-l-4 border-l-red-500"
        }`}>
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            toast.type === "success" ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
          }`}>
            {toast.type === "success" ? (
              <CheckCircle2 size={20} className="stroke-[2.5]" />
            ) : (
              <AlertCircle size={20} className="stroke-[2.5]" />
            )}
          </div>
          <div className="flex-1 text-left">
            <h4 className={`text-[10px] font-black uppercase tracking-wider ${
              toast.type === "success" ? "text-emerald-600" : "text-red-600"
            }`}>
              {toast.type === "success" ? "Success" : "Error"}
            </h4>
            <p className="mt-0.5 text-xs font-semibold text-slate-700 leading-snug">
              {toast.message}
            </p>
          </div>
          <button onClick={() => setToast(null)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100/50 text-slate-400 hover:text-slate-650 transition cursor-pointer">
            <X size={14} className="stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AddRationSupplier;
