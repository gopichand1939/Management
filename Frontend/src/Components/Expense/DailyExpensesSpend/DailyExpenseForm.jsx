import { useRef } from "react";
import { Building2, Calendar, Clock3, FileText, IndianRupee, Tag, Text, Upload } from "lucide-react";

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

const categoryOptions = [
  "Maintenance",
  "Pantry",
  "Utilities",
  "Supplies",
  "Rent",
  "Staff",
  "Other",
];

const hours = Array.from({ length: 12 }, (_, index) => {
  return String(index + 1).padStart(2, "0");
});

const minutes = Array.from({ length: 12 }, (_, index) => {
  return String(index * 5).padStart(2, "0");
});

const getTodayDateValue = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getCurrentTimeValue = () => {
  const date = new Date();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
};

const getDateValue = (value) => {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
};

const getTimeParts = (value) => {
  const normalizedValue = value ? String(value).slice(0, 5) : getCurrentTimeValue();
  const [hourValue = "00", minuteValue = "00"] = normalizedValue.split(":");
  const parsedHour = Number(hourValue);
  const displayHour = parsedHour % 12 || 12;
  const roundedMinute = Math.round(Number(minuteValue || 0) / 5) * 5;

  return {
    hour: String(displayHour).padStart(2, "0"),
    minute: String(roundedMinute === 60 ? 55 : roundedMinute).padStart(2, "0"),
    period: parsedHour >= 12 ? "PM" : "AM",
  };
};

const getTimeValueFromParts = ({ hour, minute, period }) => {
  let parsedHour = Number(hour);

  if (period === "PM" && parsedHour < 12) {
    parsedHour += 12;
  }

  if (period === "AM" && parsedHour === 12) {
    parsedHour = 0;
  }

  return `${String(parsedHour).padStart(2, "0")}:${minute}`;
};

const buildChangeEvent = (name, value) => {
  return {
    target: {
      name,
      value,
    },
  };
};

const DailyExpenseForm = ({
  formData,
  onChange,
  onSubmit,
  buttonText,
  institutions = [],
  showInstitutionField = false,
  loadingInstitutions = false,
  disabled = false,
  onFileChange,
}) => {
  const dateInputRef = useRef(null);
  const billInputRef = useRef(null);
  const timeParts = getTimeParts(formData.expense_time);
  const billFile = formData.bill_file_file;
  const existingBill = formData.bill_file;
  const billName = billFile?.name || existingBill?.original_name || existingBill?.file_name || "";

  const setDefaultDate = () => {
    if (formData.expense_date) {
      return;
    }

    onChange(buildChangeEvent("expense_date", getTodayDateValue()));
  };

  const openDatePicker = () => {
    setDefaultDate();

    if (dateInputRef.current?.showPicker) {
      dateInputRef.current.showPicker();
      return;
    }

    dateInputRef.current?.focus();
  };

  const handleTimePartChange = (partName, value) => {
    const nextParts = {
      ...timeParts,
      [partName]: value,
    };

    onChange(buildChangeEvent("expense_time", getTimeValueFromParts(nextParts)));
  };

  const handleBillDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleBillDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];

    if (!file || !onFileChange) {
      return;
    }

    onFileChange({
      target: {
        files: [file],
      },
    });
  };

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
          label="Expense Title"
          name="expense_title"
          value={formData.expense_title || ""}
          placeholder="Expense title"
          icon={Text}
          onChange={onChange}
        />

        <InputField
          label="Category"
          name="category"
          value={formData.category || ""}
          placeholder="Category"
          icon={Tag}
          list="daily-expense-categories"
          options={categoryOptions}
          onChange={onChange}
        />

        <InputField
          label="Amount"
          name="amount"
          type="number"
          value={formData.amount || ""}
          placeholder="Amount"
          icon={IndianRupee}
          onChange={onChange}
        />

        <div className="grid gap-1.5">
          <label
            htmlFor="expense_date"
            className="text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
            Date
          </label>

          <div
            onClick={openDatePicker}
            className="flex min-h-[42px] w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-left text-slate-400 transition-all duration-200 hover:border-orange-500/50 hover:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm"
          >
            <Calendar size={16} />
            <input
              ref={dateInputRef}
              id="expense_date"
              name="expense_date"
              type="date"
              value={getDateValue(formData.expense_date)}
              onChange={onChange}
              onFocus={setDefaultDate}
              disabled={disabled}
              className="w-full cursor-pointer border-0 bg-transparent text-sm text-slate-800 outline-none"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="expense_time_hour"
            className="text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
            Time
          </label>

          <div className="flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-slate-400 transition-all duration-200 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm">
            <Clock3 size={16} />

            <select
              id="expense_time_hour"
              value={timeParts.hour}
              onChange={(event) => handleTimePartChange("hour", event.target.value)}
              disabled={disabled}
              className={selectClassName}
              aria-label="Hour"
            >
              {hours.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>

            <span className="text-sm font-bold text-slate-400">:</span>

            <select
              value={timeParts.minute}
              onChange={(event) => handleTimePartChange("minute", event.target.value)}
              disabled={disabled}
              className={selectClassName}
              aria-label="Minute"
            >
              {minutes.map((minute) => (
                <option key={minute} value={minute}>
                  {minute}
                </option>
              ))}
            </select>

            <select
              value={timeParts.period}
              onChange={(event) => handleTimePartChange("period", event.target.value)}
              disabled={disabled}
              className={selectClassName}
              aria-label="AM or PM"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <InputField
            label="Notes"
            name="notes"
            value={formData.notes || ""}
            placeholder="Details of where it was spent, store/vendor name, purpose..."
            icon={FileText}
            onChange={onChange}
            disabled={disabled}
          />
        </div>

        <div className="grid gap-1.5 md:col-span-2">
          <label
            htmlFor="bill_file"
            className="text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
            Bill / Receipt
          </label>

          <div
            className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 transition-all duration-200 hover:border-orange-400 hover:bg-orange-50/30"
            onDragEnter={handleBillDrag}
            onDragOver={handleBillDrag}
            onDrop={handleBillDrop}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-left">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-100 bg-white text-orange-500 shadow-sm">
                  <FileText size={18} />
                </span>

                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {billName || "Drop bill here or upload"}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    PDF, JPG, PNG or WEBP up to 5 MB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => billInputRef.current?.click()}
                disabled={disabled}
                className="inline-flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={16} />
                <span>{billName ? "Change Bill" : "Upload Bill"}</span>
              </button>
            </div>

            {existingBill?.file_url && !billFile && (
              <a
                href={existingBill.file_url}
                target="_blank"
                rel="noreferrer"
                className="w-fit text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                View uploaded bill
              </a>
            )}

            <input
              ref={billInputRef}
              id="bill_file"
              name="bill_file"
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={onFileChange}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="secondary" disabled={disabled} onClick={() => window.history.back()}>
            Cancel
          </Button>

          <Button type="submit" disabled={disabled}>
            {buttonText}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default DailyExpenseForm;
