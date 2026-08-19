import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { X, AlertCircle } from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import CatalogItemForm from "./CatalogItemForm";
import {
  CATALOG_ITEM_VIEW,
  CATALOG_ITEM_EDIT,
  CATALOG_CATEGORY_DROPDOWN,
  GET_UNIT,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const EditCatalogItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [formData, setFormData] = useState({
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
    institution_id: "",
  });

  const [toast, setToast] = useState(null);

  // Fetch Item details and load dropdown catalogs
  useEffect(() => {
    const fetchItemDetailsAndDropdowns = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        // 1. Fetch Item Data
        const response = await fetch(CATALOG_ITEM_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: Number(id) }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Failed to load item details");
          setLoading(false);
          return;
        }

        const item = data.data;
        if (item) {
          setFormData({
            id: item.id,
            name: item.name || "",
            alternate_name: item.alternate_name || "",
            clover_id: item.clover_id || "",
            description: item.description || "",
            price: item.price !== undefined ? parseFloat(item.price) : 0,
            price_type: item.price_type || "Fixed",
            price_unit: item.price_unit || "",
            cost: item.cost !== undefined ? parseFloat(item.cost) : 0,
            product_code: item.product_code || "",
            sku: item.sku || "",
            barcode: item.barcode || "",
            quantity: item.quantity !== undefined ? parseInt(item.quantity) : 0,
            is_hidden: item.is_hidden || "No",
            default_tax_rates: item.default_tax_rates || "Yes",
            is_non_revenue_item: item.is_non_revenue_item || "No",
            printer_labels: item.printer_labels || "",
            modifier_groups: item.modifier_groups || "",
            category_id: item.category_id || "",
            unit_id: item.unit_id || "",
            tax_rates: item.tax_rates || "",
            variant_attribute: item.variant_attribute || "",
            variant_option: item.variant_option || "",
            status: item.status || "active",
            institution_id: String(item.institution_id),
          });

          // 2. Fetch Dropdowns
          const catRes = await fetch(CATALOG_CATEGORY_DROPDOWN, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ institution_id: Number(item.institution_id) }),
          });
          const catData = await catRes.json();
          
          const unitRes = await fetch(GET_UNIT, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ institution_id: Number(item.institution_id) }),
          });
          const unitData = await unitRes.json();

          if (catRes.ok) setCategories(catData.data || []);
          if (unitRes.ok) setUnits(unitData.data || []);
        }
      } catch (err) {
        setError(err.message || "Failed to load item details");
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetailsAndDropdowns();
  }, [id]);

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

    setSaving(true);
    try {
      const payload = {
        ...formData,
        id: Number(id),
        institution_id: Number(formData.institution_id),
        price: Number(formData.price) || 0,
        cost: Number(formData.cost) || 0,
        quantity: Number(formData.quantity) || 0,
        category_id: formData.category_id ? Number(formData.category_id) : undefined,
        unit_id: formData.unit_id ? Number(formData.unit_id) : undefined,
      };

      const response = await fetch(CATALOG_ITEM_EDIT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = data.message || "Failed to update item";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      navigate("/catalog-management/item-master", {
        state: { toastMessage: "Catalog item updated successfully", toastType: "success" },
      });
    } catch (err) {
      const msg = err.message || "Failed to update item";
      setError(msg);
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
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
                Edit Catalog Item
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Modify POS attributes, costs, and configurations for this product
              </p>
            </div>

            {error && <Error error={error} className="mb-6" />}

            {loading ? (
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
                  buttonText={saving ? "Saving..." : "Save Changes"}
                  categories={categories}
                  units={units}
                  disabled={saving}
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

export default EditCatalogItem;
