import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BedDouble,
  Building2,
  ChevronLeft,
  Edit,
  Hash,
  Home,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Warehouse,
  Users,
  Info,
  Tag,
  Calendar,
  X,
  Bath,
  Sparkles,
  TrendingUp,
  Search,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import Error from "../Common/Error";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import {
  INSTITUTION_VIEW,
  TOKEN_KEY,
} from "../../Utils/Constants";

// Subcomponents
import BedLayout from "./components/BedLayout";
import RoomCard from "./components/RoomCard";
import BedSeat from "./components/BedSeat";

const tabs = [
  "Bed Layout", // Primary Focus
  "Overview",
  "Floors",
  "Rooms",
  "Occupancy Stats",
];

const formatLabel = (value) => {
  if (!value) return "-";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStatusStyles = (status) => {
  const norm = String(status || "").toLowerCase();
  if (norm === "vacant" || norm === "active") {
    return "bg-emerald-50 text-emerald-600 border-emerald-100/80";
  }
  if (norm === "reserved") {
    return "bg-amber-50 text-amber-600 border-amber-100/80";
  }
  if (norm === "occupied") {
    return "bg-rose-50 text-rose-600 border-rose-100/80";
  }
  if (norm === "blocked" || norm === "inactive") {
    return "bg-slate-100 text-slate-500 border-slate-200/80";
  }
  return "bg-slate-50 text-slate-600 border-slate-100/80";
};

const MetaTile = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-slate-100/80 bg-slate-50/50 p-4 text-left hover:border-orange-500/10 transition-all hover:bg-white duration-250">
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
      {label}
    </p>
    <div className="mt-2 flex items-start gap-2.5">
      <span className="mt-0.5 text-orange-500 shrink-0">
        <Icon size={15} />
      </span>
      <p className="text-sm font-bold text-slate-800 leading-normal">{value || "-"}</p>
    </div>
  </div>
);

const ViewInstituion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [institution, setInstitution] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Bed Layout");
  const [selectedFloorIdx, setSelectedFloorIdx] = useState(0);
  const [bedSearchText, setBedSearchText] = useState("");

  // Bed details side-drawer state
  const [viewingFloorIdx, setViewingFloorIdx] = useState(null);
  const [viewingRoomIdx, setViewingRoomIdx] = useState(null);
  const [viewingBedIdx, setViewingBedIdx] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  useEffect(() => {
    const getInstitution = async () => {
      try {
        const response = await fetch(INSTITUTION_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Institution fetch failed");
          return;
        }

        setInstitution(data.institution);
      } catch (apiError) {
        setError(apiError.message);
      }
    };

    getInstitution();
  }, [id]);

  const flatRooms = useMemo(() => {
    return (institution?.floors || []).flatMap((floor, floorIdx) => {
      return (floor.rooms || []).map((room, roomIdx) => ({
        ...room,
        floor_name: floor.floor_name,
        floor_number: floor.floor_number,
        floorIdx,
        roomIdx,
      }));
    });
  }, [institution]);

  const metrics = useMemo(() => {
    if (!institution) return { totalBeds: 0, occupiedBeds: 0, occupancyRate: 0 };
    const totalFloors = institution.total_floors || (institution.floors || []).length;
    const totalRooms = institution.total_rooms || flatRooms.length;
    
    let totalBeds = 0;
    let occupiedBeds = 0;
    let vacantBeds = 0;
    let reservedBeds = 0;
    let blockedBeds = 0;

    (institution.floors || []).forEach((f) => {
      (f.rooms || []).forEach((r) => {
        (r.beds || []).forEach((b) => {
          totalBeds++;
          if (b.status === "occupied") occupiedBeds++;
          else if (b.status === "reserved") reservedBeds++;
          else if (b.status === "blocked") blockedBeds++;
          else vacantBeds++;
        });
      });
    });

    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalFloors,
      totalRooms,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      reservedBeds,
      blockedBeds,
      occupancyRate,
    };
  }, [institution, flatRooms]);

  // Handle viewing specific bed info
  const handleViewBedInfo = (floorIdx, roomIdx, bedIdx) => {
    setViewingFloorIdx(floorIdx);
    setViewingRoomIdx(roomIdx);
    setViewingBedIdx(bedIdx);
    setIsDetailDrawerOpen(true);
  };

  const selectedBedDetails = useMemo(() => {
    if (viewingFloorIdx === null || viewingRoomIdx === null || viewingBedIdx === null || !institution) return null;
    const currentFloor = institution.floors[viewingFloorIdx];
    const room = currentFloor?.rooms[viewingRoomIdx];
    const bed = room?.beds[viewingBedIdx];
    if (!bed) return null;

    return {
      ...bed,
      room_number: room.room_number,
      room_type: room.room_type,
      base_rent: room.rent_amount,
      floor_name: currentFloor.floor_name,
    };
  }, [institution, viewingFloorIdx, viewingRoomIdx, viewingBedIdx]);

  // Filter beds based on search input
  const filteredBeds = useMemo(() => {
    if (!institution) return [];
    const list = [];
    (institution.floors || []).forEach((floor) => {
      (floor.rooms || []).forEach((room) => {
        (room.beds || []).forEach((bed, idx) => {
          list.push({
            ...bed,
            floor_name: floor.floor_name,
            room_number: room.room_number,
            bed_index: idx,
          });
        });
      });
    });

    if (!bedSearchText.trim()) return list;
    const query = bedSearchText.toLowerCase();
    return list.filter((b) => 
      b.floor_name.toLowerCase().includes(query) ||
      `room ${b.room_number}`.toLowerCase().includes(query) ||
      b.bed_number.toLowerCase().includes(query) ||
      b.status.toLowerCase().includes(query)
    );
  }, [institution, bedSearchText]);

  // Tab 1: Primary Bed Layout view
  const renderBedLayoutMap = () => {
    const floor = institution?.floors[selectedFloorIdx];
    if (!floor) return <p className="text-slate-400 py-8 text-center font-bold">No floors configured.</p>;

    return (
      <div className="flex flex-col gap-6 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight">
              Bed Occupancy Map — {floor.floor_name}
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Visual seat chart of level inventory. Select a seat to check details.
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
              <span className="h-2.5 w-2.5 rounded bg-emerald-500 shadow-sm" /> Vacant
            </span>
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
              <span className="h-2.5 w-2.5 rounded bg-rose-500 shadow-sm" /> Occupied
            </span>
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
              <span className="h-2.5 w-2.5 rounded bg-amber-500 shadow-sm" /> Reserved
            </span>
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
              <span className="h-2.5 w-2.5 rounded bg-slate-400 shadow-sm" /> Blocked
            </span>
          </div>
        </div>

        {/* Floor selector tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
          {(institution?.floors || []).map((fl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedFloorIdx(idx);
                setIsDetailDrawerOpen(false);
              }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap border ${
                selectedFloorIdx === idx
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {fl.floor_name}
            </button>
          ))}
        </div>

        {/* Rooms Seat Booking Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {(floor.rooms || []).length === 0 ? (
            <div className="col-span-full border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400">
              <Home size={32} className="mx-auto opacity-30 mb-2" />
              <p className="text-xs font-bold">No rooms configured on this floor level.</p>
            </div>
          ) : (
            (floor.rooms || []).map((room, rIdx) => (
              <motion.div
                key={room.id || rIdx}
                whileHover={{ y: -4, shadow: "0 20px 40px -15px rgba(15,23,42,0.05)" }}
                className="rounded-3xl border border-slate-150 p-5 bg-white hover:border-orange-500/25 transition-all duration-300 flex flex-col gap-4 text-left relative overflow-hidden"
              >
                {/* Top thin status border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-400" />
                
                <div className="flex items-center justify-between border-b border-slate-50 pb-2.5 mt-1">
                  <div>
                    <span className="text-base font-black text-slate-800">Room {room.room_number}</span>
                    <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider mt-0.5">
                      {room.room_type} Sharing
                    </p>
                  </div>
                  {room.attached_bathroom && (
                    <span className="text-slate-400 bg-slate-50 border border-slate-100 p-1 rounded-lg" title="Attached Bathroom">
                      <Bath size={14} />
                    </span>
                  )}
                </div>

                <BedLayout
                  beds={room.beds || []}
                  selectedBedIndex={null}
                  onBedClick={(bIdx) => handleViewBedInfo(selectedFloorIdx, rIdx, bIdx)}
                />

                <div className="text-[10px] font-black text-slate-400 mt-1 flex justify-between uppercase tracking-widest border-t border-slate-50 pt-3">
                  <span>Cap: {room.capacity} Beds</span>
                  <span className="text-slate-650">₹{room.rent_amount}/Mo</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Tab 2: Overview details
  const renderOverview = () => {
    return (
      <div className="grid gap-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Master Profile specs */}
          <div className="rounded-3xl border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-5 text-left">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Master PG Profile</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Core identifier specs and configuration variables.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetaTile icon={Hash} label="PG Registration Code" value={institution?.institution_code} />
              <MetaTile
                icon={ShieldCheck}
                label="PG Category"
                value={formatLabel(institution?.institution_type)}
              />
              <MetaTile icon={Mail} label="Email Address" value={institution?.email} />
              <MetaTile icon={Phone} label="Contact Phone" value={institution?.phone} />
              <MetaTile icon={UserRound} label="Assigned Manager" value={institution?.manager_name} />
              <MetaTile icon={Phone} label="Manager Phone" value={institution?.manager_phone} />
            </div>
          </div>

          {/* Location specs */}
          <div className="rounded-3xl border border-slate-150 bg-slate-900 p-6 text-white shadow-sm flex flex-col justify-between text-left relative overflow-hidden">
            {/* Background design glow */}
            <div className="absolute right-0 bottom-0 text-white/5 translate-x-1/4 translate-y-1/4 scale-150 pointer-events-none">
              <Building2 size={220} />
            </div>

            <div className="z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                Location Details
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-white">{institution?.city || "Unknown City"}</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                {institution?.state || "-"} {institution?.pincode ? `• ${institution.pincode}` : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 z-10 my-4">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="mt-0.5 text-orange-400 shrink-0" />
                <p className="text-xs font-semibold leading-relaxed text-slate-250">
                  {institution?.address || "Street address not configured"}
                </p>
              </div>
            </div>

            {institution?.logo && (
              <div className="overflow-hidden rounded-2xl border border-white/10 h-32 z-10 mt-auto">
                <img
                  src={institution.logo}
                  alt={institution.institution_name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Tab 3: Floors layout overview
  const renderFloors = () => {
    return (
      <div className="grid gap-5 text-left">
        {(institution?.floors || []).map((floor, idx) => (
          <section
            key={floor.id || idx}
            className="rounded-3xl border border-slate-150 bg-white p-6 shadow-sm hover:border-slate-200 transition-all"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-500 border border-orange-100/50">
                  <Warehouse size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-850">{floor.floor_name}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-0.5">
                    Level {floor.floor_number} • {formatLabel(floor.gender_type)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-md border ${
                    floor.status === "active"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-rose-50 text-rose-600 border-rose-100"
                  }`}
                >
                  {floor.status}
                </span>
                <span className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-0.5 text-[10px] font-black text-slate-500">
                  {(floor.rooms || []).length} Rooms
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {(floor.rooms || []).map((room, rIdx) => (
                <div
                  key={room.id || rIdx}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-white hover:border-orange-550/15 transition-all cursor-pointer text-left"
                >
                  <p className="text-xs font-black text-slate-800">Room {room.room_number}</p>
                  <p className="text-[9px] font-bold text-slate-450 mt-1 capitalize tracking-tight">
                    {room.room_type} Share • {room.attached_bathroom ? "Bath" : "Common"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  // Tab 4: Rooms list
  const renderRooms = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {flatRooms.map((room, idx) => (
          <RoomCard
            key={room.id || idx}
            room={room}
            floorName={room.floor_name}
            onBedClick={(bIdx) => handleViewBedInfo(room.floorIdx, room.roomIdx, bIdx)}
          />
        ))}
      </div>
    );
  };

  // Tab 5: Occupancy Stats
  const renderOccupancyStats = () => {
    return (
      <div className="grid gap-6 text-left">
        {/* Dynamic Occupancy Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-150 p-4 bg-white shadow-sm flex flex-col justify-between h-[84px]">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Occupancy Rate</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-slate-800 leading-none">{metrics.occupancyRate}%</span>
              <TrendingUp size={14} className="text-emerald-500" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-150 p-4 bg-white shadow-sm flex flex-col justify-between h-[84px]">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Vacant Beds</span>
            <span className="text-2xl font-black text-emerald-600 mt-2 block leading-none">{metrics.vacantBeds}</span>
          </div>
          <div className="rounded-2xl border border-slate-150 p-4 bg-white shadow-sm flex flex-col justify-between h-[84px]">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Reserved</span>
            <span className="text-2xl font-black text-amber-500 mt-2 block leading-none">{metrics.reservedBeds}</span>
          </div>
          <div className="rounded-2xl border border-slate-150 p-4 bg-white shadow-sm flex flex-col justify-between h-[84px]">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Blocked / Main.</span>
            <span className="text-2xl font-black text-slate-500 mt-2 block leading-none">{metrics.blockedBeds}</span>
          </div>
        </div>

        {/* Detailed inventory list */}
        <div className="rounded-3xl border border-slate-150 p-6 bg-white flex flex-col gap-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800">Bed Inventory List</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Examine specific bed status and overrides across the building.</p>
            </div>

            {/* Bed Search Box */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:bg-white focus-within:shadow-sm transition-all duration-200 w-full sm:max-w-xs shrink-0">
              <Search size={14} />
              <input
                type="text"
                value={bedSearchText}
                placeholder="Search bed, level, room..."
                onChange={(e) => setBedSearchText(e.target.value)}
                className="w-full border-0 bg-transparent text-xs font-semibold text-slate-850 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-450 text-left">
                  <th className="py-3.5 px-4">Level</th>
                  <th className="py-3.5 px-4">Room No.</th>
                  <th className="py-3.5 px-4">Bed Name</th>
                  <th className="py-3.5 px-4">Bed Type</th>
                  <th className="py-3.5 px-4">Rent Override</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredBeds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                      No matching beds found.
                    </td>
                  </tr>
                ) : (
                  filteredBeds.map((bed, idx) => (
                    <tr key={bed.id || idx} className="hover:bg-slate-55/35 transition-colors cursor-pointer" onClick={() => {
                      // Lookup coordinates of the bed to render correctly
                      const flIdx = institution.floors.findIndex(f => f.floor_name === bed.floor_name);
                      if (flIdx !== -1) {
                        const rmIdx = institution.floors[flIdx].rooms.findIndex(r => r.room_number === bed.room_number);
                        if (rmIdx !== -1) {
                          handleViewBedInfo(flIdx, rmIdx, bed.bed_index);
                        }
                      }
                    }}>
                      <td className="py-3 px-4 font-bold text-slate-800">{bed.floor_name}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">Room {bed.room_number}</td>
                      <td className="py-3 px-4 font-bold text-slate-650">{bed.bed_number}</td>
                      <td className="py-3 px-4 font-semibold capitalize">{bed.bed_type.replace("_", " ")}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {bed.rent_override ? `₹${bed.rent_override}` : "Default"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${getStatusStyles(
                            bed.status
                          )}`}
                        >
                          {bed.status}
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
    );
  };

  const statItems = [
    { label: "Levels", value: metrics.totalFloors, icon: Warehouse, color: "from-sky-500 to-blue-500 bg-sky-50 text-sky-600 border-sky-100" },
    { label: "Rooms", value: metrics.totalRooms, icon: Home, color: "from-orange-500 to-red-500 bg-orange-50 text-orange-500 border-orange-100" },
    { label: "Total Inventory", value: `${metrics.totalBeds} Beds`, icon: BedDouble, color: "from-emerald-500 to-teal-500 bg-emerald-50 text-emerald-600 border-emerald-100" },
    { label: "Live Occupants", value: metrics.occupiedBeds, icon: Users, color: "from-rose-500 to-red-500 bg-rose-50 text-rose-500 border-rose-100" },
    { label: "Occupancy Rate", value: `${metrics.occupancyRate}%`, icon: Sparkles, color: "from-violet-500 to-indigo-500 bg-violet-50 text-violet-600 border-violet-100" },
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex min-h-0 flex-1 flex-col bg-slate-50">
          <div className="w-full flex-1 px-6 pb-8 pt-7 md:px-8 lg:pt-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 text-left animate-fadeIn">
              
              {/* Header / Profile block */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => navigate("/institutions")}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-350 hover:shadow-sm transition-all duration-200"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div>
                    <h1 className="text-xl font-black text-slate-850 tracking-tight leading-none flex items-center gap-2">
                      {institution?.institution_name || "PG Configuration"}
                      {institution?.status && (
                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-md border tracking-wider leading-none ${
                          institution.status === "active"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                          {institution.status}
                        </span>
                      )}
                    </h1>
                    <p className="text-xs text-slate-400 font-semibold mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="flex items-center gap-0.5"><Hash size={11} />{institution?.institution_code || "No Code"}</span>
                      <span>•</span>
                      <span className="capitalize">{formatLabel(institution?.institution_type)}</span>
                      {institution?.city && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5"><MapPin size={11} />{institution.city}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/institutions/edit/${id}`)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/35 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <Edit size={14} />
                    <span>Edit Configuration</span>
                  </button>
                </div>
              </div>

              <Error message={error} />

              {/* Summary Stats metrics */}
              {institution && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {statItems.map((st, sIdx) => {
                    const Icon = st.icon;
                    return (
                      <div
                        key={sIdx}
                        className={`rounded-2xl border ${st.color.split(" ")[2]} bg-white p-4 text-left shadow-[0_10px_25px_-12px_rgba(15,23,42,0.03)] hover:shadow-md transition-shadow flex items-center justify-between col-span-1 ${sIdx === 4 ? "col-span-2 sm:col-span-1" : ""}`}
                      >
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{st.label}</p>
                          <p className="text-lg font-black text-slate-800 mt-2 tracking-tight leading-none">{st.value}</p>
                        </div>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center border shrink-0 ${st.color.split(" ")[0]} ${st.color.split(" ")[1]}`}>
                          <Icon size={14} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tabs slider */}
              {institution && (
                <div className="flex flex-col gap-6">
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-150 p-1 flex overflow-x-auto shadow-sm gap-1">
                    {tabs.map((tab) => {
                      const isActive = activeTab === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab);
                            setIsDetailDrawerOpen(false);
                          }}
                          className="relative rounded-xl px-4 py-2.5 text-xs font-black transition-all whitespace-nowrap outline-none cursor-pointer"
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeViewTab"
                              className="absolute inset-0 rounded-xl bg-slate-900 shadow-sm"
                              transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            />
                          )}
                          <span
                            className={`relative z-10 ${
                              isActive
                                ? "font-black text-white"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {tab}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab contents panel */}
                  <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm min-h-[380px]">
                    {activeTab === "Bed Layout" && renderBedLayoutMap()}
                    {activeTab === "Overview" && renderOverview()}
                    {activeTab === "Floors" && renderFloors()}
                    {activeTab === "Rooms" && renderRooms()}
                    {activeTab === "Occupancy Stats" && renderOccupancyStats()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Bed Details Read-only Slide-Drawer */}
      <AnimatePresence>
        {isDetailDrawerOpen && selectedBedDetails && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[6px]"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 p-6 flex flex-col justify-between border-l border-slate-150 text-left overflow-y-auto"
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-orange-500 border border-orange-100/50">
                      <BedDouble size={16} />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">
                        {selectedBedDetails.bed_number}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Room {selectedBedDetails.room_number} • {selectedBedDetails.floor_name}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDetailDrawerOpen(false)}
                    className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-150 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Micro Visual Bed seat detail */}
                <div className="mt-5 text-left">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Seat Illustration
                  </span>
                  
                  <div
                    className="rounded-2xl border border-slate-200/80 p-5 flex items-center justify-center relative shadow-inner overflow-hidden min-h-[120px]"
                    style={{
                      background: "repeating-linear-gradient(90deg, #FAF7F2, #FAF7F2 26px, #F3EFE7 27px)",
                    }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-slate-450 border-b border-slate-350" />
                    
                    <div className="z-10 py-1 scale-110">
                      <BedSeat bed={selectedBedDetails} isSelected={false} onClick={null} />
                    </div>
                  </div>
                </div>

                {/* Details Container */}
                <div className="mt-5 flex flex-col gap-3.5">
                  {/* Status Card */}
                  <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50 hover:bg-white transition-all">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      Bed Status
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${getStatusStyles(
                        selectedBedDetails.status
                      )}`}
                    >
                      {selectedBedDetails.status}
                    </span>
                  </div>

                  {/* Sharing Category */}
                  <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50 hover:bg-white transition-all">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Sharing Config
                    </span>
                    <p className="text-sm font-black text-slate-800 capitalize">
                      {selectedBedDetails.room_type} Sharing Room
                    </p>
                  </div>

                  {/* Bed Category */}
                  <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50 hover:bg-white transition-all">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Bed Type
                    </span>
                    <p className="text-sm font-black text-slate-800 capitalize">
                      {selectedBedDetails.bed_type.replace("_", " ")}
                    </p>
                  </div>

                  {/* Rent Info */}
                  <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50 hover:bg-white transition-all">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Pricing Detail
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Base Room Rent</span>
                        <span className="text-sm font-black text-slate-800">₹{selectedBedDetails.base_rent}</span>
                      </div>
                      {selectedBedDetails.rent_override ? (
                        <div className="text-right">
                          <span className="text-[9px] text-orange-400 block font-bold uppercase tracking-wider">Rent Override</span>
                          <span className="text-sm font-black text-orange-600">₹{selectedBedDetails.rent_override}</span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-[9px] text-slate-450 block font-bold uppercase tracking-wider">Rent Override</span>
                          <span className="text-xs font-black text-slate-400 italic">None</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Footer */}
              <div className="border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="w-full h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-650 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewInstituion;
