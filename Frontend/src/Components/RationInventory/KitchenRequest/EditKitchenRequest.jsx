import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Button from "../../Common/Button";
import KitchenRequestForm from "./KitchenRequestForm";
import {
  RATION_KITCHEN_REQUEST_VIEW,
  RATION_KITCHEN_REQUEST_EDIT,
  TOKEN_KEY
} from "../../../Utils/Constants";

const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch (e) {
    return String(value);
  }
};

const EditKitchenRequest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    id: "",
    request_number: "",
    request_date: "",
    required_date: "",
    meal_type_id: "",
    priority: "medium",
    remarks: "",
    institution_id: "",
  });

  const [items, setItems] = useState([]);

  // Fetch kitchen request details
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError("");

      const institutionId = location.state?.institution_id || authUser?.institution_id;

      try {
        const response = await fetch(RATION_KITCHEN_REQUEST_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: Number(id),
            institution_id: institutionId ? Number(institutionId) : undefined
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Failed to load kitchen request details");
          return;
        }

        const { header, items: requestItems } = data.data;

        if (header.status !== 'draft' && header.status !== 'pending') {
          setError(`Cannot edit a request in ${header.status?.toUpperCase()} status`);
          return;
        }

        setFormData({
          id: String(header.id),
          request_number: header.request_number,
          request_date: formatDate(header.request_date),
          required_date: formatDate(header.required_date),
          meal_type_id: String(header.meal_type_id),
          priority: header.priority,
          remarks: header.remarks || "",
          institution_id: String(header.institution_id),
        });

        setItems(requestItems.map((item) => ({
          item_id: item.item_id,
          item_name: item.item_name,
          item_code: item.item_code,
          sku_id: item.sku_id,
          barcode: item.barcode,
          category_name: item.category_name,
          unit_code: item.unit_code,
          current_stock: item.current_stock,
          minimum_stock: item.minimum_stock,
          requested_quantity: item.requested_quantity,
          remarks: item.remarks || ""
        })));
      } catch (err) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetails();
  }, [id, authUser]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSubmit = async (status) => {
    setError("");

    if (!formData.required_date) {
      setError("Required date is required");
      return;
    }
    if (!formData.meal_type_id) {
      setError("Meal Type is required");
      return;
    }
    if (items.length === 0) {
      setError("At least one item is required");
      return;
    }

    setSubmitLoading(true);

    try {
      const payload = {
        id: Number(formData.id),
        request_date: formData.request_date,
        required_date: formData.required_date,
        meal_type_id: Number(formData.meal_type_id),
        priority: formData.priority,
        remarks: formData.remarks,
        status,
        items: items.map((i) => ({
          item_id: i.item_id,
          requested_quantity: Number(i.requested_quantity),
          remarks: i.remarks || ""
        })),
        institution_id: Number(formData.institution_id)
      };

      const response = await fetch(RATION_KITCHEN_REQUEST_EDIT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to update kitchen request");
        return;
      }

      setToast({
        message: `Kitchen request updated successfully as ${status}`,
        type: "success",
      });

      setTimeout(() => {
        navigate("/ration-inventory/kitchen-request", {
          state: {
            toastMessage: `Kitchen request updated successfully as ${status}`,
            toastType: "success",
          },
        });
      }, 1500);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => navigate("/ration-inventory/kitchen-request")}
              className="!p-2.5"
            />
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Edit Kitchen Request
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Modify details of Draft/Pending request: {formData.request_number}
              </p>
            </div>
          </div>

          <Error message={error} />

          {toast && (
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border p-4 shadow-lg bg-emerald-50 text-emerald-800 border-emerald-100 transition-all">
              <CheckCircle2 size={18} />
              <span className="text-sm font-bold">{toast.message}</span>
            </div>
          )}

          {loading ? (
            <div className="p-8 flex justify-center">
              <PageLoader />
            </div>
          ) : (
            <KitchenRequestForm
              formData={formData}
              setFormData={setFormData}
              items={items}
              setItems={setItems}
              onSubmit={handleSubmit}
              isEdit
              submitLoading={submitLoading}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default EditKitchenRequest;
