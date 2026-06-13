import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Building2,
  Plus,
  Grid,
  List,
  Layers,
  Home,
  BedDouble,
  Phone,
  User,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import {
  INSTITUTION_DELETE,
  INSTITUTION_LIST,
  PG_ADMIN_MY_INSTITUTION,
  TOKEN_KEY,
} from "../../Utils/Constants";
import {
  hasMenuAction,
  MENU_ACTIONS,
} from "../../Utils/MenuPermissions";

const Institution = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const canCreate =
    !isPgAdmin &&
    hasMenuAction(authUser, "/institutions", MENU_ACTIONS.CREATE);
  const canEdit = hasMenuAction(authUser, "/institutions", MENU_ACTIONS.EDIT);
  const canView = hasMenuAction(authUser, "/institutions", MENU_ACTIONS.VIEW);
  const canDelete = hasMenuAction(authUser, "/institutions", MENU_ACTIONS.DELETE);

  const [institutions, setInstitutions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getInstitutions = async () => {
      setError("");
      setLoading(true);

      try {
        const apiUrl = isPgAdmin ? PG_ADMIN_MY_INSTITUTION : INSTITUTION_LIST;
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Institution list failed");
          return;
        }

        setInstitutions(data.institutions || []);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    getInstitutions();
  }, [authUser, isPgAdmin]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this PG?")) return;
    setError("");

    try {
      const response = await fetch(INSTITUTION_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Institution delete failed");
        return;
      }

      setInstitutions((prev) => prev.filter((item) => item.id !== id));
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  // Compute overall totals for PG stats
  const overallStats = useMemo(() => {
    let totalPGs = institutions.length;
    let totalBeds = 0;
    let occupiedBeds = 0;

    institutions.forEach((pg) => {
      const pgBeds = pg.total_beds ?? (pg.floors || []).reduce((s, f) => 
        s + (f.rooms || []).reduce((sr, r) => sr + (r.beds || []).length, 0), 0
      );
      const pgOccupied = pg.occupied_beds ?? (pg.floors || []).reduce((s, f) => 
        s + (f.rooms || []).reduce((sr, r) => sr + (r.beds || []).filter(b => b.status === "occupied").length, 0), 0
      );

      totalBeds += pgBeds;
      occupiedBeds += pgOccupied;
    });

    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalPGs,
      totalBeds,
      occupiedBeds,
      occupancyRate,
    };
  }, [institutions]);

  // Filter & Search institutions list
  const filteredInstitutions = useMemo(() => {
    return institutions.filter((pg) => {
      const nameMatch = pg.institution_name?.toLowerCase().includes(searchText.toLowerCase()) ||
                        pg.institution_code?.toLowerCase().includes(searchText.toLowerCase()) ||
                        pg.city?.toLowerCase().includes(searchText.toLowerCase());

      const statusMatch = statusFilter === "all" || pg.status === statusFilter;
      const typeMatch = typeFilter === "all" || pg.institution_type === typeFilter;

      return nameMatch && statusMatch && typeMatch;
    });
  }, [institutions, searchText, statusFilter, typeFilter]);

  // Calculate detailed counts for an institution card/row
  const getPgMetrics = (pg) => {
    const totalFloors = pg.total_floors ?? (pg.floors || []).length;
    const totalRooms = pg.total_rooms ?? (pg.floors || []).reduce((s, f) => 
      s + (f.rooms || []).length, 0
    );
    const totalBeds = pg.total_beds ?? (pg.floors || []).reduce((s, f) => 
      s + (f.rooms || []).reduce((sr, r) => sr + (r.beds || []).length, 0), 0
    );
    const occupiedBeds = pg.occupied_beds ?? (pg.floors || []).reduce((s, f) => 
      s + (f.rooms || []).reduce((sr, r) => sr + (r.beds || []).filter(b => b.status === "occupied").length, 0), 0
    );
    const vacantBeds = totalBeds - occupiedBeds;
    const vacancyPercent = totalBeds > 0 ? Math.round((vacantBeds / totalBeds) * 100) : 100;
    const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalFloors,
      totalRooms,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      vacancyPercent,
      occupancyPercent,
    };
  };

  const formatPgType = (type) => {
    if (!type) return "Coliving";
    return type
      .replace("_pg", " PG")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const statItems = [
    { label: "Total PGs Onboarded", value: overallStats.totalPGs, color: "from-orange-500 to-red-500 shadow-orange-500/10", icon: Building2 },
    { label: "Total Bed Inventory", value: `${overallStats.totalBeds} Beds`, color: "from-sky-500 to-blue-500 shadow-blue-500/10", icon: BedDouble },
    { label: "Beds Occupied", value: `${overallStats.occupiedBeds} Beds`, color: "from-emerald-500 to-teal-500 shadow-emerald-500/10", icon: Users },
    { label: "Live Occupancy", value: `${overallStats.occupancyRate}%`, color: "from-violet-500 to-indigo-500 shadow-violet-500/10", icon: Layers }
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
              
              {/* Header section with sticky actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="text-left">
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    PG & Institution Management
                  </h1>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Manage profiles, layouts, and occupancy status visually.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex rounded-xl bg-slate-100/80 p-1 border border-slate-200/60 backdrop-blur-sm shadow-sm">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === "grid"
                          ? "bg-white text-orange-500 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Grid size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === "table"
                          ? "bg-white text-orange-500 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <List size={16} />
                    </button>
                  </div>

                  {canCreate && (
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 hover:-translate-y-0.5 transition-all duration-200"
                      type="button"
                      onClick={() => navigate("/institutions/add")}
                    >
                      <Plus size={16} />
                      <span>Add PG</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick statistics banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-md p-4 flex items-center justify-between shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                          {item.label}
                        </p>
                        <p className="text-xl font-black text-slate-800 mt-1.5 tracking-tight">
                          {item.value}
                        </p>
                      </div>
                      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-lg shrink-0`}>
                        <Icon size={16} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modern Filters Bar */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-3xl border border-slate-100 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.04)]">
                <div className="flex w-full md:max-w-sm items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:bg-white focus-within:shadow-sm transition-all duration-200">
                  <Search size={16} />
                  <input
                    type="text"
                    value={searchText}
                    placeholder="Search by PG name, code, or location..."
                    onChange={(e) => setSearchText(e.target.value)}
                    className="h-10 w-full border-0 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="flex items-center gap-1.5 text-slate-450 text-xs font-bold mr-1">
                    <Filter size={14} />
                    <span>Filters:</span>
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-650 outline-none hover:border-slate-350 focus:border-orange-500/50 transition-all cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-655 outline-none hover:border-slate-350 focus:border-orange-500/50 transition-all cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="boys_pg">Boys PG</option>
                    <option value="girls_pg">Girls PG</option>
                    <option value="coliving">Coliving</option>
                    <option value="hostel">Hostel</option>
                    <option value="apartment">Apartment</option>
                  </select>
                </div>
              </div>

              <Error message={error} />

              {loading ? (
                <div className="rounded-3xl border border-slate-100 bg-white p-16 shadow-sm flex justify-center items-center">
                  <PageLoader />
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="rounded-3xl border border-slate-100 bg-white p-20 shadow-sm text-center">
                  <Building2 size={42} className="mx-auto text-slate-300" />
                  <h3 className="text-base font-black text-slate-700 mt-4 tracking-tight">No PG Records Found</h3>
                  <p className="text-xs text-slate-400 font-bold mt-1.5 max-w-sm mx-auto">
                    Try checking your filters, query text, or onboard a new PG record.
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                /* Card Layout View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredInstitutions.map((pg) => {
                    const metrics = getPgMetrics(pg);
                    return (
                      <motion.div
                        key={pg.id}
                        whileHover={{ y: -5, shadow: "0 25px 50px -12px rgba(255, 107, 0, 0.06)" }}
                        className="rounded-[32px] border border-slate-150 bg-white p-5 hover:border-orange-500/25 transition-all duration-300 flex flex-col justify-between text-left group relative shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] overflow-hidden"
                      >
                        {/* Top Accent Gradient Bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 opacity-80" />

                        <div>
                          {/* Title Area */}
                          <div className="flex items-start justify-between gap-3 mt-1">
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-xl border border-orange-100 bg-orange-50 text-orange-500 shrink-0">
                                <Building2 size={16} />
                              </span>
                              <div>
                                <h3 className="text-base font-black text-slate-800 leading-tight">
                                  {pg.institution_name}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                  {pg.institution_code || "No Code"}
                                </p>
                              </div>
                            </div>
                            
                            <span
                              className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-md border ${
                                pg.status === "active"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : "bg-rose-50 text-rose-600 border-rose-100"
                              }`}
                            >
                              {pg.status}
                            </span>
                          </div>

                          {/* PG Specs Chips */}
                          <div className="flex flex-wrap gap-1.5 mt-4">
                            <span className="bg-slate-50 text-slate-650 border border-slate-100 text-[10px] font-black px-2 py-0.5 rounded-lg">
                              {formatPgType(pg.institution_type)}
                            </span>
                            {pg.city && (
                              <span className="bg-slate-50 text-slate-650 border border-slate-100 text-[10px] font-black px-2 py-0.5 rounded-lg">
                                {pg.city}
                              </span>
                            )}
                          </div>

                          {/* Occupancy Indicator */}
                          <div className="mt-5 bg-slate-50/50 border border-slate-100/80 p-3.5 rounded-2xl">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                              <span>Occupancy Rate</span>
                              <span className="text-slate-800 font-black">{metrics.occupancyPercent}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden shadow-inner">
                              <div
                                className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                                style={{ width: `${metrics.occupancyPercent}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-2">
                              <span>{metrics.occupiedBeds} Beds Filled</span>
                              <span>{metrics.vacantBeds} Beds Vacant ({metrics.vacancyPercent}%)</span>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                            <div className="border border-slate-100 rounded-xl p-2 bg-slate-50/30 flex flex-col justify-center h-[56px]">
                              <div className="flex items-center justify-center gap-1">
                                <Layers size={11} className="text-slate-400" />
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Floors</span>
                              </div>
                              <p className="text-xs font-black text-slate-700 mt-1">{metrics.totalFloors}</p>
                            </div>
                            <div className="border border-slate-100 rounded-xl p-2 bg-slate-50/30 flex flex-col justify-center h-[56px]">
                              <div className="flex items-center justify-center gap-1">
                                <Home size={11} className="text-slate-400" />
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rooms</span>
                              </div>
                              <p className="text-xs font-black text-slate-700 mt-1">{metrics.totalRooms}</p>
                            </div>
                            <div className="border border-slate-100 rounded-xl p-2 bg-slate-50/30 flex flex-col justify-center h-[56px]">
                              <div className="flex items-center justify-center gap-1">
                                <BedDouble size={11} className="text-slate-400" />
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Beds</span>
                              </div>
                              <p className="text-xs font-black text-slate-700 mt-1">{metrics.totalBeds}</p>
                            </div>
                          </div>
                        </div>

                        {/* Manager & Actions */}
                        <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-550 shrink-0">
                              <User size={14} />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-[8px] text-slate-400 font-black uppercase leading-none">Manager</p>
                              <p className="text-xs font-black text-slate-700 mt-0.5 truncate">
                                {pg.manager_name || "Unassigned"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {canView && (
                              <button
                                type="button"
                                onClick={() => navigate(`/institutions/view/${pg.id}`)}
                                className="p-2 rounded-xl border border-slate-150 bg-white text-slate-500 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all"
                                title="View details"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => navigate(`/institutions/edit/${pg.id}`)}
                                className="p-2 rounded-xl border border-slate-150 bg-white text-slate-500 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all"
                                title="Edit layout"
                              >
                                <Edit size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(pg.id)}
                                className="p-2 rounded-xl border border-slate-150 bg-white text-slate-500 hover:text-red-500 hover:border-red-200 shadow-sm transition-all"
                                title="Delete record"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* Custom Modern Table View */
                <div className="rounded-3xl border border-slate-150 bg-white overflow-hidden shadow-sm shadow-slate-100">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-4 px-6">PG / Code</th>
                          <th className="py-4 px-6">Type</th>
                          <th className="py-4 px-6">Inventory Specs</th>
                          <th className="py-4 px-6">Occupancy Map</th>
                          <th className="py-4 px-6">Manager</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredInstitutions.map((pg) => {
                          const metrics = getPgMetrics(pg);
                          return (
                            <tr key={pg.id} className="hover:bg-slate-50/30 transition-colors">
                              {/* PG Profile */}
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-orange-100 bg-orange-50/80 text-orange-500 shrink-0">
                                    <Building2 size={15} />
                                  </span>
                                  <div>
                                    <p className="font-bold text-slate-800 leading-snug">
                                      {pg.institution_name}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                      {pg.institution_code || "-"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Type badge */}
                              <td className="py-4 px-6">
                                <span className="inline-block bg-slate-50 text-slate-650 border border-slate-100/80 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                                  {formatPgType(pg.institution_type)}
                                </span>
                              </td>

                              {/* Specs */}
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3 text-xs text-slate-500 font-black">
                                  <span title="Floors">{metrics.totalFloors} Floors</span>
                                  <span className="text-slate-200">•</span>
                                  <span title="Rooms">{metrics.totalRooms} Rooms</span>
                                  <span className="text-slate-200">•</span>
                                  <span title="Beds">{metrics.totalBeds} Beds</span>
                                </div>
                              </td>

                              {/* Occupancy Rate Bar */}
                              <td className="py-4 px-6 min-w-[170px]">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
                                    <span className="text-slate-600">{metrics.occupancyPercent}% Occupied</span>
                                    <span>{metrics.vacantBeds} Vacant</span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                                    <div
                                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                                      style={{ width: `${metrics.occupancyPercent}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Manager */}
                              <td className="py-4 px-6">
                                <div className="text-xs text-slate-700">
                                  <p className="font-bold">{pg.manager_name || "Unassigned"}</p>
                                  {pg.manager_phone && (
                                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold flex items-center gap-0.5">
                                      <Phone size={10} />
                                      {pg.manager_phone}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-4 px-6">
                                <span
                                  className={`inline-block px-2.5 py-0.5 text-[9px] font-black uppercase rounded-md border ${
                                    pg.status === "active"
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                      : "bg-rose-50 text-rose-600 border-rose-100"
                                  }`}
                                >
                                  {pg.status}
                                </span>
                              </td>

                              {/* Table Actions */}
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {canView && (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/institutions/view/${pg.id}`)}
                                      className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:text-orange-500 hover:border-orange-200 transition-colors bg-white shadow-sm"
                                      title="View details"
                                    >
                                      <Eye size={12} />
                                    </button>
                                  )}
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/institutions/edit/${pg.id}`)}
                                      className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:text-orange-500 hover:border-orange-200 transition-colors bg-white shadow-sm"
                                      title="Edit layout"
                                    >
                                      <Edit size={12} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(pg.id)}
                                      className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors bg-white shadow-sm"
                                      title="Delete record"
                                    >
                                      <Trash2 size={12} />
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
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Institution;
