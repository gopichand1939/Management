import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  BadgeIndianRupee,
  CalendarClock,
  CreditCard,
  FileImage,
  History,
  Image as ImageIcon,
  Search,
  UserRound,
  RotateCw,
  FolderOpen,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import TenantShell from "../TenantShell";
import {
  TENANT_ACTIVE_LIST,
  TENANT_HISTORY_VIEW,
  GET_INSTITUTION_LIST,
} from "../../../Utils/Constants";
import {
  formatCurrency,
  formatDisplayDate,
  getAssetUrl,
  getAuthHeaders,
  getStatusBadgeClassName,
} from "../tenantHelpers";

const formatPaymentMonth = (value) => {
  if (!value) {
    return "Payment Cycle";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Payment Cycle";
  }

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const formatBillingCycleLabel = (value) => {
  return value === "calendar_month_prorated"
    ? "Current month prorated, then 1st to month end"
    : "Same date every month";
};

const TableSkeleton = ({ rows = 3, cols = 5 }) => (
  <div className="animate-pulse space-y-2 p-3">
    {Array.from({ length: rows }).map((_, rIdx) => (
      <div key={rIdx} className="flex gap-4 h-7 items-center">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <div key={cIdx} className="bg-slate-100 rounded-lg h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

const TenantHistory = () => {
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const [tenants, setTenants] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("all");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [history, setHistory] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

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

  const fetchTenants = async (instId = selectedInstitutionId) => {
    setLoadingTenants(true);
    setError("");

    try {
      const payload = {};
      if (instId && instId !== "all") {
        payload.institution_id = Number(instId);
      }
      const response = await fetch(TENANT_ACTIVE_LIST, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Tenant list fetch failed");
      }

      const tenantList = data.tenants || [];
      setTenants(tenantList);

      if (tenantList.length > 0) {
        setSelectedTenantId(String(tenantList[0].id));
      } else {
        setSelectedTenantId("");
      }
    } catch (apiError) {
      setError(apiError.message || "Tenant list fetch failed");
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    if (!isPgAdmin) {
      fetchInstitutions();
    }
  }, [isPgAdmin]);

  useEffect(() => {
    fetchTenants(selectedInstitutionId);
  }, [selectedInstitutionId]);

  useEffect(() => {
    const fetchTenantHistory = async () => {
      if (!selectedTenantId) {
        setHistory(null);
        return;
      }

      setLoadingHistory(true);
      setError("");

      try {
        const response = await fetch(TENANT_HISTORY_VIEW, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ tenant_id: selectedTenantId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Tenant history fetch failed");
        }

        setHistory(data.history || null);
      } catch (apiError) {
        setError(apiError.message || "Tenant history fetch failed");
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchTenantHistory();
  }, [selectedTenantId]);

  const filteredTenants = useMemo(() => {
    const term = searchText.toLowerCase();

    return tenants.filter((tenant) => {
      const matchesSearch =
        !searchText ||
        tenant.full_name?.toLowerCase().includes(term) ||
        tenant.admission_number?.toLowerCase().includes(term) ||
        tenant.phone?.toLowerCase().includes(term) ||
        tenant.institution_name?.toLowerCase().includes(term);

      const matchesInst =
        selectedInstitutionId === "all" ||
        Number(tenant.institution_id) === Number(selectedInstitutionId);

      return matchesSearch && matchesInst;
    });
  }, [searchText, tenants, selectedInstitutionId]);

  const tenant = history?.tenant;
  const onboardingAssets = history?.onboarding_assets;
  const paymentTimeline = history?.payment_timeline;
  const duesSummary = history?.dues_summary;
  const activityLogs = history?.activity_logs || [];

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getRefundBadgeColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "refunded") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-rose-50 text-rose-700 border-rose-100";
  };

  const getVerificationStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "verified" || s === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-150";
    if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-150";
    return "bg-rose-50 text-rose-700 border-rose-150";
  };

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-slate-800 text-left animate-fadeIn">
        
        {/* Title Header */}
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-800">
              <History size={18} className="text-orange-500" />
              Tenant History Desk
            </h1>
            <p className="mt-1 text-[10px] font-bold text-slate-400">
              Audit historic stay profiles, documents, dues, and logs in simple tabular rows.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedTenantId) {
                // Re-trigger history fetch
                const temp = selectedTenantId;
                setSelectedTenantId("");
                setTimeout(() => setSelectedTenantId(temp), 50);
              } else {
                fetchTenants(selectedInstitutionId);
              }
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh History Audit"
          >
            <RotateCw size={13} />
          </button>
        </div>

        {/* Top Resident Directory Panel - Compact Table */}
        <div className="bg-white p-3 rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest self-start sm:self-auto">
              1. Select Resident Directory
            </span>
            <div className="flex w-full sm:w-auto items-center gap-3 justify-end">
              {!isPgAdmin && (
                <select
                  value={selectedInstitutionId}
                  onChange={(event) => setSelectedInstitutionId(event.target.value)}
                  className="h-8 rounded-lg border border-slate-250 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50"
                >
                  <option value="all">All Institutions</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.institution_name || inst.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-400 focus-within:border-orange-500/50 focus-within:bg-white transition max-w-xs w-full">
                <Search size={13} />
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search resident..."
                  className="h-8 w-full border-0 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Scrollable Resident Directory Table */}
          <div className="overflow-auto max-h-[160px] border border-slate-150 rounded-xl scrollbar-thin">
            {loadingTenants ? (
              <TableSkeleton rows={3} cols={5} />
            ) : filteredTenants.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 italic font-bold">
                No active residents match filters.
              </div>
            ) : (
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-black uppercase tracking-wider text-slate-400 h-8 select-none">
                    <th className="px-3 w-[6%] text-center">Status</th>
                    <th className="px-3 w-[26%]">Resident Name</th>
                    <th className="px-3 w-[20%]">Admission ID</th>
                    <th className="px-3 w-[18%]">Phone</th>
                    <th className="px-3 w-[30%]">Room Stay Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredTenants.map((ten) => {
                    const isSelected = selectedTenantId === String(ten.id);
                    return (
                      <tr
                        key={ten.id}
                        onClick={() => setSelectedTenantId(String(ten.id))}
                        className={`h-9 hover:bg-slate-50 transition cursor-pointer select-none ${
                          isSelected ? "bg-orange-50/20 text-orange-700 font-bold border-l-2 border-orange-500" : ""
                        }`}
                      >
                        <td className="px-3 text-center">
                          <div className={`h-2 w-2 rounded-full mx-auto ${isSelected ? "bg-orange-500 animate-pulse" : "bg-slate-300"}`} />
                        </td>
                        <td className="px-3 truncate font-black">
                          {ten.full_name}
                        </td>
                        <td className="px-3 truncate text-[11px] text-slate-500">
                          {ten.admission_number || "—"}
                        </td>
                        <td className="px-3 truncate text-[11px] text-slate-500">
                          {ten.phone || "—"}
                        </td>
                        <td className="px-3 truncate text-[11px] text-slate-600">
                          {ten.institution_name} • Room {ten.room_number || "—"} ({ten.bed_number || "—"})
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <Error message={error} />

        {/* Selected Tenant Audit Workspace */}
        {loadingHistory ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : !tenant ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-150 shadow-sm text-center">
            <UserRound size={36} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-black text-slate-700 mt-3">No Resident Selected</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              Select a resident from the directory grid above to compile stay and payment ledgers.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* Resident Bio Header Banner */}
            <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-center gap-3">
                {onboardingAssets?.profile_photo?.file_url ? (
                  <img
                    src={getAssetUrl(onboardingAssets.profile_photo.file_url)}
                    alt={tenant.full_name}
                    className="h-10 w-10 rounded-full object-cover border border-slate-100 shadow-sm"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-sm font-black flex items-center justify-center">
                    {getInitials(tenant.full_name)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black tracking-tight text-slate-800 leading-none">
                      {tenant.full_name}
                    </h2>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getStatusBadgeClassName(tenant.status)}`}>
                      {tenant.status}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    Admission ID: {tenant.admission_number || "NO ID"}
                  </p>
                </div>
              </div>

              {/* Bio Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-slate-600 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 flex-1">
                <p><span className="font-bold text-slate-400 mr-1 uppercase text-[8px]">Stay:</span> {tenant.floor_name} / R-{tenant.room_number} ({tenant.bed_number})</p>
                <p><span className="font-bold text-slate-400 mr-1 uppercase text-[8px]">Phone:</span> {tenant.phone || "—"}</p>
                <p><span className="font-bold text-slate-400 mr-1 uppercase text-[8px]">Check-in:</span> {formatDisplayDate(tenant.check_in_date).split(",")[0]}</p>
                <p className="truncate"><span className="font-bold text-slate-400 mr-1 uppercase text-[8px]">Email:</span> {tenant.email || "—"}</p>
              </div>
            </div>

            {/* micro stats badges row */}
            <div className="flex flex-wrap gap-2.5 items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1.5">
                History Metrics:
              </span>
              <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600">
                <span className="text-[9px] font-black text-slate-400 uppercase">Documents:</span>
                <span className="text-slate-800 font-black">{onboardingAssets?.documents?.length || 0}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600">
                <span className="text-[9px] font-black text-slate-400 uppercase">Total Paid:</span>
                <span className="text-emerald-700 font-black">{formatCurrency(paymentTimeline?.total_paid_amount || 0)}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600">
                <span className="text-[9px] font-black text-slate-400 uppercase">Pending Due:</span>
                <span className="text-rose-700 font-black">{formatCurrency(duesSummary?.display_pending_due_amount || 0)}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600">
                <span className="text-[9px] font-black text-slate-400 uppercase">Timeline Logs:</span>
                <span className="text-slate-800 font-black">{activityLogs.length}</span>
              </div>
            </div>

            {/* TABULAR LAYOUT SECTIONS - ALL STACKED COMPACT ROWS */}
            
            {/* Section A: Onboarding Documents Table */}
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-150 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <ImageIcon size={12} className="text-slate-455" />
                  A. Onboarding Document verification list
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[8px] font-black uppercase tracking-wider text-slate-400 h-8">
                      <th className="px-3 w-[25%]">Document name</th>
                      <th className="px-3 w-[20%]">Document Type</th>
                      <th className="px-3 w-[25%]">Document Number</th>
                      <th className="px-3 w-[18%]">Upload Date</th>
                      <th className="px-3 w-[12%] text-center">Attachment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {onboardingAssets?.documents && onboardingAssets.documents.length > 0 ? (
                      onboardingAssets.documents.map((doc) => (
                        <tr key={doc.id} className="h-9 hover:bg-slate-50/50">
                          <td className="px-3 font-bold text-slate-800 truncate">{doc.document_name}</td>
                          <td className="px-3 uppercase text-[10px] text-slate-400 font-black">{doc.document_type}</td>
                          <td className="px-3 text-slate-600 font-bold truncate">{doc.document_number || "—"}</td>
                          <td className="px-3 text-[11px] text-slate-500">{formatDisplayDate(doc.uploaded_at).split(",")[0]}</td>
                          <td className="px-3 text-center">
                            {doc.file_url ? (
                              <a
                                href={getAssetUrl(doc.file_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-6 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-black uppercase tracking-wider text-slate-600 hover:text-orange-500 hover:border-orange-200 transition"
                              >
                                Open File
                              </a>
                            ) : (
                              <span className="text-[9px] font-black uppercase text-slate-300">No File</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-3 py-4 text-center text-slate-400 italic">
                          No onboarding verification records uploaded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section B: Join-Time & Forecast Due Ledger Table */}
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-150 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <BadgeIndianRupee size={12} className="text-slate-455" />
                  B. Stay Settlement Schedule & Forecast Ledger
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[750px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[8px] font-black uppercase tracking-wider text-slate-400 h-8">
                      <th className="px-3 w-[25%]">Ledger Category / Type</th>
                      <th className="px-3 w-[15%]">Expected Amount</th>
                      <th className="px-3 w-[15%]">Status</th>
                      <th className="px-3 w-[20%]">Maturity / Schedule</th>
                      <th className="px-3 w-[25%]">Reference Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    
                    {/* Onboarding Payment Row */}
                    {paymentTimeline?.onboarding_payment && (
                      <tr className="h-10 hover:bg-slate-50/50">
                        <td className="px-3 font-bold text-slate-800">
                          Onboarding Payment
                        </td>
                        <td className="px-3 font-black text-slate-850">
                          {formatCurrency(paymentTimeline.onboarding_payment.amount || 0)}
                        </td>
                        <td className="px-3">
                          <span className={`inline-flex rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getVerificationStatusColor(paymentTimeline.onboarding_payment.verification_status || paymentTimeline.onboarding_payment.status)}`}>
                            {paymentTimeline.onboarding_payment.verification_status || paymentTimeline.onboarding_payment.status}
                          </span>
                        </td>
                        <td className="px-3 text-[11px] text-slate-550">
                          {formatDisplayDate(paymentTimeline.onboarding_payment.payment_date).split(",")[0]}
                        </td>
                        <td className="px-3 text-[11px] text-slate-500 truncate" title={duesSummary?.upcoming_cycle?.first_cycle_start_date ? `First Stay settlement: ${formatDisplayDate(duesSummary.upcoming_cycle.first_cycle_start_date).split(",")[0]} to ${formatDisplayDate(duesSummary.upcoming_cycle.first_cycle_end_date).split(",")[0]}` : "—"}>
                          {duesSummary?.upcoming_cycle?.first_cycle_start_date 
                            ? `First stay: ${formatDisplayDate(duesSummary.upcoming_cycle.first_cycle_start_date).split(",")[0]} — ${formatDisplayDate(duesSummary.upcoming_cycle.first_cycle_end_date).split(",")[0]}` 
                            : "Onboarding record."}
                        </td>
                      </tr>
                    )}

                    {/* Next Due Cycle Row */}
                    {duesSummary?.upcoming_cycle ? (
                      <tr className="h-10 hover:bg-slate-50/50 bg-orange-50/5">
                        <td className="px-3 font-bold text-slate-800">
                          Next Due Cycle
                        </td>
                        <td className="px-3 font-black text-slate-850">
                          {formatCurrency(duesSummary.upcoming_cycle.expected_amount || 0)}
                        </td>
                        <td className="px-3">
                          <span className="inline-flex rounded border border-sky-100 bg-sky-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-600">
                            Upcoming
                          </span>
                        </td>
                        <td className="px-3 text-[11px] text-slate-550 font-bold">
                          Due Date: {formatDisplayDate(duesSummary.upcoming_cycle.due_date).split(",")[0]}
                        </td>
                        <td className="px-3 text-[11px] text-slate-500 leading-tight">
                          <p>Outstanding: <span className="font-black text-slate-700">{formatCurrency(duesSummary?.next_due?.pending_amount || 0)}</span></p>
                          <p className="text-[9px] text-slate-400 uppercase mt-0.5">Anchor: {formatDisplayDate(duesSummary.upcoming_cycle.due_month).split(",")[0]}</p>
                        </td>
                      </tr>
                    ) : (
                      <tr className="h-10">
                        <td colSpan="5" className="px-3 text-[11px] text-emerald-600 italic">No upcoming monthly due cycle logged.</td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </div>
            </div>

            {/* Section C: Complete Payment Ledger Timeline Table */}
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-150 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard size={12} className="text-slate-455" />
                  C. Complete Payment Ledger Timeline
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[780px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[8px] font-black uppercase tracking-wider text-slate-400 h-8">
                      <th className="px-3 w-[20%]">Billing Cycle Month</th>
                      <th className="px-3 w-[15%]">Amount Paid</th>
                      <th className="px-3 w-[15%]">Payment Type</th>
                      <th className="px-3 w-[12%]">Mode</th>
                      <th className="px-3 w-[16%]">Ref / Receipt ID</th>
                      <th className="px-3 w-[12%]">Status</th>
                      <th className="px-3 w-[10%] text-center">Attachment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {paymentTimeline?.payments && paymentTimeline.payments.length > 0 ? (
                      paymentTimeline.payments.map((payment) => (
                        <tr key={payment.id} className="h-10 hover:bg-slate-50/50">
                          <td className="px-3 text-[11px] font-bold text-slate-800 leading-tight">
                            <p>{formatPaymentMonth(payment.payment_date)}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">
                              {formatDisplayDate(payment.payment_date).split(",")[0]}
                            </p>
                          </td>
                          <td className="px-3 font-black text-slate-850">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-3 uppercase text-[10px] text-slate-500 font-black">
                            {payment.payment_type}
                          </td>
                          <td className="px-3 text-slate-600 font-bold capitalize">
                            {payment.payment_mode || "—"}
                          </td>
                          <td className="px-3 text-[11px] text-slate-500 truncate" title={payment.reference_number || payment.receipt_number || "—"}>
                            {payment.reference_number || payment.receipt_number || "—"}
                          </td>
                          <td className="px-3">
                            <span className={`inline-flex rounded border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${getVerificationStatusColor(payment.verification_status || payment.status)}`}>
                              {payment.verification_status || payment.status}
                            </span>
                          </td>
                          <td className="px-3 text-center">
                            {payment.payment_proof_url ? (
                              <a
                                href={getAssetUrl(payment.payment_proof_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-6 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-wider text-slate-600 hover:text-orange-500 hover:border-orange-200 transition"
                              >
                                View
                              </a>
                            ) : (
                              <span className="text-[9px] font-black uppercase text-slate-300">None</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-3 py-4 text-center text-slate-400 italic">No payments logged in the timeline archive.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section D: Activity Logs Table */}
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-150 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <CalendarClock size={12} className="text-slate-455" />
                  D. System Activity Log & Audit Timeline
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[550px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[8px] font-black uppercase tracking-wider text-slate-400 h-8">
                      <th className="px-3 w-[55%]">System Action Performed</th>
                      <th className="px-3 w-[20%]">Performed By</th>
                      <th className="px-3 w-[25%]">Logged Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {activityLogs && activityLogs.length > 0 ? (
                      activityLogs.map((activity) => (
                        <tr key={activity.id} className="h-9 hover:bg-slate-50/50">
                          <td className="px-3 text-slate-800 font-bold capitalize truncate">
                            {String(activity.action || "").replaceAll("_", " ")}
                          </td>
                          <td className="px-3 text-[11px] text-slate-500 font-black uppercase tracking-wider">
                            Admin ID: {activity.performed_by || "System"}
                          </td>
                          <td className="px-3 text-[11px] text-slate-500">
                            {formatDisplayDate(activity.created_at)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-3 py-4 text-center text-slate-400 italic">No activity logs recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </TenantShell>
  );
};

export default TenantHistory;
