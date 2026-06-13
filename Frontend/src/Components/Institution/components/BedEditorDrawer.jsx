import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, BedDouble, Check, AlertCircle } from "lucide-react";

const bedTypeOptions = [
  { value: "single", label: "Single Bed" },
  { value: "bunk_lower", label: "Bunk Lower" },
  { value: "bunk_upper", label: "Bunk Upper" },
  { value: "queen", label: "Queen Size" },
];

const statusOptions = [
  { value: "vacant", label: "Vacant", color: "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20" },
  { value: "occupied", label: "Occupied", color: "bg-rose-500 text-white border-rose-600 shadow-rose-500/20" },
  { value: "reserved", label: "Reserved", color: "bg-amber-500 text-white border-amber-600 shadow-amber-500/20" },
  { value: "blocked", label: "Blocked", color: "bg-slate-500 text-white border-slate-600 shadow-slate-550/20" },
];

const BedEditorDrawer = ({ isOpen, bed, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    bed_number: "",
    bed_type: "single",
    status: "vacant",
    rent_override: "",
  });

  useEffect(() => {
    if (bed) {
      setFormData({
        bed_number: bed.bed_number || "",
        bed_type: bed.bed_type || "single",
        status: bed.status || "vacant",
        rent_override: bed.rent_override !== undefined && bed.rent_override !== null ? String(bed.rent_override) : "",
      });
    }
  }, [bed, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStatusSelect = (statusValue) => {
    setFormData((prev) => ({
      ...prev,
      status: statusValue,
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      rent_override: formData.rent_override === "" ? null : Number(formData.rent_override),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Sliding spring panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 p-6 flex flex-col justify-between border-l border-slate-100 overflow-hidden"
          >
            {/* Top orange gradient indicator bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-red-500" />

            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mt-1.5">
                <div className="flex items-center gap-3 text-left">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-orange-500">
                    <BedDouble size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 leading-tight">
                      Edit Bed Config
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {bed?.bed_number || "Bed Details"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition-all duration-200"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleFormSubmit} className="mt-6 flex flex-col gap-5 text-left">
                {/* Bed Identifier */}
                <div className="grid gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Bed Name / Identification
                  </label>
                  <input
                    type="text"
                    name="bed_number"
                    value={formData.bed_number}
                    onChange={handleChange}
                    placeholder="e.g. Bed A"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 focus:shadow-sm transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Bed Type */}
                <div className="grid gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Bed Category
                  </label>
                  <select
                    name="bed_type"
                    value={formData.bed_type}
                    onChange={handleChange}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 focus:shadow-sm transition-all duration-200"
                  >
                    {bedTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Selection Buttons */}
                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Occupancy Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map((opt) => {
                      const isSelected = formData.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleStatusSelect(opt.value)}
                          className={`h-11 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all duration-300 ${
                            isSelected
                              ? `${opt.color} border-transparent shadow-md`
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-350"
                          }`}
                        >
                          {isSelected && <Check size={12} className="stroke-[3]" />}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rent Override */}
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Rent Override
                    </label>
                    <span className="text-[9.5px] text-slate-400 font-bold flex items-center gap-0.5">
                      <AlertCircle size={10} />
                      Overrides room base rent
                    </span>
                  </div>
                  <input
                    type="number"
                    name="rent_override"
                    value={formData.rent_override}
                    onChange={handleChange}
                    placeholder="e.g. 8500 (Optional)"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 focus:shadow-sm transition-all placeholder:text-slate-400"
                  />
                </div>
              </form>
            </div>

            {/* Actions Footer */}
            <div className="border-t border-slate-100 pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/35 transition-all duration-200"
              >
                Save Config
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BedEditorDrawer;
