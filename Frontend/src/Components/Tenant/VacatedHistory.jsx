import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Search, Undo2, UserMinus, WalletCards, Building2, Compass, ArrowRight, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import TenantShell from "./TenantShell";
import { TENANT_VACATED_LIST, GET_INSTITUTION_LIST } from "../../Utils/Constants";
import {
  buildMetricCards,
  formatCurrency,
  formatDisplayDate,
  getAuthHeaders,
  getStatusBadgeClassName,
} from "./tenantHelpers";

const VacatedHistory = () => {
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchInstitutions = async () => {
    try {
      const response = await fetch(GET_INSTITUTION_LIST, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (response.ok) {
        setInstitutions(data.institutions || data.data || []);
      }
    } catch (err) {
      console.error("Failed to load institutions:", err);
    }
  };

  const fetchVacatedTenants = async (instId = selectedInstitutionId) => {
    setLoading(true);
    setError("");

    try {
      const payload = {};
      if (instId && instId !== "all") {
        payload.institution_id = Number(instId);
      }
      const response = await fetch(TENANT_VACATED_LIST, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Vacated tenants fetch failed");
      }

      setTenants(data.tenants || []);
    } catch (apiError) {
      setError(apiError.message || "Vacated tenants fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPgAdmin) {
      fetchInstitutions();
    }
  }, [isPgAdmin]);

  useEffect(() => {
    fetchVacatedTenants(selectedInstitutionId);
  }, [selectedInstitutionId]);

  const filteredTenants = useMemo(() => {
    const term = searchText.toLowerCase();

    return tenants.filter((tenant) => {
      return (
        tenant.full_name?.toLowerCase().includes(term) ||
        tenant.institution_name?.toLowerCase().includes(term) ||
        tenant.phone?.toLowerCase().includes(term) ||
        tenant.admission_number?.toLowerCase().includes(term)
      );
    });
  }, [searchText, tenants]);

  const metricCards = buildMetricCards([
    {
      label: "Vacated Records",
      value: filteredTenants.length,
      icon: UserMinus,
      color: "from-sky-500 to-blue-500 bg-sky-50 border-sky-100",
    },
    {
      label: "Checkout Logged",
      value: filteredTenants.filter((tenant) => tenant.checkout_date || tenant.expected_checkout_date).length,
      icon: CalendarClock,
      color: "from-amber-500 to-orange-500 bg-amber-50 border-amber-100",
    },
    {
      label: "Refund Pending",
      value: filteredTenants.filter((tenant) => tenant.deposit_refund_status === "pending").length,
      icon: WalletCards,
      color: "from-violet-500 to-indigo-500 bg-violet-50 border-violet-100",
    },
    {
      label: "Beds Released",
      value: filteredTenants.filter((tenant) => tenant.bed_number).length,
      icon: Undo2,
      color: "from-emerald-500 to-teal-500 bg-emerald-50 border-emerald-100",
    },
  ]);

  const getRefundBadgeColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "refunded") return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (s === "pending") return "bg-amber-50 text-amber-600 border-amber-100";
    return "bg-rose-50 text-rose-600 border-rose-100";
  };

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-fadeIn">
        {/* Header banner */}
        <div className="text-left border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Checkout & Vacated History
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 font-bold">
            Audit historic stays, released inventories, and deposit closures.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="rounded-3xl border border-slate-150 bg-white p-4 shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-left flex justify-between items-center"
              >
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">{card.label}</span>
                  <span className="text-xl font-black text-slate-800 tracking-tight block mt-2 leading-none">{card.value}</span>
                </div>
                <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${card.color.split(" ")[0]} ${card.color.split(" ")[1]} ${card.color.split(" ")[2]}`}>
                  <Icon size={14} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Search Desk */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3 rounded-[32px] border border-slate-150 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.04)]">
          <div className="text-left px-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Archive List</span>
          </div>

          <div className="flex w-full md:w-auto items-center justify-end gap-3 min-w-0">
            {!isPgAdmin && (
              <select
                value={selectedInstitutionId}
                onChange={(e) => setSelectedInstitutionId(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition-all focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 shrink-0"
                aria-label="Filter by Institution"
              >
                <option value="all">All Institutions</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.institution_name || inst.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex w-full md:w-64 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:bg-white focus-within:shadow-sm transition-all duration-200 shrink-0">
              <Search size={14} />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search vacated resident..."
                className="h-9 w-full border-0 bg-transparent text-xs font-semibold text-slate-850 outline-none placeholder:text-slate-455"
              />
            </div>
          </div>
        </div>

        <Error message={error} />

        {loading ? (
          <div className="rounded-[32px] border border-slate-100 bg-white p-16 shadow-sm flex justify-center items-center">
            <PageLoader />
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="rounded-[32px] border border-slate-150 bg-white p-20 shadow-sm text-center">
            <UserMinus size={36} className="mx-auto text-slate-300" />
            <h3 className="text-base font-black text-slate-700 mt-3.5">No Archive Records</h3>
            <p className="text-xs text-slate-400 font-bold mt-1 max-w-xs mx-auto">
              No historical checks checkout data matches your query.
            </p>
          </div>
        ) : (
          /* Visual Cards list */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {filteredTenants.map((ten) => (
              <motion.div
                key={ten.id}
                whileHover={{ y: -4, shadow: "0 20px 40px -15px rgba(15,23,42,0.05)" }}
                className="rounded-[32px] border border-slate-150 bg-white p-5 hover:border-orange-500/25 transition-all duration-300 flex flex-col justify-between relative overflow-hidden shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] min-h-[190px]"
              >
                {/* Accent thin top line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-400 opacity-60" />

                <div>
                  <div className="flex items-start justify-between gap-3 mt-1">
                    <div>
                      <h3 className="text-sm font-black text-slate-850 truncate max-w-[150px]">{ten.full_name}</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        ID: {ten.admission_number || "NO ID"}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${getStatusBadgeClassName(ten.status || "vacated")}`}>
                      {ten.status || "vacated"}
                    </span>
                  </div>

                  {/* Stays marker */}
                  <div className="mt-3.5 bg-slate-50/50 border border-slate-100/80 p-3 rounded-2xl flex flex-col gap-1.5 text-[11px] font-semibold text-slate-550">
                    <p className="truncate"><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] mr-1">Last Stay</span> {ten.institution_name}</p>
                    <p className="truncate"><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] mr-1">Config</span> {ten.floor_name || "Ground"} • Room {ten.room_number} ({ten.bed_number})</p>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-1.5 text-[9px] text-slate-400 uppercase tracking-widest font-black">
                      <span>Checkout Date</span>
                      <span className="text-slate-650 font-bold">{formatDisplayDate(ten.checkout_date || ten.expected_checkout_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer specs */}
                <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getRefundBadgeColor(ten.deposit_refund_status)}`}>
                      Refund: {ten.deposit_refund_status || "Pending"}
                    </span>
                    {ten.refundable_amount && (
                      <span className="text-[10px] text-slate-455 font-bold">({formatCurrency(ten.refundable_amount)})</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/tenant/profile/${ten.id}`)}
                    className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-slate-150 bg-white px-2.5 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-orange-500 hover:border-orange-200 transition-colors shadow-sm cursor-pointer"
                  >
                    <FolderOpen size={11} />
                    <span>File</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </TenantShell>
  );
};

export default VacatedHistory;
