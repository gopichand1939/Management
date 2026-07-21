import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import RationPurchaseForm from "./RationPurchaseForm";
import {
  RATION_PURCHASE_VIEW,
  RATION_PURCHASE_EDIT,
  TOKEN_KEY
} from "../../../Utils/Constants";

const EditRationPurchase = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);

  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    purchase_number: "",
    purchase_date: "",
    supplier_id: "",
    supplier_invoice_number: "",
    invoice_date: "",
    notes: "",
    other_charges: "0",
    paid_amount: "0",
    status: "draft",
    institution_id: "",
  });

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3050);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load purchase detail
  useEffect(() => {
    const fetchPurchase = async () => {
      setLoadingPage(true);
      setError("");

      try {
        const instId = location.state?.institution_id || authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
        const response = await fetch(RATION_PURCHASE_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: Number(id),
            institution_id: instId ? Number(instId) : undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Failed to fetch purchase details");
          return;
        }

        const purchase = data.data;
        if (purchase) {
          if (purchase.status !== "draft") {
            setError("Only draft purchases can be edited");
            return;
          }

          // Format dates
          const fmtPurchaseDate = purchase.purchase_date
            ? new Date(purchase.purchase_date).toISOString().substring(0, 10)
            : "";
          const fmtInvoiceDate = purchase.invoice_date
            ? new Date(purchase.invoice_date).toISOString().substring(0, 10)
            : "";

          setFormData({
            purchase_number: purchase.purchase_number || "",
            purchase_date: fmtPurchaseDate,
            supplier_id: purchase.supplier?.id ? String(purchase.supplier.id) : (purchase.supplier_id ? String(purchase.supplier_id) : ""),
            supplier_invoice_number: purchase.supplier_invoice_number || purchase.invoice_number || "",
            invoice_date: fmtInvoiceDate,
            notes: purchase.notes || "",
            other_charges: purchase.other_charges ? String(purchase.other_charges) : "0",
            paid_amount: purchase.paid_amount ? String(purchase.paid_amount) : "0",
            status: purchase.status || "draft",
            institution_id: purchase.institution_id ? String(purchase.institution_id) : "",
          });

          const mappedItems = (purchase.items || []).map((it) => ({
            item_id: it.item_id,
            item_name: it.item_name,
            item_code: it.item_code,
            sku_id: it.sku_id,
            barcode: it.barcode,
            unit_code: it.unit?.unit_code || "",
            quantity: it.purchase_information?.quantity || 0,
            free_quantity: it.purchase_information?.free_quantity || 0,
            unit_price: it.purchase_information?.unit_price || 0,
            discount_percentage: it.purchase_information?.discount_percentage || 0,
            gst_percentage: it.purchase_information?.gst_percentage || 0,
            batch_number: it.batch?.batch_number || null,
            manufacturing_date: it.batch?.manufacturing_date || null,
            expiry_date: it.batch?.expiry_date || null,
            batch_tracking: it.item_configuration?.batch_tracking || false,
            expiry_tracking: it.item_configuration?.expiry_tracking || false,
          }));

          setItems(mappedItems);
        }
      } catch (err) {
        setError(err.message || "Failed to load purchase details");
      } finally {
        setLoadingPage(false);
      }
    };

    fetchPurchase();
  }, [id, authUser]);

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
        id: Number(id),
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

      const response = await fetch(RATION_PURCHASE_EDIT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || "Purchase update failed";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      navigate("/ration-inventory/purchases/history", {
        state: {
          toastMessage: `Ration purchase entry updated successfully as ${status}`,
          toastType: "success",
        },
      });
    } catch (apiError) {
      const msg = apiError.message || "Purchase update failed";
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
                  Edit Purchase Entry
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Modify details of the draft purchase order
                </p>
              </div>

              <Error message={error} />

              {loadingPage ? (
                <div className="bg-white border border-slate-100 rounded-2xl w-full p-8 shadow-sm flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                <RationPurchaseForm
                  formData={formData}
                  items={items}
                  setFormData={setFormData}
                  setItems={setItems}
                  onSubmit={handleSubmit}
                  onCancel={() => navigate("/ration-inventory/purchases/history")}
                  buttonText={loading ? "Saving..." : "Save Changes"}
                  disabled={loading}
                  isEdit={true}
                />
              )}

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

export default EditRationPurchase;
