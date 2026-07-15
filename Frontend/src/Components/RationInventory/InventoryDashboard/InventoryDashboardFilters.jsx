import { useState, useEffect } from "react";
import { RefreshCw, Calendar, Eye } from "lucide-react";

const InventoryDashboardFilters = ({
  isSuperAdmin,
  institutions,
  loadingInstitutions,
  selectedInstitutionId,
  onInstitutionChange,
  filters,
  onFilterChange,
  onRefresh
}) => {
  const [showCustomDates, setShowCustomDates] = useState(filters.range === "custom");

  const handleRangeChange = (e) => {
    const val = e.target.value;
    let fromDate = "";
    let toDate = "";
    const today = new Date().toISOString().substring(0, 10);

    if (val === "today") {
      fromDate = today;
      toDate = today;
      setShowCustomDates(false);
    } else if (val === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      fromDate = d.toISOString().substring(0, 10);
      toDate = today;
      setShowCustomDates(false);
    } else if (val === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      fromDate = d.toISOString().substring(0, 10);
      toDate = today;
      setShowCustomDates(false);
    } else if (val === "this_month") {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate = first.toISOString().substring(0, 10);
      toDate = today;
      setShowCustomDates(false);
    } else if (val === "prev_month") {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      fromDate = first.toISOString().substring(0, 10);
      toDate = last.toISOString().substring(0, 10);
      setShowCustomDates(false);
    } else if (val === "custom") {
      setShowCustomDates(true);
      fromDate = filters.from_date || today;
      toDate = filters.to_date || today;
    }

    onFilterChange({
      ...filters,
      range: val,
      from_date: fromDate,
      to_date: toDate
    });
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({
      ...filters,
      [name]: value
    });
  };

  return (
    <div className="flex flex-col gap-5 bg-white/95 backdrop-blur-md border border-slate-100 p-5 md:flex-row md:items-center justify-between text-left rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center gap-5 flex-1">
        {/* Institution selector */}
        {isSuperAdmin && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institution</span>
            <select
              value={selectedInstitutionId}
              onChange={onInstitutionChange}
              disabled={loadingInstitutions}
              className="h-10 cursor-pointer rounded-xl border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-350 hover:bg-slate-50/30 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-w-[200px] shadow-sm"
            >
              <option value="">Select Institution</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.institution_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Preset Filter */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Period</span>
          <select
            value={filters.range}
            onChange={handleRangeChange}
            className="h-10 cursor-pointer rounded-xl border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-350 hover:bg-slate-50/30 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
          >
            <option value="this_month">This Month</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="prev_month">Previous Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom date range fields */}
        {showCustomDates && (
          <div className="flex items-end gap-2.5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Date</span>
              <input
                type="date"
                name="from_date"
                value={filters.from_date}
                onChange={handleDateChange}
                className="h-10 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
              />
            </div>
            <span className="text-slate-400 text-xs font-bold self-center mb-2.5">to</span>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Date</span>
              <input
                type="date"
                name="to_date"
                value={filters.to_date}
                onChange={handleDateChange}
                className="h-10 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Expiry alerts configuration */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expiry Threshold</span>
          <select
            name="expiry_days"
            value={filters.expiry_days}
            onChange={handleDateChange}
            className="h-10 cursor-pointer rounded-xl border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-350 hover:bg-slate-50/30 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
          >
            <option value="15">15 Days</option>
            <option value="30">30 Days</option>
            <option value="60">60 Days</option>
            <option value="90">90 Days</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center">
        <button
          onClick={onRefresh}
          className="group h-10 px-4 rounded-xl border border-slate-200/80 bg-white text-xs font-bold text-slate-650 hover:bg-slate-50/50 hover:text-slate-800 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all duration-300 cursor-pointer flex items-center gap-2 shadow-sm hover:shadow active:scale-95"
          title="Refresh Dashboard Data"
        >
          <RefreshCw size={13} className="text-slate-500 transition-transform duration-500 group-hover:rotate-180" />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default InventoryDashboardFilters;
