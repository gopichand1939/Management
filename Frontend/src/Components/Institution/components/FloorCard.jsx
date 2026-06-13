import { Edit2, Trash2, Users, Warehouse } from "lucide-react";
import { motion } from "framer-motion";

const genderBadges = {
  boys: { label: "Boys Only", styles: "bg-blue-50 text-blue-600 border-blue-100" },
  girls: { label: "Girls Only", styles: "bg-rose-50 text-rose-600 border-rose-100" },
  mixed: { label: "Co-Living", styles: "bg-purple-50 text-purple-600 border-purple-100" },
};

const FloorCard = ({
  floor,
  index,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}) => {
  const gender = floor.gender_type || "mixed";
  const badge = genderBadges[gender] || genderBadges.mixed;
  const roomCount = floor.rooms?.length || 0;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -4, shadow: "0 20px 40px -15px rgba(0,0,0,0.05)" }}
      className={`rounded-3xl border p-5 transition-all duration-300 relative group cursor-pointer text-left flex flex-col justify-between overflow-hidden ${
        isSelected
          ? "border-orange-500 bg-orange-50/5 shadow-md shadow-orange-500/5 ring-1 ring-orange-500"
          : "border-slate-100 bg-white hover:border-slate-250 shadow-sm hover:shadow"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                isSelected ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-500"
              }`}
            >
              <Warehouse size={18} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 leading-tight">
                {floor.floor_name || `Floor ${index}`}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Level {floor.floor_number ?? index}
              </p>
            </div>
          </div>

          {/* Action icons on hover */}
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 rounded-lg border border-slate-100 bg-white text-slate-400 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all"
                title="Edit floor info"
              >
                <Edit2 size={12} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 rounded-lg border border-slate-100 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-all"
                title="Delete floor"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-50 pt-4">
        <span
          className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badge.styles}`}
        >
          {badge.label}
        </span>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Users size={12} className="text-slate-400" />
          <span>{roomCount} {roomCount === 1 ? "Room" : "Rooms"}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default FloorCard;
