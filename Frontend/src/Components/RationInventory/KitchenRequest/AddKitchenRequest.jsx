import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Button from "../../Common/Button";
import KitchenRequestForm from "./KitchenRequestForm";
import {
  RATION_KITCHEN_REQUEST_CREATE,
  RATION_KITCHEN_REQUEST_NEXT_NUMBER,
  TOKEN_KEY
} from "../../../Utils/Constants";

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const AddKitchenRequest = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    request_number: "",
    request_date: getTodayDateString(),
    required_date: "",
    meal_type_id: "",
    priority: "medium",
    remarks: "",
    institution_id: authUser?.institution_id 
      ? String(authUser.institution_id) 
      : (sessionStorage.getItem("selected_institution_id") || ""),
  });

  const [items, setItems] = useState([]);

  // Fetch next request sequence number
  useEffect(() => {
    const fetchNextNumber = async () => {
      const instId = formData.institution_id;
      if (!instId) return;

      try {
        const response = await fetch(RATION_KITCHEN_REQUEST_NEXT_NUMBER, {
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
        if (response.ok && data.data?.request_number) {
          setFormData((prev) => ({ ...prev, request_number: data.data.request_number }));
        }
      } catch (err) {
        console.error("Error fetching request sequence number:", err);
      }
    };

    fetchNextNumber();
  }, [formData.institution_id]);

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
      setError("At least one kitchen request item is required");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        status,
        items: items.map((i) => ({
          item_id: i.item_id,
          requested_quantity: Number(i.requested_quantity),
          remarks: i.remarks || ""
        })),
        institution_id: Number(formData.institution_id)
      };

      const response = await fetch(RATION_KITCHEN_REQUEST_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to create kitchen request");
        return;
      }

      setToast({
        message: `Kitchen request created successfully as ${status}`,
        type: "success",
      });

      setTimeout(() => {
        navigate("/ration-inventory/kitchen-request", {
          state: {
            toastMessage: `Kitchen request created successfully as ${status}`,
            toastType: "success",
          },
        });
      }, 1500);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
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
                New Kitchen Request
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Demand log for kitchen ingredients and items
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

          <KitchenRequestForm
            formData={formData}
            setFormData={setFormData}
            items={items}
            setItems={setItems}
            onSubmit={handleSubmit}
            submitLoading={loading}
          />
        </main>
      </div>
    </div>
  );
};

export default AddKitchenRequest;
