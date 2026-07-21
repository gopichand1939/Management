import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import RationPurchaseForm from "./RationPurchaseForm";
import {
  RATION_PURCHASE_CREATE,
  RATION_PURCHASE_NEXT_NUMBER,
  TOKEN_KEY
} from "../../../Utils/Constants";

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const AddRationPurchase = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    purchase_number: "",
    purchase_date: getTodayDateString(),
    supplier_id: "",
    supplier_invoice_number: "",
    invoice_date: "",
    notes: "",
    other_charges: "0",
    paid_amount: "0",
    institution_id: authUser?.institution_id 
      ? String(authUser.institution_id) 
      : (sessionStorage.getItem("selected_institution_id") || ""),
  });

  const [items, setItems] = useState([]);

  // Fetch next purchase number
  useEffect(() => {
    const fetchNextNumber = async () => {
      const instId = authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
      if (!instId) return;

      try {
        const response = await fetch(RATION_PURCHASE_NEXT_NUMBER, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institution_id: Number(instId),
          }),
        });
        const data = await response.json();
        if (response.ok && data.data?.purchase_number) {
          setFormData((prev) => ({ ...prev, purchase_number: data.data.purchase_number }));
        }
      } catch (err) {
        console.error("Error fetching purchase number sequence:", err);
      }
    };

    fetchNextNumber();
  }, [authUser]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3050);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSubmit = async (status, totals) => {
    setError("");

    if (!formData.purchase_date) {
      const msg = "Purchase Date is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }
    if (!formData.supplier_id) {
      const msg = "Supplier is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }
    if (items.length === 0) {
      const msg = "At least one purchase item is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        purchase_date: formData.purchase_date,
        supplier_id: Number(formData.supplier_id),
        supplier_invoice_number: formData.supplier_invoice_number || null,
        invoice_date: formData.invoice_date || null,
        notes: formData.notes || null,
        other_charges: parseFloat(formData.other_charges) || 0,
        paid_amount: parseFloat(formData.paid_amount) || 0,
        status: status, // 'draft' or 'completed'
        items: items.map((it) => ({
          item_id: it.item_id,
          quantity: it.quantity,
          free_quantity: it.free_quantity || 0,
          unit_price: it.unit_price,
          discount_percentage: it.discount_percentage || 0,
          gst_percentage: it.gst_percentage || 0,
          batch_number: it.batch_number || null,
          manufacturing_date: it.manufacturing_date || null,
          expiry_date: it.expiry_date || null,
        })),
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
      };

      const response = await fetch(RATION_PURCHASE_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || "Purchase creation failed";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      navigate("/ration-inventory/purchases/history", {
        state: {
          toastMessage: `Ration purchase entry created successfully as ${status}`,
          toastType: "success",
        },
      });
    } catch (apiError) {
      const msg = apiError.message || "Purchase creation failed";
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
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
              
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  New Purchase Entry
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Add items to ration inventory via scan or manual entry
                </p>
              </div>

              <Error message={error} />

              <RationPurchaseForm
                formData={formData}
                items={items}
                setFormData={setFormData}
                setItems={setItems}
                onSubmit={handleSubmit}
                onCancel={() => navigate("/ration-inventory/purchases")}
                buttonText={loading ? "Saving..." : "Save Purchase"}
                disabled={loading}
              />

            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div className={`fixed top-24 right-6 z-[9999] flex w-[360px] items-center gap-3.5 rounded-2xl border bg-white/95 p-4.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] backdrop-blur-md ${
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

export default AddRationPurchase;
