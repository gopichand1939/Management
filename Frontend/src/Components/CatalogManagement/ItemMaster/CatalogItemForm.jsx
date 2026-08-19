import { useState, useEffect } from "react";
import { 
  Tag, 
  Hash, 
  DollarSign, 
  Layers, 
  Scale, 
  Eye, 
  Printer, 
  Sparkles,
  FileText,
  Sliders,
  Settings,
  ShieldAlert
} from "lucide-react";
import Button from "../../Common/Button";
import InputField from "../../Common/InputField";
import { CATALOG_ITEM_GENERATE_SKU, TOKEN_KEY } from "../../../Utils/Constants";

const selectClassName = `
  w-full
  border-0
  bg-transparent
  text-slate-800
  outline-none
  text-sm
`;

const CatalogItemForm = ({
  formData,
  onChange,
  onSubmit,
  onCancel,
  buttonText,
  categories = [],
  units = [],
  disabled = false,
  setToast,
}) => {
  const [generatingSku, setGeneratingSku] = useState(false);

  // Auto-generate SKU and Product Code handler
  const handleAutoGenerateSku = async () => {
    if (!formData.name) {
      setToast({ message: "Please enter the Item Name first to generate a SKU", type: "error" });
      return;
    }

    setGeneratingSku(true);
    try {
      const response = await fetch(CATALOG_ITEM_GENERATE_SKU, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: Number(formData.institution_id),
          category_id: formData.category_id ? Number(formData.category_id) : null,
          name: formData.name,
        }),
      });

      const data = await response.json();
      if (response.ok && data.sku) {
        // Trigger parent state updates
        onChange({ target: { name: "sku", value: data.sku } });
        onChange({ target: { name: "product_code", value: data.sku } });
        onChange({ target: { name: "barcode", value: data.sku } });
        setToast({ message: "SKU and Product Code auto-generated!", type: "success" });
      } else {
        setToast({ message: data.message || "SKU generation failed", type: "error" });
      }
    } catch (err) {
      setToast({ message: "Network error during SKU generation", type: "error" });
    } finally {
      setGeneratingSku(false);
    }
  };

  return (
    <form
      className="bg-white border border-slate-100 rounded-2xl w-full max-w-[960px] p-8 shadow-sm text-left"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-6">
        
        {/* SECTION 1: Core Identifiers */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Tag size={14} className="text-orange-500" />
            Core Identification
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <InputField
              label="Item Name"
              name="name"
              value={formData.name || ""}
              placeholder="e.g. Remote Control Car"
              onChange={onChange}
              required
              disabled={disabled}
            />

            <InputField
              label="Alternate Name"
              name="alternate_name"
              value={formData.alternate_name || ""}
              placeholder="e.g. RC Car"
              onChange={onChange}
              disabled={disabled}
            />

            <InputField
              label="Clover ID"
              name="clover_id"
              value={formData.clover_id || ""}
              placeholder="Leave empty or enter external Clover ID"
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        </div>

        {/* SECTION 2: Category & Unit */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Layers size={14} className="text-orange-500" />
            Category & Measurement
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="category_id" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Category
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm transition">
                <Layers size={16} />
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id || ""}
                  onChange={onChange}
                  disabled={disabled}
                  className={selectClassName}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.category_name} {cat.category_code ? `(${cat.category_code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="unit_id" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Unit (Shared Master)
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm transition">
                <Scale size={16} />
                <select
                  id="unit_id"
                  name="unit_id"
                  value={formData.unit_id || ""}
                  onChange={onChange}
                  disabled={disabled}
                  className={selectClassName}
                >
                  <option value="">Select Unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_name} ({unit.unit_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Smart SKUs & Codes */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-orange-500" />
              SKU & Barcode Configuration
            </h3>
            <button
              type="button"
              onClick={handleAutoGenerateSku}
              disabled={disabled || generatingSku}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 disabled:opacity-60 flex items-center gap-1 transition cursor-pointer"
            >
              <Sparkles size={12} />
              {generatingSku ? "Generating..." : "Auto-Generate SKU & Code"}
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <InputField
              label="SKU ID"
              name="sku"
              value={formData.sku || ""}
              placeholder="e.g. TOY-RCC-001"
              onChange={onChange}
              icon={Hash}
              disabled={disabled}
            />

            <InputField
              label="Product Code"
              name="product_code"
              value={formData.product_code || ""}
              placeholder="e.g. TOY-RCC-001"
              onChange={onChange}
              icon={Hash}
              disabled={disabled}
            />

            <InputField
              label="Barcode Value"
              name="barcode"
              value={formData.barcode || ""}
              placeholder="e.g. TOY-RCC-001"
              onChange={onChange}
              icon={Hash}
              disabled={disabled}
            />
          </div>
        </div>

        {/* SECTION 4: Financials & Stock */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
            <DollarSign size={14} className="text-orange-500" />
            Pricing & Inventory
          </h3>
          <div className="grid gap-4 md:grid-cols-5">
            <InputField
              label="Price ($)"
              name="price"
              type="number"
              step="0.01"
              value={formData.price !== undefined ? formData.price : ""}
              placeholder="0.00"
              onChange={onChange}
              icon={DollarSign}
              disabled={disabled}
              required
            />

            <div className="grid gap-1.5">
              <label htmlFor="price_type" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Price Type
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm transition">
                <select
                  id="price_type"
                  name="price_type"
                  value={formData.price_type || "Fixed"}
                  onChange={onChange}
                  disabled={disabled}
                  className={selectClassName}
                >
                  <option value="Fixed">Fixed</option>
                  <option value="Variable">Variable</option>
                  <option value="Per Unit">Per Unit</option>
                </select>
              </div>
            </div>

            <InputField
              label="Price Unit"
              name="price_unit"
              value={formData.price_unit || ""}
              placeholder="e.g. Lb, Item, Hour"
              onChange={onChange}
              disabled={disabled}
            />

            <InputField
              label="Cost ($)"
              name="cost"
              type="number"
              step="0.01"
              value={formData.cost !== undefined ? formData.cost : ""}
              placeholder="0.00"
              onChange={onChange}
              icon={DollarSign}
              disabled={disabled}
            />

            <InputField
              label="Stock Quantity"
              name="quantity"
              type="number"
              value={formData.quantity !== undefined ? formData.quantity : ""}
              placeholder="0"
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        </div>

        {/* SECTION 5: POS & Clover Operational Rules */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Settings size={14} className="text-orange-500" />
            Clover Point-of-Sale Configuration
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            
            <div className="grid gap-1.5">
              <label htmlFor="is_hidden" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Is Hidden?
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm transition">
                <select
                  id="is_hidden"
                  name="is_hidden"
                  value={formData.is_hidden || "No"}
                  onChange={onChange}
                  disabled={disabled}
                  className={selectClassName}
                >
                  <option value="No">No (Show in Register)</option>
                  <option value="Yes">Yes (Hide from Terminal)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="default_tax_rates" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Use Default Tax Rates?
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm transition">
                <select
                  id="default_tax_rates"
                  name="default_tax_rates"
                  value={formData.default_tax_rates || "Yes"}
                  onChange={onChange}
                  disabled={disabled}
                  className={selectClassName}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="is_non_revenue_item" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Non-revenue Item?
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm transition">
                <select
                  id="is_non_revenue_item"
                  name="is_non_revenue_item"
                  value={formData.is_non_revenue_item || "No"}
                  onChange={onChange}
                  disabled={disabled}
                  className={selectClassName}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>

            <InputField
              label="Printer Labels"
              name="printer_labels"
              value={formData.printer_labels || ""}
              placeholder="e.g. Kitchen Printer, Bar Printer"
              onChange={onChange}
              icon={Printer}
              disabled={disabled}
            />

            <InputField
              label="Modifier Groups"
              name="modifier_groups"
              value={formData.modifier_groups || ""}
              placeholder="e.g. Size-Modifiers, Extra-Toppings"
              onChange={onChange}
              icon={Sliders}
              disabled={disabled}
            />

            <InputField
              label="Tax Rates"
              name="tax_rates"
              value={formData.tax_rates || ""}
              placeholder="e.g. Sales Tax (6.66%)"
              onChange={onChange}
              icon={ShieldAlert}
              disabled={disabled}
            />
          </div>
        </div>

        {/* SECTION 6: Variants */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sliders size={14} className="text-orange-500" />
            Variants & Variations
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Variant Attribute"
              name="variant_attribute"
              value={formData.variant_attribute || ""}
              placeholder="e.g. Size, Color"
              onChange={onChange}
              disabled={disabled}
            />

            <InputField
              label="Variant Option"
              name="variant_option"
              value={formData.variant_option || ""}
              placeholder="e.g. Small, Red"
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        </div>

        {/* SECTION 7: Description */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileText size={14} className="text-orange-500" />
            Product Description
          </h3>
          <div className="grid gap-1.5">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm transition">
              <textarea
                id="description"
                name="description"
                value={formData.description || ""}
                placeholder="Write a brief retail description of the product..."
                onChange={onChange}
                rows={3}
                disabled={disabled}
                className="w-full resize-none border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Actions Button Bar */}
        <div className="flex items-center gap-3 mt-4 border-t border-slate-100 pt-6">
          <Button type="submit" disabled={disabled}>
            {buttonText}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </Button>
        </div>

      </div>
    </form>
  );
};

export default CatalogItemForm;
