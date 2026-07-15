import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Calendar, Play, Eye } from "lucide-react";

import SearchBar from "../../Common/SearchBar";
import Table from "../../Common/Table";
import StatusBadge from "../../Common/StatusBadge";
import PageLoader from "../../Common/PageLoader";
import ActionPopOver from "../../Common/ActionPopOver";
import {
  RATION_STOCK_ISSUE_APPROVED_REQUEST_LIST,
  GET_INSTITUTION_LIST,
  TOKEN_KEY
} from "../../../Utils/Constants";

const ApprovedKitchenRequests = ({ selectedInstitutionId, setSelectedInstitutionId, institutions, loadingInstitutions }) => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || authUser?.profile_id === 1;

  const [requestsList, setRequestsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchApprovedRequests = async (page = 1) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(RATION_STOCK_ISSUE_APPROVED_REQUEST_LIST, {
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
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to fetch approved requests");
        return;
      }

      setRequestsList(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedRequests(currentPage);
  }, [selectedInstitutionId, authUser, currentPage]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchApprovedRequests(1);
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
    { key: "request_number", label: "Request Number" },
    { key: "request_date", label: "Request Date" },
    { key: "required_date", label: "Required Date" },
    { key: "meal_type", label: "Meal Type" },
    { key: "total_items", label: "Total Items" },
    { key: "remaining_items", label: "Remaining Items" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "requested_by", label: "Requested By" },
    { key: "actions", label: "Actions" },
  ];

  const tableData = requestsList.map((req, index) => {
    return {
      ...req,
      serial_number: (currentPage - 1) * 10 + index + 1,
      request_date: formatDate(req.request_date),
      required_date: formatDate(req.required_date),
      meal_type: req.meal_type_name || "-",
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
              {
                label: "Issue Stock",
                icon: Play,
                onClick: () => navigate(`/ration-inventory/stock-issue/create/${req.id}`),
              },
              {
                label: "View Request",
                icon: Eye,
                onClick: () => navigate(`/ration-inventory/kitchen-request/view/${req.id}`),
              }
            ]}
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
                placeholder="Search Request Number..."
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
            <button
              onClick={() => fetchApprovedRequests(1)}
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
    </div>
  );
};

export default ApprovedKitchenRequests;
