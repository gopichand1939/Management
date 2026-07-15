import {
  AlignLeft,
  Hash,
  Tag,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  CreditCard,
  MapPin
} from "lucide-react";

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

const RationSupplierForm = ({
  formData,
  onChange,
  onSubmit,
  onCancel,
  buttonText,
  institutions = [],
  showInstitutionField = false,
  loadingInstitutions = false,
  disabled = false,
}) => {
  return (
    <form
      className="bg-white border border-slate-100 rounded-2xl w-full max-w-[720px] p-8 shadow-sm"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {showInstitutionField && (
          <div className="grid gap-1.5 md:col-span-2">
            <label
              htmlFor="institution_id"
              className="text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              Institution
            </label>

            <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 transition-all duration-200 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm">
              <Building2 size={16} />

              <select
                id="institution_id"
                name="institution_id"
                value={formData.institution_id || ""}
                onChange={onChange}
                disabled={disabled || loadingInstitutions}
                className={selectClassName}
                required
              >
                <option value="">
                  {loadingInstitutions ? "Loading institutions..." : "Select institution"}
                </option>
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.institution_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <InputField
          label="Supplier Name"
          name="supplier_name"
          value={formData.supplier_name || ""}
          placeholder="Supplier name"
          icon={User}
          onChange={onChange}
          required
        />

        <InputField
          label="Supplier Code"
          name="supplier_code"
          value={formData.supplier_code || ""}
          placeholder="Supplier code"
          icon={Hash}
          onChange={onChange}
          required
        />

        <InputField
          label="Contact Person"
          name="contact_person"
          value={formData.contact_person || ""}
          placeholder="Contact person name"
          icon={User}
          onChange={onChange}
        />

        <InputField
          label="Phone Number"
          name="phone"
          value={formData.phone || ""}
          placeholder="Phone number"
          icon={Phone}
          onChange={onChange}
          required
        />

        <InputField
          label="Alternate Phone"
          name="alternate_phone"
          value={formData.alternate_phone || ""}
          placeholder="Alternate phone number"
          icon={Phone}
          onChange={onChange}
        />

        <InputField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email || ""}
          placeholder="Email address"
          icon={Mail}
          onChange={onChange}
        />

        <InputField
          label="GST Number"
          name="gst_number"
          value={formData.gst_number || ""}
          placeholder="GSTIN number"
          icon={FileText}
          onChange={onChange}
        />

        <InputField
          label="PAN Number"
          name="pan_number"
          value={formData.pan_number || ""}
          placeholder="PAN card number"
          icon={CreditCard}
          onChange={onChange}
        />

        <InputField
          label="City"
          name="city"
          value={formData.city || ""}
          placeholder="City"
          icon={MapPin}
          onChange={onChange}
        />

        <InputField
          label="State"
          name="state"
          value={formData.state || ""}
          placeholder="State"
          icon={MapPin}
          onChange={onChange}
        />

        <InputField
          label="Pincode"
          name="pincode"
          value={formData.pincode || ""}
          placeholder="Pincode"
          icon={MapPin}
          onChange={onChange}
        />

        <InputField
          label="Payment Terms"
          name="payment_terms"
          value={formData.payment_terms || ""}
          placeholder="Payment terms (e.g. Net 30)"
          icon={CreditCard}
          onChange={onChange}
        />

        <div className="grid gap-1.5 md:col-span-2">
          <label
            htmlFor="status"
            className="text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
            Status
          </label>

          <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 transition-all duration-200 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm">
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

        <div className="grid gap-1.5 md:col-span-2">
          <label
            htmlFor="address"
            className="text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
            Address
          </label>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-slate-400 transition-all duration-200 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm">
            <MapPin size={16} className="mt-0.5 shrink-0" />

            <textarea
              id="address"
              name="address"
              value={formData.address || ""}
              placeholder="Full address"
              onChange={onChange}
              rows={3}
              className="w-full resize-none border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-1.5 md:col-span-2">
          <label
            htmlFor="description"
            className="text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
            Description
          </label>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-slate-400 transition-all duration-200 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm">
            <AlignLeft size={16} className="mt-0.5 shrink-0" />

            <textarea
              id="description"
              name="description"
              value={formData.description || ""}
              placeholder="Description"
              onChange={onChange}
              rows={3}
              className="w-full resize-none border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 text-sm"
            />
          </div>
        </div>

        <div className="md:col-span-2 flex items-center gap-3 mt-4">
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

export default RationSupplierForm;
