import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { X, AlertCircle } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import CatalogItemForm from "./CatalogItemForm";
import {
  CATALOG_ITEM_CREATE,
  CATALOG_CATEGORY_DROPDOWN,
  RATION_UNIT_LIST, // standard list or dropdown
  RATION_UNIT_DELETE, // let's check constants, we had RATION_UNIT_LIST which is unit lists, but let's check if we have a unit dropdown or list.
  // Wait, in Constants.jsx we have GET_UNIT: BASE_URL + "/ration-unit/dropdown"
  GET_UNIT,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const defaultFormData = {
  name: "",
  alternate_name: "",
  clover_id: "",
  description: "",
  price: 0,
  price_type: "Fixed",
  price_unit: "",
  cost: 0,
  product_code: "",
  sku: "",
  barcode: "",
  quantity: 0,
  is_hidden: "No",
  default_tax_rates: "Yes",
  is_non_revenue_item: "No",
  printer_labels: "",
  modifier_groups: "",
  category_id: "",
  unit_id: "",
  tax_rates: "",
  variant_attribute: "",
  variant_option: "",
  status: "active",
};

const AddCatalogItem = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
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

  // Load institutions list if super admin
  useEffect(() => {
    const fetchInstitutions = async () => {
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
            setFormData((current) => ({ ...current, institution_id: String(list[0].id) }));
          }
        }
      } catch (err) {
        console.error("Failed to load institutions:", err);
      }
    };
    fetchInstitutions();
  }, [showInstitutionField]);

  // Load dropdown selections when institution changes
  useEffect(() => {
    const loadDropdowns = async () => {
      const instId = authUser?.institution_id || formData.institution_id;
      if (!instId) return;

      setLoadingDropdowns(true);
      try {
        // Fetch Categories
        const catRes = await fetch(CATALOG_CATEGORY_DROPDOWN, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });
        const catData = await catRes.json();
        
        // Fetch Units (shared units table)
        const unitRes = await fetch(GET_UNIT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });
        const unitData = await unitRes.json();

        if (catRes.ok) setCategories(catData.data || []);
        if (unitRes.ok) setUnits(unitData.data || []);
      } catch (err) {
        console.error("Failed to fetch dropdown datasets:", err);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    loadDropdowns();
  }, [formData.institution_id, authUser]);

  // Auto-fill active institution details
  useEffect(() => {
    if (authUser?.institution_id && !formData.institution_id) {
      setFormData((current) => ({ ...current, institution_id: String(authUser.institution_id) }));
    } else if (!formData.institution_id) {
      const savedInstId = sessionStorage.getItem("selected_institution_id");
      if (savedInstId) {
        setFormData((current) => ({ ...current, institution_id: savedInstId }));
      }
    }
  }, [authUser, formData.institution_id]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Item Name is required");
      return;
    }

    if (showInstitutionField && !formData.institution_id) {
      setError("Institution selection is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        institution_id: Number(formData.institution_id),
        price: Number(formData.price) || 0,
        cost: Number(formData.cost) || 0,
        quantity: Number(formData.quantity) || 0,
        category_id: formData.category_id ? Number(formData.category_id) : undefined,
        unit_id: formData.unit_id ? Number(formData.unit_id) : undefined,
      };

      const response = await fetch(CATALOG_ITEM_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = data.message || "Failed to create catalog item";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      navigate("/catalog-management/item-master", {
        state: { toastMessage: "Catalog item created successfully", toastType: "success" },
      });
    } catch (err) {
      const msg = err.message || "Failed to create catalog item";
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
                Add Catalog Item
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Insert a new product record to the POS catalog template
              </p>
            </div>

            {error && <Error error={error} className="mb-6" />}

            {loadingDropdowns ? (
              <div className="flex justify-center py-12">
                <PageLoader />
              </div>
            ) : (
              <div className="flex justify-start">
                <CatalogItemForm
                  formData={formData}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  onCancel={() => navigate("/catalog-management/item-master")}
                  buttonText={loading ? "Creating..." : "Create Item"}
                  categories={categories}
                  units={units}
                  disabled={loading}
                  setToast={setToast}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddCatalogItem;
