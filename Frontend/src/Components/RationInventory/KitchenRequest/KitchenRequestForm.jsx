import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Trash2, Calendar, ClipboardList } from "lucide-react";

import InputField from "../../Common/InputField";
import Button from "../../Common/Button";
import PageLoader from "../../Common/PageLoader";
import RationItemScanner from "../Purchase/RationItemScanner";
import {
  MEAL_TYPE_ACTIVE_LIST,
  RATION_CURRENT_STOCK_VIEW,
  GET_INSTITUTION_LIST,
  TOKEN_KEY
} from "../../../Utils/Constants";

const KitchenRequestForm = ({
  formData,
  setFormData,
  items,
  setItems,
  onSubmit,
  isEdit = false,
  submitLoading = false
}) => {
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  const [mealTypes, setMealTypes] = useState([]);
  const [loadingMealTypes, setLoadingMealTypes] = useState(false);

  // Selected item adding state
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemStockInfo, setItemStockInfo] = useState(null);
  const [requestedQty, setRequestedQty] = useState("");
  const [itemRemarks, setItemRemarks] = useState("");
  const [loadingStock, setLoadingStock] = useState(false);
  const [itemError, setItemError] = useState("");

  const scannerRef = useRef(null);

  // Fetch institutions if super admin
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
        }
      } catch (err) {
        console.error("Error loading institutions:", err);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [isSuperAdmin]);

  // Fetch active meal types
  useEffect(() => {
    const instId = formData.institution_id;
    if (!instId) {
      setMealTypes([]);
      return;
    }

    const getMealTypes = async () => {
      setLoadingMealTypes(true);
      try {
        const response = await fetch(MEAL_TYPE_ACTIVE_LIST, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });

        const data = await response.json();
        if (response.ok) {
          setMealTypes(data.mealTypes || data.data || []);
        }
      } catch (err) {
        console.error("Error loading meal types:", err);
      } finally {
        setLoadingMealTypes(false);
      }
    };

    getMealTypes();
  }, [formData.institution_id]);

  const handleInstitutionChange = (e) => {
    const instId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      institution_id: instId,
      meal_type_id: "",
    }));
    setItems([]);
    setSelectedItem(null);
    setItemStockInfo(null);
    setRequestedQty("");
    setItemRemarks("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Scanned / Selected Item from child scanner
  const handleItemSelected = async (item) => {
    setItemError("");
    setSelectedItem(item);
    setLoadingStock(true);

    try {
      const response = await fetch(RATION_CURRENT_STOCK_VIEW, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item_id: item.id,
          institution_id: Number(formData.institution_id),
        }),
      });

      const data = await response.json();
      if (response.ok && data.data) {
        setItemStockInfo(data.data.stock);
      } else {
        // Fallback default details from item master
        setItemStockInfo({
          current_stock: 0,
          minimum_stock: item.minimum_stock || 0,
          reorder_quantity: item.reorder_quantity || 0,
          stock_status: "out_of_stock",
          stock_value: 0
        });
      }
    } catch (err) {
      console.error("Error fetching item stock details:", err);
      setItemStockInfo({
        current_stock: 0,
        minimum_stock: item.minimum_stock || 0,
        reorder_quantity: item.reorder_quantity || 0,
        stock_status: "out_of_stock",
        stock_value: 0
      });
    } finally {
      setLoadingStock(false);
    }
  };

  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    setItemError("");

    if (!selectedItem) {
      setItemError("Please select or scan an item first");
      return;
    }

    const qty = parseFloat(requestedQty);
    if (isNaN(qty) || qty <= 0) {
      setItemError("Requested quantity must be a positive number greater than 0");
      return;
    }

    // Check duplicate
    const exists = items.some((i) => i.item_id === selectedItem.id);
    if (exists) {
      setItemError("This item has already been added to the request list");
      return;
    }

    const newItem = {
      item_id: selectedItem.id,
      item_name: selectedItem.item_name,
      item_code: selectedItem.item_code,
      sku_id: selectedItem.sku_id,
      barcode: selectedItem.barcode,
      category_name: selectedItem.category_name || itemStockInfo?.category_name || "Ration",
      unit_code: selectedItem.unit_code || itemStockInfo?.unit_code || "Unit",
      current_stock: itemStockInfo?.current_stock || 0,
      minimum_stock: itemStockInfo?.minimum_stock || 0,
      requested_quantity: qty,
      remarks: itemRemarks
    };

    setItems((prev) => [...prev, newItem]);

    // Reset adding state
    setSelectedItem(null);
    setItemStockInfo(null);
    setRequestedQty("");
    setItemRemarks("");

    if (scannerRef.current) {
      scannerRef.current.focusInput();
    }
  };

  const handleRemoveItem = (itemId) => {
    setItems((prev) => prev.filter((i) => i.item_id !== itemId));
  };

  return (
    <div className="space-y-6">

      {/* Header Fields Section */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ClipboardList size={16} className="text-orange-500" />
          Request Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Institution Selector (Super Admin Only) */}
          {isSuperAdmin ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Institution *</label>
              <select
                value={formData.institution_id}
                onChange={handleInstitutionChange}
                disabled={isEdit || loadingInstitutions}
                className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
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

          {/* Request Number (Disabled) */}
          <InputField
            label="Request Number"
            name="request_number"
            value={formData.request_number || "Auto-generating..."}
            disabled
          />

          {/* Request Date (Disabled) */}
          <InputField
            label="Request Date"
            name="request_date"
            type="date"
            value={formData.request_date}
            disabled
          />

          {/* Required Date */}
          <InputField
            label="Required Date *"
            name="required_date"
            type="date"
            value={formData.required_date}
            onChange={handleInputChange}
          />

          {/* Meal Type Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Meal Type *</label>
            <select
              name="meal_type_id"
              value={formData.meal_type_id}
              onChange={handleInputChange}
              disabled={loadingMealTypes || !formData.institution_id}
              className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
            >
              <option value="">Select Meal Type</option>
              {mealTypes.map((mt) => (
                <option key={mt.id} value={mt.id}>
                  {mt.meal_type_name} ({mt.meal_type_code})
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Priority *</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

        </div>

        <div className="mt-4">
          <InputField
            label="General Remarks"
            name="remarks"
            placeholder="Enter any additional request details..."
            value={formData.remarks || ""}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Add Items block */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left grid lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Scanner/Manual lookup */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={16} className="text-orange-500" />
            Find Items to Add
          </h3>

          {!formData.institution_id ? (
            <div className="p-4 bg-slate-55 text-slate-500 text-xs font-semibold rounded-xl border border-slate-100 text-center">
              Please select an institution first
            </div>
          ) : (
            <RationItemScanner
              ref={scannerRef}
              onItemSelected={handleItemSelected}
              institutionId={Number(formData.institution_id)}
            />
          )}

          {/* Selected Item Profile Detail */}
          {selectedItem && (
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800">{selectedItem.item_name}</h4>
                  <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                    SKU: {selectedItem.sku_id} | Code: {selectedItem.item_code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedItem(null); setItemStockInfo(null); }}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {loadingStock ? (
                <div className="h-6 w-32 bg-slate-200 animate-pulse rounded" />
              ) : (
                itemStockInfo && (
                  <div className="grid grid-cols-3 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-slate-450 block text-[10px] uppercase">Available Stock</span>
                      <span className="text-slate-800 text-sm font-black">{itemStockInfo.current_stock} {selectedItem.unit_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[10px] uppercase">Min Stock Threshold</span>
                      <span className="text-slate-800 text-sm font-black">{itemStockInfo.minimum_stock} {selectedItem.unit_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[10px] uppercase">Stock Value</span>
                      <span className="text-emerald-600 text-sm font-black">₹{parseFloat(itemStockInfo.stock_value || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quantities configuration & button */}
        <div className="flex flex-col justify-end gap-4 p-4 rounded-xl border border-dashed border-slate-200">
          <InputField
            label="Requested Quantity *"
            name="requested_qty"
            type="number"
            min="0.001"
            step="0.001"
            placeholder="e.g. 10"
            value={requestedQty}
            onChange={(e) => setRequestedQty(e.target.value)}
          />

          <InputField
            label="Item Remarks"
            name="item_remarks"
            placeholder="Remarks for this item..."
            value={itemRemarks}
            onChange={(e) => setItemRemarks(e.target.value)}
          />

          {itemError && <span className="text-[11px] font-bold text-red-500 mt-1">{itemError}</span>}

          <Button
            variant="orange"
            icon={Plus}
            onClick={handleAddItem}
            disabled={!selectedItem}
            className="w-full h-11"
          >
            Add to List
          </Button>
        </div>

      </div>

      {/* Added Items table list */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          Request Items ({items.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600 font-medium">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
              <tr>
                <th className="p-3">S.No</th>
                <th className="p-3">Item Specs</th>
                <th className="p-3">Category</th>
                <th className="p-3">Unit</th>
                <th className="p-3 text-right">Available Stock</th>
                <th className="p-3 text-right">Requested Qty *</th>
                <th className="p-3">Remarks</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={item.item_id} className="hover:bg-slate-50/50">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3">
                      <div>
                        <div className="font-bold text-slate-800">{item.item_name}</div>
                        <div className="text-[9px] font-bold text-slate-400">SKU: {item.sku_id}</div>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-slate-500">{item.category_name}</td>
                    <td className="p-3 font-semibold text-slate-500">{item.unit_code}</td>
                    <td className="p-3 text-right font-bold text-slate-700">{item.current_stock}</td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.requested_quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setItems((prev) =>
                            prev.map((i) =>
                              i.item_id === item.item_id
                                ? { ...i, requested_quantity: isNaN(val) ? "" : val }
                                : i
                            )
                          );
                        }}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right font-black focus:outline-none focus:ring-2 focus:ring-orange-500/10"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.remarks || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) =>
                            prev.map((i) =>
                              i.item_id === item.item_id ? { ...i, remarks: val } : i
                            )
                          );
                        }}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500/10"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.item_id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400 font-semibold">
                    No items added yet. Search or scan items above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer controls */}
        <div className="flex justify-end gap-3.5 mt-6 border-t pt-5">
          <Button
            variant="secondary"
            onClick={() => onSubmit("draft")}
            disabled={submitLoading || items.length === 0}
          >
            Save as Draft
          </Button>

          <Button
            variant="orange"
            onClick={() => onSubmit("pending")}
            disabled={submitLoading || items.length === 0}
          >
            {isEdit ? "Update & Submit" : "Submit Request"}
          </Button>
        </div>

      </div>

    </div>
  );
};

export default KitchenRequestForm;
