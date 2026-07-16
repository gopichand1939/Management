import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Ban, Calendar, ClipboardList, Info, User, CheckCircle, XCircle } from "lucide-react";

import Sidebar from "../../Layout/Sidebar";
import Navbar from "../../Layout/Navbar";
import Button from "../../Common/Button";
import StatusBadge from "../../Common/StatusBadge";
import PageLoader from "../../Common/PageLoader";
import {
  RATION_STOCK_AUDIT_VIEW,
  RATION_STOCK_AUDIT_APPROVE,
  RATION_STOCK_AUDIT_REJECT,
  TOKEN_KEY
} from "../../../Utils/Constants";

const ViewRationStockAudit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [audit, setAudit] = useState(null);
  const [items, setItems] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAuditDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const instId = authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
      const response = await fetch(RATION_STOCK_AUDIT_VIEW, {
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
        throw new Error(data.message || "Failed to load stock audit details");
      }

      setAudit(data.data?.header || null);
      setItems(data.data?.items || []);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditDetails();
  }, [id, authUser]);

  const handleApprove = async () => {
    if (!window.confirm("Are you sure you want to approve this stock audit? This will post automatic stock adjustments and cannot be reversed.")) return;

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const instId = authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
      const response = await fetch(RATION_STOCK_AUDIT_APPROVE, {
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
      if (response.ok) {
        setSuccessMsg(data.message || "Stock audit approved successfully");
        fetchAuditDetails();
      } else {
        setError(data.message || "Failed to approve stock audit");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm("Are you sure you want to reject this stock audit?")) return;

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const instId = authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
      const response = await fetch(RATION_STOCK_AUDIT_REJECT, {
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
      if (response.ok) {
        setSuccessMsg(data.message || "Stock audit rejected successfully");
        fetchAuditDetails();
      } else {
        setError(data.message || "Failed to reject stock audit");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
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
      <div className="flex min-h-screen bg-slate-50/70">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <PageLoader />
          </main>
        </div>
      </div>
    );
  }

  if (error && !audit) {
    return (
      <div className="flex min-h-screen bg-slate-50/70">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 text-left">
              <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100">
                {error || "Stock audit details not found."}
              </div>
              <Button variant="secondary" onClick={() => navigate("/ration-inventory/stock-audit")} className="self-start">
                <ArrowLeft size={16} className="mr-2" />
                Back to List
              </Button>
            </div>
          </main>
        </div>
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
                    onClick={() => navigate("/ration-inventory/stock-audit")}
                    className="p-2 hover:bg-slate-50 border rounded-xl text-slate-450 hover:text-slate-650 transition cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    Audit: {audit.audit_number}
                  </h1>
                </div>
                <p className="mt-1 text-sm text-slate-500 font-medium ml-11">
                  Reconciliation sheets, differences, status history and admin actions.
                </p>
              </div>

              <div className="flex items-center gap-3 ml-11 md:ml-0">
                {audit.status === "pending" && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="!border-red-200 !text-red-600 hover:!bg-red-50"
                    >
                      <XCircle size={16} className="mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="!bg-emerald-600 hover:!bg-emerald-700 text-white"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Approve
                    </Button>
                  </>
                )}
                <StatusBadge status={audit.status} />
              </div>
            </div>

            {successMsg && (
              <div className="p-4 text-sm text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100">
                {successMsg}
              </div>
            )}
            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {/* Header Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              {/* Row 1 */}
              <div className="flex items-start gap-3">
                <Calendar className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Date</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{formatDate(audit.audit_date)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Info className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Name</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{audit.audit_name}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created By</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{audit.created_by_email || `User: ${audit.created_by}`}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved By</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{audit.approved_by_email || (audit.approved_by ? `User: ${audit.approved_by}` : "-")}</div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-start gap-3">
                <Calendar className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved Date</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{formatDate(audit.approved_at)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created Date</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{formatDate(audit.created_at)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 col-span-1 md:col-span-2">
                <Calendar className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Updated</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{formatDate(audit.updated_at)}</div>
                </div>
              </div>

              {/* Remarks */}
              <div className="md:col-span-4 flex items-start gap-3 border-t border-slate-50 pt-4 mt-2">
                <Info className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks</div>
                  <div className="text-sm font-bold text-slate-700 mt-1">{audit.remarks || "No remarks specified"}</div>
                </div>
              </div>
            </div>

            {/* Audit Item List Grid */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ClipboardList size={16} className="text-orange-500" />
                Audited Items List
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Item Info</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Unit</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-32 text-blue-500">System Stock</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-32 text-orange-500">Physical Stock</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-28">Difference</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase w-32">Direction</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const sys = parseFloat(item.system_stock || 0);
                      const phy = parseFloat(item.physical_stock || 0);
                      const diff = item.difference_quantity ? parseFloat(item.difference_quantity) : (phy - sys);

                      let direction = "-";
                      if (diff > 0) {
                        direction = "Increase (+)";
                      } else if (diff < 0) {
                        direction = "Decrease (-)";
                      }

                      return (
                        <tr key={item.id} className="border-b border-slate-100/80 hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-800 text-xs">{item.item_name}</span>
                            <div className="text-[9px] text-slate-400">Code: {item.item_code} | SKU: {item.sku_id}</div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600 font-semibold">{item.category_name || "-"}</td>
                          <td className="px-4 py-3.5 text-xs text-slate-600 font-semibold">{item.unit || "-"}</td>
                          <td className="px-4 py-3.5 text-right text-xs font-bold text-blue-600 bg-blue-50/10">
                            {sys.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-xs font-bold text-orange-600 bg-orange-50/10">
                            {phy.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3.5 text-right text-xs font-bold ${
                            diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-slate-600"
                          }`}>
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-[10px] font-bold border capitalize ${
                              diff > 0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : diff < 0
                                ? "bg-red-50 text-red-700 border-red-100"
                                : "bg-slate-50 text-slate-600 border-slate-100"
                            }`}>
                              {direction}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-650">{item.remarks || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewRationStockAudit;
