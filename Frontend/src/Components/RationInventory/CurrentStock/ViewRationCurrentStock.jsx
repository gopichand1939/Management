import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, History, Building2, Package, Tag, Layers, Database } from "lucide-react";

import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import { RATION_CURRENT_STOCK_VIEW, TOKEN_KEY } from "../../../Utils/Constants";

const formatCurrency = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? "₹0.00" : `₹${num.toFixed(2)}`;
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

const ViewRationCurrentStock = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stockDetails, setStockDetails] = useState(null);

  const institutionId = location.state?.institution_id || authUser?.institution_id;

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(RATION_CURRENT_STOCK_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_id: Number(id),
            institution_id: institutionId ? Number(institutionId) : undefined
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Failed to fetch stock item details");
          return;
        }

        setStockDetails(data.data);
      } catch (err) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetails();
  }, [id, institutionId]);

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

  if (error || !stockDetails) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 md:p-8 space-y-4">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate("/ration-inventory/current-stock")}>
              Back to List
            </Button>
            <Error message={error || "Stock item details not found"} />
          </main>
        </div>
      </div>
    );
  }

  const { item, stock, last_purchase, recent_transactions } = stockDetails;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-left">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  icon={ArrowLeft}
                  onClick={() => navigate("/ration-inventory/current-stock")}
                  className="!p-2.5"
                />
                <div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    {item.item_name}
                  </h1>
                  <p className="text-xs font-semibold text-slate-450 mt-0.5">
                    Item Code: {item.item_code} | SKU: {item.sku_id}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                icon={History}
                onClick={() => navigate(`/ration-inventory/current-stock/history/${id}`, { state: { institution_id: institutionId } })}
              >
                View Full Transaction History
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Column 1: Item Profile Card */}
            <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-6 text-left">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                <img
                  src={item.image_url || "/placeholder-item.png"}
                  alt={item.item_name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop";
                  }}
                />
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Item Specifications</h4>
                <div className="flex flex-col gap-3.5 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Tag size={13} />Barcode:</span>
                    <span className="text-slate-800 font-bold">{item.barcode || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Layers size={13} />Category:</span>
                    <span className="text-slate-800 font-bold">{item.category?.category_name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Package size={13} />Unit of Measure:</span>
                    <span className="text-slate-800 font-bold">{item.unit?.unit_name || "-"} ({item.unit?.unit_code})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Database size={13} />Item Status:</span>
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                      item.status === "active"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-red-50 text-red-600 border border-red-100"
                    }`}>
                      {item.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Inventory Stock & Last Purchase */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Row: Stock Summary Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Stock Stats */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Stock Ledger Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Stock</div>
                      <div className="text-3xl font-black text-slate-800 mt-1">{stock.current_stock}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Value</div>
                      <div className="text-xl font-black text-emerald-600 mt-2">{formatCurrency(stock.stock_value)}</div>
                    </div>
                  </div>
                  <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                    <div>Min Stock limit: <span className="text-slate-800 font-bold">{stock.minimum_stock}</span></div>
                    <div>Reorder Qty: <span className="text-slate-800 font-bold">{stock.reorder_quantity}</span></div>
                  </div>
                  <div className="mt-4">
                    <span className={`inline-flex items-center rounded-xl px-3.5 py-1.5 text-xs font-black border shadow-sm ${
                      stock.stock_status === "in_stock"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : stock.stock_status === "low_stock"
                        ? "bg-amber-500 text-white border-amber-600 animate-pulse font-extrabold uppercase tracking-wider"
                        : "bg-rose-600 text-white border-rose-700 font-extrabold uppercase tracking-wider"
                    }`}>
                      {stock.stock_status === "in_stock" ? "In Stock" : stock.stock_status === "low_stock" ? "Low Stock" : "Out of Stock"}
                    </span>
                  </div>
                </div>

                {/* Last Purchase Info */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Building2 size={13} className="text-orange-500" />
                    Last Inflow Purchase
                  </h4>
                  {last_purchase ? (
                    <div className="flex flex-col gap-3 text-xs font-semibold text-slate-650">
                      <div className="flex justify-between">
                        <span className="text-slate-450">Invoice Number:</span>
                        <span className="text-slate-800 font-bold">{last_purchase.purchase_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">Supplier:</span>
                        <span className="text-slate-800 font-bold">{last_purchase.supplier_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">Date:</span>
                        <span className="text-slate-800 font-bold">{new Date(last_purchase.purchase_date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2.5 mt-2.5">
                        <span className="text-slate-450">Qty Received:</span>
                        <span className="text-slate-800 font-bold">{last_purchase.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">Unit Price:</span>
                        <span className="text-slate-800 font-bold">{formatCurrency(last_purchase.unit_price)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 flex items-center justify-center text-xs font-semibold text-slate-400">
                      No purchase details recorded yet
                    </div>
                  )}
                </div>

              </div>

              {/* Recent Transactions List */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col text-left">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Stock Log Inflows/Outflows</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-600 font-medium">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Reference No</th>
                        <th className="p-3 text-right">Qty In</th>
                        <th className="p-3 text-right">Qty Out</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recent_transactions.length > 0 ? (
                        recent_transactions.map((tx) => (
                          <tr key={tx.transaction_id} className="hover:bg-slate-50/50">
                            <td className="p-3 whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                tx.transaction_type.startsWith("PURCHASE") && !tx.transaction_type.includes("CANCEL")
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-red-50 text-red-600"
                              }`}>
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">{tx.reference_number || "-"}</td>
                            <td className="p-3 text-right text-emerald-600 font-bold">
                              {tx.quantity_in > 0 ? `+${tx.quantity_in}` : "-"}
                            </td>
                            <td className="p-3 text-right text-red-650 font-bold">
                              {tx.quantity_out > 0 ? `-${tx.quantity_out}` : "-"}
                            </td>
                            <td className="p-3 text-right">{formatCurrency(tx.unit_price)}</td>
                            <td className="p-3 max-w-[120px] truncate" title={tx.remarks}>{tx.remarks || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-slate-400 font-semibold">
                            No stock transactions recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
};

export default ViewRationCurrentStock;
