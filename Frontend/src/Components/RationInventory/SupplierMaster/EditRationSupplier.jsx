import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import RationSupplierForm from "./RationSupplierForm";
import {
  RATION_SUPPLIER_EDIT,
  RATION_SUPPLIER_VIEW,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const EditRationSupplier = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);
  const showInstitutionField = authUser?.role === "super_admin" || !authUser?.institution_id;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [formData, setFormData] = useState({
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
    institution_id: "",
  });
  const [toast, setToast] = useState(null);

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
    const getSupplier = async () => {
      setLoadingPage(true);
      setError("");

      try {
        const instId = location.state?.institution_id || authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
        const response = await fetch(RATION_SUPPLIER_VIEW, {
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
          setError(data.message || "Ration supplier fetch failed");
          return;
        }

        const supplier = data.data;
        if (supplier) {
          setFormData({
            supplier_name: supplier.supplier_name || "",
            supplier_code: supplier.supplier_code || "",
            contact_person: supplier.contact_person || "",
            phone: supplier.phone || "",
            alternate_phone: supplier.alternate_phone || "",
            email: supplier.email || "",
            gst_number: supplier.gst_number || "",
            pan_number: supplier.pan_number || "",
            address: supplier.address || "",
            city: supplier.city || "",
            state: supplier.state || "",
            pincode: supplier.pincode || "",
            payment_terms: supplier.payment_terms || "",
            description: supplier.description || "",
            status: supplier.status || "active",
            institution_id: supplier.institution_id ? String(supplier.institution_id) : "",
          });
        }
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingPage(false);
      }
    };

    getSupplier();
  }, [id]);

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
        id,
        supplier_name: trimmedName,
        supplier_code: trimmedCode,
        phone: trimmedPhone,
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
      };

      const response = await fetch(RATION_SUPPLIER_EDIT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || "Supplier edit failed";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      navigate("/ration-inventory/supplier-master", {
        state: { toastMessage: "Ration supplier updated successfully", toastType: "success" }
      });
    } catch (apiError) {
      const msg = apiError.message || "Supplier edit failed";
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
                  Edit Supplier
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Modify details of the ration supplier master record
                </p>
              </div>

              <Error message={error} />

              {loadingPage ? (
                <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-[720px] p-8 shadow-sm flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                <RationSupplierForm
                  formData={formData}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  onCancel={() => navigate("/ration-inventory/supplier-master")}
                  buttonText={loading ? "Saving..." : "Save Changes"}
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

export default EditRationSupplier;
