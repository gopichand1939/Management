import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Hash, Info, BadgeIndianRupee, BedDouble, Bath } from "lucide-react";

const roomTypeOptions = [
  { value: "single", label: "Single Share" },
  { value: "double", label: "Double Sharing" },
  { value: "triple", label: "Triple Sharing" },
  { value: "dormitory", label: "Dormitory" },
  { value: "suite", label: "Suite" },
];

const roomStatusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const RoomModal = ({ isOpen, onClose, onSave, initialRoom }) => {
  const [formData, setFormData] = useState({
    room_number: "",
    room_type: "double",
    capacity: "2",
    rent_amount: "",
    attached_bathroom: false,
    status: "active",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialRoom) {
      setFormData({
        room_number: initialRoom.room_number || "",
        room_type: initialRoom.room_type || "double",
        capacity: initialRoom.capacity !== undefined ? String(initialRoom.capacity) : "2",
        rent_amount: initialRoom.rent_amount !== undefined ? String(initialRoom.rent_amount) : "",
        attached_bathroom: Boolean(initialRoom.attached_bathroom),
        status: initialRoom.status || "active",
      });
    } else {
      setFormData({
        room_number: "",
        room_type: "double",
        capacity: "2",
        rent_amount: "",
        attached_bathroom: false,
        status: "active",
      });
    }
    setError("");
  }, [initialRoom, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.room_number.trim()) {
      setError("Room number is required");
      return;
    }
    if (!formData.capacity || Number(formData.capacity) <= 0) {
      setError("Capacity must be greater than 0");
      return;
    }
    if (!formData.rent_amount || Number(formData.rent_amount) <= 0) {
      setError("Rent amount must be greater than 0");
      return;
    }

    onSave({
      ...formData,
      capacity: Number(formData.capacity),
      rent_amount: Number(formData.rent_amount),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Modal floating card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 260 }}
            className="w-full max-w-md rounded-[32px] border border-white/20 bg-white p-6 shadow-2xl relative z-10 text-left overflow-hidden"
          >
            {/* Top orange gradient indicator bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-red-500" />

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-5 p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200"
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1.5">
              {initialRoom ? "Edit Room Details" : "Add New Room"}
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Set up room identification, sharing parameters, and bed pricing.
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-100/50"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              {/* Room Number */}
              <div className="grid gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Room Identifier / Number
                </label>
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:shadow-sm transition-all duration-200">
                  <Hash size={16} className="shrink-0" />
                  <input
                    type="text"
                    name="room_number"
                    value={formData.room_number}
                    onChange={handleChange}
                    placeholder="e.g. 101 or Room A"
                    className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 font-semibold"
                  />
                </div>
              </div>

              {/* Sharing Type & Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Sharing Type
                  </label>
                  <select
                    name="room_type"
                    value={formData.room_type}
                    onChange={handleChange}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 focus:shadow-sm transition-all duration-200"
                  >
                    {roomTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Bed Capacity
                  </label>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:shadow-sm transition-all duration-200">
                    <BedDouble size={16} className="shrink-0" />
                    <input
                      type="number"
                      name="capacity"
                      min="1"
                      value={formData.capacity}
                      onChange={handleChange}
                      placeholder="2"
                      className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rent & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Monthly Rent (Per Bed)
                  </label>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:shadow-sm transition-all duration-200">
                    <BadgeIndianRupee size={16} className="shrink-0" />
                    <input
                      type="number"
                      name="rent_amount"
                      min="0"
                      value={formData.rent_amount}
                      onChange={handleChange}
                      placeholder="8000"
                      className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 focus:shadow-sm transition-all duration-200"
                  >
                    {roomStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bathroom Checkbox */}
              <label className="flex items-center gap-3 cursor-pointer mt-1 py-1 group select-none">
                <input
                  type="checkbox"
                  name="attached_bathroom"
                  checked={formData.attached_bathroom}
                  onChange={handleChange}
                  className="h-4 w-4 rounded-md border-slate-300 text-orange-500 focus:ring-orange-500/20"
                />
                <span className="text-sm font-bold text-slate-650 group-hover:text-slate-800 transition-colors flex items-center gap-1.5">
                  <Bath size={14} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                  Has Attached Bathroom
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/35 transition-all duration-200"
                >
                  {initialRoom ? "Save Changes" : "Add Room"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RoomModal;
