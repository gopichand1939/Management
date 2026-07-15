import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { AlignLeft, Hash, Tag, Building2, Scale, Percent, Landmark, ShieldAlert, Image, Plus, RefreshCw, Download, Printer } from "lucide-react";

import Button from "../../Common/Button";
import InputField from "../../Common/InputField";

const selectClassName = `
  w-full
  border-0
  bg-transparent
  text-slate-800
  outline-none
  text-sm
`;

const RationItemForm = ({
  formData,
  onChange,
  onSubmit,
  onCancel,
  buttonText,
  categories = [],
  units = [],
  institutions = [],
  showInstitutionField = false,
  loadingInstitutions = false,
  disabled = false,
  onAutoGenerateBarcode,
  isEdit = false,
}) => {
  const fileInputRef = useRef(null);

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onChange({
        target: {
          name: "item_image_file",
          value: e.target.files[0],
        },
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange({
        target: {
          name: "item_image_file",
          value: e.dataTransfer.files[0],
        },
      });
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById("ration-item-qr-canvas");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${formData.barcode || "RAT000000"}-qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const printQR = () => {
    const printContents = document.getElementById("ration-item-qr-label-container").innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Label</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              font-family: sans-serif; 
              margin: 0; 
              padding: 20px; 
              background-color: white;
            }
            .qr-wrapper {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
              text-align: center;
              width: 220px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .qr-title { font-weight: bold; font-size: 14px; color: #1e293b; margin-bottom: 8px; }
            .qr-barcode { font-family: monospace; font-size: 11px; color: #64748b; margin-top: 8px; }
            .qr-meta { font-size: 10px; color: #64748b; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="qr-wrapper">
            ${printContents}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const selectedUnit = units.find(u => String(u.id) === String(formData.unit_id));
  const selectedCategory = categories.find(c => String(c.id) === String(formData.category_id));

  const imagePreview = formData.item_image_file 
    ? URL.createObjectURL(formData.item_image_file) 
    : formData.image_url;

  return (
    <form
      className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 text-left"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-6">
        {/* Basic Information */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Basic Information
            </h3>
          </div>

          {showInstitutionField && (
            <div className="grid gap-1.5">
              <label
                htmlFor="institution_id"
                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                Institution
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 bg-white shadow-sm focus-within:text-orange-500 focus-within:border-orange-500/50">
                <Building2 size={16} />
                <select
                  id="institution_id"
                  name="institution_id"
                  value={formData.institution_id || ""}
                  onChange={onChange}
                  disabled={disabled || loadingInstitutions}
                  className={selectClassName}
                >
                  <option value="">
                    {loadingInstitutions ? "Loading institutions..." : "Select institution"}
                  </option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.institution_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Item Name"
              name="item_name"
              value={formData.item_name || ""}
              placeholder="e.g. Basmati Rice Premium"
              icon={Tag}
              onChange={onChange}
              required
              disabled={disabled}
            />

            <InputField
              label="Item Code"
              name="item_code"
              value={formData.item_code || ""}
              placeholder="e.g. RICE001"
              icon={Hash}
              onChange={onChange}
              required
              disabled={disabled}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="category_id"
                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                Category
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 bg-white shadow-sm focus-within:text-orange-500 focus-within:border-orange-500/50">
                <Building2 size={16} />
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id || ""}
                  onChange={onChange}
                  disabled={disabled}
                  required
                  className={selectClassName}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="unit_id"
                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                Unit of Measure
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 bg-white shadow-sm focus-within:text-orange-500 focus-within:border-orange-500/50">
                <Scale size={16} />
                <select
                  id="unit_id"
                  name="unit_id"
                  value={formData.unit_id || ""}
                  onChange={onChange}
                  disabled={disabled}
                  required
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

          <div className="grid gap-1.5">
            <label
              htmlFor="description"
              className="text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              Description
            </label>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-slate-400 bg-white shadow-sm focus-within:text-orange-500 focus-within:border-orange-500/50">
              <AlignLeft size={16} className="mt-0.5 shrink-0" />
              <textarea
                id="description"
                name="description"
                value={formData.description || ""}
                placeholder="Optional details..."
                onChange={onChange}
                rows={3}
                disabled={disabled}
                className="w-full resize-none border-0 bg-transparent text-slate-800 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Item Image
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={disabled ? undefined : handleImageClick}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-orange-500/50 transition bg-slate-50/50 ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {imagePreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-28 w-28 object-cover rounded-lg border border-slate-100 shadow-sm"
                  />
                  <span className="text-xs font-bold text-orange-500">Change Image</span>
                </div>
              ) : (
                <>
                  <Image size={24} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">
                    Click or drag image here to upload
                  </span>
                  <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stock Configuration */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Stock Configuration
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <InputField
              label="Minimum Stock Level"
              name="minimum_stock"
              type="number"
              step="any"
              value={formData.minimum_stock || "0"}
              placeholder="Alert threshold"
              icon={ShieldAlert}
              onChange={onChange}
              disabled={disabled}
            />

            <InputField
              label="Maximum Stock Level"
              name="maximum_stock"
              type="number"
              step="any"
              value={formData.maximum_stock || ""}
              placeholder="Maximum limit"
              icon={ShieldAlert}
              onChange={onChange}
              disabled={disabled}
            />

            <InputField
              label="Reorder Quantity"
              name="reorder_quantity"
              type="number"
              step="any"
              value={formData.reorder_quantity || ""}
              placeholder="Reorder quantity"
              icon={RefreshCw}
              onChange={onChange}
              disabled={disabled}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="batch_tracking"
                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                Batch Tracking
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 bg-white shadow-sm focus-within:text-orange-500 focus-within:border-orange-500/50">
                <select
                  id="batch_tracking"
                  name="batch_tracking"
                  value={String(formData.batch_tracking) || "false"}
                  onChange={onChange}
                  disabled={disabled}
                  className={selectClassName}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="expiry_tracking"
                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                Expiry Tracking
              </label>
              <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 bg-white shadow-sm focus-within:text-orange-500 focus-within:border-orange-500/50">
                <select
                  id="expiry_tracking"
                  name="expiry_tracking"
                  value={String(formData.expiry_tracking) || "false"}
                  onChange={onChange}
                  disabled={disabled}
                  className={selectClassName}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Button type="submit" disabled={disabled}>
            {buttonText}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Purchase Info */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Purchase Info
            </h3>
          </div>

          <InputField
            label="Default Purchase Price"
            name="default_purchase_price"
            type="number"
            step="any"
            value={formData.default_purchase_price || "0.00"}
            placeholder="Cost price"
            icon={Landmark}
            onChange={onChange}
            disabled={disabled}
          />

          <InputField
            label="GST %"
            name="gst_percentage"
            type="number"
            step="any"
            value={formData.gst_percentage || "0"}
            placeholder="GST Percentage"
            icon={Percent}
            onChange={onChange}
            disabled={disabled}
          />

          <div className="grid gap-1.5">
            <label
              htmlFor="status"
              className="text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              Status
            </label>
            <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 bg-white shadow-sm focus-within:text-orange-500 focus-within:border-orange-500/50">
              <select
                id="status"
                name="status"
                value={formData.status || "active"}
                onChange={onChange}
                disabled={disabled}
                className={selectClassName}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Barcode & QR code Section */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Barcode / QR Code
            </h3>
          </div>

          <div className="grid gap-4">
            <InputField
              label="Barcode value"
              name="barcode"
              value={formData.barcode || ""}
              placeholder="e.g. RAT000001"
              icon={Hash}
              onChange={onChange}
              required
              disabled={disabled}
            />

            {!isEdit && (
              <Button
                type="button"
                variant="secondary"
                icon={Plus}
                onClick={onAutoGenerateBarcode}
                disabled={disabled}
                className="w-full flex items-center justify-center"
              >
                Auto-generate
              </Button>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-xl bg-slate-50/50">
            <div id="ration-item-qr-label-container" className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col items-center text-center w-full max-w-[200px]">
              <span className="text-xs font-bold text-slate-800 truncate w-full max-w-[180px] mb-2">
                {formData.item_name || "Ration Item"}
              </span>
              <div className="bg-white p-1.5 border border-slate-100 rounded-lg">
                <QRCodeCanvas
                  id="ration-item-qr-canvas"
                  value={formData.barcode ? `${formData.barcode}` : "NONE"}
                  size={120}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 mt-2 font-bold select-all">
                {formData.barcode || "-"}
              </span>
              {formData.sku_id && (
                <span className="text-[9px] font-semibold text-slate-400 mt-0.5 truncate w-full">
                  SKU: {formData.sku_id}
                </span>
              )}
              {selectedUnit && (
                <span className="text-[9px] font-semibold text-slate-400 truncate w-full">
                  Unit: {selectedUnit.unit_code}
                </span>
              )}
            </div>

            <div className="flex gap-2 w-full mt-4">
              <Button
                type="button"
                variant="secondary"
                icon={Download}
                onClick={downloadQR}
                disabled={disabled || !formData.barcode}
                className="flex-1 text-[10px] py-1.5 h-8 flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                Download
              </Button>
              <Button
                type="button"
                variant="secondary"
                icon={Printer}
                onClick={printQR}
                disabled={disabled || !formData.barcode}
                className="flex-1 text-[10px] py-1.5 h-8 flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default RationItemForm;
