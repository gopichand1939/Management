import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Eye, Ban } from "lucide-react";

import SearchBar from "../../Common/SearchBar";
import Table from "../../Common/Table";
import StatusBadge from "../../Common/StatusBadge";
import PageLoader from "../../Common/PageLoader";
import ActionPopOver from "../../Common/ActionPopOver";
import CancelRationStockIssue from "./CancelRationStockIssue";
import {
  RATION_STOCK_ISSUE_LIST,
  TOKEN_KEY
} from "../../../Utils/Constants";
import { hasMenuAction, MENU_ACTIONS } from "../../../Utils/MenuPermissions";

const RationStockIssueItemsTable = ({ selectedInstitutionId, setSelectedInstitutionId, institutions, loadingInstitutions }) => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || authUser?.profile_id === 1;

  const routePath = "/ration-inventory/stock-issue";
  const canDelete = hasMenuAction(authUser, routePath, MENU_ACTIONS.DELETE);

  const [issueList, setIssueList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Cancel Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelIssueId, setCancelIssueId] = useState(null);

  const fetchStockIssues = async (page = 1) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(RATION_STOCK_ISSUE_LIST, {
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
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to fetch stock issues list");
        return;
      }

      setIssueList(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockIssues(currentPage);
  }, [selectedInstitutionId, authUser, currentPage, selectedStatus]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchStockIssues(1);
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

  const columns = [
    { key: "serial_number", label: "S.No" },
    { key: "issue_number", label: "Issue Number" },
    { key: "issue_date", label: "Issue Date" },
    { key: "request_number", label: "Request Number" },
    { key: "meal_type", label: "Meal Type" },
    { key: "total_items", label: "Total Items" },
    { key: "total_quantity", label: "Total Quantity" },
    { key: "status", label: "Status" },
    { key: "created_by", label: "Created By" },
    { key: "created_date", label: "Created Date" },
    { key: "actions", label: "Actions" },
  ];

  const handleCancelClick = (id) => {
    setCancelIssueId(id);
    setCancelModalOpen(true);
  };

  const handleCancelSuccess = () => {
    fetchStockIssues(currentPage);
  };

  const tableData = issueList.map((issue, index) => {
    return {
      ...issue,
      serial_number: (currentPage - 1) * 10 + index + 1,
      issue_date: formatDate(issue.issue_date),
      created_date: formatDate(issue.created_at),
      meal_type: issue.meal_type_name || "-",
      created_by: issue.created_by_email || `User: ${issue.created_by}`,
      total_quantity: parseFloat(issue.total_quantity || 0).toFixed(2),
      status: <StatusBadge status={issue.status} />,
      actions: (
        <div className="flex items-center justify-center">
          <ActionPopOver
            actions={[
              {
                label: "View Issue",
                icon: Eye,
                onClick: () => navigate(`/ration-inventory/stock-issue/view/${issue.id}`),
              },
              canDelete && issue.status === "completed" && {
                label: "Cancel Issue",
                icon: Ban,
                onClick: () => handleCancelClick(issue.id),
              }
            ].filter(Boolean)}
          />
        </div>
      )
    };
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Search & Filter Toolbar */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col">
        <div className="flex flex-col gap-4 border-b border-slate-50 p-5 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="w-full max-w-sm flex items-center">
              <SearchBar
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search Issue, Request Number..."
              />
              <button type="submit" className="hidden" />
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={() => fetchStockIssues(1)}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5">
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

      {cancelModalOpen && (
        <CancelRationStockIssue
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          issueId={cancelIssueId}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
};

export default RationStockIssueItemsTable;
