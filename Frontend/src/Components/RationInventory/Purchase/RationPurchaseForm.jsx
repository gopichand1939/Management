import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Calendar,
  Building2,
  FileText,
  CreditCard,
  Notebook,
  DollarSign,
  Tag,
  Boxes,
  Layers,
  ChevronDown
} from "lucide-react";

import InputField from "../../Common/InputField";
import Button from "../../Common/Button";
import RationItemScanner from "./RationItemScanner";
import RationPurchaseItemsTable from "./RationPurchaseItemsTable";
import { RATION_SUPPLIER_DROPDOWN, TOKEN_KEY } from "../../../Utils/Constants";

const selectClassName = `
  w-full
  border-0
  bg-transparent
  text-slate-800
  outline-none
  text-sm
`;

const RationPurchaseForm = ({
  formData,
  items,
  setFormData,
  setItems,
  onSubmit,
  onCancel,
  buttonText,
  disabled = false,
  isEdit = false,
}) => {
  const { authUser } = useSelector((state) => state.user);
  const institutionId = authUser?.institution_id || formData.institution_id;

  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  // Active Item Form Fields
  const [itemFields, setItemFields] = useState({
    quantity: "",
    free_quantity: "",
    unit_price: "",
    discount_percentage: "0",
    gst_percentage: "",
    batch_number: "",
    manufacturing_date: "",
    expiry_date: "",
  });

  const [itemError, setItemError] = useState("");
  const scannerRef = useRef(null);
  const qtyInputRef = useRef(null);

  // Load suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      const instId = authUser?.institution_id || formData.institution_id;
      if (!instId) return;

      setLoadingSuppliers(true);
      try {
        const response = await fetch(RATION_SUPPLIER_DROPDOWN, {
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
        if (response.ok) {
          setSuppliers(data.suppliers || data.data || []);
        }
      } catch (err) {
        console.error("Error loading suppliers:", err);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, [authUser, formData.institution_id]);

  // Focus quantity input when active item changes
  useEffect(() => {
    if (activeItem && qtyInputRef.current) {
      qtyInputRef.current.focus();
    }
  }, [activeItem]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemFieldChange = (e) => {
    const { name, value } = e.target;
    setItemFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemSelected = (item) => {
    setItemError("");
    setActiveItem(item);
    setItemFields({
      quantity: "",
      free_quantity: "",
      unit_price: item.default_purchase_price ? String(item.default_purchase_price) : "",
      discount_percentage: "0",
      gst_percentage: item.gst_percentage ? String(item.gst_percentage) : "0",
      batch_number: "",
      manufacturing_date: "",
      expiry_date: "",
    });
  };

  const handleAddItemToTable = (e) => {
    e.preventDefault();
    setItemError("");

    const qty = parseFloat(itemFields.quantity);
    if (isNaN(qty) || qty <= 0) {
      setItemError("Quantity is required and must be greater than 0");
      return;
    }

    const price = parseFloat(itemFields.unit_price);
    if (isNaN(price) || price < 0) {
      setItemError("Unit price cannot be negative");
      return;
    }

    if (activeItem.batch_tracking && (!itemFields.batch_number || !itemFields.batch_number.trim())) {
      setItemError("Batch number is required for this item");
      return;
    }

    if (activeItem.expiry_tracking && !itemFields.expiry_date) {
      setItemError("Expiry date is required for this item");
      return;
    }

    // Prepare item record
    const newRecord = {
      item_id: activeItem.id,
      item_name: activeItem.item_name,
      item_code: activeItem.item_code,
      sku_id: activeItem.sku_id,
      barcode: activeItem.barcode,
      unit_code: activeItem.unit_code,
      quantity: qty,
      free_quantity: parseFloat(itemFields.free_quantity) || 0,
      unit_price: price,
      discount_percentage: parseFloat(itemFields.discount_percentage) || 0,
      gst_percentage: parseFloat(itemFields.gst_percentage) || 0,
      batch_number: activeItem.batch_tracking ? itemFields.batch_number.trim() : null,
      manufacturing_date: itemFields.manufacturing_date || null,
      expiry_date: activeItem.expiry_tracking ? itemFields.expiry_date : null,
      batch_tracking: activeItem.batch_tracking,
      expiry_tracking: activeItem.expiry_tracking,
    };

    // Duplicate check and merge rule
    // "Same item + same batch + same expiry: Merge quantity. Else: Add new row"
    const duplicateIndex = items.findIndex((it) => {
      const matchId = it.item_id === newRecord.item_id;
      const matchBatch = (it.batch_number || "") === (newRecord.batch_number || "");
      const matchExpiry = (it.expiry_date || "") === (newRecord.expiry_date || "");
      return matchId && matchBatch && matchExpiry;
    });

    if (duplicateIndex > -1) {
      const confirmMerge = window.confirm(
        `Item '${newRecord.item_name}' with the same batch and expiry is already added. Do you want to merge the quantities?`
      );

      if (confirmMerge) {
        const updatedItems = [...items];
        updatedItems[duplicateIndex] = {
          ...updatedItems[duplicateIndex],
          quantity: updatedItems[duplicateIndex].quantity + newRecord.quantity,
          free_quantity: updatedItems[duplicateIndex].free_quantity + newRecord.free_quantity,
        };
        setItems(updatedItems);
      }
    } else {
      setItems((prev) => [...prev, newRecord]);
    }

    // Reset scanner state and focus input
    setActiveItem(null);
    if (scannerRef.current) {
      scannerRef.current.focusInput();
    }
  };

  const handleClearActiveItem = () => {
    setActiveItem(null);
    setItemError("");
    if (scannerRef.current) {
      scannerRef.current.focusInput();
    }
  };

  // Remove item row
  const handleRemoveRow = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Edit item row (loads item details back into selection card, removing from table)
  const handleEditRow = (index) => {
    const itemToEdit = items[index];
    handleItemSelected({
      id: itemToEdit.item_id,
      item_name: itemToEdit.item_name,
      item_code: itemToEdit.item_code,
      sku_id: itemToEdit.sku_id,
      barcode: itemToEdit.barcode,
      unit_code: itemToEdit.unit_code,
      batch_tracking: itemToEdit.batch_tracking,
      expiry_tracking: itemToEdit.expiry_tracking,
    });
    setItemFields({
      quantity: String(itemToEdit.quantity),
      free_quantity: itemToEdit.free_quantity ? String(itemToEdit.free_quantity) : "",
      unit_price: String(itemToEdit.unit_price),
      discount_percentage: String(itemToEdit.discount_percentage),
      gst_percentage: String(itemToEdit.gst_percentage),
      batch_number: itemToEdit.batch_number || "",
      manufacturing_date: itemToEdit.manufacturing_date || "",
      expiry_date: itemToEdit.expiry_date || "",
    });
    handleRemoveRow(index);
  };

  // Calculations for Footer
  const calculateTotals = () => {
    let subTotal = 0;
    let discountAmount = 0;
    let gstAmount = 0;

    items.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const discPct = parseFloat(item.discount_percentage) || 0;
      const gstPct = parseFloat(item.gst_percentage) || 0;

      const beforeDisc = qty * price;
      const disc = beforeDisc * (discPct / 100);
      const afterDisc = beforeDisc - disc;
      const gst = afterDisc * (gstPct / 100);

      subTotal += beforeDisc;
      discountAmount += disc;
      gstAmount += gst;
    });

    const otherCharges = parseFloat(formData.other_charges) || 0;
    const rawTotal = subTotal - discountAmount + gstAmount + otherCharges;
    const grandTotal = Math.round(rawTotal);
    const roundOff = grandTotal - rawTotal;
    const paid = parseFloat(formData.paid_amount) || 0;
    const balance = grandTotal - paid;

    return {
      subTotal,
      discountAmount,
      gstAmount,
      otherCharges,
      roundOff,
      grandTotal,
      balance,
    };
  };

  const totals = calculateTotals();

  const handleFormSubmit = (e, status) => {
    e.preventDefault();
    onSubmit(status, totals);
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* SECTION 1: PURCHASE INFORMATION */}
      <form onSubmit={(e) => e.preventDefault()} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b pb-2">
          1. Purchase Information
        </h3>

        <div className="grid gap-4 md:grid-cols-3">
          <InputField
            label="Purchase Number"
            name="purchase_number"
            value={formData.purchase_number || "Auto Generated"}
            placeholder="Auto Generated"
            icon={FileText}
            disabled
          />

          <InputField
            label="Purchase Date"
            name="purchase_date"
            type="date"
            value={formData.purchase_date || ""}
            icon={Calendar}
            onChange={handleHeaderChange}
            required
            disabled={disabled}
          />

          <div className="grid gap-1.5">
            <label htmlFor="supplier_id" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Supplier
            </label>
            <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm">
              <Building2 size={16} />
              <select
                id="supplier_id"
                name="supplier_id"
                value={formData.supplier_id || ""}
                onChange={handleHeaderChange}
                disabled={disabled || loadingSuppliers}
                className={selectClassName}
                required
              >
                <option value="">
                  {loadingSuppliers ? "Loading suppliers..." : "Select Supplier"}
                </option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.supplier_name} ({supplier.supplier_code})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </div>

          <InputField
            label="Supplier Invoice Number"
            name="supplier_invoice_number"
            value={formData.supplier_invoice_number || ""}
            placeholder="Invoice number"
            icon={FileText}
            onChange={handleHeaderChange}
            disabled={disabled}
          />

          <InputField
            label="Invoice Date"
            name="invoice_date"
            type="date"
            value={formData.invoice_date || ""}
            icon={Calendar}
            onChange={handleHeaderChange}
            disabled={disabled}
          />

          <InputField
            label="Notes / Remarks"
            name="notes"
            value={formData.notes || ""}
            placeholder="Optional purchase details"
            icon={Notebook}
            onChange={handleHeaderChange}
            disabled={disabled}
          />
        </div>
      </form>

      {/* SECTION 2: SCAN OR SEARCH ITEM */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b pb-2">
          2. Scan or Search Item
        </h3>
        <RationItemScanner
          ref={scannerRef}
          onItemSelected={handleItemSelected}
          institutionId={institutionId}
        />

        {/* SECTION 3: SELECTED ITEM DETAILS CARD */}
        {activeItem && (
          <form
            onSubmit={handleAddItemToTable}
            className="mt-4 p-5 bg-slate-50 border border-slate-200/60 rounded-2xl grid gap-4 md:grid-cols-4 relative"
          >
            {/* Header info card */}
            <div className="md:col-span-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
              <div>
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-wider">
                  Active Selected Item
                </span>
                <h4 className="text-md font-black text-slate-800 mt-0.5">
                  {activeItem.item_name} ({activeItem.item_code})
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs font-semibold text-slate-400">
                  <span>SKU ID: {activeItem.sku_id}</span>
                  <span>Barcode: {activeItem.barcode}</span>
                  <span>Category: {activeItem.category_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-white text-slate-650 rounded-lg px-2.5 py-1 border shadow-xs">
                  Unit: {activeItem.unit_code}
                </span>
              </div>
            </div>

            <InputField
              ref={qtyInputRef}
              label="Quantity"
              name="quantity"
              type="number"
              step="any"
              value={itemFields.quantity}
              placeholder="0.00"
              icon={Boxes}
              onChange={handleItemFieldChange}
              required
            />

            <InputField
              label="Free Quantity"
              name="free_quantity"
              type="number"
              step="any"
              value={itemFields.free_quantity}
              placeholder="0.00"
              icon={Boxes}
              onChange={handleItemFieldChange}
            />

            <InputField
              label="Unit Price"
              name="unit_price"
              type="number"
              step="0.01"
              value={itemFields.unit_price}
              placeholder="0.00"
              icon={DollarSign}
              onChange={handleItemFieldChange}
              required
            />

            <InputField
              label="Discount (%)"
              name="discount_percentage"
              type="number"
              step="any"
              value={itemFields.discount_percentage}
              placeholder="0"
              icon={Tag}
              onChange={handleItemFieldChange}
            />

            <InputField
              label="GST (%)"
              name="gst_percentage"
              type="number"
              step="any"
              value={itemFields.gst_percentage}
              placeholder="0"
              icon={Tag}
              onChange={handleItemFieldChange}
              required
            />

            <InputField
              label={`Batch Number ${activeItem.batch_tracking ? "*" : ""}`}
              name="batch_number"
              value={itemFields.batch_number}
              placeholder="Enter batch"
              icon={Layers}
              onChange={handleItemFieldChange}
              required={activeItem.batch_tracking}
              disabled={!activeItem.batch_tracking}
            />

            <InputField
              label="Manufacturing Date"
              name="manufacturing_date"
              type="date"
              value={itemFields.manufacturing_date}
              icon={Calendar}
              onChange={handleItemFieldChange}
            />

            <InputField
              label={`Expiry Date ${activeItem.expiry_tracking ? "*" : ""}`}
              name="expiry_date"
              type="date"
              value={itemFields.expiry_date}
              icon={Calendar}
              onChange={handleItemFieldChange}
              required={activeItem.expiry_tracking}
              disabled={!activeItem.expiry_tracking}
            />

            {itemError && (
              <div className="md:col-span-4 text-xs font-bold text-red-500 text-left bg-red-50 border border-red-100 p-3 rounded-xl mt-1">
                {itemError}
              </div>
            )}

            <div className="md:col-span-4 flex items-center gap-3 border-t border-slate-200/80 pt-3 mt-1">
              <Button type="submit">
                Add Item
              </Button>
              <Button type="button" variant="secondary" onClick={handleClearActiveItem}>
                Clear Item
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* SECTION 4: PURCHASE ITEMS TABLE */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Purchase Items
          </h3>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
            {items.length} Items Added
          </span>
        </div>
        <RationPurchaseItemsTable
          items={items}
          onEdit={handleEditRow}
          onRemove={handleRemoveRow}
          readOnly={disabled}
        />
      </div>

      {/* SECTION 5: TOTALS, PAID AMOUNT, & SUBMISSIONS */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-3.5 text-left">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-2">
            Payment & Charges Details
          </h4>
          <InputField
            label="Other Charges (₹)"
            name="other_charges"
            type="number"
            step="0.01"
            value={formData.other_charges || ""}
            placeholder="0.00"
            icon={DollarSign}
            onChange={handleHeaderChange}
            disabled={disabled}
          />
          <InputField
            label="Paid Amount (₹)"
            name="paid_amount"
            type="number"
            step="0.01"
            value={formData.paid_amount || ""}
            placeholder="0.00"
            icon={DollarSign}
            onChange={handleHeaderChange}
            disabled={disabled}
          />
        </div>

        <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-2 text-left">
            Purchase Summary
          </h4>

          <div className="grid grid-cols-2 gap-y-2.5 text-sm font-semibold text-slate-600">
            <div className="text-left">Subtotal:</div>
            <div className="text-right text-slate-800">₹{totals.subTotal.toFixed(2)}</div>

            <div className="text-left">Total Discount:</div>
            <div className="text-right text-red-500">-₹{totals.discountAmount.toFixed(2)}</div>

            <div className="text-left">Total GST:</div>
            <div className="text-right text-slate-800">+₹{totals.gstAmount.toFixed(2)}</div>

            {totals.otherCharges > 0 && (
              <>
                <div className="text-left">Other Charges:</div>
                <div className="text-right text-slate-855">+₹{totals.otherCharges.toFixed(2)}</div>
              </>
            )}

            {Math.abs(totals.roundOff) > 0.001 && (
              <>
                <div className="text-left">Round Off:</div>
                <div className="text-right text-slate-500">
                  {totals.roundOff >= 0 ? "+" : ""}
                  ₹{totals.roundOff.toFixed(2)}
                </div>
              </>
            )}

            <div className="text-left font-black text-base border-t pt-2.5 text-slate-800">
              Grand Total:
            </div>
            <div className="text-right font-black text-base border-t pt-2.5 text-slate-800">
              ₹{totals.grandTotal.toFixed(2)}
            </div>

            <div className="text-left font-black text-slate-550">Balance Amount:</div>
            <div className="text-right font-black text-slate-700">₹{totals.balance.toFixed(2)}</div>
          </div>

          <div className="flex items-center gap-3 border-t pt-4 mt-2">
            <Button
              type="button"
              onClick={(e) => handleFormSubmit(e, "draft")}
              disabled={disabled || items.length === 0}
              variant="secondary"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={(e) => handleFormSubmit(e, "completed")}
              disabled={disabled || items.length === 0}
            >
              {isEdit && formData.status === "completed" ? "Save Changes" : "Complete Purchase"}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RationPurchaseForm;
