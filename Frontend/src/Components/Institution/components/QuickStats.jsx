import { BedDouble, Home, Layers, Users } from "lucide-react";
import { motion } from "framer-motion";

const QuickStats = ({ stats }) => {
  const items = [
    {
      label: "Total Floors",
      value: stats.totalFloors || 0,
      icon: Layers,
      color: "from-violet-500 to-indigo-650",
      bgColor: "bg-violet-50/50 border-violet-100/50",
      textColor: "text-violet-600",
      shadow: "shadow-violet-500/10",
    },
    {
      label: "Total Rooms",
      value: stats.totalRooms || 0,
      icon: Home,
      color: "from-sky-500 to-blue-650",
      bgColor: "bg-sky-50/50 border-sky-100/50",
      textColor: "text-sky-600",
      shadow: "shadow-sky-500/10",
    },
    {
      label: "Total Beds",
      value: stats.totalBeds || 0,
      icon: BedDouble,
      color: "from-emerald-500 to-teal-650",
      bgColor: "bg-emerald-50/50 border-emerald-100/50",
      textColor: "text-emerald-600",
      shadow: "shadow-emerald-500/10",
    },
    {
      label: "Occupied Beds",
      value: stats.occupiedBeds || 0,
      subtext: `${stats.occupancyPercent || 0}% Occupancy`,
      icon: Users,
      color: "from-orange-500 to-red-650",
      bgColor: "bg-orange-50/50 border-orange-100/50",
      textColor: "text-orange-600",
      shadow: "shadow-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`rounded-3xl border ${item.bgColor} p-4 md:p-5 flex items-center justify-between shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] bg-white/70 backdrop-blur-md relative overflow-hidden group hover:shadow-md transition-all duration-300`}
          >
            {/* Soft backdrop blur decoration */}
            <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/30 blur-lg group-hover:scale-150 transition-all duration-500 pointer-events-none" />

            <div className="flex flex-col min-w-0 z-10">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">
                {item.label}
              </span>
              <span className="text-2xl md:text-3xl font-black text-slate-800 mt-1.5 tracking-tight">
                {item.value}
              </span>
              {item.subtext && (
                <span className="text-[10px] md:text-xs text-slate-500 mt-1 font-semibold leading-none">
                  {item.subtext}
                </span>
              )}
            </div>

            <div
              className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-lg ${item.shadow} group-hover:scale-110 transition-all duration-300 shrink-0 z-10`}
            >
              <Icon size={18} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default QuickStats;
