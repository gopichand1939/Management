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
  RATION_STOCK_ADJUSTMENT_CREATE,
  RATION_STOCK_ADJUSTMENT_NEXT_NUMBER,
  RATION_CURRENT_STOCK_VIEW,
  GET_INSTITUTION_LIST,
  TOKEN_KEY
} from "../../../Utils/Constants";

const AddRationStockAdjustment = () => {
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
    adjustment_number: "",
    adjustment_date: new Date().toISOString().substring(0, 10),
    reason: "Correction",
    remarks: "",
    institution_id: authUser?.institution_id 
      ? String(authUser.institution_id) 
      : (sessionStorage.getItem("selected_institution_id") || ""),
  });

  const [items, setItems] = useState([]);
  const [scannedIndex, setScannedIndex] = useState(null);

  const reasons = [
    "Damage",
    "Expiry",
    "Wastage",
    "Spillage",
    "Correction",
    "Extra Stock Found",
    "Opening Balance",
    "System Correction",
    "Other"
  ];

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
      const response = await fetch(RATION_STOCK_ADJUSTMENT_NEXT_NUMBER, {
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
          adjustment_number: data.data?.adjustment_number || "Auto-generating..."
        }));
      }
    } catch (err) {
      console.error("Error generating next number:", err);
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
        unit: scannedItem.unit_code || "Unit",
        current_stock: currentStock,
        adjustment_quantity: "",
        adjustment_direction: "decrease",
        reason: formData.reason,
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
      const el = document.getElementById(`adj-qty-input-${index}`);
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

  const handleConfirmAdjustment = async (e) => {
    e.preventDefault();
    setError(null);

    const instId = formData.institution_id;
    if (!instId) {
      setError("Please select an institution.");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one item for adjustment.");
      return;
    }

    // Validate quantities
    for (const item of items) {
      const qty = parseFloat(item.adjustment_quantity);
      if (isNaN(qty) || qty <= 0) {
        setError(`Adjustment quantity for item ${item.item_name} must be a positive number greater than 0.`);
        return;
      }

      if (item.adjustment_direction === "decrease" && qty > item.current_stock) {
        setError(`Decrease quantity (${qty}) for item ${item.item_name} cannot exceed current stock balance (${item.current_stock}).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        institution_id: Number(instId),
        adjustment_date: formData.adjustment_date,
        reason: formData.reason,
        remarks: formData.remarks,
        items: items.map((i) => ({
          item_id: i.item_id,
          adjustment_quantity: parseFloat(i.adjustment_quantity),
          adjustment_direction: i.adjustment_direction,
          reason: i.reason,
          remarks: i.remarks
        }))
      };

      const response = await fetch(RATION_STOCK_ADJUSTMENT_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create stock adjustment");
      }

      navigate("/ration-inventory/stock-adjustment");

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
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">New Stock Adjustment</h1>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  Scan barcodes, adjust quantities, and select adjustment reasons.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmAdjustment} className="space-y-6">
              {/* Header Fields Section */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ClipboardList size={16} className="text-orange-500" />
                  Adjustment Header Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                  {/* Adjustment Number (Disabled) */}
                  <InputField
                    label="Adjustment Number"
                    name="adjustment_number"
                    value={formData.adjustment_number || "Auto-generating..."}
                    disabled
                  />

                  {/* Adjustment Date */}
                  <InputField
                    label="Adjustment Date *"
                    name="adjustment_date"
                    type="date"
                    value={formData.adjustment_date}
                    onChange={handleInputChange}
                    required
                  />

                  {/* Default Reason */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500">Default Reason *</label>
                    <select
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                      required
                    >
                      {reasons.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <InputField
                    label="Remarks"
                    name="remarks"
                    placeholder="Enter general remarks..."
                    value={formData.remarks || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Barcode QR Scanner */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-orange-500" />
                  Find Items to Adjust
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
                  Adjustment Items List
                </h3>

                {items.length === 0 ? (
                  <div className="p-8 text-center text-xs font-semibold text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
                    No items added. Scan a barcode or search for items to add.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Item Info</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase w-20">Unit</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-28 text-blue-500">Current Stock</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase w-36">Direction *</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase w-32">Adjust Qty *</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-28 text-orange-500">New Stock</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase w-40">Reason *</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Remarks</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase w-16">Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => {
                          const isHighlighted = idx === scannedIndex;
                          const currentStock = parseFloat(item.current_stock || 0);
                          const qty = parseFloat(item.adjustment_quantity || 0);
                          let newStock = currentStock;

                          if (!isNaN(qty)) {
                            newStock = item.adjustment_direction === "increase"
                              ? currentStock + qty
                              : currentStock - qty;
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

                              {/* Unit */}
                              <td className="px-4 py-3.5 text-xs text-slate-650 font-semibold">{item.unit || "-"}</td>

                              {/* Current Stock */}
                              <td className="px-4 py-3.5 text-right text-xs font-bold text-blue-600 bg-blue-50/20">
                                {currentStock.toFixed(2)}
                              </td>

                              {/* Direction Dropdown */}
                              <td className="px-4 py-3.5">
                                <select
                                  value={item.adjustment_direction}
                                  onChange={(e) => handleItemFieldChange(idx, "adjustment_direction", e.target.value)}
                                  className="w-32 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500 bg-white"
                                >
                                  <option value="decrease">Decrease (-)</option>
                                  <option value="increase">Increase (+)</option>
                                </select>
                              </td>

                              {/* Adjust Quantity Input */}
                              <td className="px-4 py-3.5">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  placeholder="Qty"
                                  value={item.adjustment_quantity ?? ""}
                                  onChange={(e) => handleItemFieldChange(idx, "adjustment_quantity", e.target.value)}
                                  className="w-28 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-orange-500 bg-white"
                                  required
                                  id={`adj-qty-input-${idx}`}
                                />
                              </td>

                              {/* New Stock */}
                              <td className="px-4 py-3.5 text-right text-xs font-bold text-orange-600 bg-orange-50/20">
                                {newStock.toFixed(2)}
                              </td>

                              {/* Reason */}
                              <td className="px-4 py-3.5">
                                <select
                                  value={item.reason}
                                  onChange={(e) => handleItemFieldChange(idx, "reason", e.target.value)}
                                  className="w-36 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-orange-500 bg-white"
                                  required
                                >
                                  {reasons.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Line Remarks */}
                              <td className="px-4 py-3.5">
                                <input
                                  type="text"
                                  placeholder="Remarks"
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
                  onClick={() => navigate("/ration-inventory/stock-adjustment")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="animate-spin" size={14} />
                      Submitting...
                    </span>
                  ) : (
                    "Confirm Stock Adjustment"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddRationStockAdjustment;
