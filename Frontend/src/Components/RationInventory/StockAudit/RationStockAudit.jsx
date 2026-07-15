import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Eye, Edit, Trash2, Plus, RefreshCw, CheckCircle, XCircle } from "lucide-react";

import Sidebar from "../../Layout/Sidebar";
import Navbar from "../../Layout/Navbar";
import SearchBar from "../../Common/SearchBar";
import Table from "../../Common/Table";
import StatusBadge from "../../Common/StatusBadge";
import PageLoader from "../../Common/PageLoader";
import ActionPopOver from "../../Common/ActionPopOver";
import Button from "../../Common/Button";
import {
  GET_INSTITUTION_LIST,
  RATION_STOCK_AUDIT_LIST,
  RATION_STOCK_AUDIT_DELETE,
  RATION_STOCK_AUDIT_APPROVE,
  RATION_STOCK_AUDIT_REJECT,
  TOKEN_KEY
} from "../../../Utils/Constants";

const RationStockAudit = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || authUser?.profile_id === 1;

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id ? String(authUser.institution_id) : (sessionStorage.getItem("selected_institution_id") || "")
  );

  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

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

  const fetchAudits = async (page = 1) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(RATION_STOCK_AUDIT_LIST, {
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
          startDate,
          endDate
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to fetch stock audits list");
        return;
      }

      setAudits(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits(currentPage);
  }, [selectedInstitutionId, authUser, currentPage, selectedStatus, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchAudits(1);
  };

  const handleInstitutionChange = (e) => {
    const instId = e.target.value;
    setSelectedInstitutionId(instId);
    sessionStorage.setItem("selected_institution_id", instId);
    setCurrentPage(1);
  };

  const handleDeleteAudit = async (id) => {
    if (!window.confirm("Are you sure you want to delete this stock audit?")) return;

    const instId = authUser?.institution_id || selectedInstitutionId;
    try {
      const response = await fetch(RATION_STOCK_AUDIT_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, institution_id: Number(instId) })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(data.message || "Stock audit deleted successfully");
        fetchAudits(currentPage);
      } else {
        setError(data.message || "Failed to delete stock audit");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    }
  };

  const handleApproveAudit = async (id) => {
    if (!window.confirm("Are you sure you want to approve this stock audit? This will post automatic stock adjustments and cannot be reversed.")) return;

    const instId = authUser?.institution_id || selectedInstitutionId;
    try {
      const response = await fetch(RATION_STOCK_AUDIT_APPROVE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, institution_id: Number(instId) })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(data.message || "Stock audit approved successfully");
        fetchAudits(currentPage);
      } else {
        setError(data.message || "Failed to approve stock audit");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    }
  };

  const handleRejectAudit = async (id) => {
    if (!window.confirm("Are you sure you want to reject this stock audit?")) return;

    const instId = authUser?.institution_id || selectedInstitutionId;
    try {
      const response = await fetch(RATION_STOCK_AUDIT_REJECT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, institution_id: Number(instId) })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(data.message || "Stock audit rejected successfully");
        fetchAudits(currentPage);
      } else {
        setError(data.message || "Failed to reject stock audit");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return String(value);
    }
  };

  const columns = [
    { key: "serial_number", label: "S.No" },
    { key: "audit_number", label: "Audit Number" },
    { key: "audit_date", label: "Audit Date" },
    { key: "audit_name", label: "Audit Name" },
    { key: "total_items", label: "Items" },
    { key: "status", label: "Status" },
    { key: "created_by", label: "Created By" },
    { key: "approved_by", label: "Approved By" },
    { key: "created_date", label: "Created Date" },
    { key: "actions", label: "Actions" },
  ];

  const tableData = audits.map((audit, index) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    return {
      ...audit,
      serial_number: (currentPage - 1) * 10 + index + 1,
      audit_date: formatDate(audit.audit_date),
      created_date: formatDate(audit.created_at),
      created_by: audit.created_by_email || `User: ${audit.created_by}`,
      approved_by: audit.approved_by_email || (audit.approved_by ? `User: ${audit.approved_by}` : "-"),
      status: <StatusBadge status={audit.status} />,
      actions: (
        <div className="flex items-center justify-center">
          <ActionPopOver
            actions={[
              {
                label: "View Details",
                icon: Eye,
                onClick: () => navigate(`/ration-inventory/stock-audit/view/${audit.id}`),
              },
              audit.status === "draft" && {
                label: "Edit Draft",
                icon: Edit,
                onClick: () => navigate(`/ration-inventory/stock-audit/edit/${audit.id}`),
              },
              audit.status === "draft" && {
                label: "Delete Draft",
                icon: Trash2,
                onClick: () => handleDeleteAudit(audit.id),
              },
              audit.status === "pending" && {
                label: "Approve Audit",
                icon: CheckCircle,
                onClick: () => handleApproveAudit(audit.id),
              },
              audit.status === "pending" && {
                label: "Reject Audit",
                icon: XCircle,
                onClick: () => handleRejectAudit(audit.id),
              }
            ].filter(Boolean)}
          />
        </div>
      )
    };
  });

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
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Stock Audit</h1>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  Perform stock reconciliations, compare physical count vs system values, and generate automatic corrections.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate("/ration-inventory/stock-audit/create")}
                  icon={Plus}
                >
                  New Stock Audit
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
                      placeholder="Search Audit Number or Item Name..."
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
                    <option value="draft">Draft</option>
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none transition"
                      title="Start Date"
                    />
                    <span className="text-slate-400 text-xs font-bold px-0.5">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none transition"
                      title="End Date"
                    />
                  </div>

                  <button
                    onClick={() => fetchAudits(1)}
                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Content area */}
              <div className="p-5 text-left">
                {successMsg && (
                  <div className="p-4 mb-4 text-sm text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100">
                    {successMsg}
                  </div>
                )}
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
    </div>
  );
};

export default RationStockAudit;
