import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Edit2, 
  Tag, 
  Hash, 
  DollarSign, 
  Scale, 
  Layers, 
  Eye, 
  EyeOff, 
  Printer, 
  Sliders, 
  Calendar, 
  FileText 
} from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Button from "../../Common/Button";
import { CATALOG_ITEM_VIEW, TOKEN_KEY } from "../../../Utils/Constants";

const ViewCatalogItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState(null);

  useEffect(() => {
    const fetchItemDetails = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
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
          return;
        }

        setItem(data.data);
      } catch (err) {
        setError(err.message || "Failed to load item details");
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [id]);

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
          <div className="mx-auto max-w-[1280px]">
            {/* Header & Back Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <button
                onClick={() => navigate("/catalog-management/item-master")}
                className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft size={16} />
                Back to List
              </button>

              {item && (
                <Button
                  onClick={() => navigate(`/catalog-management/item-master/edit/${item.id}`)}
                  className="flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit Item
                </Button>
              )}
            </div>

            {error && <Error error={error} className="mb-6" />}

            {loading ? (
              <div className="flex justify-center py-12">
                <PageLoader />
              </div>
            ) : item ? (
              <div className="flex flex-col gap-6 max-w-[960px] text-left">
                
                {/* Main Identity Banner Card */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{item.name}</h2>
                    {item.alternate_name && (
                      <p className="text-sm font-semibold text-slate-500 mt-1">
                        Alt Name: {item.alternate_name}
                      </p>
                    )}
                    <span className="text-xs font-bold text-slate-400 mt-2 block">
                      Item ID: #{item.id} {item.clover_id ? `| Clover ID: ${item.clover_id}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                      item.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-slate-100 text-slate-700 border border-slate-150"
                    }`}>
                      {item.status === "active" ? <Eye size={12} /> : <EyeOff size={12} />}
                      {item.status === "active" ? "Active" : "Inactive"}
                    </span>
                    {item.is_hidden === "Yes" && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 text-xs font-bold">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid sections */}
                <div className="grid gap-6 md:grid-cols-2">
                  
                  {/* Category & Unit Information */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <Layers size={14} className="text-orange-500" />
                      Category & Measurement
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Category</span>
                        <span className="text-sm font-semibold text-slate-800 mt-1 block">
                          {item.category_name || "Uncategorized"} {item.category_code ? `(${item.category_code})` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Unit of Measure</span>
                        <span className="text-sm font-semibold text-slate-800 mt-1 block">
                          {item.unit_name || "—"} {item.unit_code ? `(${item.unit_code})` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock & Financials */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <DollarSign size={14} className="text-orange-500" />
                      Financials & Stock
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Retail Price</span>
                        <span className="text-base font-black text-slate-900 mt-1 block">
                          ${parseFloat(item.price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Wholesale Cost</span>
                        <span className="text-base font-black text-slate-900 mt-1 block">
                          ${parseFloat(item.cost || 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Price Type</span>
                        <span className="text-xs font-bold text-slate-700 mt-1 block">
                          {item.price_type || "Fixed"} {item.price_unit ? `per ${item.price_unit}` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Stock Level</span>
                        <span className={`text-base font-black mt-1 block ${
                          item.quantity <= 0 ? "text-rose-600" : "text-emerald-700"
                        }`}>
                          {item.quantity || 0} units
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Codes & SKUs */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <Hash size={14} className="text-orange-500" />
                      SKU & Codes
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">SKU</span>
                          <span className="font-mono text-xs font-bold text-slate-800 mt-1 block uppercase">
                            {item.sku || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Product Code</span>
                          <span className="font-mono text-xs font-bold text-slate-800 mt-1 block uppercase">
                            {item.product_code || "—"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Barcode Value</span>
                        <span className="font-mono text-xs font-bold text-slate-800 mt-1 block uppercase">
                          {item.barcode || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* POS Configuration */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <Printer size={14} className="text-orange-500" />
                      Clover POS Options
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Non-revenue item?</span>
                        <span className="text-slate-800">{item.is_non_revenue_item || "No"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Default Tax Rates?</span>
                        <span className="text-slate-800">{item.default_tax_rates || "Yes"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Printer Labels</span>
                        <span className="text-slate-800">{item.printer_labels || "None"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Modifier Groups</span>
                        <span className="text-slate-800">{item.modifier_groups || "None"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Tax Rates Profiles</span>
                        <span className="text-slate-800">{item.tax_rates || "None"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Attributes and Options */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <Sliders size={14} className="text-orange-500" />
                      Variants
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Variant Attribute</span>
                        <span className="text-sm font-semibold text-slate-800 mt-1 block">
                          {item.variant_attribute || "None (Standard Item)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Variant Option</span>
                        <span className="text-sm font-semibold text-slate-800 mt-1 block">
                          {item.variant_option || "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={16} className="text-orange-500" />
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Product Description</span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                      {item.description || "No description provided."}
                    </p>
                  </div>

                  {/* Meta Details footer */}
                  <div className="md:col-span-2 bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4 text-xs font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      Created: {new Date(item.created_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      Last Updated: {new Date(item.updated_at).toLocaleString()}
                    </span>
                  </div>

                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 font-medium">
                Item details not found.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewCatalogItem;
