import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Eye, Edit2, Trash2, CheckCircle2, AlertCircle, RefreshCw, XCircle, Calendar } from "lucide-react";

import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import SearchBar from "../../Common/SearchBar";
import StatusBadge from "../../Common/StatusBadge";
import Table from "../../Common/Table";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import ActionPopOver from "../../Common/ActionPopOver";
import DeleteKitchenRequest from "./DeleteKitchenRequest";
import ApproveKitchenRequest from "./ApproveKitchenRequest";
import RejectKitchenRequest from "./RejectKitchenRequest";
import {
  RATION_KITCHEN_REQUEST_LIST,
  RATION_KITCHEN_REQUEST_DASHBOARD,
  GET_INSTITUTION_LIST,
  MEAL_TYPE_ACTIVE_LIST,
  TOKEN_KEY
} from "../../../Utils/Constants";
import {
  hasMenuAction,
  MENU_ACTIONS
} from "../../../Utils/MenuPermissions";

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

const KitchenRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);

  const routePath = "/ration-inventory/kitchen-request";
  const canCreate = hasMenuAction(authUser, routePath, MENU_ACTIONS.CREATE);
  const canEdit = hasMenuAction(authUser, routePath, MENU_ACTIONS.EDIT);
  const canView = hasMenuAction(authUser, routePath, MENU_ACTIONS.VIEW);
  const canDelete = hasMenuAction(authUser, routePath, MENU_ACTIONS.DELETE);

  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;
  
  const [requestsList, setRequestsList] = useState([]);
  const [summaryData, setSummaryData] = useState({
    draft_count: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    completed_count: 0,
    total_count: 0
  });

  // Action Modals State
  const [deleteId, setDeleteId] = useState(null);
  const [approveRequest, setApproveRequest] = useState(null);
  const [rejectId, setRejectId] = useState(null);

  // Filter States
  const [searchText, setSearchText] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [institutions, setInstitutions] = useState([]);
  const [mealTypes, setMealTypes] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id 
      ? String(authUser.institution_id) 
      : (sessionStorage.getItem("selected_institution_id") || "")
  );

  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    if (location.state?.toastMessage) {
      setToast({
        message: location.state.toastMessage,
        type: location.state.toastType || "success",
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
          if (!selectedInstitutionId && list.length === 1) {
            const firstInstId = String(list[0].id);
            setSelectedInstitutionId(firstInstId);
            sessionStorage.setItem("selected_institution_id", firstInstId);
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

  // Fetch meal types filter dropdown
  useEffect(() => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;

    const getMealTypes = async () => {
      try {
        const response = await fetch(MEAL_TYPE_ACTIVE_LIST, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });

        const data = await response.json();
        if (response.ok) {
          setMealTypes(data.mealTypes || data.data || []);
        }
      } catch (err) {
        console.error("Error loading meal types:", err);
      }
    };

    getMealTypes();
  }, [selectedInstitutionId, authUser]);

  // Fetch list & dashboard counts
  const fetchKitchenRequests = async (page = currentPage) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) {
      setRequestsList([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_KITCHEN_REQUEST_LIST, {
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
          filters: {
            meal_type_id: selectedMealType ? Number(selectedMealType) : null,
            priority: selectedPriority || null,
            start_date: startDate || null,
            end_date: endDate || null
          }
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to fetch kitchen requests");
        return;
      }

      setRequestsList(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || 0);

      // Load Summary Counts
      setLoadingSummary(true);
      const summaryRes = await fetch(RATION_KITCHEN_REQUEST_DASHBOARD, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ institution_id: Number(instId) }),
      });
      const summaryDataRes = await summaryRes.json();
      if (summaryRes.ok) {
        setSummaryData(summaryDataRes.data);
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchKitchenRequests(currentPage);
  }, [selectedInstitutionId, authUser, currentPage, selectedMealType, selectedPriority, selectedStatus, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchKitchenRequests(1);
  };

  const handleInstitutionChange = (e) => {
    const instId = e.target.value;
    setSelectedInstitutionId(instId);
    sessionStorage.setItem("selected_institution_id", instId);
    setCurrentPage(1);
  };

  const handleActionSuccess = (msg) => {
    setToast({ message: msg, type: "success" });
    fetchKitchenRequests(currentPage);
  };

  // Define Columns
  const columns = [
    { key: "serial_number", label: "S.No" },
    { key: "request_number", label: "Request Number" },
    { key: "request_date", label: "Request Date" },
    { key: "required_date", label: "Required Date" },
    { key: "meal_type", label: "Meal Type" },
    { key: "total_items", label: "Total Items" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "requested_by", label: "Requested By" },
    { key: "actions", label: "Actions" },
  ];

  // Define rows
  const tableData = requestsList.map((req, index) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    return {
      ...req,
      serial_number: (currentPage - 1) * 10 + index + 1,
      request_date: formatDate(req.request_date),
      required_date: formatDate(req.required_date),
      meal_type: `${req.meal_type_name || "-"} (${req.meal_type_code || "-"})`,
      requested_by: req.requested_by_email || `User: ${req.requested_by}`,
      priority: (
        <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-[10px] font-bold border capitalize ${
          req.priority === "critical"
            ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse font-black"
            : req.priority === "high"
            ? "bg-red-50 text-red-600 border-red-100"
            : req.priority === "medium"
            ? "bg-amber-50 text-amber-600 border-amber-100"
            : "bg-slate-50 text-slate-500 border-slate-100"
        }`}>
          {req.priority}
        </span>
      ),
      status: <StatusBadge status={req.status} />,
      actions: (
        <div className="flex items-center justify-center">
          <ActionPopOver
            actions={[
              canView && {
                label: "View Request",
                icon: Eye,
                onClick: () => navigate(`/ration-inventory/kitchen-request/view/${req.id}`, { state: { institution_id: instId } }),
              },
              canEdit && (req.status === "draft" || req.status === "pending") && {
                label: "Edit Request",
                icon: Edit2,
                onClick: () => navigate(`/ration-inventory/kitchen-request/edit/${req.id}`, { state: { institution_id: instId } }),
              },
              canDelete && (req.status === "draft" || req.status === "pending") && {
                label: "Delete Request",
                icon: Trash2,
                onClick: () => setDeleteId(req.id),
                className: "text-red-650 hover:bg-red-50"
              },
              (req.status === "pending") && {
                label: "Approve Request",
                icon: CheckCircle2,
                onClick: () => setApproveRequest(req),
                className: "text-emerald-600 hover:bg-emerald-50"
              },
              (req.status === "pending") && {
                label: "Reject Request",
                icon: XCircle,
                onClick: () => setRejectId(req.id),
                className: "text-red-500 hover:bg-red-50"
              }
            ].filter(Boolean)}
          />
        </div>
      ),
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Kitchen Requests
              </h1>
              <p className="mt-1 text-sm text-slate-500 font-medium">
                Log demands and retrieve details of kitchen requests
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={() => fetchKitchenRequests(currentPage)}
                disabled={loading}
              >
                Refresh
              </Button>
              {canCreate && (
                <Button
                  variant="orange"
                  icon={Plus}
                  onClick={() => navigate("/ration-inventory/kitchen-request/new")}
                >
                  New Request
                </Button>
              )}
            </div>
          </div>

          <Error message={error} />

          {/* Toast Notification */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border p-4 shadow-lg transition-all bg-emerald-50 text-emerald-800 border-emerald-100`}>
              <CheckCircle2 size={18} />
              <span className="text-sm font-bold">{toast.message}</span>
            </div>
          )}

          {/* Summary Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Draft</div>
              <div className="text-2xl font-black text-slate-550 mt-1">{loadingSummary ? "..." : summaryData.draft_count}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{loadingSummary ? "..." : summaryData.pending_count}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Approved</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{loadingSummary ? "..." : summaryData.approved_count}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Rejected</div>
              <div className="text-2xl font-black text-red-650 mt-1">{loadingSummary ? "..." : summaryData.rejected_count}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Completed</div>
              <div className="text-2xl font-black text-blue-650 mt-1">{loadingSummary ? "..." : summaryData.completed_count}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total requests</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{loadingSummary ? "..." : summaryData.total_count}</div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col">
            
            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-slate-50 p-5 md:flex-row md:items-center">
              
              <div className="flex flex-1 items-center gap-2">
                <form onSubmit={handleSearchSubmit} className="w-full max-w-sm flex items-center">
                  <SearchBar
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search Number, Remarks..."
                  />
                  <button type="submit" className="hidden" />
                </form>
              </div>

              {/* Filters Block */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Institution Select Dropdown */}
                {isSuperAdmin && (
                  <div className="relative">
                    <select
                      value={selectedInstitutionId}
                      onChange={handleInstitutionChange}
                      disabled={loadingInstitutions}
                      className="h-10 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
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

                {/* Meal Type Filter */}
                <select
                  value={selectedMealType}
                  onChange={(e) => {
                    setSelectedMealType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                >
                  <option value="">All Meal Types</option>
                  {mealTypes.map((mt) => (
                    <option key={mt.id} value={mt.id}>
                      {mt.meal_type_name}
                    </option>
                  ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={selectedPriority}
                  onChange={(e) => {
                    setSelectedPriority(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>

                {/* Date range filters */}
                <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-white text-xs font-semibold text-slate-500">
                  <Calendar size={13} className="text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="outline-none text-slate-700 bg-transparent"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="outline-none text-slate-700 bg-transparent"
                  />
                </div>

              </div>

            </div>

            {/* Table Listing */}
            {loading ? (
              <div className="p-8 flex justify-center">
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

        </main>
      </div>

      {/* Confirmation Modals */}
      {deleteId && (
        <DeleteKitchenRequest
          id={deleteId}
          onClose={() => setDeleteId(null)}
          onSuccess={() => handleActionSuccess("Kitchen request deleted successfully")}
          institutionId={selectedInstitutionId}
        />
      )}

      {approveRequest && (
        <ApproveKitchenRequest
          request={approveRequest}
          onClose={() => setApproveRequest(null)}
          onSuccess={() => handleActionSuccess("Kitchen request approved successfully")}
          institutionId={selectedInstitutionId}
        />
      )}

      {rejectId && (
        <RejectKitchenRequest
          id={rejectId}
          onClose={() => setRejectId(null)}
          onSuccess={() => handleActionSuccess("Kitchen request rejected successfully")}
          institutionId={selectedInstitutionId}
        />
      )}

    </div>
  );
};

export default KitchenRequest;
