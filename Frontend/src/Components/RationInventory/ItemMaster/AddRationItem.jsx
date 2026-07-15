import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { X, AlertCircle } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import RationItemForm from "./RationItemForm";
import {
  RATION_ITEM_CREATE,
  RATION_ITEM_NEXT_BARCODE,
  GET_CATOGORY,
  GET_UNIT,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const defaultFormData = {
  item_name: "",
  item_code: "",
  barcode: "",
  category_id: "",
  unit_id: "",
  description: "",
  item_image_file: null,
  minimum_stock: "0",
  maximum_stock: "",
  reorder_quantity: "",
  default_purchase_price: "0.00",
  gst_percentage: "0",
  batch_tracking: false,
  expiry_tracking: false,
  status: "active",
};

const AddRationItem = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin";
  const showInstitutionField = authUser?.role === "super_admin" || !authUser?.institution_id;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  
  const [institutions, setInstitutions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  
  const [formData, setFormData] = useState({
    ...defaultFormData,
    institution_id: authUser?.institution_id 
      ? String(authUser.institution_id) 
      : (sessionStorage.getItem("selected_institution_id") || ""),
  });
  const [toast, setToast] = useState(null);

  // Load institutions if Super Admin
  useEffect(() => {
    const getInstitutions = async () => {
      if (!showInstitutionField) return;
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
        if (response.ok) {
          const list = data.institutions || data.data || [];
          setInstitutions(list);
          if (!formData.institution_id && list.length === 1) {
            setFormData((current) => ({
              ...current,
              institution_id: String(list[0].id),
            }));
          }
        }
      } catch (err) {
        console.error("Error fetching institutions:", err);
      }
    };

    getInstitutions();
  }, [showInstitutionField]);

  // Load categories & units once institution_id is selected or available
  useEffect(() => {
    const loadDropdowns = async () => {
      const targetInstId = formData.institution_id;
      if (!targetInstId) {
        setCategories([]);
        setUnits([]);
        return;
      }

      setLoadingDropdowns(true);
      setError("");

      try {
        const bodyObj = { institution_id: Number(targetInstId) };
        const headersObj = {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        };

        const [catRes, unitRes] = await Promise.all([
          fetch(GET_CATOGORY, {
            method: "POST",
            headers: headersObj,
            body: JSON.stringify(bodyObj),
          }),
          fetch(GET_UNIT, {
            method: "POST",
            headers: headersObj,
            body: JSON.stringify(bodyObj),
          }),
        ]);

        const catData = await catRes.json();
        const unitData = await unitRes.json();

        if (catRes.ok && catData.success) {
          setCategories(catData.categories || catData.data || []);
        } else {
          setError(catData.message || "Failed to load categories");
        }

        if (unitRes.ok && unitData.success) {
          setUnits(unitData.units || unitData.data || []);
        } else {
          setError(unitData.message || "Failed to load units of measure");
        }
      } catch (err) {
        console.error("Error loading dropdown data:", err);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    loadDropdowns();
  }, [formData.institution_id]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (authUser?.institution_id && !formData.institution_id) {
      setFormData((current) => ({
        ...current,
        institution_id: String(authUser.institution_id),
      }));
    }
  }, [authUser, formData.institution_id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "item_code" || name === "barcode") {
      setFormData((current) => ({
        ...current,
        [name]: value.toUpperCase(),
      }));
      return;
    }

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAutoGenerateBarcode = async () => {
    const targetInstId = formData.institution_id;
    if (!targetInstId) {
      const msg = "Please select an institution first";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }

    try {
      const response = await fetch(RATION_ITEM_NEXT_BARCODE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ institution_id: Number(targetInstId) }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setFormData((current) => ({
          ...current,
          barcode: data.data.barcode,
        }));
      } else {
        setError(data.message || "Failed to generate barcode");
      }
    } catch (err) {
      setError(err.message || "Failed to generate barcode");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // Trim validation
    const trimmedName = (formData.item_name || "").trim();
    const trimmedCode = (formData.item_code || "").trim();
    const trimmedBarcode = (formData.barcode || "").trim();

    if (!trimmedName) {
      const msg = "Item Name is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }
    if (!trimmedCode) {
      const msg = "Item Code is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }
    if (!trimmedBarcode) {
      const msg = "Barcode is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }
    if (!formData.category_id) {
      const msg = "Category is required";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }
    if (!formData.unit_id) {
      const msg = "Unit of Measure is required";
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
      const submitData = new FormData();
      submitData.append("item_name", trimmedName);
      submitData.append("item_code", trimmedCode);
      submitData.append("barcode", trimmedBarcode);
      submitData.append("category_id", formData.category_id);
      submitData.append("unit_id", formData.unit_id);
      submitData.append("status", formData.status);
      
      if (formData.description && formData.description.trim()) {
        submitData.append("description", formData.description.trim());
      }
      if (formData.minimum_stock) {
        submitData.append("minimum_stock", formData.minimum_stock);
      }
      if (formData.maximum_stock) {
        submitData.append("maximum_stock", formData.maximum_stock);
      }
      if (formData.reorder_quantity) {
        submitData.append("reorder_quantity", formData.reorder_quantity);
      }
      if (formData.default_purchase_price) {
        submitData.append("default_purchase_price", formData.default_purchase_price);
      }
      if (formData.gst_percentage) {
        submitData.append("gst_percentage", formData.gst_percentage);
      }
      submitData.append("batch_tracking", String(formData.batch_tracking));
      submitData.append("expiry_tracking", String(formData.expiry_tracking));

      if (formData.institution_id) {
        submitData.append("institution_id", formData.institution_id);
      }

      if (formData.item_image_file) {
        submitData.append("item_image", formData.item_image_file);
      }

      const response = await fetch(RATION_ITEM_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: submitData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to create ration item");
        setToast({ message: data.message || "Failed to create ration item", type: "error" });
        return;
      }

      setToast({ message: "Ration item created successfully", type: "success" });
      setTimeout(() => {
        const routePath = isSuperAdmin ? "/superadmin/ration-inventory/item-master" : "/ration-inventory/item-master";
        navigate(routePath);
      }, 1500);
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      setToast({ message: err.message || "An unexpected error occurred", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const routePath = isSuperAdmin ? "/superadmin/ration-inventory/item-master" : "/ration-inventory/item-master";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar />
        <main className="flex-1 p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Add Ration Item
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Create a new ration item with automatic SKU mapping
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-700 text-sm font-semibold max-w-6xl">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingDropdowns ? (
            <PageLoader message="Loading categories and units..." />
          ) : (
            <RationItemForm
              formData={formData}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onCancel={() => navigate(routePath)}
              buttonText={loading ? "Saving..." : "Save Item"}
              categories={categories}
              units={units}
              institutions={institutions}
              showInstitutionField={showInstitutionField}
              loadingInstitutions={false}
              disabled={loading}
              onAutoGenerateBarcode={handleAutoGenerateBarcode}
            />
          )}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border bg-white shadow-xl max-w-md animate-in slide-in-from-bottom duration-300">
          <div className={`h-2 w-2 rounded-full ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
          <span className="text-xs font-bold text-slate-700">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default AddRationItem;
