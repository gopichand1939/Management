import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { 
  Shield, 
  UserCog, 
  Users, 
  Bed, 
  IndianRupee, 
  AlertTriangle, 
  Activity, 
  Plus, 
  RefreshCw, 
  Layers, 
  Home, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  TrendingUp,
  Percent
} from "lucide-react";
import Header from "../../Components/Layout/Header";
import Navbar from "../../Components/Layout/Navbar";
import Sidebar from "../../Components/Layout/Sidebar";
import AuthSuperAdmin from "../../Components/SuperAdmin/AuthSuperAdmin";
import useFetchUserData from "../../Hooks/useFetchUserData";
import { TOKEN_KEY, DASHBOARD_OVERVIEW } from "../../Utils/Constants";

const Dashboard = () => {
  const navigate = useNavigate();
  const { users } = useFetchUserData();
  const { authUser } = useSelector((state) => state.user);
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setError("User authentication token not found.");
        setLoading(false);
        return;
      }
      
      const response = await fetch(DASHBOARD_OVERVIEW, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        setDashboardData(data.dashboard);
      } else {
        setError(data.message || "Failed to load dashboard statistics.");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("An error occurred while connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatRevenue = (value) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const getRoomStatusDetails = (occupied, total) => {
    if (total === 0) {
      return {
        border: "border-slate-200 bg-slate-50",
        text: "text-slate-600",
        badge: "bg-slate-400 text-white",
        label: "No Beds"
      };
    }
    if (occupied === total) {
      return {
        border: "border-emerald-100 bg-emerald-50/20 hover:border-emerald-300",
        text: "text-emerald-800",
        badge: "bg-emerald-500 text-white",
        label: "Full"
      };
    }
    if (occupied > 0) {
      return {
        border: "border-amber-100 bg-amber-50/20 hover:border-amber-300",
        text: "text-amber-800",
        badge: "bg-amber-500 text-white",
        label: "Partial"
      };
    }
    return {
      border: "border-rose-100 bg-rose-50/20 hover:border-rose-300",
      text: "text-rose-800",
      badge: "bg-rose-500 text-white",
      label: "Empty"
    };
  };

  const getFloorProgressColor = (pct) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getFloorTextAndBgColor = (pct) => {
    if (pct >= 80) return "text-emerald-700 bg-emerald-50";
    if (pct >= 50) return "text-amber-700 bg-amber-50";
    return "text-rose-700 bg-rose-50";
  };

  // SVG Chart Renderer
  const renderRevenueChart = (monthlyTrends) => {
    if (!monthlyTrends || monthlyTrends.length === 0) {
      return <p className="text-sm text-slate-400 text-center py-12">No trend data available</p>;
    }

    const maxRev = Math.max(...monthlyTrends.map((t) => Number(t.revenue || 0)), 1000);
    const chartHeight = 160;
    const chartWidth = 500;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const points = monthlyTrends.map((t, idx) => {
      const x = paddingLeft + (idx * (chartWidth - paddingLeft - paddingRight)) / (monthlyTrends.length - 1 || 1);
      const y = chartHeight - paddingBottom - (Number(t.revenue || 0) * (chartHeight - paddingTop - paddingBottom)) / maxRev;
      return { x, y, ...t };
    });

    const linePath = points.reduce((acc, p, idx) => {
      return acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`;
    }, "");

    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
      : "";

    return (
      <div className="w-full overflow-visible">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = paddingTop + ratio * (chartHeight - paddingTop - paddingBottom);
            return (
              <line
                key={i}
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Paths */}
          {points.length > 0 && (
            <>
              <path d={areaPath} fill="url(#revGrad)" />
              <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data circles & values */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                  />
                  <text
                    x={p.x}
                    y={p.y - 8}
                    fontSize="8"
                    fontWeight="800"
                    textAnchor="middle"
                    fill="#334155"
                    className="font-satoshi"
                  >
                    {formatRevenue(Number(p.revenue))}
                  </text>
                  <text
                    x={p.x}
                    y={chartHeight - 10}
                    fontSize="9"
                    fontWeight="700"
                    textAnchor="middle"
                    fill="#64748B"
                    className="font-satoshi"
                  >
                    {p.month}
                  </text>
                </g>
              ))}
            </>
          )}
        </svg>
      </div>
    );
  };

  // SVB Donut calculation variables
  const occupiedCount = dashboardData?.occupied_beds || 0;
  const vacantCount = dashboardData?.vacant_beds || 0;
  const reservedCount = dashboardData?.reserved_beds || 0;
  const maintenanceCount = dashboardData?.maintenance_beds || 0;
  const totalChart = occupiedCount + vacantCount + reservedCount + maintenanceCount || 1;

  const pctOccupied = Math.round((occupiedCount / totalChart) * 100);
  const pctReserved = Math.round((reservedCount / totalChart) * 100);
  const pctMaintenance = Math.round((maintenanceCount / totalChart) * 100);
  const pctVacant = Math.round((vacantCount / totalChart) * 100);

  const circ = 251.2;
  const dashOccupied = (occupiedCount / totalChart) * circ;
  const dashReserved = (reservedCount / totalChart) * circ;
  const dashMaintenance = (maintenanceCount / totalChart) * circ;
  const dashVacant = (vacantCount / totalChart) * circ;

  const offsetOccupied = 0;
  const offsetReserved = dashOccupied;
  const offsetMaintenance = dashOccupied + dashReserved;
  const offsetVacant = dashOccupied + dashReserved + dashMaintenance;

  const isSuperAdmin = authUser?.role === "super_admin";

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)] bg-slate-50">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 md:gap-8">
              
              {/* Header Container */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Header
                  title="PG Operations Dashboard"
                  subtitle="Unified status console tracking rooms, collections, checkouts, and beds layout."
                />
                
                <button
                  onClick={fetchDashboardData}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl shadow-sm text-xs font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  Refresh Feed
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-bold text-slate-500">Loading analytics dataset...</span>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
                  <AlertTriangle className="text-red-500" size={32} />
                  <h3 className="text-sm font-black text-red-800">Overview Fetch Failed</h3>
                  <p className="text-xs text-red-600 max-w-md">{error}</p>
                  <button
                    onClick={fetchDashboardData}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow transition-all duration-200"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : (
                <>
                  {/* Hero Top Cards */}
                  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 font-satoshi">
                    
                    {/* Card 1: Total Tenants */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Tenants</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Users size={16} /></div>
                      </div>
                      <strong className="block text-2xl font-black text-slate-800 mt-2">{dashboardData?.total_tenants || 0}</strong>
                      <span className="text-[10px] text-indigo-600 font-bold block mt-1">
                        Active: {dashboardData?.active_tenants || 0} • Vacated: {dashboardData?.vacated_tenants || 0}
                      </span>
                    </div>

                    {/* Card 2: Occupied Beds */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Occupied Beds</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Bed size={16} /></div>
                      </div>
                      <strong className="block text-xl font-black text-slate-800 mt-2 truncate">
                        {dashboardData?.occupied_beds || 0} / {dashboardData?.total_beds || 0}
                      </strong>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                        {pctOccupied}% Beds Filled
                      </span>
                    </div>

                    {/* Card 3: Vacant Beds */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Vacant Beds</span>
                        <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center"><Bed size={16} className="opacity-60" /></div>
                      </div>
                      <strong className="block text-2xl font-black text-slate-800 mt-2">{dashboardData?.vacant_beds || 0}</strong>
                      <span className="text-[10px] text-slate-500 font-bold block mt-1">
                        {pctVacant}% Space Left
                      </span>
                    </div>

                    {/* Card 4: Monthly Revenue */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Monthly Revenue</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><IndianRupee size={16} /></div>
                      </div>
                      <strong className="block text-xl font-black text-slate-800 mt-2 truncate">
                        {formatRevenue(dashboardData?.total_monthly_revenue || 0)}
                      </strong>
                      <span className="text-[10px] text-blue-600 font-bold block mt-1">
                        Collected: {formatRevenue(dashboardData?.collected_payments || 0)}
                      </span>
                    </div>

                    {/* Card 5: Pending Payments */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pending Dues</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><IndianRupee size={16} /></div>
                      </div>
                      <strong className="block text-xl font-black text-slate-800 mt-2 truncate">
                        {formatRevenue(dashboardData?.pending_payments || 0)}
                      </strong>
                      <span className="text-[10px] text-amber-600 font-bold block mt-1">
                        Overdue Arrears: {formatRevenue(dashboardData?.overdue_payments || 0)}
                      </span>
                    </div>

                    {/* Card 6: Occupancy Rate */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Occupancy Rate</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Percent size={16} /></div>
                      </div>
                      <strong className="block text-2xl font-black text-slate-800 mt-2">
                        {dashboardData?.occupancy_percentage || 0}%
                      </strong>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${dashboardData?.occupancy_percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>

                  </section>

                  {/* Super Admin: Institution Comparison Cards */}
                  {isSuperAdmin && dashboardData?.institution_wise_stats?.length > 0 && (
                    <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm font-satoshi">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Layers size={16} className="text-indigo-600" />
                          Institution Occupancy Profiles
                        </h3>
                        <span className="text-[10px] font-extrabold text-slate-400">SUPER ADMIN VIEW</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {dashboardData.institution_wise_stats.map((inst) => (
                          <div 
                            key={inst.institution_id} 
                            className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:shadow-md hover:border-slate-200 transition-all duration-200"
                          >
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Institution Stay</span>
                            <strong className="text-base font-black text-slate-800 block truncate mt-0.5">{inst.institution_name}</strong>
                            <div className="flex items-center justify-between mt-4">
                              <span className="text-xs font-bold text-slate-500">
                                {inst.occupied_beds} / {inst.total_beds} beds filled
                              </span>
                              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                                {inst.occupancy_percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200/60 h-1 rounded-full mt-2 overflow-hidden">
                              <div 
                                className="bg-indigo-500 h-full rounded-full"
                                style={{ width: `${inst.occupancy_percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Main Sections Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 font-satoshi">
                    
                    {/* Left & Center: Charts & Heatmaps (Col-span 2) */}
                    <div className="xl:col-span-2 flex flex-col gap-6 md:gap-8">
                      
                      {/* Sub-grid: Revenue & Floor heatmap */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Revenue line graph */}
                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp size={16} className="text-blue-600" />
                                Monthly Revenue Trend
                              </h3>
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Business Growth</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-bold mb-4">Tracking monthly billable rent cycles</p>
                          </div>
                          
                          <div className="h-44 flex items-end">
                            {renderRevenueChart(dashboardData?.monthly_revenue_trend)}
                          </div>
                        </div>

                        {/* Floor wise heatmap */}
                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <Layers size={16} className="text-indigo-600" />
                              Floor-Wise Occupancy Heatmap
                            </h3>
                            <span className="text-[10px] text-slate-400 font-bold">Weak Floor Spotter</span>
                          </div>

                          <div className="flex flex-col gap-3.5 max-h-[176px] overflow-y-auto pr-1">
                            {dashboardData?.floor_wise_stats?.length > 0 ? (
                              dashboardData.floor_wise_stats.map((floor) => {
                                const total = floor.total_beds || 0;
                                const occupied = floor.occupied_beds || 0;
                                const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
                                return (
                                  <div key={floor.floor_id} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-700">{floor.floor_name}</span>
                                        <span className="text-[9px] font-bold text-slate-400">({floor.total_rooms} Rooms)</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500">{occupied} / {total} beds filled</span>
                                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${getFloorTextAndBgColor(pct)}`}>
                                          {pct}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-300 ${getFloorProgressColor(pct)}`}
                                        style={{ width: `${pct}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-slate-400 text-center py-12">No floor details registered.</p>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Room Status Grid (Hotel Booking UI) */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <Home size={16} className="text-slate-700" />
                              Room Booking Grid Overview
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">Real-time room occupancy states</p>
                          </div>
                          <div className="flex gap-2">
                            <span className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Full</span>
                            <span className="flex items-center gap-1 text-[9px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">Partial</span>
                            <span className="flex items-center gap-1 text-[9px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">Empty</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-[220px] overflow-y-auto pr-1">
                          {dashboardData?.room_wise_stats?.length > 0 ? (
                            dashboardData.room_wise_stats.map((room) => {
                              const occupied = room.occupied_beds || 0;
                              const total = room.total_beds || 0;
                              const empty = room.vacant_beds || 0;
                              const styles = getRoomStatusDetails(occupied, total);
                              return (
                                <div 
                                  key={room.room_id} 
                                  className={`border rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${styles.border}`}
                                  onClick={() => navigate(`/tenant/active`)}
                                >
                                  <span className="text-xs font-black text-slate-800">Room {room.room_number}</span>
                                  <strong className={`block text-xs font-black mt-1 ${styles.text}`}>
                                    {occupied} / {total} beds filled
                                  </strong>
                                  <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                    {empty} Empty Space
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-400 text-center col-span-full py-8">No rooms registered.</p>
                          )}
                        </div>
                      </div>

                      {/* Bed Occupancy Visual Layout (blueprint room visualization) */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Bed size={16} className="text-indigo-600" />
                          Live Room Blueprint Map
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                          
                          {/* Room Blueprint layout box (takes 3 cols) */}
                          <div className="md:col-span-3 flex flex-col gap-3">
                            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bed Blueprint Layout (Room 101)</span>
                                <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black">Ground Floor</span>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-3 py-2">
                                <div className="border border-rose-100 bg-rose-50/60 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 text-rose-700 shadow-sm">
                                  <Bed size={18} className="fill-rose-500/10" />
                                  <span className="text-[10px] font-black">Bed A1</span>
                                  <span className="text-[8px] font-extrabold bg-rose-200/50 px-1.5 py-0.5 rounded">Gopichand T.</span>
                                </div>
                                <div className="border border-emerald-100 bg-emerald-50/60 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 text-emerald-700 shadow-sm">
                                  <Bed size={18} className="fill-emerald-500/10" />
                                  <span className="text-[10px] font-black">Bed A2</span>
                                  <span className="text-[8px] font-extrabold bg-emerald-200/50 px-1.5 py-0.5 rounded">Vacant</span>
                                </div>
                                <div className="border border-emerald-100 bg-emerald-50/60 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 text-emerald-700 shadow-sm">
                                  <Bed size={18} className="fill-emerald-500/10" />
                                  <span className="text-[10px] font-black">Bed A3</span>
                                  <span className="text-[8px] font-extrabold bg-emerald-200/50 px-1.5 py-0.5 rounded">Vacant</span>
                                </div>
                                <div className="border border-amber-100 bg-amber-50/60 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 text-amber-700 shadow-sm">
                                  <Bed size={18} className="fill-amber-500/10" />
                                  <span className="text-[10px] font-black">Bed A4</span>
                                  <span className="text-[8px] font-extrabold bg-amber-200/50 px-1.5 py-0.5 rounded">Reserved</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* List of Vacant beds directly from db (takes 2 cols) */}
                          <div className="md:col-span-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Real-Time Available Beds</span>
                            <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto">
                              {dashboardData?.available_beds?.length > 0 ? (
                                dashboardData.available_beds.slice(0, 3).map((bed) => (
                                  <div 
                                    key={bed.id} 
                                    className="flex justify-between items-center p-2 border border-slate-100 rounded-xl bg-white hover:shadow-sm transition-all duration-200"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                                        {bed.bed_number}
                                      </div>
                                      <div className="text-left flex flex-col">
                                        <span className="text-xs font-bold text-slate-800">Room {bed.room_number}</span>
                                        <span className="text-[9px] text-slate-400 font-bold">{bed.floor_name} • {bed.bed_type}</span>
                                      </div>
                                    </div>
                                    <span className="text-[8px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Vacant</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">No vacant beds registered.</p>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>

                    {/* Right column: Widgets & Timelines */}
                    <div className="flex flex-col gap-6 md:gap-8">
                      
                      {/* Circular Occupancy Chart */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col items-center">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 w-full text-left flex items-center gap-2">
                          <Activity size={16} className="text-indigo-600" />
                          Occupancy Metrics Chart
                        </h3>

                        <div className="relative w-44 h-44 flex items-center justify-center">
                          <svg width="150" height="150" viewBox="0 0 100 100" className="transform -rotate-90 overflow-visible">
                            {/* Empty background circle */}
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F1F5F9" strokeWidth="9" />
                            
                            {/* Vacant (Gray) */}
                            {vacantCount > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#94A3B8"
                                strokeWidth="9"
                                strokeDasharray={`${dashVacant} ${circ}`}
                                strokeDashoffset={-offsetVacant}
                                strokeLinecap="round"
                              />
                            )}
                            
                            {/* Maintenance (Red) */}
                            {maintenanceCount > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#EF4444"
                                strokeWidth="9"
                                strokeDasharray={`${dashMaintenance} ${circ}`}
                                strokeDashoffset={-offsetMaintenance}
                                strokeLinecap="round"
                              />
                            )}
                            
                            {/* Reserved (Yellow) */}
                            {reservedCount > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#F59E0B"
                                strokeWidth="9"
                                strokeDasharray={`${dashReserved} ${circ}`}
                                strokeDashoffset={-offsetReserved}
                                strokeLinecap="round"
                              />
                            )}
                            
                            {/* Occupied (Green) */}
                            {occupiedCount > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#10B981"
                                strokeWidth="9"
                                strokeDasharray={`${dashOccupied} ${circ}`}
                                strokeDashoffset={-offsetOccupied}
                                strokeLinecap="round"
                              />
                            )}
                          </svg>

                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-slate-800 leading-none">{pctOccupied}%</span>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">Occupied</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-5 w-full">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                            <span className="text-[10px] font-bold text-slate-500">Occupied ({occupiedCount})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                            <span className="text-[10px] font-bold text-slate-500">Reserved ({reservedCount})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                            <span className="text-[10px] font-bold text-slate-500">Maint. ({maintenanceCount})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 block"></span>
                            <span className="text-[10px] font-bold text-slate-500">Vacant ({vacantCount})</span>
                          </div>
                        </div>

                      </div>

                      {/* Quick Actions Panel */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Plus size={16} className="text-slate-700" />
                          Operations Quick Actions
                        </h3>
                        <div className="flex flex-col gap-2">
                          <Link 
                            to="/tenant/onboarding" 
                            className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm font-bold text-xs text-slate-700 transition-all duration-200"
                          >
                            <span>Add New Tenant</span>
                            <ArrowUpRight size={14} className="text-slate-400" />
                          </Link>
                          <Link 
                            to="/tenant/onboarding" 
                            className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm font-bold text-xs text-slate-700 transition-all duration-200"
                          >
                            <span>Allocate Bed Room</span>
                            <ArrowUpRight size={14} className="text-slate-400" />
                          </Link>
                          <Link 
                            to="/tenant/payments" 
                            className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm font-bold text-xs text-slate-700 transition-all duration-200"
                          >
                            <span>Verify Tenant Payments</span>
                            <ArrowUpRight size={14} className="text-slate-400" />
                          </Link>
                          <Link 
                            to="/institutions" 
                            className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm font-bold text-xs text-slate-700 transition-all duration-200"
                          >
                            <span>Manage Rooms & Floors</span>
                            <ArrowUpRight size={14} className="text-slate-400" />
                          </Link>
                        </div>
                      </div>

                      {/* Pending Attention Alerts */}
                      {/* <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <AlertTriangle size={16} className="text-amber-500" />
                          Pending Attention Tasks
                        </h3>

                        <div className="flex flex-col gap-2.5">
                          {dashboardData?.pending_payments > 0 && (
                            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-100/60">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                              <span className="text-[11px] font-bold text-amber-900 leading-tight">
                                {formatRevenue(dashboardData.pending_payments)} dues pending verified checkout collection.
                              </span>
                            </div>
                          )}

                          {dashboardData?.pending_verification_tenants > 0 && (
                            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-100/60">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                              <span className="text-[11px] font-bold text-amber-900 leading-tight">
                                {dashboardData.pending_verification_tenants} tenants credentials await verify checks.
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-100/60">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                            <span className="text-[11px] font-bold text-amber-900 leading-tight">
                              8 room spaces scheduled for weekly dusting checks.
                            </span>
                          </div>

                          {dashboardData?.upcoming_vacations?.length > 0 && (
                            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-red-50 border border-red-100/60">
                              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                              <span className="text-[11px] font-bold text-red-950 leading-tight">
                                {dashboardData.upcoming_vacations.length} tenants checkout within coming days.
                              </span>
                            </div>
                          )}

                          {(!dashboardData?.pending_payments && !dashboardData?.pending_verification_tenants && !dashboardData?.upcoming_vacations?.length) && (
                            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 text-emerald-800">
                              <CheckCircle2 size={16} />
                              <span className="text-xs font-bold">All dashboard operation logs verified clean!</span>
                            </div>
                          )}
                        </div>
                      </div> */}

                      {/* Recent Activities timeline */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Activity size={16} className="text-blue-600" />
                          Live Activity Log
                        </h3>

                        <div className="flex flex-col gap-4 max-h-[200px] overflow-y-auto pr-1">
                          {dashboardData?.recent_tenant_activities?.length > 0 ? (
                            dashboardData.recent_tenant_activities.map((act) => (
                              <div key={act.id} className="flex gap-3 text-left">
                                <div className="flex flex-col items-center">
                                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <Clock size={12} />
                                  </div>
                                  <div className="w-[1.5px] bg-slate-100 flex-1 my-1"></div>
                                </div>
                                <div className="flex-1 flex flex-col">
                                  <strong className="text-xs font-black text-slate-800">
                                    {act.tenant_name || "PG User"}
                                  </strong>
                                  <span className="text-[10px] font-bold text-slate-500 leading-normal">
                                    {act.action} {act.new_value ? `(${act.new_value})` : ""}
                                  </span>
                                  <span className="text-[8px] font-extrabold text-slate-400 uppercase mt-0.5">
                                    {new Date(act.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 text-center py-4">No recent stay updates logged.</p>
                          )}
                        </div>
                      </div>

                      {/* Upcoming Checkouts */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Calendar size={16} className="text-red-500" />
                          Upcoming Operations Exit Notice
                        </h3>

                        <div className="flex flex-col gap-2.5">
                          {dashboardData?.upcoming_vacations?.length > 0 ? (
                            dashboardData.upcoming_vacations.map((vac) => (
                              <div 
                                key={vac.id} 
                                className="flex justify-between items-center p-2.5 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all duration-200"
                              >
                                <div className="flex items-center gap-2.5 text-left">
                                  <div className="w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center font-black text-xs">
                                    {vac.full_name?.charAt(0) || "U"}
                                  </div>
                                  <div className="flex flex-col">
                                    <strong className="text-xs font-black text-slate-800">{vac.full_name}</strong>
                                    <span className="text-[9px] text-slate-400 font-bold">Room {vac.room_id || "N/A"}</span>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col">
                                  <span className="text-[9px] font-extrabold text-rose-500 uppercase tracking-wide">Checkout Exits</span>
                                  <span className="text-[9px] font-black text-slate-500">
                                    {new Date(vac.expected_checkout_date).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">No active vacate notice listings.</p>
                          )}
                        </div>
                      </div>

                    </div>

                  </div>
                </>
              )}

              {/* Super Admin Info or other views */}
              <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <Header
                      title="Super Admin Controls"
                      subtitle="Control node configurations and manage all active operators."
                    />
                    <div className="flex flex-wrap gap-4 mt-4">
                      {/* Total Registered Admins metric */}
                      <div className="flex items-center gap-3 bg-red-50/30 border border-red-100 rounded-xl p-3.5 flex-1 min-w-[200px]">
                        <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><UserCog size={18} /></div>
                        <div className="text-left flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Registered Super Admins</span>
                          <strong className="text-xl font-black text-slate-800 block">{users.length}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-emerald-50/30 border border-emerald-100 rounded-xl p-3.5 flex-1 min-w-[200px]">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center"><Shield size={18} /></div>
                        <div className="text-left flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Security System Status</span>
                          <strong className="text-xl font-black text-slate-800 block">Verified Stable</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <AuthSuperAdmin />
                </div>
              </section>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
