import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Ban, Calendar, ClipboardList, Info, User } from "lucide-react";

import Sidebar from "../../Layout/Sidebar";
import Navbar from "../../Layout/Navbar";
import Button from "../../Common/Button";
import StatusBadge from "../../Common/StatusBadge";
import PageLoader from "../../Common/PageLoader";
import CancelRationStockAdjustment from "./CancelRationStockAdjustment";
import { RATION_STOCK_ADJUSTMENT_VIEW, TOKEN_KEY } from "../../../Utils/Constants";

const ViewRationStockAdjustment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adjustment, setAdjustment] = useState(null);
  const [items, setItems] = useState([]);

  // Cancel Modal state
  const [cancelOpen, setCancelOpen] = useState(false);

  const fetchAdjustmentDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const instId = authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
      const response = await fetch(RATION_STOCK_ADJUSTMENT_VIEW, {
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
        throw new Error(data.message || "Failed to load stock adjustment details");
      }

      setAdjustment(data.data?.header || null);
      setItems(data.data?.items || []);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustmentDetails();
  }, [id]);

  const handleCancelSuccess = () => {
    fetchAdjustmentDetails();
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

  if (error || !adjustment) {
    return (
      <div className="flex min-h-screen bg-slate-50/70">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 text-left">
              <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100">
                {error || "Stock adjustment details not found."}
              </div>
              <Button variant="secondary" onClick={() => navigate("/ration-inventory/stock-adjustment")} className="self-start">
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
                    onClick={() => navigate("/ration-inventory/stock-adjustment")}
                    className="p-2 hover:bg-slate-50 border rounded-xl text-slate-450 hover:text-slate-650 transition cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    Adjustment: {adjustment.adjustment_number}
                  </h1>
                </div>
                <p className="mt-1 text-sm text-slate-500 font-medium ml-11">
                  View stock adjustment properties, reasons, remarks and item details.
                </p>
              </div>

              <div className="flex items-center gap-3 ml-11 md:ml-0">
                {adjustment.status === "completed" && (
                  <Button variant="secondary" onClick={() => setCancelOpen(true)} className="!border-red-200 !text-red-600 hover:!bg-red-50">
                    <Ban size={16} className="mr-2" />
                    Cancel Stock Adjustment
                  </Button>
                )}
                <StatusBadge status={adjustment.status} />
              </div>
            </div>

            {/* Header Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              {/* Row 1 */}
              <div className="flex items-start gap-3">
                <Calendar className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adjustment Date</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{formatDate(adjustment.adjustment_date)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Info className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason Category</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{adjustment.reason}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created By</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{adjustment.created_by_email || `User: ${adjustment.created_by}`}</div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-start gap-3">
                <Calendar className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created Date</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{formatDate(adjustment.created_at)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Updated</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{formatDate(adjustment.updated_at)}</div>
                </div>
              </div>

              {/* Remarks */}
              <div className="md:col-span-3 flex items-start gap-3 border-t border-slate-50 pt-4 mt-2">
                <Info className="text-orange-500 mt-0.5" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks</div>
                  <div className="text-sm font-bold text-slate-700 mt-1">{adjustment.remarks || "No remarks specified"}</div>
                </div>
              </div>
            </div>

            {/* Adjustment Item List Grid */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ClipboardList size={16} className="text-orange-500" />
                Adjustment Items List
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Item Info</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">SKU ID</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Barcode</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Unit</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Previous Stock</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase w-28">Direction</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase text-orange-500 font-bold">Adjusted Qty</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase text-blue-500 font-bold">New Stock</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100/80 hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-800 text-xs">{item.item_name}</span>
                          <div className="text-[9px] text-slate-400">Code: {item.item_code}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-semibold">{item.sku_id || "-"}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-semibold">{item.barcode || "-"}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-semibold">{item.unit || "-"}</td>
                        <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-600">
                          {parseFloat(item.previous_stock || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-[10px] font-bold border capitalize ${
                            item.adjustment_direction === "increase"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-red-50 text-red-700 border-red-100"
                          }`}>
                            {item.adjustment_direction === "increase" ? "Increase (+)" : "Decrease (-)"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-xs font-bold text-orange-600 bg-orange-50/10">
                          {parseFloat(item.adjustment_quantity || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-xs font-bold text-blue-600 bg-blue-50/10">
                          {parseFloat(item.new_stock || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">{item.reason || "-"}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-650">{item.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {cancelOpen && (
              <CancelRationStockAdjustment
                isOpen={cancelOpen}
                onClose={() => setCancelOpen(false)}
                adjustmentId={id}
                onSuccess={handleCancelSuccess}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewRationStockAdjustment;
