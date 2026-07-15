import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Calendar, ClipboardList, Trash2, RefreshCw } from "lucide-react";

import Sidebar from "../../Layout/Sidebar";
import Navbar from "../../Layout/Navbar";
import PageLoader from "../../Common/PageLoader";
import InputField from "../../Common/InputField";
import Button from "../../Common/Button";
import RationItemScanner from "../Purchase/RationItemScanner";
import {
  RATION_STOCK_AUDIT_CREATE,
  RATION_STOCK_AUDIT_NEXT_NUMBER,
  RATION_CURRENT_STOCK_VIEW,
  GET_INSTITUTION_LIST,
  TOKEN_KEY
} from "../../../Utils/Constants";

const AddRationStockAudit = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || authUser?.profile_id === 1;

  const scannerRef = useRef(null);

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    audit_number: "",
    audit_date: new Date().toISOString().substring(0, 10),
    audit_name: "",
    remarks: "",
    institution_id: authUser?.institution_id 
      ? String(authUser.institution_id) 
      : (sessionStorage.getItem("selected_institution_id") || ""),
  });

  const [items, setItems] = useState([]);
  const [scannedIndex, setScannedIndex] = useState(null);

  // Fetch institutions for Super Admin
  useEffect(() => {
    const getInstitutions = async () => {
      if (!isSuperAdmin) return;
      setLoadingInstitutions(true);
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
          if (!formData.institution_id && list.length > 0) {
            const firstId = String(list[0].id);
            setFormData((prev) => ({ ...prev, institution_id: firstId }));
            sessionStorage.setItem("selected_institution_id", firstId);
          }
        }
      } catch (err) {
        console.error("Error fetching institutions:", err);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [isSuperAdmin]);

  // Fetch next sequence number
  const fetchNextNumber = async (instId) => {
    if (!instId) return;
    try {
      const response = await fetch(RATION_STOCK_AUDIT_NEXT_NUMBER, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ institution_id: Number(instId) })
      });
      const data = await response.json();
      if (response.ok) {
        setFormData((prev) => ({
          ...prev,
          audit_number: data.data?.audit_number || "Auto-generating..."
        }));
      }
    } catch (err) {
      console.error("Error generating next audit number:", err);
    }
  };

  useEffect(() => {
    const instId = formData.institution_id;
    if (instId) {
      fetchNextNumber(instId);
      setLoading(false);
    }
  }, [formData.institution_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (name === "institution_id") {
      sessionStorage.setItem("selected_institution_id", value);
      setItems([]);
      setScannedIndex(null);
    }
  };

  const handleItemScanned = async (scannedItem) => {
    setScannedIndex(null);
    setToast(null);

    const instId = formData.institution_id;
    if (!instId) {
      setToast({ message: "Please select an institution first", type: "error" });
      return;
    }

    // Check duplicate
    const duplicateIndex = items.findIndex((i) => i.item_id === scannedItem.id);
    if (duplicateIndex !== -1) {
      setScannedIndex(duplicateIndex);
      setToast({ message: `Item '${scannedItem.item_name}' already added. Scroll to edit.`, type: "success" });
      focusAndHighlightRow(duplicateIndex);
      return;
    }

    // Fetch dynamic stock for scanned item
    try {
      const stockRes = await fetch(RATION_CURRENT_STOCK_VIEW, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          item_id: scannedItem.id,
          institution_id: Number(instId)
        })
      });
      const stockData = await stockRes.json();
      const currentStock = stockRes.ok ? parseFloat(stockData.data?.stock?.current_stock || 0) : 0;

      const newItem = {
        item_id: scannedItem.id,
        item_name: scannedItem.item_name,
        item_code: scannedItem.item_code,
        sku_id: scannedItem.sku_id,
        barcode: scannedItem.barcode,
        category_name: scannedItem.category_name || "Ration",
        unit: scannedItem.unit_code || "Unit",
        system_stock: currentStock,
        physical_stock: "",
        remarks: ""
      };

      setItems((prev) => [...prev, newItem]);
      const newIndex = items.length;
      setScannedIndex(newIndex);
      setToast({ message: `Added item: ${scannedItem.item_name}.`, type: "success" });
      focusAndHighlightRow(newIndex);

    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to load current stock details for item", type: "error" });
    }
  };

  const focusAndHighlightRow = (index) => {
    setTimeout(() => {
      const el = document.getElementById(`audit-phy-stock-input-${index}`);
      if (el) {
        el.focus();
        el.select();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleItemFieldChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    setScannedIndex(null);
  };

  const handleSaveAudit = async (statusType) => {
    setError(null);

    const instId = formData.institution_id;
    if (!instId) {
      setError("Please select an institution.");
      return;
    }

    if (!formData.audit_name.trim()) {
      setError("Audit name is required.");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one item to audit.");
      return;
    }

    // Validate physical stock
    for (const item of items) {
      const pStock = parseFloat(item.physical_stock);
      if (isNaN(pStock) || pStock < 0) {
        setError(`Physical stock for item ${item.item_name} must be a positive number greater than or equal to 0.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        institution_id: Number(instId),
        audit_date: formData.audit_date,
        audit_name: formData.audit_name.trim(),
        remarks: formData.remarks,
        status: statusType,
        items: items.map((i) => ({
          item_id: i.item_id,
          system_stock: parseFloat(i.system_stock || 0),
          physical_stock: parseFloat(i.physical_stock),
          remarks: i.remarks
        }))
      };

      const response = await fetch(RATION_STOCK_AUDIT_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save stock audit");
      }

      navigate("/ration-inventory/stock-audit");

    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 text-left">
            {/* Page Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">New Stock Audit</h1>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  Create a count record comparing system stock against physical count.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Header Fields Section */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ClipboardList size={16} className="text-orange-500" />
                  Audit Header Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Institution Select (Super Admin Only) */}
                  {isSuperAdmin ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500">Institution *</label>
                      <select
                        name="institution_id"
                        value={formData.institution_id}
                        onChange={handleInputChange}
                        disabled={loadingInstitutions}
                        className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                        required
                      >
                        <option value="">Select Institution</option>
                        {institutions.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.institution_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {/* Audit Number (Disabled) */}
                  <InputField
                    label="Audit Number"
                    name="audit_number"
                    value={formData.audit_number || "Auto-generating..."}
                    disabled
                  />

                  {/* Audit Date */}
                  <InputField
                    label="Audit Date *"
                    name="audit_date"
                    type="date"
                    value={formData.audit_date}
                    onChange={handleInputChange}
                    required
                  />

                  {/* Audit Name */}
                  <InputField
                    label="Audit Name *"
                    name="audit_name"
                    placeholder="e.g., Year End Audit 2026"
                    value={formData.audit_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="mt-4">
                  <InputField
                    label="Remarks"
                    name="remarks"
                    placeholder="Enter general audit remarks..."
                    value={formData.remarks || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Barcode QR Scanner */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-orange-500" />
                  Scan or Search Items
                </h3>
                {!formData.institution_id ? (
                  <div className="p-4 bg-slate-50 text-slate-500 text-xs font-semibold rounded-xl border border-slate-100 text-center">
                    Please select an institution first
                  </div>
                ) : (
                  <RationItemScanner
                    ref={scannerRef}
                    onItemSelected={handleItemScanned}
                    institutionId={Number(formData.institution_id)}
                  />
                )}

                {toast && (
                  <div className={`mt-4 p-3 text-xs font-bold rounded-xl border ${
                    toast.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-red-50 text-red-700 border-red-100"
                  }`}>
                    {toast.message}
                  </div>
                )}
              </div>

              {/* Items checklist table */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ClipboardList size={16} className="text-orange-500" />
                  Audited Items List
                </h3>

                {items.length === 0 ? (
                  <div className="p-8 text-center text-xs font-semibold text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
                    No items added yet. Scan a barcode or search for items to add them.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Item Info</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase w-20">Unit</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-32 text-blue-500">System Stock</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase w-32">Physical Stock *</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-28">Difference</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase w-32">Direction</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Line Remarks</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase w-16">Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => {
                          const isHighlighted = idx === scannedIndex;
                          const sysStock = parseFloat(item.system_stock || 0);
                          const phyStock = parseFloat(item.physical_stock);
                          const diff = isNaN(phyStock) ? 0 : phyStock - sysStock;

                          let direction = "-";
                          if (diff > 0) {
                            direction = "Increase (+)";
                          } else if (diff < 0) {
                            direction = "Decrease (-)";
                          }

                          return (
                            <tr
                              key={`${item.item_id}-${idx}`}
                              className={`border-b border-slate-100/80 hover:bg-slate-50/50 transition ${
                                isHighlighted ? "bg-orange-50/50 border-orange-200" : ""
                              }`}
                            >
                              {/* Item Info */}
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-slate-800 text-xs">{item.item_name}</div>
                                <div className="text-[10px] text-slate-450 mt-0.5">Code: {item.item_code} | SKU: {item.sku_id}</div>
                              </td>

                              {/* Category */}
                              <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{item.category_name}</td>

                              {/* Unit */}
                              <td className="px-4 py-3.5 text-xs text-slate-650 font-semibold">{item.unit || "-"}</td>

                              {/* System Stock */}
                              <td className="px-4 py-3.5 text-right text-xs font-bold text-blue-600 bg-blue-50/20">
                                {sysStock.toFixed(2)}
                              </td>

                              {/* Physical Stock Input */}
                              <td className="px-4 py-3.5">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  placeholder="Physical Count"
                                  value={item.physical_stock ?? ""}
                                  onChange={(e) => handleItemFieldChange(idx, "physical_stock", e.target.value)}
                                  className="w-28 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-orange-500 bg-white"
                                  required
                                  id={`audit-phy-stock-input-${idx}`}
                                />
                              </td>

                              {/* Difference */}
                              <td className={`px-4 py-3.5 text-right text-xs font-bold ${
                                diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-slate-600"
                              }`}>
                                {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                              </td>

                              {/* Direction */}
                              <td className="px-4 py-3.5 text-center">
                                <span className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-[10px] font-bold border capitalize ${
                                  diff > 0
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : diff < 0
                                    ? "bg-red-50 text-red-700 border-red-100"
                                    : "bg-slate-50 text-slate-600 border-slate-100"
                                }`}>
                                  {direction}
                                </span>
                              </td>

                              {/* Remarks */}
                              <td className="px-4 py-3.5">
                                <input
                                  type="text"
                                  placeholder="Remarks (wastage, corrections, etc.)"
                                  value={item.remarks || ""}
                                  onChange={(e) => handleItemFieldChange(idx, "remarks", e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500 bg-white"
                                />
                              </td>

                              {/* Remove Button */}
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                                  title="Remove Item"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/ration-inventory/stock-audit")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleSaveAudit("draft")}
                  disabled={submitting}
                  className="!border-slate-200 !text-slate-600 hover:!bg-slate-50"
                >
                  Save as Draft
                </Button>
                <Button type="button" onClick={() => handleSaveAudit("pending")} disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="animate-spin" size={14} />
                      Submitting...
                    </span>
                  ) : (
                    "Submit for Approval"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddRationStockAudit;
