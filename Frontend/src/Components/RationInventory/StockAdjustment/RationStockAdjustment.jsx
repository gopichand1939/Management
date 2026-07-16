import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Eye, Ban, Plus, RefreshCw } from "lucide-react";

import Sidebar from "../../Layout/Sidebar";
import Navbar from "../../Layout/Navbar";
import SearchBar from "../../Common/SearchBar";
import Table from "../../Common/Table";
import StatusBadge from "../../Common/StatusBadge";
import PageLoader from "../../Common/PageLoader";
import ActionPopOver from "../../Common/ActionPopOver";
import Button from "../../Common/Button";
import CancelRationStockAdjustment from "./CancelRationStockAdjustment";
import {
  GET_INSTITUTION_LIST,
  RATION_STOCK_ADJUSTMENT_LIST,
  TOKEN_KEY
} from "../../../Utils/Constants";

const RationStockAdjustment = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || authUser?.profile_id === 1;

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id ? String(authUser.institution_id) : (sessionStorage.getItem("selected_institution_id") || "")
  );

  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Cancel Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelAdjustmentId, setCancelAdjustmentId] = useState(null);

  // Fetch institutions
  useEffect(() => {
    const getInstitutions = async () => {
      if (!isSuperAdmin) return;
      setLoadingInstitutions(true);
      try {
        const response = await fetch(GET_INSTITUTION_LIST, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();
        if (response.ok) {
          const list = data.institutions || data.data || [];
          setInstitutions(list);
          if (!selectedInstitutionId && list.length > 0) {
            const prevId = sessionStorage.getItem("selected_institution_id");
            if (prevId && list.some(inst => String(inst.id) === String(prevId))) {
              setSelectedInstitutionId(String(prevId));
            } else {
              setSelectedInstitutionId(String(list[0].id));
              sessionStorage.setItem("selected_institution_id", String(list[0].id));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching institutions:", err);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [isSuperAdmin]);

  const fetchAdjustments = async (page = 1) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(RATION_STOCK_ADJUSTMENT_LIST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: Number(instId),
          page,
          limit: 10,
          search: searchText,
          status: selectedStatus,
          reason: selectedReason
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to fetch stock adjustments list");
        return;
      }

      setAdjustments(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments(currentPage);
  }, [selectedInstitutionId, authUser, currentPage, selectedStatus, selectedReason]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchAdjustments(1);
  };

  const handleInstitutionChange = (e) => {
    const instId = e.target.value;
    setSelectedInstitutionId(instId);
    sessionStorage.setItem("selected_institution_id", instId);
    setCurrentPage(1);
  };

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      return String(value);
    }
  };

  const handleCancelClick = (id) => {
    setCancelAdjustmentId(id);
    setCancelModalOpen(true);
  };

  const handleCancelSuccess = () => {
    fetchAdjustments(currentPage);
  };

  const columns = [
    { key: "serial_number", label: "S.No" },
    { key: "adjustment_number", label: "Adjustment Number" },
    { key: "adjustment_date", label: "Adjustment Date" },
    { key: "reason", label: "Reason" },
    { key: "remarks", label: "Remarks" },
    { key: "total_items", label: "Items" },
    { key: "total_quantity", label: "Adjusted Qty" },
    { key: "status", label: "Status" },
    { key: "created_by", label: "Created By" },
    { key: "created_date", label: "Created Date" },
    { key: "actions", label: "Actions" },
  ];

  const tableData = adjustments.map((adj, index) => {
    return {
      ...adj,
      serial_number: (currentPage - 1) * 10 + index + 1,
      adjustment_date: formatDate(adj.adjustment_date),
      created_date: formatDate(adj.created_at),
      created_by: adj.created_by_email || `User: ${adj.created_by}`,
      total_quantity: parseFloat(adj.total_quantity || 0).toFixed(2),
      status: <StatusBadge status={adj.status} />,
      actions: (
        <div className="flex items-center justify-center">
          <ActionPopOver
            actions={[
              {
                label: "View Details",
                icon: Eye,
                onClick: () => navigate(`/ration-inventory/stock-adjustment/view/${adj.id}`),
              },
              adj.status === "completed" && {
                label: "Cancel Adjustment",
                icon: Ban,
                onClick: () => handleCancelClick(adj.id),
              }
            ].filter(Boolean)}
          />
        </div>
      )
    };
  });

  const reasons = [
    "Damage",
    "Expiry",
    "Wastage",
    "Spillage",
    "Correction",
    "Extra Stock Found",
    "Opening Balance",
    "System Correction",
    "Other"
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center text-left">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Stock Adjustment</h1>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  Perform inventory count corrections, log wastage, damaged or expired stock.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate("/ration-inventory/stock-adjustment/create")}
                  icon={Plus}
                >
                  New Adjustment
                </Button>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col">
              <div className="flex flex-col gap-4 border-b border-slate-50 p-5 md:flex-row md:items-center">
                <div className="flex flex-1 items-center gap-2">
                  <form onSubmit={handleSearchSubmit} className="w-full max-w-sm flex items-center">
                    <SearchBar
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Search Adjustment Number..."
                    />
                    <button type="submit" className="hidden" />
                  </form>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {isSuperAdmin && (
                    <select
                      value={selectedInstitutionId}
                      onChange={handleInstitutionChange}
                      disabled={loadingInstitutions}
                      className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                    >
                      <option value="">Select Institution</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.institution_name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select
                    value={selectedReason}
                    onChange={(e) => {
                      setSelectedReason(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                  >
                    <option value="">All Reasons</option>
                    {reasons.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => fetchAdjustments(1)}
                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Content area */}
              <div className="p-5 text-left">
                {error && (
                  <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center p-10">
                    <PageLoader />
                  </div>
                ) : (
                  <Table
                    columns={columns}
                    data={tableData}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={totalRecords}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {cancelModalOpen && (
        <CancelRationStockAdjustment
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          adjustmentId={cancelAdjustmentId}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
};

export default RationStockAdjustment;
