import { Bath, Edit2, Trash2, Users, Ruler, BadgeIndianRupee, Calendar, Home, CheckCircle2, ShieldAlert, Plus } from "lucide-react";
import { motion } from "framer-motion";

const blanketColors = {
  vacant: {
    blanket: "bg-[#a2d3c2] text-emerald-900 border-t border-[#81bcab]",
    badge: "bg-white text-emerald-600 border border-emerald-100",
    label: "VACANT",
  },
  occupied: {
    blanket: "bg-[#e89b9b] text-red-900 border-t border-[#d87c7c]",
    badge: "bg-white text-red-600 border border-red-100",
    label: "OCCUPIED",
  },
  reserved: {
    blanket: "bg-[#f5d0a5] text-amber-900 border-t border-[#e5ba8c]",
    badge: "bg-white text-amber-600 border border-amber-100",
    label: "RESERVED",
  },
  blocked: {
    blanket: "bg-slate-200 text-slate-700 border-t border-slate-300",
    badge: "bg-white text-slate-500 border border-slate-200",
    label: "BLOCKED",
  },
};

const getShortBedLabel = (bedNumber, index) => {
  if (!bedNumber) return String.fromCharCode(65 + index);
  const clean = bedNumber.replace(/bed\s*[-_]?\s*/i, "").trim();
  return clean || String.fromCharCode(65 + index);
};

const RoomCard = ({
  room,
  floorName,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onBedClick,
  onAddBed,
}) => {
  const capacity = room.capacity || 0;
  const beds = room.beds || [];
  const occupiedCount = beds.filter((b) => b.status === "occupied").length;
  const vacantCount = beds.filter((b) => b.status === "vacant").length;
  const reservedCount = beds.filter((b) => b.status === "reserved").length;

  // Determine occupancy status text
  let occupancyStatus = "Vacant";
  let occupancyColor = "text-emerald-600 bg-emerald-50 border-emerald-100/50";
  let occupancyBar = "bg-emerald-500";
  if (capacity === 0) {
    occupancyStatus = "Empty";
    occupancyColor = "text-slate-500 bg-slate-50 border-slate-200";
    occupancyBar = "bg-slate-400";
  } else if (occupiedCount === capacity) {
    occupancyStatus = "Filled";
    occupancyColor = "text-rose-600 bg-rose-50 border-rose-100/50";
    occupancyBar = "bg-rose-500";
  } else if (occupiedCount > 0 || reservedCount > 0) {
    occupancyStatus = "Partially";
    occupancyColor = "text-amber-600 bg-amber-50 border-amber-100/50";
    occupancyBar = "bg-amber-500";
  }

  const formatPgType = (type) => {
    if (!type) return "Double Sharing";
    return type
      .replace(/\b\w/g, (c) => c.toUpperCase()) + " Sharing";
  };

  const bedCount = beds.length;

  // Dynamic bed sizing config based on total beds in the room layout
  const sizeConfig = {
    1: {
      frame: "h-[105px] w-[72px] rounded-xl border-2 p-1",
      pillow: "h-3 mt-0.5 rounded",
      mattress: "mt-1 p-0.5 gap-0.5",
      bedLabel: "text-[11px]",
      statusLabel: "text-[6px] px-1 py-0.2",
      showTable: true,
      tableSize: "w-5 h-5 text-[9px]",
      gap: "gap-2",
    },
    2: {
      frame: "h-[105px] w-[64px] rounded-xl border-2 p-1",
      pillow: "h-3 mt-0.5 rounded",
      mattress: "mt-1 p-0.5 gap-0.5",
      bedLabel: "text-[11px]",
      statusLabel: "text-[6px] px-1 py-0.2",
      showTable: true,
      tableSize: "w-5 h-5 text-[9px]",
      gap: "gap-2",
    },
    3: {
      frame: "h-[90px] w-[44px] rounded-lg border-2 p-0.5",
      pillow: "h-2 mt-0.5 rounded-sm",
      mattress: "mt-0.5 p-0.5 gap-0.5",
      bedLabel: "text-[10px]",
      statusLabel: "text-[5px] px-0.5 py-0.2",
      showTable: true,
      tableSize: "w-3 h-3 text-[6px]",
      gap: "gap-1",
    },
    4: {
      frame: "h-[80px] w-[40px] rounded-md border p-0.5",
      pillow: "h-1.5 mt-0.5 rounded-sm",
      mattress: "mt-0.5 p-0.5 gap-0.5",
      bedLabel: "text-[9.5px]",
      statusLabel: "text-[4.5px] px-0.2 py-0.1",
      showTable: false,
      tableSize: "hidden",
      gap: "gap-1",
    },
    default: {
      frame: "h-[75px] w-[36px] rounded-md border p-0.5",
      pillow: "h-1.5 mt-0.5 rounded-sm",
      mattress: "mt-0.5 p-0.5 gap-0.5",
      bedLabel: "text-[9px]",
      statusLabel: "hidden",
      showTable: false,
      tableSize: "hidden",
      gap: "gap-1",
    }
  };

  const cfg = sizeConfig[bedCount] || sizeConfig.default;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -6, shadow: "0 25px 50px -12px rgba(255, 107, 0, 0.08)" }}
      className={`rounded-[32px] border bg-white p-6 transition-all duration-300 relative group text-left flex flex-col justify-between overflow-hidden ${
        isSelected
          ? "border-orange-500 shadow-xl shadow-orange-500/5 ring-1 ring-orange-500"
          : "border-slate-100 shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] hover:border-orange-500/25"
      }`}
    >
      {/* Top Premium Color Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-red-500" />

      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mt-1.5">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">
              Room {room.room_number || "Unnumbered"}
            </h3>
            <div className="flex items-center gap-2 text-slate-400 text-xs mt-1 font-bold">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Home size={13} className="text-slate-400" />
                {floorName || room.floor_name || "Ground Floor"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <Users size={13} className="text-slate-400" />
                {formatPgType(room.room_type)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                room.status === "active"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-rose-50 text-rose-600 border-rose-100"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${room.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
              {room.status || "active"}
            </span>

            {/* Actions - always visible when callbacks are provided */}
            {(onAddBed || onEdit || onDelete) && (
              <div className="flex items-center gap-1.5 transition-all duration-200">
                {onAddBed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddBed();
                    }}
                    className="p-1.5 rounded-xl border border-slate-100 bg-white text-slate-400 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all"
                    title="Add bed to this room"
                  >
                    <Plus size={12} />
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="p-1.5 rounded-xl border border-slate-100 bg-white text-slate-400 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all"
                    title="Edit room specifications"
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
                    className="p-1.5 rounded-xl border border-slate-100 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-all"
                    title="Remove room"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2x2 Specs Grid */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {/* Capacity Box */}
          <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 flex flex-col justify-between h-[76px] text-left">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Capacity</span>
              <Users size={12} className="text-slate-400 shrink-0" />
            </div>
            <div>
              <span className="font-black text-slate-700 text-xs block whitespace-nowrap">
                {capacity} Beds
              </span>
              <span className="text-[9px] text-slate-400 font-semibold block mt-0.5 capitalize truncate">
                {room.room_type || "double"} Share
              </span>
            </div>
          </div>

          {/* Base Rent Box */}
          <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 flex flex-col justify-between h-[76px] text-left">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Base Rent</span>
              <BadgeIndianRupee size={12} className="text-slate-400 shrink-0" />
            </div>
            <div>
              <span className="font-black text-slate-700 text-xs block whitespace-nowrap">
                ₹{room.rent_amount || 0}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                Per Bed / Mo
              </span>
            </div>
          </div>

          {/* Bath Config Box */}
          <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 flex flex-col justify-between h-[76px] text-left">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Bath Config</span>
              <Bath size={12} className="text-slate-400 shrink-0" />
            </div>
            <div>
              <span className="font-black text-slate-700 text-xs block whitespace-nowrap truncate">
                {room.attached_bathroom ? "Attached" : "Common"}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                Bathroom
              </span>
            </div>
          </div>

          {/* Occupancy Box */}
          <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 flex flex-col justify-between h-[76px] text-left">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Occupancy</span>
              <CheckCircle2 size={12} className="text-slate-400 shrink-0" />
            </div>
            <div>
              <span className={`font-black text-xs block whitespace-nowrap px-1.5 py-0.5 rounded border leading-none w-fit ${occupancyColor}`}>
                {occupancyStatus}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                {occupiedCount} / {capacity} Beds
              </span>
            </div>
          </div>
        </div>

        {/* Visual Bed Layout (Floorplan box) */}
        <div className="mt-5 text-left">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Configured Beds Layout
          </span>

          {/* Floorplan frame with warm oak slats */}
          <div
            className="rounded-3xl border border-slate-200 px-3 py-4 relative flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2.5 min-h-[160px] h-auto shadow-inner overflow-hidden"
            style={{
              background: "repeating-linear-gradient(90deg, #FAF7F2, #FAF7F2 30px, #EFECE6 31px)",
            }}
          >
            {/* Wall Window detail */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-20 h-2 bg-slate-650 rounded flex items-center justify-center shadow-sm z-10">
              <div className="w-16 h-0.5 bg-sky-300/80" />
            </div>

            {beds.length === 0 ? (
              <div className="text-center text-slate-400 py-6 z-10 bg-white/60 px-4 rounded-xl border border-dashed border-slate-200">
                <span className="text-xs font-bold">No beds created. Set capacity to generate beds.</span>
              </div>
            ) : (
              beds.map((bed, bIdx) => {
                const bedCfg = blanketColors[bed.status] || blanketColors.vacant;
                const isEven = bIdx % 2 === 0;
                const flexDir = isEven ? "flex-row" : "flex-row-reverse";

                return (
                  <div
                    key={bIdx}
                    className={`flex items-center ${cfg.gap} z-10 ${cfg.showTable ? flexDir : "flex-col"}`}
                  >
                    {/* Bed Frame Illustration */}
                    <div
                      onClick={(e) => {
                        if (onBedClick) {
                          e.stopPropagation();
                          onBedClick(bIdx);
                        }
                      }}
                      className={`${cfg.frame} border-amber-800 bg-[#fbfaf8] flex flex-col cursor-pointer transition-transform hover:scale-105 duration-200 shadow-sm`}
                    >
                      {/* Pillow */}
                      <div className={`w-full ${cfg.pillow} border border-slate-200 bg-white shadow-sm shrink-0`} />

                      {/* Mattress Sheet with status color */}
                      <div className={`w-full flex-1 rounded-b-md ${cfg.mattress} flex flex-col items-center justify-center ${bedCfg.blanket}`}>
                        <span className={`${cfg.bedLabel} font-black uppercase tracking-tight whitespace-nowrap`}>
                          {getShortBedLabel(bed.bed_number, bIdx)}
                        </span>
                        {cfg.statusLabel !== "hidden" && (
                          <span className={`px-1 py-0.5 rounded leading-none uppercase ${cfg.statusLabel} ${bedCfg.badge}`}>
                            {bedCfg.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bedside table */}
                    {cfg.showTable && (
                      <div className="flex flex-col items-center gap-1 select-none shrink-0">
                        <div className={`${cfg.tableSize} rounded bg-amber-800/90 border border-amber-900 shadow-sm flex items-center justify-center text-white relative`}>
                          {/* Plant design leaf */}
                          {bedCount <= 3 && <span className="text-emerald-300 text-[8px]">☘</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer Specs info bar */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-500">
        <div className="flex items-center gap-2">
          <Ruler size={14} className="text-slate-400" />
          <span>Room Type: <span className="text-slate-700 capitalize">{room.room_type || "double"}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <BadgeIndianRupee size={14} className="text-slate-400" />
          <span>Rent Type: <span className="text-slate-700">Per Bed</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Bath size={14} className="text-slate-400" />
          <span>Bathroom: <span className="text-slate-700">{room.attached_bathroom ? "Attached" : "Common"}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span>Status: <span className="text-slate-700 capitalize">{room.status || "active"}</span></span>
        </div>
      </div>
    </motion.div>
  );
};

export default RoomCard;
