import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  Search,
  Undo2,
  UserMinus,
  WalletCards,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import TenantShell from "./TenantShell";
import { TENANT_VACATED_LIST, GET_INSTITUTION_LIST } from "../../Utils/Constants";
import {
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
  const [refundStatus, setRefundStatus] = useState("all");
  const [sortBy, setSortBy] = useState("checkout_desc");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pagination & Pop-up detail states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedTenantDetail, setSelectedTenantDetail] = useState(null);

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

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedInstitutionId, refundStatus, sortBy, limit]);

  // Client-side processing (filtering & sorting)
  const processedTenants = useMemo(() => {
    let list = tenants.filter((tenant) => {
      const term = searchText.toLowerCase();
      const matchesSearch =
        !searchText ||
        (tenant.full_name?.toLowerCase().includes(term) ||
          tenant.phone?.toLowerCase().includes(term) ||
          tenant.admission_number?.toLowerCase().includes(term) ||
          tenant.room_number?.toLowerCase().includes(term) ||
          tenant.bed_number?.toLowerCase().includes(term));

      const matchesInst =
        selectedInstitutionId === "all" ||
        Number(tenant.institution_id) === Number(selectedInstitutionId);

      const matchesRefund =
        refundStatus === "all" ||
        String(tenant.deposit_refund_status).toLowerCase() === refundStatus;

      return matchesSearch && matchesInst && matchesRefund;
    });

    list.sort((a, b) => {
      if (sortBy === "checkout_desc") {
        return (
          new Date(b.checkout_date || b.expected_checkout_date || 0).getTime() -
          new Date(a.checkout_date || a.expected_checkout_date || 0).getTime()
        );
      }
      if (sortBy === "checkout_asc") {
        return (
          new Date(a.checkout_date || a.expected_checkout_date || 0).getTime() -
          new Date(b.checkout_date || b.expected_checkout_date || 0).getTime()
        );
      }
      if (sortBy === "name_asc") {
        return (a.full_name || "").localeCompare(b.full_name || "");
      }
      if (sortBy === "name_desc") {
        return (b.full_name || "").localeCompare(a.full_name || "");
      }
      return 0;
    });

    return list;
  }, [tenants, searchText, selectedInstitutionId, refundStatus, sortBy]);

  // Paginated chunk
  const paginatedTenants = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return processedTenants.slice(start, start + limit);
  }, [processedTenants, currentPage, limit]);

  const totalCount = processedTenants.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Stats cards calculations
  const statsTenants = useMemo(() => {
    if (selectedInstitutionId === "all") return tenants;
    return tenants.filter((t) => Number(t.institution_id) === Number(selectedInstitutionId));
  }, [tenants, selectedInstitutionId]);

  const metricCards = useMemo(() => {
    return [
      {
        id: "total_vacated",
        label: "Vacated Records",
        value: statsTenants.length,
        icon: UserMinus,
        color: "bg-sky-50 text-sky-600 border-sky-100/55",
      },
      {
        id: "checkout_logged",
        label: "Checkout Logged",
        value: statsTenants.filter((t) => t.checkout_date || t.expected_checkout_date).length,
        icon: CalendarClock,
        color: "bg-amber-50 text-amber-500 border-amber-100/55",
      },
      {
        id: "refund_pending",
        label: "Refund Pending",
        value: statsTenants.filter((t) => String(t.deposit_refund_status).toLowerCase() === "pending").length,
        icon: WalletCards,
        color: "bg-violet-50 text-violet-650 border-violet-100/55",
      },
      {
        id: "beds_released",
        label: "Beds Released",
        value: statsTenants.filter((t) => t.bed_number).length,
        icon: Undo2,
        color: "bg-emerald-50 text-emerald-600 border-emerald-100/55",
      },
    ];
  }, [statsTenants]);

  const handleExportCSV = () => {
    if (processedTenants.length === 0) return;
    const headers = [
      "Name",
      "Admission No",
      "Phone",
      "Email",
      "Last Stay",
      "Room & Bed",
      "Check-in Date",
      "Checkout Date",
      "Rent",
      "Refundable Deposit",
      "Refund Status"
    ];
    const rows = processedTenants.map((ten) => [
      ten.full_name || "",
      ten.admission_number || "",
      ten.phone || "",
      ten.email || "",
      ten.institution_name || "",
      `Room ${ten.room_number || ""} (${ten.bed_number || ""})`,
      ten.check_in_date ? new Date(ten.check_in_date).toLocaleDateString() : "",
      ten.checkout_date ? new Date(ten.checkout_date).toLocaleDateString() : "",
      ten.agreed_monthly_rent || "",
      ten.refundable_amount || "",
      ten.deposit_refund_status || ""
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Vacated_Archive_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRefundBadgeColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "refunded") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-rose-50 text-rose-700 border-rose-100";
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-slate-800 animate-fadeIn">
        
        {/* Unified Premium Toolbar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="text-left">
            <h1 className="text-lg font-black tracking-tight text-slate-800 flex items-center gap-2">
              <span>Checkout & Vacated History</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black uppercase">
                {totalCount} Records
              </span>
            </h1>
            <p className="mt-1 text-[10px] text-slate-400 font-bold">
              Audit historic stays, released inventories, and deposit closures.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => fetchVacatedTenants(selectedInstitutionId)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              title="Refresh Records"
            >
              <RotateCw size={13} />
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              title="Export to CSV"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchText("");
                setRefundStatus("all");
                setSortBy("checkout_desc");
                setSelectedInstitutionId("all");
              }}
              className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Compact Summary Cards row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="rounded-2xl border border-slate-150 bg-white p-3 shadow-sm hover:shadow transition text-left flex justify-between items-center h-14"
              >
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{card.label}</span>
                  <span className="text-lg font-black text-slate-800 tracking-tight block mt-1 leading-none">{card.value}</span>
                </div>
                <div className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 ${card.color}`}>
                  <Icon size={12} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters Desk */}
        <div className="flex flex-col gap-3 bg-white p-3 rounded-2xl border border-slate-150 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
            
            {/* Search Input */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-slate-400 focus-within:border-orange-500/50 focus-within:bg-white transition">
              <Search size={13} />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search name, phone, admission..."
                className="h-8 w-full border-0 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Institution Filter */}
            {!isPgAdmin && (
              <select
                value={selectedInstitutionId}
                onChange={(e) => setSelectedInstitutionId(e.target.value)}
                className="h-8 rounded-xl border border-slate-250 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50"
              >
                <option value="all">All Buildings</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.institution_name || inst.name}
                  </option>
                ))}
              </select>
            )}

            {/* Refund Status */}
            <select
              value={refundStatus}
              onChange={(e) => setRefundStatus(e.target.value)}
              className="h-8 rounded-xl border border-slate-250 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50"
            >
              <option value="all">All Refund Statuses</option>
              <option value="pending">Pending Refund</option>
              <option value="refunded">Refunded</option>
              <option value="rejected">Rejected / Deducted</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 rounded-xl border border-slate-250 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50"
            >
              <option value="checkout_desc">Checkout Date (Latest)</option>
              <option value="checkout_asc">Checkout Date (Oldest)</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
        </div>

        <Error message={error} />

        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 shadow-sm flex justify-center items-center">
            <PageLoader />
          </div>
        ) : paginatedTenants.length === 0 ? (
          <div className="rounded-2xl border border-slate-150 bg-white p-16 shadow-sm text-center">
            <UserMinus size={36} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-black text-slate-700 mt-3.5">No Archive Records Found</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-1 max-w-xs mx-auto">
              No vacated check-out profiles match your current search criteria.
            </p>
          </div>
        ) : (
          
          /* Compact Enterprise Data Table Workspace */
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-2xl border border-slate-150 bg-white shadow-sm scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-black uppercase tracking-wider text-slate-400 h-9 select-none">
                    <th className="px-3 w-[4%] text-center">#</th>
                    <th className="px-3 w-[8%]">Avatar</th>
                    <th className="px-3 w-[22%]">Resident Name</th>
                    <th className="px-3 w-[15%]">Phone / ID</th>
                    <th className="px-3 w-[23%]">Historic Stay</th>
                    <th className="px-3 w-[12%]">Checkout</th>
                    <th className="px-3 w-[13%]">Refund status</th>
                    <th className="px-3 w-[12%]">Refundable</th>
                    <th className="px-3 w-[8%] text-center">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {paginatedTenants.map((ten, index) => {
                    const rowNum = (currentPage - 1) * limit + index + 1;
                    return (
                      <tr
                        key={ten.id}
                        onClick={() => setSelectedTenantDetail(ten)}
                        className="h-11 hover:bg-slate-50/70 transition-colors cursor-pointer select-none"
                      >
                        <td className="px-3 text-center text-[10px] text-slate-400 font-black">
                          {rowNum}
                        </td>
                        <td className="px-3">
                          {ten.profile_photo?.file_url ? (
                            <img
                              src={ten.profile_photo.file_url}
                              alt="Resident avatar"
                              className="h-7 w-7 rounded-full object-cover border border-slate-100"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-black flex items-center justify-center">
                              {getInitials(ten.full_name)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 truncate font-black text-slate-800" title={ten.full_name}>
                          {ten.full_name}
                        </td>
                        <td className="px-3 truncate text-slate-500 font-bold" title={ten.phone}>
                          <p className="leading-none text-slate-700">{ten.phone}</p>
                          <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">
                            {ten.admission_number || "NO ID"}
                          </p>
                        </td>
                        <td className="px-3 truncate text-slate-600">
                          <p className="leading-none text-slate-750 font-black truncate">{ten.institution_name}</p>
                          <p className="text-[10px] text-slate-455 mt-1 truncate">
                            Room {ten.room_number || "—"} ({ten.bed_number || "—"})
                          </p>
                        </td>
                        <td className="px-3 whitespace-nowrap text-slate-500">
                          {formatDisplayDate(ten.checkout_date || ten.expected_checkout_date).split(",")[0]}
                        </td>
                        <td className="px-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${getRefundBadgeColor(ten.deposit_refund_status)}`}>
                            {ten.deposit_refund_status || "Pending"}
                          </span>
                        </td>
                        <td className="px-3 font-black text-slate-850">
                          {formatCurrency(ten.refundable_amount || 0)}
                        </td>
                        <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => navigate(`/tenant/profile/${ten.id}`)}
                            className="p-1 rounded-lg border border-slate-150 bg-white text-slate-455 hover:text-orange-500 hover:border-orange-200 shadow-sm transition cursor-pointer"
                            title="Go to Resident Profile File"
                          >
                            <FolderOpen size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Paging Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-left gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-bold">
                    Showing <span className="font-black text-slate-800">{1 + (currentPage - 1) * limit}</span> –{" "}
                    <span className="font-black text-slate-800">{Math.min(currentPage * limit, totalCount)}</span> of{" "}
                    <span className="font-black text-slate-800">{totalCount} records</span>
                  </span>

                  {/* Limit Selector */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span>Rows:</span>
                    <select
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="h-7 rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-bold outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Page Select Numbers */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="cursor-pointer inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={13} className="mr-0.5" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => {
                        const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <div key={p} className="flex items-center">
                            {showEllipsisBefore && <span className="px-1 text-slate-400 text-xs">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`h-8 w-8 text-xs font-black rounded-lg border transition ${
                                currentPage === p
                                  ? "bg-slate-800 border-slate-800 text-white shadow-sm"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="cursor-pointer inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRight size={13} className="ml-0.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Premium Resident Profile Details Modal Popup */}
      <AnimatePresence>
        {selectedTenantDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTenantDetail(null)}
              className="absolute inset-0 cursor-default"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-150 bg-white p-6 text-left shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {selectedTenantDetail.profile_photo?.file_url ? (
                    <img
                      src={selectedTenantDetail.profile_photo.file_url}
                      alt="Avatar"
                      className="h-10 w-10 rounded-full object-cover border border-slate-100 shadow-sm"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-sm font-black flex items-center justify-center">
                      {getInitials(selectedTenantDetail.full_name)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-black text-slate-800 leading-tight">
                      {selectedTenantDetail.full_name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Admission ID: {selectedTenantDetail.admission_number || "NO ID"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${getStatusBadgeClassName(selectedTenantDetail.status || "vacated")}`}>
                    {selectedTenantDetail.status || "vacated"}
                  </span>
                  <button
                    onClick={() => setSelectedTenantDetail(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Stay & Personal Profile Card */}
                <div className="rounded-2xl border border-slate-150 bg-slate-50/50 p-4">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Stay & Personal details</span>
                  <div className="space-y-2.5 text-xs">
                    <p className="flex items-center gap-2 text-slate-700">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-500 w-12 shrink-0">Email:</span>
                      <span className="truncate font-semibold">{selectedTenantDetail.email || "—"}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-500 w-12 shrink-0">Phone:</span>
                      <span className="font-semibold">{selectedTenantDetail.phone || "—"}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-500 w-12 shrink-0">Gender:</span>
                      <span className="font-semibold capitalize">{selectedTenantDetail.gender || "—"}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-500 w-12 shrink-0">DOB:</span>
                      <span className="font-semibold">{selectedTenantDetail.date_of_birth ? new Date(selectedTenantDetail.date_of_birth).toLocaleDateString("en-IN") : "—"}</span>
                    </p>
                    <p className="text-slate-705 leading-tight">
                      <span className="font-bold text-slate-400 mr-2 uppercase text-[9px]">Occupation:</span>
                      <span className="font-semibold">{selectedTenantDetail.occupation || "—"} {selectedTenantDetail.company_name ? `at ${selectedTenantDetail.company_name}` : ""}</span>
                    </p>
                  </div>
                </div>

                {/* 2. Inventories & Stay Dates */}
                <div className="rounded-2xl border border-slate-150 bg-slate-50/50 p-4">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Stay & Allocation Info</span>
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <p className="truncate">
                      <span className="font-bold text-slate-400 mr-2 uppercase text-[9px]">Building:</span>
                      <span className="font-black text-slate-800">{selectedTenantDetail.institution_name}</span>
                    </p>
                    <p className="truncate">
                      <span className="font-bold text-slate-400 mr-2 uppercase text-[9px]">Location:</span>
                      <span className="font-semibold">{selectedTenantDetail.floor_name || "—"} • Room {selectedTenantDetail.room_number || "—"} ({selectedTenantDetail.bed_number || "—"})</span>
                    </p>
                    <div className="pt-2 border-t border-slate-150/80 flex justify-between">
                      <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Check-in</span>
                        <span className="font-semibold mt-0.5 block">{formatDisplayDate(selectedTenantDetail.check_in_date).split(",")[0]}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Checkout</span>
                        <span className="font-semibold mt-0.5 block text-slate-800">{formatDisplayDate(selectedTenantDetail.checkout_date || selectedTenantDetail.expected_checkout_date).split(",")[0]}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Deposit Closure Ledger */}
                <div className="rounded-2xl border border-slate-150 bg-slate-50/50 p-4">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Deposit Closure Ledger</span>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Monthly Rent</span>
                      <span className="font-semibold">{formatCurrency(selectedTenantDetail.agreed_monthly_rent || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Security Deposit</span>
                      <span className="font-semibold">{formatCurrency(selectedTenantDetail.security_deposit || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Deposit Paid</span>
                      <span className="font-semibold">{formatCurrency(selectedTenantDetail.deposit_paid || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 text-xs font-black text-slate-800">
                      <span>Refundable Deposit</span>
                      <span className="text-orange-600 text-sm">{formatCurrency(selectedTenantDetail.refundable_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[9px] font-black uppercase text-slate-400">Refund Status</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${getRefundBadgeColor(selectedTenantDetail.deposit_refund_status)}`}>
                        {selectedTenantDetail.deposit_refund_status || "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Documents Archive */}
                <div className="rounded-2xl border border-slate-150 bg-slate-50/50 p-4 flex flex-col justify-between gap-3">
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Document File archive</span>
                    <div className="space-y-1.5 animate-fadeIn">
                      {selectedTenantDetail.documents && selectedTenantDetail.documents.length > 0 ? (
                        selectedTenantDetail.documents.map((doc, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded-lg border border-slate-150/60 text-xs">
                            <div>
                              <p className="text-slate-850 font-bold capitalize leading-tight">{doc.document_type || doc.document_name}</p>
                              <p className="text-[9px] text-slate-400">{doc.document_number || "—"}</p>
                            </div>
                            {doc.document_url ? (
                              <a
                                href={doc.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-slate-55 text-slate-500 hover:text-orange-500 border border-slate-200 transition cursor-pointer"
                                title="View Document"
                              >
                                <FolderOpen size={11} />
                              </a>
                            ) : (
                              <span className="text-[8px] font-black text-slate-350 uppercase">No File</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">No verification records uploaded.</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Notes & Emergency Footer bar */}
              <div className="p-3.5 rounded-2xl bg-orange-50/20 border border-orange-100/40 text-left">
                <span className="block text-[8px] font-black text-orange-600 uppercase tracking-widest mb-1.5">Checkout Notes & Emergency Contacts</span>
                <p className="text-xs text-slate-705 italic leading-relaxed mb-2 font-medium">
                  "{selectedTenantDetail.notes || "No checkout notes logged."}"
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-orange-100/25 text-[11px] text-slate-500 font-bold">
                  <p><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] mr-1">Emergency contact:</span> {selectedTenantDetail.guardian_name || selectedTenantDetail.emergency_contact_name || "—"}</p>
                  <p><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] mr-1">Phone:</span> {selectedTenantDetail.guardian_phone || selectedTenantDetail.emergency_contact_phone || "—"}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/tenant/profile/${selectedTenantDetail.id}`);
                    setSelectedTenantDetail(null);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FolderOpen size={13} />
                  <span>Go to Full Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTenantDetail(null)}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800 transition cursor-pointer shadow-sm"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </TenantShell>
  );
};

export default VacatedHistory;
