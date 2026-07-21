import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { 
  BedDouble, 
  Building2, 
  Search, 
  Sparkles, 
  Users, 
  Warehouse, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import TenantShell from "./TenantShell";
import { TENANT_VACANT_BEDS, INSTITUTION_LIST, PG_ADMIN_MY_INSTITUTION } from "../../Utils/Constants";
import {
  buildMetricCards,
  getAuthHeaders,
  groupVacantBeds,
} from "./tenantHelpers";

const VacantBeds = () => {
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const [beds, setBeds] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Advanced Filters & Pagination States (Backend Driven)
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRoomType, setFilterRoomType] = useState("all");
  const [filterFloorId, setFilterFloorId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [expandedFloorId, setExpandedFloorId] = useState(null);
  const [expandedRoomIds, setExpandedRoomIds] = useState({});
  const [availableFloors, setAvailableFloors] = useState([]);

  // 1. Fetch institutions once on load
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await fetch(isPgAdmin ? PG_ADMIN_MY_INSTITUTION : INSTITUTION_LIST, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (response.ok) {
          const list = data.institutions || [];
          setInstitutions(list);
          if (list.length > 0) {
            setSelectedInstitutionId(String(list[0].id));
          }
        }
      } catch (err) {
        console.error("Failed to load institutions", err);
      }
    };
    fetchInstitutions();
  }, [isPgAdmin]);

  // 2. Fetch beds from backend with pagination, search, and filters
  useEffect(() => {
    if (!selectedInstitutionId) return;

    const fetchBeds = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(TENANT_VACANT_BEDS, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            institution_id: selectedInstitutionId,
            search: searchText,
            status: filterStatus,
            roomType: filterRoomType,
            floorId: filterFloorId,
            page: currentPage,
            limit: 50 // 50 items per page
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Bed layout fetch failed");
        }

        const bedList = data.beds || [];
        setBeds(bedList);

        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        } else {
          setTotalPages(1);
          setTotalCount(bedList.length);
        }
      } catch (apiError) {
        setError(apiError.message || "Failed to load beds");
      } finally {
        setLoading(false);
      }
    };

    // Debounce search query to avoid spamming the backend
    const timer = setTimeout(() => {
      fetchBeds();
    }, 300);

    return () => clearTimeout(timer);
  }, [
    selectedInstitutionId,
    searchText,
    filterStatus,
    filterRoomType,
    filterFloorId,
    currentPage
  ]);

  // Extract unique floors seen from beds data when no floor level filter is selected
  useEffect(() => {
    if (filterFloorId === "all" && beds.length > 0) {
      const uniqueFloors = [];
      const floorIds = new Set();
      beds.forEach((bed) => {
        if (bed.floor_id && !floorIds.has(bed.floor_id)) {
          floorIds.add(bed.floor_id);
          uniqueFloors.push({
            id: bed.floor_id,
            floor_name: bed.floor_name || `Floor ${bed.floor_number}`
          });
        }
      });
      if (uniqueFloors.length > 0) {
        setAvailableFloors(uniqueFloors);
      }
    }
  }, [beds, filterFloorId]);

  // Reset page to 1 when filters or selection changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedInstitutionId, searchText, filterStatus, filterRoomType, filterFloorId]);

  const filteredHierarchy = useMemo(() => {
    return groupVacantBeds(beds, institutions);
  }, [beds, institutions]);

  const selectedHierarchy = useMemo(() => {
    if (!selectedInstitutionId) {
      return null;
    }

    return (
      filteredHierarchy.find((institution) => Number(institution.id) === Number(selectedInstitutionId)) ||
      null
    );
  }, [filteredHierarchy, selectedInstitutionId]);

  // Expand the first floor by default whenever selected hierarchy changes
  useEffect(() => {
    if (selectedHierarchy?.floors?.length > 0) {
      setExpandedFloorId(selectedHierarchy.floors[0].id);
    } else {
      setExpandedFloorId(null);
    }
    setExpandedRoomIds({});
  }, [selectedHierarchy]);

  const toggleRoomExpansion = (roomId) => {
    setExpandedRoomIds((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  const metricCards = buildMetricCards([
    {
      label: "Vacant Beds",
      value: beds.filter((bed) => bed.status === "vacant").length,
      icon: BedDouble,
      color: "from-emerald-500 to-teal-500 bg-emerald-50 border-emerald-100",
    },
    {
      label: "Locked Beds",
      value: beds.filter((bed) => bed.status !== "vacant").length,
      icon: Sparkles,
      color: "from-rose-500 to-red-500 bg-rose-50 border-rose-100",
    },
    {
      label: "Total Buildings",
      value: new Set(beds.map((bed) => bed.institution_name)).size,
      icon: Building2,
      color: "from-sky-500 to-blue-500 bg-sky-50 border-sky-100",
    },
    {
      label: "Shared Rooms",
      value: new Set(beds.map((bed) => `${bed.institution_id}-${bed.floor_id}-${bed.room_id}`)).size,
      icon: Users,
      color: "from-violet-500 to-indigo-500 bg-violet-50 border-violet-100",
    },
  ]);

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-fadeIn">
        <div className="text-left border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Bed Availability Console
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 font-bold">
            Expand floors and rooms to view real-time vacancies with maximum information density and zero clutter.
          </p>
        </div>

        {/* Banner Stats Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metricCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.id}
                className="rounded-3xl border border-slate-150 bg-white p-4 text-left shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {card.label}
                    </span>
                    <span className="mt-2 block text-xl font-black leading-none tracking-tight text-slate-800">
                      {card.value}
                    </span>
                  </div>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${card.color.split(" ")[2]}`}>
                    <Icon size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Unified Search & Inline Multi-Filter Control Console */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-[32px] border border-slate-150 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.04)]">
          {/* Left: Search + Dropdowns inline */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search Input */}
            <div className="flex w-full sm:max-w-xs items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-slate-400 focus-within:border-orange-500/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:shadow-sm transition-all duration-200">
              <Search size={14} className="shrink-0" />
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search floor, room, bed..."
                className="h-9 w-full border-0 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Select Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Bed Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-700 outline-none focus:border-orange-500/50 cursor-pointer"
                aria-label="Filter Bed Status"
              >
                <option value="all">All Statuses</option>
                <option value="vacant">Vacant Only</option>
                <option value="occupied">Occupied/Reserved</option>
              </select>

              {/* Sharing Type */}
              <select
                value={filterRoomType}
                onChange={(e) => setFilterRoomType(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-700 outline-none focus:border-orange-500/50 cursor-pointer"
                aria-label="Filter Sharing Type"
              >
                <option value="all">All Sharing Types</option>
                <option value="single">Single Sharing</option>
                <option value="double">Double Sharing</option>
                <option value="triple">Triple Sharing</option>
                <option value="quad">Quad Sharing</option>
              </select>

              {/* Floor Level */}
              <select
                value={filterFloorId}
                onChange={(e) => setFilterFloorId(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-700 outline-none focus:border-orange-500/50 cursor-pointer"
                aria-label="Filter Floor Level"
              >
                <option value="all">All Floors</option>
                {availableFloors.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.floor_name}
                  </option>
                ))}
              </select>

              {/* Reset Filters Button */}
              {(filterStatus !== "all" || filterRoomType !== "all" || filterFloorId !== "all" || searchText !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterRoomType("all");
                    setFilterFloorId("all");
                    setSearchText("");
                  }}
                  className="h-9 inline-flex items-center justify-center rounded-xl border border-slate-200 hover:border-orange-250 hover:text-orange-500 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Right: Building Selector Tabs */}
          <div className="scrollbar-thin flex gap-1 overflow-x-auto shrink-0 max-w-full lg:max-w-xs justify-end">
            {institutions.map((institution) => {
              const isActive = String(institution.id) === selectedInstitutionId;

              return (
                <button
                  key={institution.id}
                  type="button"
                  onClick={() => setSelectedInstitutionId(String(institution.id))}
                  className={`cursor-pointer whitespace-nowrap rounded-xl px-3 py-2 text-[10px] font-black transition-all ${
                    isActive
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {institution.institution_name}
                </button>
              );
            })}
          </div>
        </div>

        <Error message={error} />

        {loading ? (
          <div className="flex items-center justify-center rounded-[32px] border border-slate-100 bg-white p-16 shadow-sm">
            <PageLoader />
          </div>
        ) : !selectedHierarchy || selectedHierarchy.floors.length === 0 ? (
          <div className="rounded-[32px] border border-slate-150 bg-white p-20 text-center shadow-sm">
            <BedDouble size={36} className="mx-auto text-slate-350" />
            <h3 className="mt-3.5 text-base font-black text-slate-700">No Bed Layout Found</h3>
            <p className="mx-auto mt-1 max-w-xs text-xs font-bold text-slate-400">
              No vacant bed slots match the filters or keyword criteria.
            </p>
          </div>
        ) : (
          /* Progressive Disclosure Floor-Level Accordion */
          <div className="flex flex-col gap-4 text-left">
            {selectedHierarchy.floors.map((floor) => {
              const isFloorExpanded = expandedFloorId === floor.id;

              const vacantCount = floor.rooms.reduce((sum, room) => {
                return sum + room.beds.filter((bed) => bed.status === "vacant").length;
              }, 0);
              const lockedCount = floor.rooms.reduce((sum, room) => {
                return sum + room.beds.filter((bed) => bed.status !== "vacant").length;
              }, 0);
              const totalBeds = vacantCount + lockedCount;
              const occupancyRate = totalBeds > 0 ? Math.round((lockedCount / totalBeds) * 100) : 0;

              return (
                <div
                  key={floor.id}
                  className="rounded-[28px] border border-slate-150 bg-white shadow-sm overflow-hidden transition-all duration-250"
                >
                  {/* Floor Header (Accordion Trigger) */}
                  <button
                    type="button"
                    onClick={() => setExpandedFloorId(isFloorExpanded ? null : floor.id)}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors ${
                        isFloorExpanded 
                          ? "bg-slate-800 text-white border-slate-900 shadow-sm" 
                          : "bg-orange-50 text-orange-500 border-orange-100/50"
                      }`}>
                        <Warehouse size={18} />
                      </span>
                      <div>
                        <h3 className="text-sm font-black leading-tight text-slate-855">
                          {floor.floor_name}
                        </h3>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Level {floor.floor_number} • {floor.rooms.length} Rooms • {totalBeds} Bed Slots
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 sm:ml-auto">
                      {/* Visual occupancy percentage progress */}
                      <div className="hidden md:flex flex-col items-end gap-1 w-28 text-right">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Occupancy: {occupancyRate}%</span>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              occupancyRate > 80 
                                ? "bg-rose-500" 
                                : occupancyRate > 50 
                                ? "bg-amber-500" 
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                      </div>

                      {/* Bed Counts Summary Pill */}
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                          {vacantCount} Vacant
                        </span>
                        <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600">
                          {lockedCount} Occupied
                        </span>
                      </div>

                      {isFloorExpanded ? (
                        <ChevronUp className="text-slate-400" size={18} />
                      ) : (
                        <ChevronDown className="text-slate-400" size={18} />
                      )}
                    </div>
                  </button>

                  {/* Level 3: Rooms Grid (Shown when Floor is expanded) */}
                  {isFloorExpanded && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50/20">
                      {floor.rooms.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                          No rooms available on this floor.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {floor.rooms.map((room) => {
                            const isRoomExpanded = !!expandedRoomIds[room.id];
                            const roomBeds = room.beds || [];
                            const roomOccupied = roomBeds.filter(b => b.status !== "vacant").length;
                            
                            return (
                              <motion.div
                                layout
                                key={room.id}
                                className={`group rounded-2xl border bg-white p-4 transition-all duration-200 cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${
                                  isRoomExpanded
                                    ? "border-orange-500 ring-1 ring-orange-500/30 shadow-md"
                                    : "border-slate-150 shadow-sm hover:border-slate-355"
                                }`}
                                onClick={() => toggleRoomExpansion(room.id)}
                              >
                                {isRoomExpanded && (
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500" />
                                )}

                                <div>
                                  <div className="flex justify-between items-start">
                                    <h4 className="text-xs font-black text-slate-800">Room {room.room_number}</h4>
                                    <span className="text-[10px] font-black text-slate-700">₹{parseFloat(room.rent_amount || 0)}</span>
                                  </div>
                                  <div className="text-[9px] font-bold text-slate-400 mt-0.5 capitalize">
                                    {room.room_type || "Double"} Sharing
                                  </div>

                                  {/* Compact Miniature Bed Visual Layout */}
                                  <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
                                    {roomBeds.map((b, idx) => {
                                      const isVacant = b.status === "vacant";
                                      const isReserved = b.status === "reserved";
                                      const label = b.bed_number 
                                        ? b.bed_number.replace(/bed\s*/i, "").trim().substring(0, 1).toUpperCase() 
                                        : String.fromCharCode(65 + idx);

                                      return (
                                        <div
                                          key={idx}
                                          title={`${b.bed_number}: ${b.status}`}
                                          className={`relative flex flex-col w-[26px] h-[36px] rounded-md border bg-[#fbfaf8] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] shrink-0 transition-transform duration-200 hover:scale-105 ${
                                            isVacant
                                              ? "border-emerald-300"
                                              : isReserved
                                              ? "border-amber-300"
                                              : "border-rose-300"
                                          }`}
                                        >
                                          {/* Tiny Pillow */}
                                          <div className="w-full h-1.5 bg-white border-b border-slate-200 shrink-0" />
                                          {/* Tiny Mattress color and bed letter */}
                                          <div className={`w-full flex-1 flex items-center justify-center text-[8px] font-black leading-none ${
                                            isVacant
                                              ? "bg-emerald-50 text-emerald-700"
                                              : isReserved
                                              ? "bg-amber-50 text-amber-700"
                                              : "bg-rose-50/80 text-rose-700"
                                          }`}>
                                            {label}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                      {roomOccupied}/{room.capacity} Beds
                                    </span>
                                  </div>
                                </div>

                                {/* Level 4: Inline Bed Slot Expansion (Shown when Room is clicked) */}
                                <AnimatePresence>
                                  {isRoomExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5"
                                      onClick={(e) => e.stopPropagation()} // prevent collapse on child click
                                    >
                                      {roomBeds.map((bed, idx) => (
                                        <div
                                          key={idx}
                                          className={`flex items-center justify-between p-1.5 rounded-lg border text-[10px] font-bold ${
                                            bed.status === "vacant"
                                              ? "bg-emerald-50/50 border-emerald-100 text-emerald-700"
                                              : bed.status === "reserved"
                                              ? "bg-amber-50/50 border-amber-100 text-amber-700"
                                              : "bg-rose-50/30 border-rose-100 text-rose-700"
                                          }`}
                                        >
                                          <span>{bed.bed_number}</span>
                                          <span className="text-[8px] font-black uppercase tracking-wider px-1 bg-white rounded shadow-sm border border-black/5">
                                            {bed.status}
                                          </span>
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <div className="text-right mt-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400 group-hover:text-orange-500">
                                  {isRoomExpanded ? "Collapse ↑" : "View Beds →"}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-left">
            <span className="text-xs text-slate-500 font-bold">
              Showing page <span className="font-black text-slate-800">{currentPage}</span> of{" "}
              <span className="font-black text-slate-800">{totalPages}</span> ({totalCount} total beds matching filters)
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="cursor-pointer inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="cursor-pointer inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </TenantShell>
  );
};

export default VacantBeds;
