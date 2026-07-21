import React, { useEffect, useMemo, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import TenantShell from "./TenantShell";
import { TENANT_PAYMENTS_LIST, TENANT_PAYMENT_VERIFY, GET_INSTITUTION_LIST } from "../../Utils/Constants";
import {
  formatCurrency,
  formatDisplayDate,
  getAuthHeaders,
} from "./tenantHelpers";

const TenantPayments = () => {
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const [payments, setPayments] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(25);

  // Advanced filters toggling and states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [collectionMonth, setCollectionMonth] = useState("all");
  const [receiptNo, setReceiptNo] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [phone, setPhone] = useState("");
  const [room, setRoom] = useState("");
  const [floorId, setFloorId] = useState("all");
  const [paymentType, setPaymentType] = useState("all");
  const [paymentMode, setPaymentMode] = useState("all");
  const [status, setStatus] = useState("all");
  const [verificationStatus, setVerificationStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Aggregate stats from backend
  const [aggregateStats, setAggregateStats] = useState({
    totalPayments: 0,
    collectedToday: 0,
    pendingAmount: 0,
    verifiedCount: 0,
    unverifiedCount: 0,
  });

  // Selected payment for the detailed modal popup view
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);

  // Memoized grouped payments based on tenant_id, reference_number, or close creation timestamp
  const groupedPayments = useMemo(() => {
    return payments.map(pay => ({
      ...pay,
      receipt_numbers: pay.receipt_number ? pay.receipt_number.split(", ") : [],
      proof_urls: pay.items ? pay.items.map(item => item.payment_proof_url).filter(Boolean) : (pay.payment_proof_url ? [pay.payment_proof_url] : []),
      notes_list: pay.items ? pay.items.map(item => item.notes).filter(Boolean) : (pay.notes ? [pay.notes] : []),
    }));
  }, [payments]);

  // Receipt modal proof state
  const [activeProofUrl, setActiveProofUrl] = useState(null);

  // Dynamic 12 months select options
  const collectionMonthOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
    const today = new Date();
    const monthValues = new Set(Array.from({ length: 12 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }));
    return [...monthValues]
      .sort((a, b) => b.localeCompare(a))
      .map((value) => {
        const [year, month] = value.split("-").map(Number);
        return { value, label: formatter.format(new Date(year, month - 1, 1)) };
      });
  }, []);

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
      const payload = {
        page: currentPage,
        limit,
        search: searchText,
        collectionMonth,
        receiptNo,
        admissionNo,
        phone,
        room,
        floorId,
        paymentType,
        paymentMode,
        status,
        verificationStatus,
        startDate,
        endDate,
        minAmount,
        maxAmount,
      };
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
      if (data.stats) {
        setAggregateStats(data.stats);
      }
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      } else {
        setTotalPages(1);
        setTotalCount((data.payments || []).length);
      }
    } catch (apiError) {
      setError(apiError.message || "Tenant payments fetch failed");
    } finally {
      setLoading(false);
    }
  };

  // Trigger paginated fetch on filter parameters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments(selectedInstitutionId);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    selectedInstitutionId,
    searchText,
    collectionMonth,
    receiptNo,
    admissionNo,
    phone,
    room,
    floorId,
    paymentType,
    paymentMode,
    status,
    verificationStatus,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    currentPage,
    limit,
  ]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedInstitutionId,
    searchText,
    collectionMonth,
    receiptNo,
    admissionNo,
    phone,
    room,
    floorId,
    paymentType,
    paymentMode,
    status,
    verificationStatus,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    limit,
  ]);

  useEffect(() => {
    if (!isPgAdmin) {
      fetchInstitutions();
    }
  }, [isPgAdmin]);

  const resetFilters = () => {
    setSearchText("");
    setCollectionMonth("all");
    setReceiptNo("");
    setAdmissionNo("");
    setPhone("");
    setRoom("");
    setFloorId("all");
    setPaymentType("all");
    setPaymentMode("all");
    setStatus("all");
    setVerificationStatus("all");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setCurrentPage(1);
  };

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

      // Reload stats & table in the background
      fetchPayments(selectedInstitutionId);
    } catch (err) {
      alert(err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const toggleRowExpansion = (rowId) => {
    setExpandedRowId(expandedRowId === rowId ? null : rowId);
  };

  const metricCards = [
    {
      id: "total_payments",
      label: "Total Collection",
      value: formatCurrency(aggregateStats.totalPayments),
      icon: Landmark,
      color: "from-sky-500 to-blue-500 bg-sky-50 text-sky-600 border-sky-100/50",
    },
    {
      id: "collected_today",
      label: "Collected Today",
      value: formatCurrency(aggregateStats.collectedToday),
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-500 bg-emerald-50 text-emerald-600 border-emerald-100/50",
    },
    {
      id: "pending_payments",
      label: "Pending Verification",
      value: formatCurrency(aggregateStats.pendingAmount),
      icon: ShieldAlert,
      color: "from-amber-500 to-orange-500 bg-amber-50 text-amber-500 border-amber-100/50",
    },
    {
      id: "verified_payments",
      label: "Verified Payments",
      value: `${aggregateStats.verifiedCount} Entries`,
      icon: BadgeCheck,
      color: "from-violet-500 to-indigo-500 bg-violet-50 text-violet-650 border-violet-100/50",
    },
  ];

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

        {/* Dynamic statistics summary cards */}
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

        {/* Filter Desk */}
        <div className="flex flex-col gap-3 bg-white p-3.5 rounded-[28px] border border-slate-150 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.04)]">
          {/* Main search line */}
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:bg-white focus-within:shadow-sm transition-all duration-200">
              <Search size={14} />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search tenant name or keyword..."
                className="h-9 w-full border-0 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-455"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isPgAdmin && (
                <select
                  value={selectedInstitutionId}
                  onChange={(e) => setSelectedInstitutionId(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition-all focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10"
                  aria-label="Filter by Institution"
                >
                  <option value="all">All Buildings</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.institution_name || inst.name}</option>
                  ))}
                </select>
              )}

              <select
                value={collectionMonth}
                onChange={(e) => setCollectionMonth(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition-all focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10"
                aria-label="Filter by Month"
              >
                <option value="all">All Months</option>
                {collectionMonthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  showAdvancedFilters 
                    ? "bg-slate-800 border-slate-800 text-white shadow-sm" 
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal size={12} />
                <span>Filters</span>
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-wider text-slate-550 hover:text-red-500 hover:border-red-200 transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Collapsible Advanced Filters Row */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-t border-slate-100 pt-3 mt-1.5"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-left">
                  {/* Receipt No */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Receipt No</span>
                    <input
                      type="text"
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value)}
                      placeholder="e.g. RCT-12"
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-705 outline-none focus:border-orange-500/50"
                    />
                  </div>

                  {/* Admission No */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Admission No</span>
                    <input
                      type="text"
                      value={admissionNo}
                      onChange={(e) => setAdmissionNo(e.target.value)}
                      placeholder="e.g. BLR-202"
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-705 outline-none focus:border-orange-500/50"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Phone</span>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-705 outline-none focus:border-orange-500/50"
                    />
                  </div>

                  {/* Room Number */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Room No</span>
                    <input
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="e.g. 102"
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-705 outline-none focus:border-orange-500/50"
                    />
                  </div>

                  {/* Payment Type */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Payment Type</span>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-705 outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="rent">Rent</option>
                      <option value="deposit">Deposit</option>
                      <option value="admission">Admission</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  {/* Payment Mode */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Payment Mode</span>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-705 outline-none"
                    >
                      <option value="all">All Modes</option>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="net_banking">Net Banking</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Status</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-705 outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  {/* Verification */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Verification</span>
                    <select
                      value={verificationStatus}
                      onChange={(e) => setVerificationStatus(e.target.value)}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-705 outline-none"
                    >
                      <option value="all">All Verifications</option>
                      <option value="verified">Verified</option>
                      <option value="pending">Pending Review</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Date range inputs */}
                  <div className="flex flex-col sm:col-span-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Date Range (Start - End)</span>
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-705 outline-none"
                      />
                      <span className="text-slate-400 text-xs">-</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-705 outline-none"
                      />
                    </div>
                  </div>

                  {/* Amount range inputs */}
                  <div className="flex flex-col sm:col-span-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Amount Range (Min - Max)</span>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-705 outline-none"
                      />
                      <span className="text-slate-400 text-xs">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-705 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Error message={error} />

        {loading ? (
          <div className="rounded-[32px] border border-slate-100 bg-white p-16 shadow-sm flex justify-center items-center">
            <PageLoader />
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-[32px] border border-slate-150 bg-white p-20 shadow-sm text-center">
            <Receipt size={36} className="mx-auto text-slate-300" />
            <h3 className="text-base font-black text-slate-700 mt-3.5">No Payments Logged</h3>
            <p className="text-xs text-slate-400 font-bold mt-1 max-w-xs mx-auto">
              No transactions match your current filters.
            </p>
          </div>
        ) : (
          /* Premium Compact Payments Ledger Container */
          <div className="flex flex-col gap-5">
            <div className="overflow-x-auto rounded-[28px] border border-slate-150 bg-white shadow-sm scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-400 h-10 select-none">
                    <th className="px-4 w-[10%]">Date</th>
                    <th className="px-4 w-[22%]">Tenant</th>
                    <th className="px-4 w-[16%]">Room & Bed</th>
                    <th className="px-4 w-[10%]">Type</th>
                    <th className="px-4 w-[10%]">Mode</th>
                    <th className="px-4 w-[13%]">Amount</th>
                    <th className="px-4 w-[15%]">Receipt No</th>
                    <th className="px-4 w-[12%]">Status</th>
                    <th className="px-4 w-[12%]">Verified</th>
                    <th className="px-4 w-[10%] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {groupedPayments.map((pay) => {
                    const isVerified = pay.verification_status === "verified";
                    const statusColors = 
                      pay.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      pay.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-100" :
                      "bg-rose-50 text-rose-700 border-rose-100";

                    const verifyColors = 
                      isVerified ? "bg-blue-50 text-blue-700 border-blue-100" :
                      pay.verification_status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-100" :
                      "bg-amber-50 text-amber-700 border-amber-100";

                    return (
                      <React.Fragment key={pay.id}>
                        {/* Compact Row */}
                        <tr 
                          onClick={() => setSelectedPaymentDetail(pay)}
                          className="h-11 hover:bg-slate-50/70 transition-colors cursor-pointer select-none"
                        >
                          <td className="px-4 whitespace-nowrap font-bold text-slate-500">
                            {formatDisplayDate(pay.payment_date).split(",")[0]}
                          </td>
                          <td className="px-4 truncate font-black text-slate-800" title={pay.full_name}>
                            {pay.full_name}
                          </td>
                          <td className="px-4 truncate text-slate-600">
                            Room {pay.room_number || "-"} ({pay.bed_number || "-"})
                          </td>
                          <td className="px-4">
                            <div className="flex flex-wrap gap-1">
                              {pay.payment_type.split(" + ").map((t) => (
                                <span key={t} className="px-2 py-0.5 rounded-md border bg-slate-50 border-slate-100 text-[9px] font-black uppercase tracking-wider">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 capitalize text-slate-500">{pay.payment_mode || "UPI"}</td>
                          <td className="px-4 font-black text-slate-850">{formatCurrency(pay.amount)}</td>
                          <td className="px-4 truncate text-slate-500 font-bold" title={pay.receipt_numbers.join(", ") || pay.reference_number || "-"}>
                            {pay.receipt_numbers.join(", ") || pay.reference_number || "—"}
                          </td>
                          <td className="px-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusColors}`}>
                              {pay.status || "Completed"}
                            </span>
                          </td>
                          <td className="px-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${verifyColors}`}>
                              {pay.verification_status || "Pending"}
                            </span>
                          </td>
                          <td className="px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Proof Thumbnail overlay */}
                              {pay.proof_urls.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setActiveProofUrl(pay.proof_urls[0])}
                                  className="p-1 rounded-lg border border-slate-150 bg-white text-slate-455 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all cursor-pointer"
                                  title="Inspect receipt slip"
                                >
                                  <FileImage size={13} />
                                </button>
                              )}
                              {/* Quick inline verify */}
                              {pay.verification_status === "pending" && (
                                <button
                                  type="button"
                                  disabled={verifyingId !== null}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    for (const item of pay.items) {
                                      if (item.verification_status === "pending") {
                                        await handleVerifyPayment(item.id, item.tenant_id);
                                      }
                                    }
                                  }}
                                  className="p-1 rounded-lg border border-emerald-250 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-sm transition-all cursor-pointer"
                                  title="Verify all pending payments"
                                >
                                  <Check size={13} className="stroke-[3]" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 text-left gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500 font-bold">
                    Showing page <span className="font-black text-slate-800">{currentPage}</span> of{" "}
                    <span className="font-black text-slate-800">{totalPages}</span> ({totalCount} total transactions)
                  </span>

                  {/* Limit selection dropdown */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-550">
                    <span>Rows:</span>
                    <select
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="cursor-pointer inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} className="mr-0.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="cursor-pointer inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} className="ml-0.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment screenshot receipt modal */}
      <AnimatePresence>
        {activeProofUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-[6px] p-4">
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

      {/* Premium Grouped Payment Detail Modal */}
      <AnimatePresence>
        {selectedPaymentDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPaymentDetail(null)}
              className="absolute inset-0 cursor-default"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-150 bg-white p-6 text-left shadow-2xl flex flex-col gap-5"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-850">
                    Transaction Details
                  </h3>
                  <p className="mt-1 text-[10px] font-bold text-slate-400">
                    Ref No: {selectedPaymentDetail.reference_number || "—"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentDetail(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-150 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                {/* 1. Resident & Room Information Card */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Resident & Location Info</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-black text-slate-800">{selectedPaymentDetail.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">ID: {selectedPaymentDetail.admission_number || "-"}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{selectedPaymentDetail.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">{selectedPaymentDetail.institution_name}</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">{selectedPaymentDetail.floor_name || "Ground Floor"}</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">Room {selectedPaymentDetail.room_number} ({selectedPaymentDetail.bed_number})</p>
                    </div>
                  </div>
                </div>

                {/* 2. Transaction Breakdown Card */}
                <div className="rounded-2xl border border-slate-150 p-4">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Transaction Breakdown</span>
                  <div className="space-y-2.5 divide-y divide-slate-100">
                    {selectedPaymentDetail.items.map((item, idx) => (
                      <div key={item.id} className={`flex justify-between items-start text-xs ${idx > 0 ? "pt-2.5" : ""}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-850 capitalize">{item.payment_type}</span>
                            <span className={`px-1.5 py-0.2 rounded border text-[8px] font-bold uppercase tracking-wider ${
                              item.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          {item.receipt_number && (
                            <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">Receipt: {item.receipt_number}</span>
                          )}
                          {item.notes && (
                            <p className="text-[10px] text-slate-550 font-medium italic mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100 max-w-[340px]">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-slate-800 shrink-0">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-dashed border-slate-200">
                      <span className="text-xs font-black text-slate-850">Total Summation</span>
                      <span className="text-sm font-black text-orange-600">{formatCurrency(selectedPaymentDetail.amount)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Payment Metadata Card */}
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650">
                  <div className="rounded-2xl border border-slate-100 p-3">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment Method</span>
                    <p className="text-slate-800 capitalize font-bold">{selectedPaymentDetail.payment_mode || "UPI"}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Date: {formatDisplayDate(selectedPaymentDetail.payment_date)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-3">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Verification Status</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        selectedPaymentDetail.verification_status === "verified" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                        {selectedPaymentDetail.verification_status || "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
                {selectedPaymentDetail.proof_urls.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveProofUrl(url)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition px-4 cursor-pointer"
                  >
                    <FileImage size={13} />
                    <span>View Proof {selectedPaymentDetail.proof_urls.length > 1 ? `#${idx + 1}` : ""}</span>
                  </button>
                ))}

                {selectedPaymentDetail.verification_status === "pending" && (
                  <button
                    type="button"
                    disabled={verifyingId !== null}
                    onClick={async () => {
                      setVerifyingId(selectedPaymentDetail.id);
                      try {
                        for (const item of selectedPaymentDetail.items) {
                          if (item.verification_status === "pending") {
                            await handleVerifyPayment(item.id, item.tenant_id);
                          }
                        }
                        setSelectedPaymentDetail(null);
                      } catch (err) {
                        alert(err.message || "Failed to verify transaction");
                      }
                    }}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-600 transition shadow-md shadow-emerald-500/20 px-4 cursor-pointer"
                  >
                    <Check size={13} className="stroke-[3]" />
                    <span>Verify Transaction</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </TenantShell>
  );
};

export default TenantPayments;
