import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  History,
  TrendingUp,
  DollarSign,
  AlertCircle,
  FileCheck,
  Ban,
  Boxes,
  Truck,
  ArrowRight
} from "lucide-react";

import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import {
  RATION_PURCHASE_DASHBOARD,
  GET_INSTITUTION_LIST,
  TOKEN_KEY
} from "../../../Utils/Constants";

const RationPurchaseDashboard = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id 
      ? String(authUser.institution_id) 
      : (sessionStorage.getItem("selected_institution_id") || "")
  );

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
            const firstId = String(list[0].id);
            setSelectedInstitutionId(firstId);
            sessionStorage.setItem("selected_institution_id", firstId);
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

  const fetchDashboardData = async () => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) {
      setDashboardData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_PURCHASE_DASHBOARD, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: Number(instId),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to load purchase analytics");
        return;
      }

      setDashboardData(data.data);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [authUser, selectedInstitutionId]);

  if (!authUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <PageLoader />
      </div>
    );
  }

  const summary = dashboardData?.summary || {
    purchases_today_count: 0,
    purchases_today_value: 0,
    purchases_month_count: 0,
    purchases_month_value: 0,
    pending_payment_amount: 0,
    draft_purchases_count: 0,
    cancelled_purchases_count: 0
  };

  const formatCurrency = (val) => {
    return `₹${parseFloat(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-2 lg:pt-3 pb-6 px-4 md:px-6">
            <div className="mx-auto w-full max-w-6xl flex flex-col gap-4">
              
              {/* Header and Shortcuts */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">
                    Purchase Dashboard
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Monitor purchase orders, values, and supplier statistics
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {isSuperAdmin && (
                    <div className="relative">
                      <select
                        value={selectedInstitutionId}
                        onChange={(e) => {
                          setSelectedInstitutionId(e.target.value);
                          sessionStorage.setItem("selected_institution_id", e.target.value);
                        }}
                        disabled={loadingInstitutions}
                        className="min-h-[42px] pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none cursor-pointer appearance-none"
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

                  <Button icon={Plus} onClick={() => navigate("/ration-inventory/purchases/new")}>
                    New Purchase
                  </Button>
                  <Button icon={History} variant="secondary" onClick={() => navigate("/ration-inventory/purchases/history")}>
                    Purchase History
                  </Button>
                </div>
              </div>

              <Error message={error} />

              {loading ? (
                <div className="h-96 flex items-center justify-center bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <PageLoader />
                </div>
              ) : !dashboardData ? (
                <div className="h-96 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-2xl shadow-sm p-6 text-center">
                  <AlertCircle size={40} className="text-slate-300" />
                  <h3 className="text-md font-bold text-slate-700 mt-3">No Institution Selected</h3>
                  <p className="text-xs text-slate-400 mt-1">Please select an institution to load analytics data.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  
                  {/* METRICS CARDS GRID */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Today Value */}
                    <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
                      <div className="p-3.5 bg-orange-50 text-orange-500 rounded-xl shrink-0">
                        <TrendingUp size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                          Purchases Today
                        </span>
                        <span className="text-lg font-black text-slate-800 mt-1 block">
                          {formatCurrency(summary.purchases_today_value)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                          {summary.purchases_today_count} transaction(s)
                        </span>
                      </div>
                    </div>

                    {/* Month Value */}
                    <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
                      <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-xl shrink-0">
                        <DollarSign size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                          Value This Month
                        </span>
                        <span className="text-lg font-black text-slate-800 mt-1 block">
                          {formatCurrency(summary.purchases_month_value)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                          {summary.purchases_month_count} transaction(s)
                        </span>
                      </div>
                    </div>

                    {/* Pending Amount */}
                    <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
                      <div className="p-3.5 bg-red-50 text-red-500 rounded-xl shrink-0">
                        <AlertCircle size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                          Pending Payments
                        </span>
                        <span className="text-lg font-black text-slate-800 mt-1 block">
                          {formatCurrency(summary.pending_payment_amount)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                          Balance due suppliers
                        </span>
                      </div>
                    </div>

                    {/* Status Counts */}
                    <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
                      <div className="p-3.5 bg-blue-50 text-blue-500 rounded-xl shrink-0">
                        <FileCheck size={22} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                          Purchase Pipeline
                        </span>
                        <div className="flex items-center gap-4 mt-2">
                          <div>
                            <span className="text-sm font-bold text-slate-800">{summary.draft_purchases_count}</span>
                            <span className="text-[9px] font-semibold text-slate-400 ml-1">Drafts</span>
                          </div>
                          <div className="border-l pl-4">
                            <span className="text-sm font-bold text-slate-850">{summary.cancelled_purchases_count}</span>
                            <span className="text-[9px] font-semibold text-slate-400 ml-1">Cancelled</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CHARTS / ANALYTICS DATA GRID */}
                  <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* Top Purchased Items */}
                    <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col gap-4 text-left">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                        <Boxes size={14} className="text-orange-500" />
                        Top Purchased Items (Completed)
                      </h3>
                      {dashboardData.topItems?.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-xs font-bold text-slate-400">
                          No items purchased yet
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 flex-1 justify-center">
                          {dashboardData.topItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                              <div className="flex flex-col text-left">
                                <span className="text-slate-800 font-bold">{item.item_name}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">Quantity: {parseFloat(item.total_qty).toLocaleString()}</span>
                              </div>
                              <span className="font-black text-slate-700">{formatCurrency(item.total_spent)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Supplier-wise Purchase Breakdown */}
                    <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col gap-4 text-left">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                        <Truck size={14} className="text-orange-500" />
                        Supplier Breakdown
                      </h3>
                      {dashboardData.supplierBreakdown?.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-xs font-bold text-slate-400">
                          No purchases mapped to suppliers
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 flex-1 justify-center">
                          {dashboardData.supplierBreakdown.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                              <div className="flex flex-col text-left">
                                <span className="text-slate-800 font-bold">{item.supplier_name}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">{item.purchases_count} Purchase Order(s)</span>
                              </div>
                              <span className="font-black text-slate-700">{formatCurrency(item.total_value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RECENT PURCHASES LIST */}
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden text-left flex flex-col">
                    <div className="p-5 border-b flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        Recent Purchases
                      </h3>
                      <button
                        type="button"
                        onClick={() => navigate("/ration-inventory/purchases/history")}
                        className="text-xs font-bold text-orange-500 hover:text-orange-650 flex items-center gap-1 cursor-pointer"
                      >
                        View All
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-slate-700 border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b">
                            <th className="px-5 py-3 text-left">Purchase No</th>
                            <th className="px-5 py-3 text-left">Purchase Date</th>
                            <th className="px-5 py-3 text-left">Supplier</th>
                            <th className="px-5 py-3 text-right">Grand Total</th>
                            <th className="px-5 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.recentPurchases?.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-semibold">
                                No purchases created yet
                              </td>
                            </tr>
                          ) : (
                            dashboardData.recentPurchases.map((purchase) => (
                              <tr key={purchase.id} className="border-b last:border-0 hover:bg-slate-50/10 font-semibold text-slate-650">
                                <td className="px-5 py-3.5 text-left text-slate-800 font-bold">{purchase.purchase_number}</td>
                                <td className="px-5 py-3.5 text-left">
                                  {new Date(purchase.purchase_date).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric"
                                  })}
                                </td>
                                <td className="px-5 py-3.5 text-left">{purchase.supplier_name}</td>
                                <td className="px-5 py-3.5 text-right text-slate-800 font-bold">{formatCurrency(purchase.grand_total)}</td>
                                <td className="px-5 py-3.5 text-center">
                                  <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                                    purchase.status === "completed"
                                      ? "bg-emerald-50 text-emerald-600"
                                      : purchase.status === "cancelled"
                                      ? "bg-red-50 text-red-650"
                                      : "bg-amber-50 text-amber-600"
                                  }`}>
                                    {purchase.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RationPurchaseDashboard;
