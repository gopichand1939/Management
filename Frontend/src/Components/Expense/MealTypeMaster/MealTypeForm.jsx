import { AlignLeft, Building2, Clock3, Hash, ListOrdered, Tag } from "lucide-react";

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

const getTimeValue = (value) => {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
};

const MealTypeForm = ({
  formData,
  onChange,
  onSubmit,
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
          <div className="grid gap-1.5">
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
          label="Meal Type Name"
          name="meal_type_name"
          value={formData.meal_type_name || ""}
          placeholder="Meal type name"
          icon={Tag}
          onChange={onChange}
        />

        <InputField
          label="Meal Type Code"
          name="meal_type_code"
          value={formData.meal_type_code || ""}
          placeholder="Meal type code"
          icon={Hash}
          onChange={onChange}
        />

        <InputField
          label="Display Order"
          name="display_order"
          type="text"
          value={formData.display_order || ""}
          placeholder="Display order"
          icon={ListOrdered}
          onChange={onChange}
        />

        <InputField
          label="Start Time"
          name="start_time"
          type="time"
          value={getTimeValue(formData.start_time)}
          icon={Clock3}
          onChange={onChange}
        />

        <InputField
          label="End Time"
          name="end_time"
          type="time"
          value={getTimeValue(formData.end_time)}
          icon={Clock3}
          onChange={onChange}
        />

        <div className="grid gap-1.5">
          <label
            htmlFor="is_active"
            className="text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
            Status
          </label>

          <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 transition-all duration-200 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm">
            <select
              id="is_active"
              name="is_active"
              value={String(formData.is_active ?? true)}
              onChange={onChange}
              disabled={disabled}
              className={selectClassName}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
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
              rows={4}
              className="w-full resize-none border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 text-sm"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Button type="submit" disabled={disabled}>
            {buttonText}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default MealTypeForm;
