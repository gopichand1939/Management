import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Trash2, Edit, Calendar, User, Info, Inbox } from "lucide-react";

import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import StatusBadge from "../../Common/StatusBadge";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import DeleteKitchenRequest from "./DeleteKitchenRequest";
import ApproveKitchenRequest from "./ApproveKitchenRequest";
import RejectKitchenRequest from "./RejectKitchenRequest";
import { RATION_KITCHEN_REQUEST_VIEW, TOKEN_KEY } from "../../../Utils/Constants";
import { hasMenuAction, MENU_ACTIONS } from "../../../Utils/MenuPermissions";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return String(value);
  }
};

const formatDateTime = (value) => {
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

const ViewKitchenRequest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);

  const routePath = "/ration-inventory/kitchen-request";
  const canEdit = hasMenuAction(authUser, routePath, MENU_ACTIONS.EDIT);
  const canDelete = hasMenuAction(authUser, routePath, MENU_ACTIONS.DELETE);
  const canApprove = hasMenuAction(authUser, routePath, MENU_ACTIONS.APPROVE);
  const canReject = hasMenuAction(authUser, routePath, MENU_ACTIONS.REJECT);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestDetails, setRequestDetails] = useState(null);

  // Modals state
  const [showDelete, setShowDelete] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const institutionId = location.state?.institution_id || authUser?.institution_id;

  const fetchDetails = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_KITCHEN_REQUEST_VIEW, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(id),
          institution_id: institutionId ? Number(institutionId) : undefined
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to load kitchen request details");
        return;
      }

      setRequestDetails(data.data);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id, authUser]);

  const handleActionSuccess = (msg) => {
    // Navigate back to listing page with toast state
    navigate("/ration-inventory/kitchen-request", {
      state: { toastMessage: msg, toastType: "success" }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 md:p-8 flex items-center justify-center">
            <PageLoader />
          </main>
        </div>
      </div>
    );
  }

  if (error || !requestDetails) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 md:p-8 space-y-4">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate("/ration-inventory/kitchen-request")}>
              Back to List
            </Button>
            <Error message={error || "Kitchen request details not found"} />
          </main>
        </div>
      </div>
    );
  }

  const { header, items } = requestDetails;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          
          {/* Header Action Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-left flex items-center gap-2">
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => navigate("/ration-inventory/kitchen-request")}
                className="!p-2.5"
              />
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  {header.request_number}
                </h1>
                <p className="text-xs font-semibold text-slate-450 mt-0.5">
                  Request Date: {formatDate(header.request_date)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Edit Button */}
              {canEdit && (header.status === "draft" || header.status === "pending") && (
                <Button
                  variant="secondary"
                  icon={Edit}
                  onClick={() => navigate(`/ration-inventory/kitchen-request/edit/${header.id}`, { state: { institution_id: institutionId } })}
                >
                  Edit
                </Button>
              )}

              {/* Delete Button */}
              {canDelete && (header.status === "draft" || header.status === "pending") && (
                <Button
                  variant="secondary"
                  icon={Trash2}
                  onClick={() => setShowDelete(true)}
                  className="!text-red-650 hover:!bg-red-50"
                >
                  Delete
                </Button>
              )}

              {/* Approval Buttons */}
              {header.status === "pending" && (
                <>
                  {canReject && (
                    <Button
                      variant="secondary"
                      icon={XCircle}
                      onClick={() => setShowReject(true)}
                      className="!text-red-500 hover:!bg-red-50"
                    >
                      Reject
                    </Button>
                  )}
                  {canApprove && (
                    <Button
                      variant="orange"
                      icon={CheckCircle2}
                      onClick={() => setShowApprove(true)}
                      className="!bg-emerald-600 hover:!bg-emerald-700"
                    >
                      Approve
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Details & Items Grid */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Header Info Block */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Info size={13} className="text-orange-500" />
                  Kitchen Request Specifications
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-1">Required Date</span>
                    <span className="text-slate-800 font-bold">{formatDate(header.required_date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-1">Meal Type</span>
                    <span className="text-slate-800 font-bold">{header.meal_type_name} ({header.meal_type_code})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-1">Priority</span>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold border capitalize ${
                      header.priority === "critical"
                        ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse font-black"
                        : header.priority === "high"
                        ? "bg-red-50 text-red-655 border-red-100"
                        : header.priority === "medium"
                        ? "bg-amber-50 text-amber-600 border-amber-100"
                        : "bg-slate-50 text-slate-500 border-slate-100"
                    }`}>
                      {header.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-1">Status</span>
                    <StatusBadge status={header.status} />
                  </div>
                </div>

                {header.remarks && (
                  <div className="border-t pt-4 mt-4 text-xs">
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-1">Remarks</span>
                    <p className="text-slate-700 font-semibold leading-relaxed">{header.remarks}</p>
                  </div>
                )}
              </div>

              {/* Items List Table */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left flex flex-col">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Inbox size={13} className="text-orange-500" />
                  Demanded kitchen items ({items.length})
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-600 font-medium">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">S.No</th>
                        <th className="p-3">Item Specs</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Unit</th>
                        <th className="p-3 text-right">Available Stock</th>
                        <th className="p-3 text-right">Requested Qty</th>
                        <th className="p-3 text-right">Approved Qty</th>
                        <th className="p-3 text-right">Issued Qty</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => (
                        <tr key={item.request_item_id} className="hover:bg-slate-50/50">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{item.item_name}</div>
                            <div className="text-[9px] font-bold text-slate-400">{item.sku_id}</div>
                          </td>
                          <td className="p-3 text-slate-500 font-semibold">{item.category_name}</td>
                          <td className="p-3 text-slate-500 font-semibold">{item.unit_code}</td>
                          <td className="p-3 text-right font-bold text-slate-700">{item.current_stock}</td>
                          <td className="p-3 text-right font-black text-slate-800">{item.requested_quantity}</td>
                          <td className="p-3 text-right font-black text-emerald-650">{item.approved_quantity}</td>
                          <td className="p-3 text-right font-black text-blue-650">{item.issued_quantity}</td>
                          <td className="p-3 max-w-[120px] truncate" title={item.remarks}>{item.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right 1 Col: Logins & Approvals audit trail */}
            <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left flex flex-col gap-6">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <User size={13} className="text-orange-500" />
                  Audit & Approval Trail
                </h4>

                <div className="space-y-4 text-xs font-semibold text-slate-650">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-50">
                    <span className="text-slate-400">Requested By:</span>
                    <span className="text-slate-800 font-bold">{header.requested_by_name || header.requested_by_email || `ID: ${header.requested_by}`}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-50">
                    <span className="text-slate-400">Created Date:</span>
                    <span className="text-slate-800 font-bold">{formatDateTime(header.created_at)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-50">
                    <span className="text-slate-400">Approved By:</span>
                    <span className="text-slate-800 font-bold">{header.approved_by_name || header.approved_by_email || (header.approved_by ? `ID: ${header.approved_by}` : "-")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Approval Date:</span>
                    <span className="text-slate-800 font-bold">{formatDateTime(header.approval_date)}</span>
                  </div>
                </div>
              </div>

              {/* Status Notice */}
              <div className="p-4 rounded-xl border bg-slate-55 border-slate-100 text-slate-500 text-xs font-bold space-y-2">
                <div className="text-slate-800 font-black flex items-center gap-1.5">
                  <Info size={14} className="text-orange-500" />
                  Demand Only Notice
                </div>
                <p className="leading-relaxed">
                  This kitchen request represents demanded items. Current stock is NOT adjusted on request creation or approval. Reduction only triggers upon issuing items.
                </p>
              </div>
            </div>

          </div>

        </main>
      </div>

      {/* Action Modals */}
      {showDelete && (
        <DeleteKitchenRequest
          id={header.id}
          onClose={() => setShowDelete(false)}
          onSuccess={() => handleActionSuccess("Kitchen request deleted successfully")}
          institutionId={institutionId}
        />
      )}

      {showApprove && (
        <ApproveKitchenRequest
          request={header}
          onClose={() => setShowApprove(false)}
          onSuccess={() => handleActionSuccess("Kitchen request approved successfully")}
          institutionId={institutionId}
        />
      )}

      {showReject && (
        <RejectKitchenRequest
          id={header.id}
          onClose={() => setShowReject(false)}
          onSuccess={() => handleActionSuccess("Kitchen request rejected successfully")}
          institutionId={institutionId}
        />
      )}

    </div>
  );
};

export default ViewKitchenRequest;
