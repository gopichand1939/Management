import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { LayoutDashboard } from "lucide-react";

import Sidebar from "../../Layout/Sidebar";
import Navbar from "../../Layout/Navbar";
import PageLoader from "../../Common/PageLoader";
import InventoryDashboardFilters from "./InventoryDashboardFilters";
import InventoryDashboardCards from "./InventoryDashboardCards";
import InventoryDashboardCharts from "./InventoryDashboardCharts";
import InventoryDashboardTables from "./InventoryDashboardTables";
import {
  GET_INSTITUTION_LIST,
  RATION_INVENTORY_DASHBOARD_SUMMARY,
  TOKEN_KEY
} from "../../../Utils/Constants";

const RationInventoryDashboard = () => {
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || authUser?.profile_id === 1;

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id ? String(authUser.institution_id) : (sessionStorage.getItem("selected_institution_id") || "")
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  // Default dates preset to current month
  const getDefaultDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const firstDay = `${year}-${month}-01`;
    const day = String(now.getDate()).padStart(2, "0");
    const lastDay = `${year}-${month}-${day}`;
    return { firstDay, lastDay };
  };

  const defaultDates = getDefaultDates();
  const [filters, setFilters] = useState({
    range: "this_month",
    from_date: defaultDates.firstDay,
    to_date: defaultDates.lastDay,
    expiry_days: "30"
  });

  // Fetch institutions list for Super Admins
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
            const prevId = sessionStorage.getItem("selected_institution_id");
            if (prevId && list.some(inst => String(inst.id) === String(prevId))) {
              setSelectedInstitutionId(String(prevId));
            } else {
              setSelectedInstitutionId(String(list[0].id));
              sessionStorage.setItem("selected_institution_id", String(list[0].id));
            }
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

  // Fetch Main Dashboard Summary stats
  const fetchDashboardSummary = async () => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(RATION_INVENTORY_DASHBOARD_SUMMARY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          institution_id: Number(instId),
          from_date: filters.from_date,
          to_date: filters.to_date,
          expiry_days: Number(filters.expiry_days)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load inventory dashboard data");
      }

      setDashboardData(data.data || null);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardSummary();
  }, [selectedInstitutionId, authUser, filters.from_date, filters.to_date, filters.expiry_days]);

  const handleInstitutionChange = (e) => {
    const instId = e.target.value;
    setSelectedInstitutionId(instId);
    sessionStorage.setItem("selected_institution_id", instId);
  };

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 text-left">
            {/* Page Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-6 border border-slate-100/60 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="relative z-10">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                  <LayoutDashboard className="text-orange-650" size={26} />
                  Inventory Dashboard
                </h1>
                <p className="mt-1.5 text-xs font-semibold text-slate-500 max-w-xl leading-relaxed">
                  Ration inventory overview, real-time analytics, stock warnings, and pending workflow approvals.
                </p>
              </div>
              <div className="absolute right-0 top-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-orange-500/5 blur-2xl pointer-events-none" />
            </div>

            {/* Filter toolbar */}
            <InventoryDashboardFilters
              isSuperAdmin={isSuperAdmin}
              institutions={institutions}
              loadingInstitutions={loadingInstitutions}
              selectedInstitutionId={selectedInstitutionId}
              onInstitutionChange={handleInstitutionChange}
              filters={filters}
              onFilterChange={setFilters}
              onRefresh={fetchDashboardSummary}
            />

            {error && (
              <div className="p-4 text-sm text-red-750 bg-red-50 rounded-xl border border-red-150">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center p-20">
                <PageLoader />
              </div>
            ) : dashboardData ? (
              <div className="flex flex-col gap-6">
                {/* 1. Summary card grids */}
                <InventoryDashboardCards summary={dashboardData.summary} />

                {/* 2. Interactive trend and pie charts */}
                <InventoryDashboardCharts
                  stockStatus={dashboardData.stock_status}
                  purchaseTrend={dashboardData.purchase_trend}
                  issueTrend={dashboardData.issue_trend}
                  categoryStock={dashboardData.category_stock}
                />

                {/* 3. Detail warning and log ledger tables */}
                <InventoryDashboardTables
                  lowStockItems={dashboardData.low_stock_items}
                  expiryAlerts={dashboardData.expiry_alerts}
                  recentTransactions={dashboardData.recent_transactions}
                  pendingActions={dashboardData.pending_actions}
                  topPurchasedItems={dashboardData.top_purchased_items}
                  topIssuedItems={dashboardData.top_issued_items}
                  supplierPurchaseSummary={dashboardData.supplier_purchase_summary}
                />
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-semibold text-slate-400 bg-white border border-slate-100 rounded-2xl shadow-sm">
                Please select an institution to load dashboard analytics.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default RationInventoryDashboard;
