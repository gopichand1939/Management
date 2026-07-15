import { useNavigate } from "react-router-dom";
import { ShieldAlert, Calendar, Boxes, User, ExternalLink, ClipboardList, CheckCircle2, ChevronRight, Truck } from "lucide-react";

const InventoryDashboardTables = ({
  lowStockItems = [],
  expiryAlerts = [],
  recentTransactions = [],
  pendingActions = [],
  topPurchasedItems = [],
  topIssuedItems = [],
  supplierPurchaseSummary = []
}) => {
  const navigate = useNavigate();

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? "₹0.00" : `₹${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (val) => {
    if (!val) return "-";
    try {
      return new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return String(val);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* 1. Pending Actions */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
          <ClipboardList size={14} className="text-orange-500" />
          Pending Approvals & Critical Warnings
        </h3>
        {pendingActions.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs font-bold text-slate-400">
            No pending action items requiring attention
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
            {pendingActions.map((action, idx) => (
              <div
                key={idx}
                onClick={() => navigate(action.route)}
                className="group flex items-start justify-between p-3.5 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/15 transition-all duration-300 cursor-pointer text-xs shadow-sm hover:shadow"
              >
                <div className="flex gap-3">
                  <span className={`mt-0.5 rounded-full p-1.5 ${
                    action.priority === "high" ? "bg-red-50 text-red-650" : "bg-amber-50 text-amber-650"
                  }`}>
                    {action.priority === "high" ? <ShieldAlert size={14} className="animate-pulse" /> : <CheckCircle2 size={14} />}
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-800 group-hover:text-orange-750 transition-colors">{action.title}</span>
                    <span className="text-[10px] text-slate-500 mt-1 leading-relaxed">{action.description}</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all self-center" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Recent Transactions */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
          <Calendar size={14} className="text-orange-500" />
          Recent Stock Activity Ledger
        </h3>
        {recentTransactions.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs font-bold text-slate-400">
            No transaction records found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Item</th>
                  <th className="py-2.5 text-center">Type</th>
                  <th className="py-2.5 text-right">In</th>
                  <th className="py-2.5 text-right">Out</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx, idx) => (
                  <tr key={idx} className="border-b border-slate-100/60 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 text-slate-500 font-medium">{formatDate(tx.transaction_date)}</td>
                    <td className="py-3 font-bold text-slate-800">{tx.item_name}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                        tx.transaction_type === "PURCHASE"
                          ? "bg-blue-50/60 text-blue-700 border-blue-100/80"
                          : tx.transaction_type === "ISSUE"
                          ? "bg-emerald-50/60 text-emerald-700 border-emerald-100/80"
                          : "bg-amber-50/60 text-amber-700 border-amber-100/80"
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-blue-600">
                      {tx.quantity_in > 0 ? `+${parseFloat(tx.quantity_in).toLocaleString()}` : "-"}
                    </td>
                    <td className="py-3 text-right font-bold text-red-650">
                      {tx.quantity_out > 0 ? `-${parseFloat(tx.quantity_out).toLocaleString()}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Low Stock Items */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShieldAlert size={14} className="text-orange-500" />
          Low Stock Alerts
        </h3>
        {lowStockItems.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs font-bold text-slate-400">
            All items are adequately stocked!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5">Item Info</th>
                  <th className="py-2.5 text-right">Available</th>
                  <th className="py-2.5 text-right">Min Level</th>
                  <th className="py-2.5 text-right text-red-500">Shortage</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100/60 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3">
                      <span className="font-bold text-slate-850 block">{item.item_name}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Code: {item.item_code} | {item.category_name}</span>
                    </td>
                    <td className="py-3 text-right font-bold text-slate-800">
                      {parseFloat(item.current_stock).toLocaleString()} {item.unit_code}
                    </td>
                    <td className="py-3 text-right text-slate-500 font-semibold">
                      {parseFloat(item.minimum_stock).toLocaleString()} {item.unit_code}
                    </td>
                    <td className="py-3 text-right font-black text-red-650 bg-red-50/20 rounded-lg px-2">
                      {parseFloat(item.shortage_quantity).toLocaleString()} {item.unit_code}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Expiry Warnings */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
          <Calendar size={14} className="text-orange-500" />
          Batch Expiry Notifications
        </h3>
        {expiryAlerts.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs font-bold text-slate-400">
            No active batches expiring soon
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5">Item / Batch</th>
                  <th className="py-2.5">Expiry Date</th>
                  <th className="py-2.5 text-right">Quantity</th>
                  <th className="py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {expiryAlerts.map((b, idx) => (
                  <tr key={idx} className="border-b border-slate-100/60 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3">
                      <span className="font-bold text-slate-850 block">{b.item_name}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Batch: {b.batch_number}</span>
                    </td>
                    <td className="py-3 font-semibold text-slate-600">{b.expiry_date}</td>
                    <td className="py-3 text-right font-bold text-slate-800">
                      {parseFloat(b.remaining_quantity).toLocaleString()}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                        b.expiry_status === "expired"
                          ? "bg-red-50 text-red-700 border-red-100/80"
                          : b.expiry_status === "expires_today"
                          ? "bg-amber-50 text-amber-700 border-amber-100/80"
                          : "bg-blue-50 text-blue-700 border-blue-100/80"
                      }`}>
                        {b.expiry_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Top Purchased & Top Issued Items */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
          <Boxes size={14} className="text-orange-500" />
          Top Purchased & Consumption Volumes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Top Purchased */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/60 shadow-sm hover:shadow-md transition-all duration-300">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">Purchased Values</h4>
            {topPurchasedItems.length === 0 ? (
              <div className="text-xs text-slate-400 font-semibold py-6 text-center">No purchases recorded</div>
            ) : (
              <div className="flex flex-col gap-3">
                {topPurchasedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold py-0.5 border-b border-slate-100/40 last:border-0">
                    <span className="text-slate-750">{item.item_name}</span>
                    <span className="font-bold text-slate-800">{formatCurrency(item.total_spent)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Issued */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/60 shadow-sm hover:shadow-md transition-all duration-300">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">Issued Volumes</h4>
            {topIssuedItems.length === 0 ? (
              <div className="text-xs text-slate-400 font-semibold py-6 text-center">No stock issues dispatched</div>
            ) : (
              <div className="flex flex-col gap-3">
                {topIssuedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold py-0.5 border-b border-slate-100/40 last:border-0">
                    <span className="text-slate-750">{item.item_name}</span>
                    <span className="font-bold text-slate-800">{parseFloat(item.total_qty).toLocaleString()} Units</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Supplier Purchase Summary */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
          <Truck size={14} className="text-orange-500" />
          Supplier Procurement Breakdown
        </h3>
        {supplierPurchaseSummary.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs font-bold text-slate-400">
            No supplier billing statistics
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[180px] overflow-y-auto pr-1">
            {supplierPurchaseSummary.map((sup, idx) => (
              <div key={idx} className="group flex items-center justify-between text-xs font-semibold p-3 border border-slate-100 rounded-xl hover:bg-slate-50/60 hover:border-slate-200 transition-all duration-300 shadow-sm hover:shadow">
                <div className="flex flex-col text-left">
                  <span className="text-slate-800 font-bold group-hover:text-orange-750 transition-colors">{sup.supplier_name}</span>
                  <span className="text-[10px] text-slate-450 mt-1">{sup.purchases_count} PO Order(s) Completed</span>
                </div>
                <span className="font-black text-slate-800">{formatCurrency(sup.total_value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryDashboardTables;
