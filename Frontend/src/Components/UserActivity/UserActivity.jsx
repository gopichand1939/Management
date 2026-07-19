import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { 
  Activity, 
  Search, 
  Globe, 
  Smartphone, 
  MapPin, 
  Calendar, 
  Laptop,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  LogOut
} from "lucide-react";
import { motion } from "framer-motion";

import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import { TOKEN_KEY, USER_ACTIVITY_LIST, USER_ACTIVITY_TERMINATE } from "../../Utils/Constants";

// Helper component for Reverse Geocoding using OpenStreetMap Nominatim API
const LocationName = ({ latitude, longitude }) => {
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!latitude || !longitude) {
      return;
    }

    const fetchAddress = async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "BLRStayUserActivityTracker/1.0"
          }
        });
        const data = await res.json();
        
        if (data && data.address) {
          const addr = data.address;
          const area = addr.suburb || addr.neighbourhood || addr.road || addr.village || addr.county || "";
          const city = addr.city || addr.town || addr.municipality || "";
          
          if (area && city) {
            setAddress(`${area}, ${city}`);
          } else if (city) {
            setAddress(city);
          } else if (data.display_name) {
            const parts = data.display_name.split(",");
            setAddress(parts.slice(0, 2).join(",").trim());
          }
        }
      } catch (err) {
        console.warn("Reverse geocoding lookup failed:", err);
      }
    };

    fetchAddress();
  }, [latitude, longitude]);

  if (!address) return null;
  return <span className="font-bold text-slate-800 text-[13px]">{address}</span>;
};

const UserActivity = () => {
  const { authUser } = useSelector((state) => state.user);

  // Filter States
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1
  });

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLogForMap, setSelectedLogForMap] = useState(null);

  // Fetch Activity Logs via POST API
  const fetchActivityLogs = async (currentPage = page, searchVal = search, roleVal = roleFilter, platformVal = platformFilter) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(USER_ACTIVITY_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`
        },
        body: JSON.stringify({
          page: currentPage,
          limit: limit,
          search: searchVal,
          role: roleVal,
          platform: platformVal
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        setError(resData.message || "Failed to load user activities.");
        return;
      }

      setLogs(resData.data || []);
      setPagination(resData.pagination || {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1
      });
    } catch (err) {
      setError(err.message || "Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Terminate/Force Logout session remotely
  const handleForceLogout = async (logId) => {
    if (!window.confirm("Are you sure you want to terminate this session? The user will be automatically logged out of that device.")) {
      return;
    }
    
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(USER_ACTIVITY_TERMINATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ logId })
      });
      const resData = await res.json();
      if (resData.success) {
        fetchActivityLogs(page, search, roleFilter, platformFilter);
      } else {
        alert(resData.message || "Failed to terminate session.");
      }
    } catch (err) {
      console.error("Failed to terminate session:", err);
      alert("Network error occurred while terminating session.");
    }
  };

  // Run search and filters fetching
  useEffect(() => {
    fetchActivityLogs(1, search, roleFilter, platformFilter);
    setPage(1);
  }, [search, roleFilter, platformFilter]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
      fetchActivityLogs(newPage, search, roleFilter, platformFilter);
    }
  };

  // Calculate Stat Cards values based on all loaded items in state or count estimate
  const stats = useMemo(() => {
    const webCount = logs.filter(l => l.platform?.toLowerCase() === "web").length;
    const appCount = logs.filter(l => l.platform?.toLowerCase() === "app").length;
    const withGeoCount = logs.filter(l => l.latitude && l.longitude).length;

    return {
      total: pagination.totalItems,
      web: webCount,
      app: appCount,
      geolocated: withGeoCount
    };
  }, [logs, pagination.totalItems]);

  // Helper to format date beautifully
  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    };
  };

  // Helper to format session duration
  const formatDuration = (loginStr, logoutStr) => {
    if (!loginStr || !logoutStr) return "-";
    const start = new Date(loginStr);
    const end = new Date(logoutStr);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return "0s";

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffDays > 0) return `${diffDays}d ${diffHrs % 24}h`;
    if (diffHrs > 0) return `${diffHrs}h ${diffMin % 60}m`;
    if (diffMin > 0) return `${diffMin}m ${diffSec % 60}s`;
    return `${diffSec}s`;
  };

  // Helper to render numbered page buttons
  const renderPageNumbers = () => {
    const pageButtons = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition-all cursor-pointer select-none ${
            page === i
              ? "border-[#F59E0B] bg-[#F59E0B] text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {i}
        </button>
      );
    }
    return pageButtons;
  };

  // Helper to render timeline extremely concisely
  const renderTimeline = (log, loginTimeMeta, logoutTimeMeta) => {
    const loginDate = loginTimeMeta.date.replace(", 2026", "");
    const loginTime = loginTimeMeta.time;

    if (logoutTimeMeta) {
      const logoutDate = logoutTimeMeta.date.replace(", 2026", "");
      const logoutTime = logoutTimeMeta.time;
      const duration = formatDuration(log.login_time, log.logout_time);

      if (loginTimeMeta.date === logoutTimeMeta.date) {
        return (
          <div className="flex flex-col gap-0.5 text-xs text-slate-700">
            <span className="font-semibold">{loginDate}</span>
            <span className="text-slate-500 font-medium">{loginTime} - {logoutTime} ({duration})</span>
          </div>
        );
      } else {
        return (
          <div className="flex flex-col gap-0.5 text-xs text-slate-700">
            <span className="font-semibold">{loginDate}, {loginTime}</span>
            <span className="text-slate-500 font-medium">to {logoutDate}, {logoutTime} ({duration})</span>
          </div>
        );
      }
    } else {
      return (
        <div className="flex flex-col gap-0.5 text-xs text-slate-700">
          <span className="font-semibold">{loginDate}, {loginTime}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded text-[10px] border border-emerald-100 animate-pulse">Live Now</span>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        
        {/* Main Content Body */}
        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          
          {/* Header Description */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="h-6 w-6 text-[#F59E0B]" />
                User Activity Tracker
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Monitor administrator logins, active device scopes, exact locations, and browsers.
              </p>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={() => fetchActivityLogs(page, search, roleFilter, platformFilter)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer select-none"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Logs
            </button>
          </div>

          {/* Quick Statistics Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Total Logins */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Logins</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6" />
              </div>
            </div>

            {/* Card 2: Web Sessions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Web Sessions</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.total > 0 ? stats.web + " active" : "0"}
                </p>
              </div>
              <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Globe className="h-6 w-6" />
              </div>
            </div>

            {/* Card 3: Mobile App Sessions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">App Sessions</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.total > 0 ? stats.app + " active" : "0"}
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Smartphone className="h-6 w-6" />
              </div>
            </div>

            {/* Card 4: Shared Locations */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Geolocated Logins</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.total > 0 ? stats.geolocated + " shared" : "0"}
                </p>
              </div>
              <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <MapPin className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Filters & Search Row */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search input field */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search Email or IP Address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all"
              />
            </div>

            {/* Dropdown Select Filters */}
            <div className="flex w-full md:w-auto flex-col sm:flex-row gap-3">
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#F59E0B] cursor-pointer"
              >
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="pg_admin">PG Admin</option>
              </select>

              {/* Platform Filter */}
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#F59E0B] cursor-pointer"
              >
                <option value="">All Platforms</option>
                <option value="Web">Web</option>
                <option value="App">App</option>
              </select>
            </div>
          </div>

          {/* Error Message Box */}
          {error && <Error message={error} />}

          {/* Logs Table Area */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <PageLoader />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                  <Activity className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">No Activity Logs Found</h3>
                  <p className="text-sm text-slate-400 max-w-xs mt-1 mx-auto">
                    Try adjusting your filters or search keywords.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4">User & Client Info</th>
                      <th className="py-2.5 px-4">Session Timeline</th>
                      <th className="py-2.5 px-4">Location</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    {logs.map((log) => {
                      const loginTimeMeta = formatDateTime(log.login_time);
                      const logoutTimeMeta = log.logout_time ? formatDateTime(log.logout_time) : null;
                      const isSuper = log.role === "super_admin";

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          
                          {/* User & Client Device Info */}
                          <td className="py-2 px-4">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-bold text-slate-800">{log.email}</span>
                                {isSuper ? (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-violet-50 text-violet-600 border border-violet-100">
                                    Super
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-600 border border-cyan-100">
                                    PG Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-slate-500">{log.platform === "Web" ? "💻 Web" : "📱 App"}</span>
                                <span>•</span>
                                <span className="text-slate-500 max-w-[150px] truncate" title={log.device_info}>{log.device_info}</span>
                                <span>•</span>
                                <code className="text-[10px] font-mono text-slate-600">{log.ip_address || "N/A"}</code>
                              </div>
                            </div>
                          </td>

                          {/* Session Timeline Info */}
                          <td className="py-2 px-4">
                            {renderTimeline(log, loginTimeMeta, logoutTimeMeta)}
                          </td>

                          {/* Location details (City & Area resolved via Reverse Geocoding) */}
                          <td className="py-2 px-4">
                            {log.latitude && log.longitude ? (
                              <div className="flex flex-col gap-0.5 text-left text-xs">
                                <LocationName latitude={log.latitude} longitude={log.longitude} />
                                <a
                                  href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 transition-all select-none"
                                  title="Open in Google Maps"
                                >
                                  <MapPin className="h-3 w-3 text-blue-500" />
                                  {parseFloat(log.latitude).toFixed(4)}, {parseFloat(log.longitude).toFixed(4)}
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                                Not Shared
                              </span>
                            )}
                          </td>

                          {/* Action - View Live Map Modal & Force Session Termination */}
                          <td className="py-2 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {log.latitude && log.longitude ? (
                                <button
                                  onClick={() => setSelectedLogForMap(log)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-sm transition-all cursor-pointer select-none"
                                  title="View exact coordinates on map"
                                >
                                  <Eye className="h-3.5 w-3.5 text-[#F59E0B]" />
                                  Map
                                </button>
                              ) : (
                                <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg select-none">
                                  No Map
                                </span>
                              )}

                              {!log.logout_time && (
                                <button
                                  onClick={() => handleForceLogout(log.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 border border-red-500 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer select-none"
                                  title="Terminate active session remotely"
                                >
                                  <LogOut className="h-3.5 w-3.5" />
                                  Logout
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Footer */}
            {logs.length > 0 && (
              <div className="border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Page {pagination.currentPage} of {pagination.totalPages || 1}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer select-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  {renderPageNumbers()}
                  
                  <button
                    disabled={page === pagination.totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer select-none"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Interactive Map Modal with zoom-in and zoom-out capabilities */}
          {selectedLogForMap && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Login Location Details</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedLogForMap.email} ({selectedLogForMap.role === 'super_admin' ? 'Super Admin' : 'PG Admin'})</p>
                  </div>
                  <button 
                    onClick={() => setSelectedLogForMap(null)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Google Maps IFrame with native controls (Zoom In/Out, Pan) */}
                <div className="p-6 space-y-4">
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 relative h-96">
                    <iframe
                      title="Login Location Map"
                      src={`https://maps.google.com/maps?q=${selectedLogForMap.latitude},${selectedLogForMap.longitude}&z=15&output=embed`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                    ></iframe>
                  </div>

                  {/* Metadata details row */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Exact Coordinates</p>
                      <p className="text-slate-700 mt-1">{selectedLogForMap.latitude}, {selectedLogForMap.longitude}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Device Scope & IP</p>
                      <p className="text-slate-700 mt-1">{selectedLogForMap.ip_address} ({selectedLogForMap.platform})</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default UserActivity;
