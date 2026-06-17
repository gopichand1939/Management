import { motion } from "framer-motion";

const statusConfigs = {
  vacant: {
    blanket: "from-emerald-450 to-teal-500 text-emerald-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]",
    foldColor: "bg-emerald-300/40 border-emerald-400/30",
    label: "Vacant",
    shadow: "shadow-emerald-500/10",
    frame: "border-amber-800/90",
  },
  occupied: {
    blanket: "from-rose-500 to-red-600 text-rose-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.35)]",
    foldColor: "bg-rose-400/45 border-rose-500/40",
    label: "Occupied",
    shadow: "shadow-red-500/20",
    frame: "border-rose-700",
  },
  reserved: {
    blanket: "from-amber-400 to-orange-500 text-amber-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]",
    foldColor: "bg-amber-300/40 border-amber-400/30",
    label: "Reserved",
    shadow: "shadow-amber-500/10",
    frame: "border-amber-700",
  },
  blocked: {
    blanket: "from-slate-300 to-slate-400 text-slate-900 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]",
    foldColor: "bg-slate-200/50 border-slate-350/30",
    label: "Blocked",
    shadow: "shadow-slate-500/5",
    frame: "border-slate-500",
  },
};

const normalizeBedStatus = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "occupied" || normalizedStatus === "active" || normalizedStatus === "verified") {
    return "occupied";
  }

  if (
    normalizedStatus === "reserved" ||
    normalizedStatus === "pending" ||
    normalizedStatus === "pending_verification" ||
    normalizedStatus === "notice_period"
  ) {
    return "reserved";
  }

  if (normalizedStatus === "blocked" || normalizedStatus === "maintenance" || normalizedStatus === "inactive") {
    return "blocked";
  }

  return "vacant";
};

const BedSeat = ({ bed, isSelected, onClick }) => {
  const status = normalizeBedStatus(bed.status);
  const cfg = statusConfigs[status] || statusConfigs.vacant;

  // Extract a single letter or short label for the bed (e.g. "Bed A" -> "A")
  const seatLabel = bed.bed_number
    ? bed.bed_number.replace(/bed\s*[-_]?\s*/i, "").trim().substring(0, 3)
    : "B";

  const isVacant = status === "vacant";

  return (
    <motion.button
      type="button"
      onClick={onClick}
    whileHover={isVacant ? { y: -4, scale: 1.05 } : {}}
    whileTap={isVacant ? { scale: 0.98 } : {}}
    className={`h-[78px] w-[56px] rounded-xl border-[3.5px] bg-[#fefdfb] flex flex-col p-0.5 relative transition-shadow duration-300 text-left ${cfg.shadow} ${cfg.frame} ${
        isVacant ? "cursor-pointer" : "cursor-not-allowed opacity-80"
      } ${
        isSelected
          ? "ring-[3px] ring-orange-500 ring-offset-2 shadow-lg shadow-orange-500/20 z-10 border-amber-900"
          : "shadow-md"
      }`}
      title={`${bed.bed_number} - Status: ${status}`}
    >
      {/* Wood Headboard detail */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-850 rounded-t-sm" />

      {/* Top Pillow Illustration */}
      <div className="w-full h-3 rounded-md border border-slate-100 bg-white shadow-[0_1.5px_3px_rgba(0,0,0,0.06)] shrink-0 mt-0.5 relative flex items-center justify-center">
        <div className="w-4/5 h-1.5 rounded-sm bg-slate-50 border border-slate-100/50" />
      </div>

      {/* Mattress Sheet with status gradient */}
      <div className={`w-full flex-1 rounded-b-lg mt-1 flex flex-col items-center justify-between p-0.5 relative overflow-hidden bg-gradient-to-br ${cfg.blanket}`}>
        {/* Folded Blanket / Cozy Bed sheets fold effect */}
        <div className={`w-full h-3.5 ${cfg.foldColor} backdrop-blur-[1px] border-b flex items-center justify-center shrink-0 rounded-t-[3px]`}>
          <span className="text-[6.5px] font-black uppercase text-white tracking-widest leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">
            {seatLabel}
          </span>
        </div>

        {/* Occupant/Status abbreviation pill */}
        <div className="flex-1 flex items-center justify-center w-full">
          <span className="text-[5.5px] font-black tracking-wider uppercase bg-white/90 backdrop-blur-sm text-slate-800 px-1 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] scale-90 border border-black/5 leading-none">
            {cfg.label}
          </span>
        </div>

        {/* Bed footboard stitch lines */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/5" />
      </div>
    </motion.button>
  );
};

export default BedSeat;
