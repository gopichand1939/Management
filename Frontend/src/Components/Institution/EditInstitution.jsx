import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Plus,
  Home,
  User,
  Phone,
  MapPin,
  Image,
  Hash,
  Info,
  Warehouse,
  Users,
} from "lucide-react";

import Button from "../Common/Button";
import Error from "../Common/Error";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";

// Subcomponents
import StepHeader from "./components/StepHeader";
import QuickStats from "./components/QuickStats";
import FloorCard from "./components/FloorCard";
import RoomCard from "./components/RoomCard";
import RoomModal from "./components/RoomModal";
import BedLayout from "./components/BedLayout";
import BedEditorDrawer from "./components/BedEditorDrawer";

import {
  INSTITUTION_EDIT,
  INSTITUTION_VIEW,
  TOKEN_KEY,
} from "../../Utils/Constants";

const steps = [
  "Basic Details",
  "Floors Setup",
  "Rooms Setup",
  "Beds Setup",
  "Review & Update",
];

const institutionTypeOptions = [
  { value: "boys_pg", label: "Boys PG" },
  { value: "girls_pg", label: "Girls PG" },
  { value: "coliving", label: "Coliving" },
  { value: "hostel", label: "Hostel" },
  { value: "apartment", label: "Apartment" },
];

const createDefaultFloor = (index) => ({
  floor_name: index === 0 ? "Ground Floor" : `Floor ${index}`,
  floor_number: index,
  gender_type: "mixed",
  status: "active",
  rooms: [],
});

const adjustBedsForCapacity = (beds, capacity) => {
  const currentCount = beds.length;
  if (currentCount === capacity) return beds;
  if (currentCount < capacity) {
    const additional = Array.from({ length: capacity - currentCount }, (_, i) => ({
      bed_number: `Bed ${String.fromCharCode(65 + currentCount + i)}`,
      bed_type: "single",
      rent_override: null,
      status: "vacant",
    }));
    return [...beds, ...additional];
  } else {
    return beds.slice(0, capacity);
  }
};

const normalizePayload = (formData, id) => {
  return {
    id,
    institution_name: formData.institution_name.trim(),
    institution_code: formData.institution_code.trim(),
    institution_type: formData.institution_type,
    phone: formData.phone.trim(),
    email: formData.email.trim(),
    address: formData.address.trim(),
    city: formData.city.trim(),
    state: formData.state.trim(),
    pincode: formData.pincode.trim(),
    manager_name: formData.manager_name.trim(),
    manager_phone: formData.manager_phone.trim(),
    status: formData.status,
    logo: formData.logo.trim(),
    floors: formData.floors.map((floor) => ({
      floor_name: String(floor.floor_name || "").trim(),
      floor_number: floor.floor_number === "" ? null : Number(floor.floor_number),
      gender_type: floor.gender_type || "mixed",
      status: floor.status || "active",
      rooms: floor.rooms.map((room) => ({
        room_number: String(room.room_number || "").trim(),
        room_type: room.room_type || "double",
        capacity: room.capacity === "" ? null : Number(room.capacity),
        rent_amount: room.rent_amount === "" ? null : Number(room.rent_amount),
        attached_bathroom: Boolean(room.attached_bathroom),
        status: room.status || "active",
        beds: room.beds.map((bed) => ({
          bed_number: String(bed.bed_number || "").trim(),
          bed_type: bed.bed_type || "single",
          rent_override: bed.rent_override === "" ? null : Number(bed.rent_override),
          status: bed.status || "vacant",
        })),
      })),
    })),
  };
};

const EditInstitution = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);

  // Core Edit States
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInstitution, setLoadingInstitution] = useState(true);
  
  const [formData, setFormData] = useState({
    institution_name: "",
    institution_code: "",
    institution_type: "coliving",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    manager_name: "",
    manager_phone: "",
    status: "active",
    logo: "",
    floors: [],
  });

  // Modal / Drawer selection states
  const [selectedFloorIdx, setSelectedFloorIdx] = useState(0);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoomIdx, setEditingRoomIdx] = useState(null);

  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [editingFloorIdx, setEditingFloorIdx] = useState(null);
  const [floorForm, setFloorForm] = useState({ floor_name: "", floor_number: "", gender_type: "mixed" });

  const [selectedRoomIdx, setSelectedRoomIdx] = useState(null);
  const [selectedBedIdx, setSelectedBedIdx] = useState(null);
  const [isBedDrawerOpen, setIsBedDrawerOpen] = useState(false);

  useEffect(() => {
    if (authUser?.role === "pg_admin") {
      navigate("/institutions", { replace: true });
    }
  }, [authUser, navigate]);

  // Load existing PG details from server
  useEffect(() => {
    const fetchInstitution = async () => {
      try {
        setLoadingInstitution(true);
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
          setError(data.message || "Failed loading details");
          return;
        }

        const inst = data.institution || {};
        setFormData({
          institution_name: inst.institution_name || "",
          institution_code: inst.institution_code || "",
          institution_type: inst.institution_type || "coliving",
          phone: inst.phone || "",
          email: inst.email || "",
          address: inst.address || "",
          city: inst.city || "",
          state: inst.state || "",
          pincode: inst.pincode || "",
          manager_name: inst.manager_name || "",
          manager_phone: inst.manager_phone || "",
          status: inst.status || "active",
          logo: inst.logo || "",
          floors: inst.floors || [],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingInstitution(false);
      }
    };

    fetchInstitution();
  }, [id]);

  // Dynamic metrics aggregations
  const stats = useMemo(() => {
    const totalFloors = formData.floors.length;
    const totalRooms = formData.floors.reduce((sum, f) => sum + f.rooms.length, 0);
    const totalBeds = formData.floors.reduce(
      (sum, f) => sum + f.rooms.reduce((rs, r) => rs + r.beds.length, 0),
      0
    );
    const occupiedBeds = formData.floors.reduce(
      (sum, f) => sum + f.rooms.reduce((rs, r) => rs + r.beds.filter(b => b.status === "occupied").length, 0),
      0
    );
    const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return { totalFloors, totalRooms, totalBeds, occupiedBeds, occupancyPercent };
  }, [formData.floors]);

  const handleBasicChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = (step) => {
    if (step === 0) {
      if (!formData.institution_name.trim()) return "PG Name is required";
      if (!formData.phone.trim()) return "Phone number is required";
      if (!formData.manager_name.trim()) return "Manager Name is required";
    }
    if (step === 1) {
      if (formData.floors.length === 0) return "Add at least one floor";
    }
    if (step === 2) {
      const hasAnyRooms = formData.floors.some((f) => f.rooms.length > 0);
      if (!hasAnyRooms) return "Define rooms for at least one floor to continue";
    }
    if (step === 3) {
      const hasBeds = formData.floors.some((f) => f.rooms.some((r) => r.beds.length > 0));
      if (!hasBeds) return "Add beds inside rooms";
    }
    return "";
  };

  const handleStepClick = (stepIdx) => {
    if (stepIdx < activeStep) {
      setActiveStep(stepIdx);
      setError("");
      return;
    }
    for (let s = activeStep; s < stepIdx; s++) {
      const stepError = validateStep(s);
      if (stepError) {
        setError(stepError);
        return;
      }
    }
    setActiveStep(stepIdx);
    setError("");
  };

  const handleNext = () => {
    const stepError = validateStep(activeStep);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError("");
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrev = () => {
    setError("");
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  // Floor Functions
  const handleAddFloor = () => {
    const nextFloorNumber = formData.floors.reduce((max, f) => Math.max(max, f.floor_number ?? 0), -1) + 1;
    
    setFormData((prev) => ({
      ...prev,
      floors: [...prev.floors, createDefaultFloor(nextFloorNumber)],
    }));
  };

  const openEditFloor = (idx) => {
    setEditingFloorIdx(idx);
    const floor = formData.floors[idx];
    setFloorForm({
      floor_name: floor.floor_name,
      floor_number: String(floor.floor_number),
      gender_type: floor.gender_type,
    });
    setIsFloorModalOpen(true);
  };

  const saveFloorDetails = () => {
    setFormData((prev) => {
      const updatedFloors = prev.floors.map((floor, i) => {
        if (i !== editingFloorIdx) return floor;
        return {
          ...floor,
          floor_name: floorForm.floor_name,
          floor_number: floorForm.floor_number === "" ? "" : Number(floorForm.floor_number),
          gender_type: floorForm.gender_type,
        };
      });
      return { ...prev, floors: updatedFloors };
    });
    setIsFloorModalOpen(false);
    setEditingFloorIdx(null);
  };

  const handleDeleteFloor = (idx) => {
    if (!window.confirm("Remove floor and all its rooms?")) return;
    setFormData((prev) => ({
      ...prev,
      floors: prev.floors.filter((_, i) => i !== idx),
    }));
    if (selectedFloorIdx >= formData.floors.length - 1) {
      setSelectedFloorIdx(Math.max(0, formData.floors.length - 2));
    }
  };

  // Rooms Functions
  const handleSaveRoom = (roomData) => {
    setFormData((prev) => {
      const updatedFloors = prev.floors.map((floor, fIdx) => {
        if (fIdx !== selectedFloorIdx) return floor;

        let newRooms = [...floor.rooms];
        if (editingRoomIdx !== null) {
          const oldRoom = floor.rooms[editingRoomIdx];
          newRooms[editingRoomIdx] = {
            ...oldRoom,
            ...roomData,
            beds: adjustBedsForCapacity(oldRoom.beds || [], roomData.capacity),
          };
        } else {
          const defaultBeds = Array.from({ length: roomData.capacity }, (_, i) => ({
            bed_number: `Bed ${String.fromCharCode(65 + i)}`,
            bed_type: "single",
            rent_override: null,
            status: "vacant",
          }));
          newRooms.push({
            ...roomData,
            beds: defaultBeds,
          });
        }

        return { ...floor, rooms: newRooms };
      });
      return { ...prev, floors: updatedFloors };
    });
    setEditingRoomIdx(null);
  };

  const handleEditRoomClick = (idx) => {
    setEditingRoomIdx(idx);
    setIsRoomModalOpen(true);
  };

  const handleDeleteRoom = (idx) => {
    if (!window.confirm("Delete room?")) return;
    setFormData((prev) => {
      const updatedFloors = prev.floors.map((floor, fIdx) => {
        if (fIdx !== selectedFloorIdx) return floor;
        return {
          ...floor,
          rooms: floor.rooms.filter((_, rIdx) => rIdx !== idx),
        };
      });
      return { ...prev, floors: updatedFloors };
    });
  };

  // Beds Drawer triggers
  const handleBedClick = (roomIdx, bedIdx) => {
    setSelectedRoomIdx(roomIdx);
    setSelectedBedIdx(bedIdx);
    setIsBedDrawerOpen(true);
  };

  const selectedBedObject = useMemo(() => {
    if (selectedRoomIdx === null || selectedBedIdx === null) return null;
    return formData.floors[selectedFloorIdx]?.rooms[selectedRoomIdx]?.beds[selectedBedIdx] || null;
  }, [formData.floors, selectedFloorIdx, selectedRoomIdx, selectedBedIdx]);

  const handleSaveBed = (updatedBed) => {
    setFormData((prev) => {
      const updatedFloors = prev.floors.map((floor, fIdx) => {
        if (fIdx !== selectedFloorIdx) return floor;
        const updatedRooms = floor.rooms.map((room, rIdx) => {
          if (rIdx !== selectedRoomIdx) return room;
          const updatedBeds = room.beds.map((bed, bIdx) => {
            if (bIdx !== selectedBedIdx) return bed;
            return { ...bed, ...updatedBed };
          });
          return { ...room, beds: updatedBeds };
        });
        return { ...floor, rooms: updatedRooms };
      });
      return { ...prev, floors: updatedFloors };
    });
    setIsBedDrawerOpen(false);
    setSelectedRoomIdx(null);
    setSelectedBedIdx(null);
  };

  // Submit edits
  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const payload = normalizePayload(formData, id);
      const response = await fetch(INSTITUTION_EDIT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed updating details");
        return;
      }

      navigate("/institutions");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingInstitution) {
    return (
      <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
        <Sidebar />
        <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
          <Navbar />
          <main className="flex flex-1 items-center justify-center bg-slate-50 px-6">
            <div className="rounded-3xl border border-slate-100 bg-white px-8 py-6 text-sm font-black text-slate-500 shadow-sm">
              Loading PG configuration tree...
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex min-h-0 flex-1 flex-col bg-slate-50">
          <div className="w-full flex-1 px-6 pb-8 pt-7 md:px-8 lg:pt-8">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 text-left">
              
              {/* Heading */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 text-left">
                <button
                  type="button"
                  onClick={() => navigate("/institutions")}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-350 transition-all duration-200 shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">Edit PG Configuration</h1>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">Edit layouts, floor plans, room rates, and live bed statuses.</p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-[0_10px_30px_-15px_rgba(15,23,42,0.02)]">
                <StepHeader steps={steps} activeStep={activeStep} onStepClick={handleStepClick} />
              </div>

              <Error message={error} />

              {/* Step Forms */}
              <section className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.03)] min-h-[400px] relative overflow-hidden text-left">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-red-500 opacity-80" />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* STEP 1: Basic Info */}
                    {activeStep === 0 && (
                      <div className="flex flex-col gap-6">
                        <div>
                          <h2 className="text-lg font-black text-slate-800 tracking-tight">Basic PG Details</h2>
                          <p className="text-xs text-slate-400 font-semibold mt-1">Specify core profile identifiers, phone contacts, and assignment managers.</p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="grid gap-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-450">PG Brand Name</label>
                            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all duration-200">
                              <Building2 size={16} className="shrink-0" />
                              <input
                                type="text"
                                name="institution_name"
                                value={formData.institution_name}
                                onChange={handleBasicChange}
                                placeholder="e.g. Sunrise Coliving"
                                className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          <div className="grid gap-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-450">PG ID Code</label>
                            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all duration-200">
                              <Hash size={16} className="shrink-0" />
                              <input
                                type="text"
                                name="institution_code"
                                value={formData.institution_code}
                                onChange={handleBasicChange}
                                placeholder="e.g. SR01"
                                className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          <div className="grid gap-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-450">Category Type</label>
                            <select
                              name="institution_type"
                              value={formData.institution_type}
                              onChange={handleBasicChange}
                              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
                            >
                              {institutionTypeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid gap-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-450">Contact Phone</label>
                            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all duration-200">
                              <Phone size={16} className="shrink-0" />
                              <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleBasicChange}
                                placeholder="e.g. 9876543210"
                                className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid gap-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-450">Email Address</label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleBasicChange}
                              placeholder="e.g. contact@sunrise.com"
                              className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
                            />
                          </div>

                          <div className="grid gap-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-450">Brand Logo URL</label>
                            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all duration-200">
                              <Image size={16} className="shrink-0" />
                              <input
                                type="text"
                                name="logo"
                                value={formData.logo}
                                onChange={handleBasicChange}
                                placeholder="Asset URL (optional)"
                                className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-5">
                          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3.5">Location Address Details</h3>
                          <div className="grid gap-4 md:grid-cols-4">
                            <div className="md:col-span-2 grid gap-1.5">
                              <label className="text-xs font-black uppercase tracking-wider text-slate-450">Street Address</label>
                              <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleBasicChange}
                                placeholder="Street, locality..."
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <label className="text-xs font-black uppercase tracking-wider text-slate-450">City</label>
                              <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleBasicChange}
                                placeholder="Bengaluru"
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <label className="text-xs font-black uppercase tracking-wider text-slate-450">Pincode</label>
                              <input
                                type="text"
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleBasicChange}
                                placeholder="560001"
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-5">
                          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3.5">Manager Specifications</h3>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-1.5">
                              <label className="text-xs font-black uppercase tracking-wider text-slate-450">Manager Full Name</label>
                              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all duration-200">
                                <User size={16} className="shrink-0" />
                                <input
                                  type="text"
                                  name="manager_name"
                                  value={formData.manager_name}
                                  onChange={handleBasicChange}
                                  placeholder="Manager full name"
                                  className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                                />
                              </div>
                            </div>
                            <div className="grid gap-1.5">
                              <label className="text-xs font-black uppercase tracking-wider text-slate-450">Manager Contact No.</label>
                              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all duration-200">
                                <Phone size={16} className="shrink-0" />
                                <input
                                  type="text"
                                  name="manager_phone"
                                  value={formData.manager_phone}
                                  onChange={handleBasicChange}
                                  placeholder="Manager contact number"
                                  className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: Floors */}
                    {activeStep === 1 && (
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Floors Configuration</h2>
                            <p className="text-xs text-slate-400 font-semibold mt-1">Establish the levels for this PG. Tap floor cards to adjust identities.</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddFloor}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/60 px-3 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-colors shadow-sm"
                          >
                            <Plus size={14} />
                            <span>Add Level</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                          {formData.floors.map((floor, idx) => (
                            <FloorCard
                              key={idx}
                              floor={floor}
                              index={idx}
                              isSelected={false}
                              onEdit={() => openEditFloor(idx)}
                              onDelete={() => handleDeleteFloor(idx)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* STEP 3: Rooms */}
                    {activeStep === 2 && (
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Rooms Configuration</h2>
                            <p className="text-xs text-slate-400 font-semibold mt-1">Define room identifiers and sharing capacities per floor level.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoomIdx(null);
                              setIsRoomModalOpen(true);
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/60 px-3 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-colors shadow-sm"
                          >
                            <Plus size={14} />
                            <span>Add Room</span>
                          </button>
                        </div>

                        {/* Floor Selector Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
                          {formData.floors.map((floor, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedFloorIdx(idx)}
                              className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
                                selectedFloorIdx === idx
                                  ? "bg-slate-800 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {floor.floor_name || `Level ${idx}`}
                            </button>
                          ))}
                        </div>

                        {/* Rooms grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                          {(formData.floors[selectedFloorIdx]?.rooms || []).map((room, idx) => (
                            <RoomCard
                              key={idx}
                              room={room}
                              floorName={formData.floors[selectedFloorIdx]?.floor_name}
                              onEdit={() => handleEditRoomClick(idx)}
                              onDelete={() => handleDeleteRoom(idx)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* STEP 4: Beds */}
                    {activeStep === 3 && (
                      <div className="flex flex-col gap-6">
                        <div>
                          <h2 className="text-lg font-black text-slate-800 tracking-tight">Visual Bed Layouts</h2>
                          <p className="text-xs text-slate-400 font-semibold mt-1">Click on bed elements (seats) to edit specifics inline.</p>
                        </div>

                        {/* Floor Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
                          {formData.floors.map((floor, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedFloorIdx(idx)}
                              className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
                                selectedFloorIdx === idx
                                  ? "bg-slate-800 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {floor.floor_name || `Level ${idx}`}
                            </button>
                          ))}
                        </div>

                        {/* Beds Grid mapping */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {(formData.floors[selectedFloorIdx]?.rooms || []).map((room, rIdx) => (
                            <div
                              key={rIdx}
                              className="rounded-[32px] border border-slate-150 p-5 flex flex-col gap-4 bg-white text-left shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] relative overflow-hidden"
                            >
                              {/* Top accent line */}
                              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-400 opacity-60" />

                              <div className="flex items-center justify-between border-b border-slate-50 pb-2 mt-1">
                                <span className="text-sm font-black text-slate-800">Room {room.room_number}</span>
                                <span className="text-[9px] bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg text-slate-555 font-black uppercase tracking-wider">
                                  {room.room_type} Sharing
                                </span>
                              </div>

                              <BedLayout
                                beds={room.beds || []}
                                selectedBedIndex={null}
                                onBedClick={(bIdx) => handleBedClick(rIdx, bIdx)}
                              />

                              <div className="text-[10px] font-bold text-slate-400 mt-1 flex justify-between uppercase tracking-wider border-t border-slate-50 pt-3">
                                <span>Capacity: {room.capacity} Beds</span>
                                <span>Rent: ₹{room.rent_amount}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* STEP 5: Review & Update */}
                    {activeStep === 4 && (
                      <div className="flex flex-col gap-6">
                        <div>
                          <h2 className="text-lg font-black text-slate-800 tracking-tight">Review PG Setup</h2>
                          <p className="text-xs text-slate-400 font-semibold mt-1">Please review the setup structure before finalizing.</p>
                        </div>

                        {/* Quick Stats */}
                        <QuickStats stats={stats} />

                        <div className="grid gap-5 md:grid-cols-2 mt-2">
                          <div className="rounded-[24px] border border-slate-150 p-5 flex flex-col gap-4 text-left shadow-sm bg-white">
                            <div className="border-b border-slate-100 pb-2 flex items-center gap-2 text-slate-500">
                              <Building2 size={15} />
                              <h4 className="text-xs font-black uppercase tracking-wider">PG Profile Specs</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3.5 text-xs font-bold text-slate-650">
                              <div>
                                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">PG Name</p>
                                <p className="font-black text-slate-800 mt-1">{formData.institution_name}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Code / ID</p>
                                <p className="font-black text-slate-800 mt-1">{formData.institution_code || "-"}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">PG Category</p>
                                <p className="font-black text-slate-800 mt-1 uppercase tracking-wide">
                                  {formData.institution_type.replace("_", " ")}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Contact No</p>
                                <p className="font-black text-slate-800 mt-1">{formData.phone}</p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-slate-150 p-5 flex flex-col gap-4 text-left shadow-sm bg-white">
                            <div className="border-b border-slate-100 pb-2 flex items-center gap-2 text-slate-500">
                              <User size={15} />
                              <h4 className="text-xs font-black uppercase tracking-wider">Management & Manager</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3.5 text-xs font-bold text-slate-655">
                              <div>
                                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Manager Name</p>
                                <p className="font-black text-slate-800 mt-1">{formData.manager_name}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Manager Contact</p>
                                <p className="font-black text-slate-800 mt-1">{formData.manager_phone}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Onboard Address</p>
                                <p className="font-black text-slate-800 mt-1">
                                  {[formData.address, formData.city, formData.state, formData.pincode].filter(Boolean).join(", ") || "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </section>

              {/* Wizard navigation buttons */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={activeStep === 0}
                  className="px-4 h-10 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>

                {activeStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-4 h-10 rounded-xl bg-slate-800 hover:bg-slate-900 text-xs font-bold text-white shadow-sm transition-all inline-flex items-center gap-1.5"
                  >
                    <span>Next Setup</span>
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-5 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/35 transition-all inline-flex items-center gap-1.5"
                  >
                    <ShieldCheck size={14} />
                    <span>{loading ? "Updating PG..." : "Save Layout"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Action Modals */}
      
      {/* Floor Configure Modal */}
      <AnimatePresence>
        {isFloorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFloorModalOpen(false)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl relative text-left overflow-hidden z-10 border border-white/20"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-red-500" />

              <h3 className="text-lg font-black text-slate-800 mt-1.5">Configure Floor Details</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">Set identifier details and floor category.</p>

              <div className="mt-5 flex flex-col gap-4">
                <div className="grid gap-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Floor Name</label>
                  <input
                    type="text"
                    value={floorForm.floor_name}
                    onChange={(e) => setFloorForm({ ...floorForm, floor_name: e.target.value })}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Floor Level Number</label>
                  <input
                    type="number"
                    value={floorForm.floor_number}
                    onChange={(e) => setFloorForm({ ...floorForm, floor_number: e.target.value })}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Gender Identity</label>
                  <select
                    value={floorForm.gender_type}
                    onChange={(e) => setFloorForm({ ...floorForm, gender_type: e.target.value })}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-750 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all cursor-pointer"
                  >
                    <option value="boys">Boys Only</option>
                    <option value="girls">Girls Only</option>
                    <option value="mixed">Co-Living / Mixed</option>
                  </select>
                </div>

                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFloorModalOpen(false)}
                    className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveFloorDetails}
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                  >
                    Save Config
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Room Modal */}
      <RoomModal
        isOpen={isRoomModalOpen}
        initialRoom={editingRoomIdx !== null ? formData.floors[selectedFloorIdx]?.rooms[editingRoomIdx] : null}
        onClose={() => {
          setIsRoomModalOpen(false);
          setEditingRoomIdx(null);
        }}
        onSave={handleSaveRoom}
      />

      {/* Bed Edit Drawer */}
      <BedEditorDrawer
        isOpen={isBedDrawerOpen}
        bed={selectedBedObject}
        onClose={() => {
          setIsBedDrawerOpen(false);
          setSelectedRoomIdx(null);
          setSelectedBedIdx(null);
        }}
        onSave={handleSaveBed}
      />
    </div>
  );
};

export default EditInstitution;
