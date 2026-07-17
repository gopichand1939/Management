import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useParams as useReactParams, useNavigate as useReactNavigate } from "react-router-dom";
import { ClipboardList, ArrowLeft, Ban, Calendar, User, Info } from "lucide-react";
import Button from "../../Common/Button";
import StatusBadge from "../../Common/StatusBadge";
import PageLoader from "../../Common/PageLoader";
import Sidebar from "../../Layout/Sidebar";
import Navbar from "../../Layout/Navbar";
import CancelRationStockIssue from "./CancelRationStockIssue";
import { RATION_STOCK_ISSUE_VIEW, TOKEN_KEY } from "../../../Utils/Constants";
import { hasMenuAction, MENU_ACTIONS } from "../../../Utils/MenuPermissions";

const ViewRationStockIssue = () => {
  const { id } = useReactParams();
  const navigate = useReactNavigate();
  const { authUser } = useSelector((state) => state.user);

  const routePath = "/ration-inventory/stock-issue";
  const canDelete = hasMenuAction(authUser, routePath, MENU_ACTIONS.DELETE);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [issue, setIssue] = useState(null);
  const [items, setItems] = useState([]);

  // Cancel Modal state
  const [cancelOpen, setCancelOpen] = useState(false);

  const fetchIssueDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const instId = authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
      const response = await fetch(RATION_STOCK_ISSUE_VIEW, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: Number(id),
          institution_id: instId ? Number(instId) : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load stock issue details");
      }

      setIssue(data.data?.header || null);
      setItems(data.data?.items || []);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueDetails();
  }, [id]);

  const handleCancelSuccess = () => {
    fetchIssueDetails();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <PageLoader />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="p-6 flex flex-col gap-4 text-left">
        <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100">
          {error || "Stock issue details not found."}
        </div>
        <Button variant="secondary" onClick={() => navigate("/ration-inventory/stock-issue")} className="self-start">
          <ArrowLeft size={16} className="mr-2" />
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 text-left">
            {/* Page Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate("/ration-inventory/stock-issue")}
                    className="p-2 hover:bg-slate-50 border rounded-xl text-slate-450 hover:text-slate-650 transition cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    Stock Issue: {issue.issue_number}
                  </h1>
                </div>
                <p className="mt-1 text-sm text-slate-500 font-medium ml-11">
                  View stock issue details, items checklist, and audit transaction log.
                </p>
              </div>

              <div className="flex items-center gap-3 ml-11 md:ml-0">
                {canDelete && issue.status === "completed" && (
                  <Button variant="secondary" onClick={() => setCancelOpen(true)} className="!border-red-200 !text-red-600 hover:!bg-red-50">
                    <Ban size={16} className="mr-2" />
                    Cancel Stock Issue
                  </Button>
                )}
                <StatusBadge status={issue.status} />
              </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              {/* Row 1 */}
              <div className="flex items-start gap-3">
                <Calendar className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Date</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{formatDate(issue.issue_date)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ClipboardList className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kitchen Request Number</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{issue.request_number}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Info className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meal Type</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{issue.meal_type_name || "-"}</div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-start gap-3">
                <User className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issued By</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{issue.issued_by_email || `User: ${issue.created_by}`}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created Date</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{formatDate(issue.created_at)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Updated</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{formatDate(issue.updated_at)}</div>
                </div>
              </div>

              {/* Remarks */}
              <div className="md:col-span-3 flex items-start gap-3 border-t border-slate-50 pt-4 mt-2">
                <Info className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks</div>
                  <div className="text-sm font-bold text-slate-700 mt-1">{issue.remarks || "No remarks specified"}</div>
                </div>
              </div>
            </div>

            {/* Item list */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ClipboardList size={16} className="text-orange-500" />
                Issued Items checklist
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Item Info</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">SKU ID</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Barcode</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Unit</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Approved Qty</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Previously Issued</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase text-orange-500 font-bold">Issue Qty</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Batch Info</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100/80 hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-800 text-xs">{item.item_name}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-semibold">{item.sku_id || "-"}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-semibold">{item.barcode || "-"}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-semibold">{item.unit || "-"}</td>
                        <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-600">
                          {parseFloat(item.approved_quantity || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-600">
                          {parseFloat(item.previously_issued_quantity || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-xs font-bold text-orange-600 bg-orange-50/10">
                          {parseFloat(item.issue_quantity || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 space-y-1">
                          {item.batch_number ? (
                            <div><span className="font-bold text-slate-400 text-[10px] uppercase">Batch:</span> {item.batch_number}</div>
                          ) : null}
                          {item.expiry_date ? (
                            <div><span className="font-bold text-slate-400 text-[10px] uppercase">Expiry:</span> {formatDate(item.expiry_date)}</div>
                          ) : null}
                          {!item.batch_number && !item.expiry_date && (
                            <span className="text-slate-400 italic text-[11px]">No batch/expiry tracking</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">{item.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {cancelOpen && (
              <CancelRationStockIssue
                isOpen={cancelOpen}
                onClose={() => setCancelOpen(false)}
                issueId={id}
                onSuccess={handleCancelSuccess}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewRationStockIssue;

