import { ClipboardList, Archive, DollarSign, ShieldAlert, BadgeAlert, Layers, CheckSquare, Settings } from "lucide-react";

const InventoryDashboardCards = ({ summary = {}, currencySymbol = "₹" }) => {
  const formatCurrency = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? `${currencySymbol}0.00` : `${currencySymbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const cardsData = [
    {
      title: "Total Items",
      value: summary.total_items ?? 0,
      subtext: `${summary.active_items ?? 0} active in catalog`,
      icon: Layers,
      iconColor: "text-blue-600",
      bgColor: "from-blue-500/10 to-blue-500/5 group-hover:from-blue-500/20",
      borderColor: "hover:border-blue-200/60 shadow-blue-500/5",
      gradBg: "from-white to-blue-50/10"
    },
    {
      title: "Current Stock Value",
      value: formatCurrency(summary.total_stock_value || 0),
      subtext: `${parseFloat(summary.total_stock_quantity || 0).toLocaleString()} units currently stored`,
      icon: DollarSign,
      iconColor: "text-emerald-600",
      bgColor: "from-emerald-500/10 to-emerald-500/5 group-hover:from-emerald-500/20",
      borderColor: "hover:border-emerald-200/60 shadow-emerald-500/5",
      gradBg: "from-white to-emerald-50/10"
    },
    {
      title: "In Stock Items",
      value: summary.in_stock_items ?? 0,
      subtext: "Above minimum reorder levels",
      icon: Archive,
      iconColor: "text-teal-600",
      bgColor: "from-teal-500/10 to-teal-500/5 group-hover:from-teal-500/20",
      borderColor: "hover:border-teal-200/60 shadow-teal-500/5",
      gradBg: "from-white to-teal-50/10"
    },
    {
      title: "Low Stock Items",
      value: summary.low_stock_items ?? 0,
      subtext: "Reorder points reached",
      icon: ShieldAlert,
      iconColor: "text-amber-600",
      bgColor: "from-amber-500/10 to-amber-500/5 group-hover:from-amber-500/20",
      borderColor: "hover:border-amber-200/60 shadow-amber-500/5",
      gradBg: "from-white to-amber-50/10",
      alert: (summary.low_stock_items ?? 0) > 0
    },
    {
      title: "Out Of Stock",
      value: summary.out_of_stock_items ?? 0,
      subtext: "Zero or negative balance items",
      icon: BadgeAlert,
      iconColor: "text-red-650",
      bgColor: "from-red-500/10 to-red-500/5 group-hover:from-red-500/20",
      borderColor: "hover:border-red-200/60 shadow-red-500/5",
      gradBg: "from-white to-red-50/10",
      alert: (summary.out_of_stock_items ?? 0) > 0
    },
    {
      title: "Purchases This Month",
      value: formatCurrency(summary.current_month_purchase_amount || 0),
      subtext: "Completed orders value",
      icon: ClipboardList,
      iconColor: "text-indigo-600",
      bgColor: "from-indigo-500/10 to-indigo-500/5 group-hover:from-indigo-500/20",
      borderColor: "hover:border-indigo-200/60 shadow-indigo-500/5",
      gradBg: "from-white to-indigo-50/10"
    },
    {
      title: "Pending Kitchen Requests",
      value: summary.pending_kitchen_requests ?? 0,
      subtext: `${summary.approved_requests_waiting_issue ?? 0} approved waiting issue`,
      icon: CheckSquare,
      iconColor: "text-orange-650",
      bgColor: "from-orange-500/10 to-orange-500/5 group-hover:from-orange-500/20",
      borderColor: "hover:border-orange-200/60 shadow-orange-500/5",
      gradBg: "from-white to-orange-50/10",
      alert: (summary.pending_kitchen_requests ?? 0) > 0
    },
    {
      title: "Pending Audits",
      value: summary.pending_stock_audits ?? 0,
      subtext: "Awaiting admin confirmation",
      icon: Settings,
      iconColor: "text-purple-650",
      bgColor: "from-purple-500/10 to-purple-500/5 group-hover:from-purple-500/20",
      borderColor: "hover:border-purple-200/60 shadow-purple-500/5",
      gradBg: "from-white to-purple-50/10",
      alert: (summary.pending_stock_audits ?? 0) > 0
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cardsData.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-2xl border border-slate-100/90 bg-gradient-to-br ${card.gradBg} p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:-translate-y-1.5 flex flex-col justify-between text-left ${card.borderColor} ${
              card.alert ? "ring-2 ring-red-500/5 border-red-100" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.title}</span>
                <span className="mt-2 text-2xl font-black text-slate-800 tracking-tight">{card.value}</span>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.bgColor} transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                <Icon size={18} className={`${card.iconColor} transition-transform duration-300`} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100/60 pt-3">
              <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">{card.subtext}</span>
              {card.alert && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InventoryDashboardCards;
