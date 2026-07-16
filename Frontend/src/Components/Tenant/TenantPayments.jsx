import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  BadgeCheck,
  CreditCard,
  Landmark,
  Search,
  ShieldAlert,
  X,
  FileImage,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Receipt,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import TenantShell from "./TenantShell";
import { TENANT_PAYMENTS_LIST, TENANT_PAYMENT_VERIFY, GET_INSTITUTION_LIST } from "../../Utils/Constants";
import {
  buildMetricCards,
  formatCurrency,
  formatDisplayDate,
  getAuthHeaders,
  getStatusBadgeClassName,
} from "./tenantHelpers";

const TenantPayments = () => {
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const [payments, setPayments] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  // Receipt modal proof state
  const [activeProofUrl, setActiveProofUrl] = useState(null);

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

  const fetchPayments = async (instId = selectedInstitutionId) => {
    setLoading(true);
    setError("");

    try {
      const payload = {};
      if (instId && instId !== "all") {
        payload.institution_id = Number(instId);
      }
      const response = await fetch(TENANT_PAYMENTS_LIST, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Tenant payments fetch failed");
      }

      setPayments(data.payments || []);
    } catch (apiError) {
      setError(apiError.message || "Tenant payments fetch failed");
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
    fetchPayments(selectedInstitutionId);
  }, [selectedInstitutionId]);

  // Inline Verification trigger
  const handleVerifyPayment = async (paymentId, tenantId) => {
    setVerifyingId(paymentId);
    try {
      const response = await fetch(TENANT_PAYMENT_VERIFY, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          payment_id: paymentId,
          tenant_id: tenantId,
          verification_status: "verified",
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      // Update state locally
      setPayments((prev) =>
        prev.map((item) =>
          item.id === paymentId ? { ...item, verification_status: "verified" } : item
        )
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredPayments = useMemo(() => {
    const term = searchText.toLowerCase();

    return payments.filter((payment) => {
      const matchesSearch =
        payment.full_name?.toLowerCase().includes(term) ||
        payment.institution_name?.toLowerCase().includes(term) ||
        payment.reference_number?.toLowerCase().includes(term) ||
        payment.payment_type?.toLowerCase().includes(term) ||
        payment.receipt_number?.toLowerCase().includes(term);

      const matchesStatus =
        selectedStatusTab === "all" ||
        (selectedStatusTab === "verified" && payment.verification_status === "verified") ||
        (selectedStatusTab === "pending" && payment.verification_status === "pending");

      return matchesSearch && matchesStatus;
    });
  }, [payments, searchText, selectedStatusTab]);

  const totalCollection = filteredPayments.reduce((sum, payment) => {
    return sum + Number(payment.amount || 0);
  }, 0);

  const metricCards = buildMetricCards([
    {
      label: "Payment Entries",
      value: filteredPayments.length,
      icon: CreditCard,
      color: "from-sky-500 to-blue-500 bg-sky-50 border-sky-100",
    },
    {
      label: "Verified Payments",
      value: filteredPayments.filter((payment) => payment.verification_status === "verified").length,
      icon: BadgeCheck,
      color: "from-emerald-500 to-teal-500 bg-emerald-50 border-emerald-100",
    },
    {
      label: "Pending Review",
      value: filteredPayments.filter((payment) => payment.verification_status === "pending").length,
      icon: ShieldAlert,
      color: "from-amber-500 to-orange-500 bg-amber-50 border-amber-100",
    },
    {
      label: "Collection Logged",
      value: formatCurrency(totalCollection),
      icon: Landmark,
      color: "from-violet-500 to-indigo-500 bg-violet-50 border-violet-100",
    },
  ]);

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Header Title */}
        <div className="text-left border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Payment Verification Desk
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 font-bold">
            Audit admission fees, monthly rents, and security deposits linked to stays.
          </p>
        </div>

        {/* Dynamic statistics */}
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

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3 rounded-[32px] border border-slate-150 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.04)]">
          <div className="flex overflow-x-auto gap-1 w-full md:w-auto pb-1 md:pb-0 scrollbar-thin">
            {[
              { id: "all", label: "All Collections" },
              { id: "pending", label: "Pending Review" },
              { id: "verified", label: "Verified" },
            ].map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setSelectedStatusTab(tb.id)}
                className={`rounded-xl px-4 py-2 text-[11px] font-black transition-all whitespace-nowrap cursor-pointer ${
                  selectedStatusTab === tb.id
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {tb.label}
              </button>
            ))}
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
                placeholder="Search receipt, tenant, type..."
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
        ) : filteredPayments.length === 0 ? (
          <div className="rounded-[32px] border border-slate-150 bg-white p-20 shadow-sm text-center">
            <Receipt size={36} className="mx-auto text-slate-300" />
            <h3 className="text-base font-black text-slate-700 mt-3.5">No Payments Logged</h3>
            <p className="text-xs text-slate-400 font-bold mt-1 max-w-xs mx-auto">
              No transactions match your current filters.
            </p>
          </div>
        ) : (
          /* Cards Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {filteredPayments.map((pay) => (
              <motion.div
                key={pay.id}
                whileHover={{ y: -4, shadow: "0 20px 40px -15px rgba(255,107,0,0.04)" }}
                className="rounded-[32px] border border-slate-150 bg-white p-5 hover:border-orange-500/25 transition-all duration-300 flex flex-col justify-between relative overflow-hidden shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] min-h-[190px]"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-400" />

                <div>
                  {/* Title Header */}
                  <div className="flex items-start justify-between gap-3 mt-1">
                    <div>
                      <h3 className="text-sm font-black text-slate-850 flex items-center gap-1.5">
                        <User size={13} className="text-slate-400 shrink-0" />
                        {pay.full_name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        Receipt: {pay.receipt_number || "No Receipt"}
                      </p>
                    </div>

                    <span className="text-base font-black text-slate-800">
                      {formatCurrency(pay.amount)}
                    </span>
                  </div>

                  {/* Transaction specs */}
                  <div className="mt-3.5 bg-slate-50/50 border border-slate-100/80 p-3 rounded-2xl flex flex-col gap-1.5 text-[11px] font-semibold text-slate-550">
                    <p className="truncate"><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] mr-1">Building</span> {pay.institution_name}</p>
                    <p className="truncate"><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] mr-1">Date</span> {formatDisplayDate(pay.payment_date)}</p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                      <span className="bg-slate-50 border border-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                        {pay.payment_type || "Rent"}
                      </span>
                      <span className="text-slate-400">Ref: {pay.reference_number || "Cash"}</span>
                    </div>
                  </div>
                </div>

                {/* Verification badge & action triggers */}
                <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                      pay.verification_status === "verified"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : "bg-amber-50 text-amber-600 border-amber-100"
                    }`}>
                      {pay.verification_status || "Pending"}
                    </span>

                    {/* Receipt proof thumbnail button */}
                    {pay.payment_proof_url && (
                      <button
                        type="button"
                        onClick={() => setActiveProofUrl(pay.payment_proof_url)}
                        className="p-1 rounded-lg border border-slate-150 bg-white text-slate-455 hover:text-orange-500 shadow-sm transition-all"
                        title="Inspect receipt slip"
                      >
                        <FileImage size={13} />
                      </button>
                    )}
                  </div>

                  {/* Inline Verification stamps */}
                  {pay.verification_status === "pending" && (
                    <button
                      type="button"
                      disabled={verifyingId === pay.id}
                      onClick={() => handleVerifyPayment(pay.id, pay.tenant_id)}
                      className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-emerald-250 bg-emerald-50 px-2.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer"
                    >
                      <Check size={11} className="stroke-[3]" />
                      <span>{verifyingId === pay.id ? "Auditing..." : "Verify"}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Payment screenshot receipt modal */}
      <AnimatePresence>
        {activeProofUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[6px] p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveProofUrl(null)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-md w-full bg-white rounded-3xl p-4 shadow-2xl z-10 flex flex-col items-center"
            >
              <button
                onClick={() => setActiveProofUrl(null)}
                className="absolute -top-9 right-0 text-white hover:text-slate-200 flex items-center gap-1 text-xs font-bold bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-sm"
              >
                <X size={14} /> Close
              </button>
              <div className="max-h-[460px] overflow-auto rounded-2xl w-full flex justify-center bg-slate-50 border border-slate-100">
                <img
                  src={activeProofUrl}
                  alt="Transaction screenshot"
                  className="object-contain max-h-[440px] w-full"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </TenantShell>
  );
};

export default TenantPayments;
