import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileBadge2,
  FileText,
  Landmark,
  Phone,
  ShieldCheck,
  User,
  Users,
  Wallet,
  Check,
  Upload,
  Sparkles,
  Bath,
  Warehouse,
  Home,
  BedDouble,
  CheckCircle2,
  DollarSign,
  Info,
} from "lucide-react";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import TenantShell from "./TenantShell";
import BedLayout from "../Institution/components/BedLayout";
import RoomCard from "../Institution/components/RoomCard";
import StepHeader from "../Institution/components/StepHeader";
import {
  INSTITUTION_LIST,
  INSTITUTION_VIEW,
  PG_ADMIN_MY_INSTITUTION,
  TENANT_CREATE,
  TENANT_VACANT_BEDS,
} from "../../Utils/Constants";
import {
  buildCreatePayload,
  buildCreateFormData,
  buildTenantStats,
  defaultTenantForm,
  formatCurrency,
  formatDisplayDate,
  getAuthHeaders,
  groupVacantBeds,
  tenantOnboardingSteps,
} from "./tenantHelpers";

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10";

const textareaClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10";

const sectionLabelClassName =
  "text-[10px] font-black uppercase tracking-wider text-slate-400 text-left block mb-1";

const formatLabel = (value) => {
  if (!value) {
    return "-";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const buildBillingPreview = (checkInDate, monthlyRent, billingCycleType) => {
  if (!checkInDate || !monthlyRent) {
    return null;
  }

  const checkIn = new Date(checkInDate);

  if (Number.isNaN(checkIn.getTime())) {
    return null;
  }

  if (billingCycleType === "calendar_month_prorated") {
    const lastDayOfMonth = new Date(checkIn.getFullYear(), checkIn.getMonth() + 1, 0);
    const totalDaysInMonth = lastDayOfMonth.getDate();
    const occupiedDays = totalDaysInMonth - checkIn.getDate() + 1;
    const proratedAmount = Math.round(((monthlyRent / totalDaysInMonth) * occupiedDays) * 100) / 100;
    const nextCycleDate = new Date(checkIn.getFullYear(), checkIn.getMonth() + 1, 1);

    return {
      amount: proratedAmount,
      currentPeriodLabel: `${formatDisplayDate(checkInDate)} to ${formatDisplayDate(lastDayOfMonth)}`,
      nextDueLabel: formatDisplayDate(nextCycleDate),
      cycleLabel: "Current month settlement",
      helperText: "Collect only the remaining days for this month. Full monthly rent starts from the 1st of next month.",
    };
  }

  const nextCycleDate = new Date(checkIn);
  nextCycleDate.setMonth(nextCycleDate.getMonth() + 1);

  return {
    amount: Number(monthlyRent),
    currentPeriodLabel: `${formatDisplayDate(checkInDate)} to ${formatDisplayDate(new Date(nextCycleDate.getTime() - 24 * 60 * 60 * 1000))}`,
    nextDueLabel: formatDisplayDate(nextCycleDate),
    cycleLabel: "Same date every month",
    helperText: "Collect one full monthly rent now. The next due will be on the same date next month.",
  };
};

const TenantOnboarding = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [vacantHierarchy, setVacantHierarchy] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [formData, setFormData] = useState(defaultTenantForm);

  // Drag-and-drop state
  const [dragActives, setDragActives] = useState({});

  useEffect(() => {
    const fetchSetupData = async () => {
      setLoading(true);
      setError("");

      try {
        const [institutionsResponse, vacantBedsResponse] = await Promise.all([
          fetch(isPgAdmin ? PG_ADMIN_MY_INSTITUTION : INSTITUTION_LIST, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({}),
          }),
          fetch(TENANT_VACANT_BEDS, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({}),
          }),
        ]);

        const institutionsData = await institutionsResponse.json();
        const vacantBedsData = await vacantBedsResponse.json();

        if (!institutionsResponse.ok) {
          throw new Error(institutionsData.message || "Institution fetch failed");
        }

        if (!vacantBedsResponse.ok) {
          throw new Error(vacantBedsData.message || "Vacant beds fetch failed");
        }

        const institutionList = institutionsData.institutions || [];
        const hierarchy = groupVacantBeds(vacantBedsData.beds || [], institutionList);

        setInstitutions(institutionList);
        setVacantHierarchy(hierarchy);

        if (institutionList.length === 1) {
          setFormData((currentState) => ({
            ...currentState,
            institution_id: String(institutionList[0].id),
          }));
        }
      } catch (apiError) {
        setError(apiError.message || "Unable to load tenant onboarding data");
      } finally {
        setLoading(false);
      }
    };

    fetchSetupData();
  }, [isPgAdmin]);

  const [selectedInstitutionHierarchy, setSelectedInstitutionHierarchy] = useState(null);

  useEffect(() => {
    if (!formData.institution_id) {
      setSelectedInstitutionHierarchy(null);
      return;
    }

    const fetchHierarchy = async () => {
      try {
        const response = await fetch(INSTITUTION_VIEW, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ id: Number(formData.institution_id) }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setSelectedInstitutionHierarchy(data.institution);
        }
      } catch (err) {
        console.error("Failed to load institution hierarchy", err);
      }
    };

    fetchHierarchy();
  }, [formData.institution_id]);

  const selectedInstitutionFromVacant = useMemo(() => {
    return vacantHierarchy.find((institution) => {
      return Number(institution.id) === Number(formData.institution_id);
    }) || null;
  }, [formData.institution_id, vacantHierarchy]);

  const selectedInstitution = selectedInstitutionHierarchy || selectedInstitutionFromVacant;

  const selectedFloor = useMemo(() => {
    return selectedInstitution?.floors.find((floor) => {
      return Number(floor.id) === Number(formData.admission.floor_id || selectedFloorId);
    }) || null;
  }, [formData.admission.floor_id, selectedFloorId, selectedInstitution]);

  const selectedRoom = useMemo(() => {
    return selectedFloor?.rooms.find((room) => {
      return Number(room.id) === Number(formData.admission.room_id || selectedRoomId);
    }) || null;
  }, [formData.admission.room_id, selectedFloor, selectedRoomId]);

  const selectedBed = useMemo(() => {
    return selectedRoom?.beds.find((bed) => {
      return Number(bed.id) === Number(formData.admission.bed_id);
    }) || null;
  }, [formData.admission.bed_id, selectedRoom]);

  const stats = useMemo(() => {
    return buildTenantStats(selectedInstitution);
  }, [selectedInstitution]);

  const billingPreview = useMemo(() => {
    return buildBillingPreview(
      formData.admission.check_in_date,
      Number(formData.payment.agreed_monthly_rent || 0),
      formData.payment.billing_cycle_type
    );
  }, [
    formData.admission.check_in_date,
    formData.payment.agreed_monthly_rent,
    formData.payment.billing_cycle_type,
  ]);

  useEffect(() => {
    if (!selectedInstitution) {
      setSelectedFloorId(null);
      setSelectedRoomId(null);
      return;
    }

    if (
      formData.admission.floor_id &&
      selectedInstitution.floors.some((floor) => Number(floor.id) === Number(formData.admission.floor_id))
    ) {
      setSelectedFloorId(Number(formData.admission.floor_id));
      return;
    }

    const firstFloor = selectedInstitution.floors[0];
    if (!firstFloor) {
      setSelectedFloorId(null);
      return;
    }

    setSelectedFloorId(firstFloor.id);
    setFormData((currentState) => ({
      ...currentState,
      admission: {
        ...currentState.admission,
        floor_id: String(firstFloor.id),
        room_id: "",
        bed_id: "",
      },
    }));
  }, [selectedInstitution]);

  useEffect(() => {
    if (!selectedFloor) {
      setSelectedRoomId(null);
      return;
    }

    if (
      formData.admission.room_id &&
      selectedFloor.rooms.some((room) => Number(room.id) === Number(formData.admission.room_id))
    ) {
      setSelectedRoomId(Number(formData.admission.room_id));
      return;
    }

    const firstRoom = selectedFloor.rooms[0];
    if (!firstRoom) {
      setSelectedRoomId(null);
      return;
    }

    setSelectedRoomId(firstRoom.id);
  }, [formData.admission.room_id, selectedFloor]);

  const setNestedField = (section, name, value) => {
    setFormData((currentState) => ({
      ...currentState,
      [section]: {
        ...currentState[section],
        [name]: value,
      },
    }));
  };

  const handleDocumentChange = (index, name, value) => {
    setFormData((currentState) => ({
      ...currentState,
      documents: currentState.documents.map((document, documentIndex) => {
        if (documentIndex !== index) {
          return document;
        }

        return {
          ...document,
          [name]: value,
        };
      }),
    }));
  };

  const handleDocumentFileChange = (index, file) => {
    setFormData((currentState) => ({
      ...currentState,
      documents: currentState.documents.map((document, documentIndex) => {
        if (documentIndex !== index) {
          return document;
        }

        return {
          ...document,
          file,
        };
      }),
    }));
  };

  const handleInstitutionChange = (value) => {
    const nextInstitution = vacantHierarchy.find((institution) => {
      return Number(institution.id) === Number(value);
    });
    const firstFloor = nextInstitution?.floors?.[0] || null;
    const firstRoom = firstFloor?.rooms?.[0] || null;

    setSelectedFloorId(firstFloor?.id || null);
    setSelectedRoomId(firstRoom?.id || null);
    setFormData((currentState) => ({
      ...currentState,
      institution_id: value,
      admission: {
        ...currentState.admission,
        floor_id: firstFloor ? String(firstFloor.id) : "",
        room_id: firstRoom ? String(firstRoom.id) : "",
        bed_id: "",
      },
    }));
  };

  const handleFloorSelect = (floor) => {
    const firstRoom = floor?.rooms?.[0] || null;

    setSelectedFloorId(floor.id);
    setSelectedRoomId(firstRoom?.id || null);
    setFormData((currentState) => ({
      ...currentState,
      admission: {
        ...currentState.admission,
        floor_id: String(floor.id),
        room_id: firstRoom ? String(firstRoom.id) : "",
        bed_id: "",
      },
    }));
  };

  const handleRoomSelect = (room) => {
    setSelectedRoomId(room.id);
    setFormData((currentState) => ({
      ...currentState,
      admission: {
        ...currentState.admission,
        floor_id: String(selectedFloor?.id || ""),
        room_id: String(room.id),
        bed_id: "",
      },
    }));
  };

  const handleBedSelect = (room, bed) => {
    if (String(bed.status || "").toLowerCase() !== "vacant") {
      return;
    }
    setSelectedRoomId(room.id);
    setFormData((currentState) => ({
      ...currentState,
      admission: {
        ...currentState.admission,
        floor_id: String(selectedFloor?.id || ""),
        room_id: String(room.id),
        bed_id: String(bed.id),
      },
    }));
  };

  // Drag and Drop Helpers
  const handleDrag = (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActives((prev) => ({ ...prev, [key]: true }));
    } else if (e.type === "dragleave") {
      setDragActives((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleDrop = (e, key, callback) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActives((prev) => ({ ...prev, [key]: false }));
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      callback(e.dataTransfer.files[0]);
    }
  };

  const getFilePreview = (file) => {
    if (!file) return null;
    try {
      return URL.createObjectURL(file);
    } catch (err) {
      return null;
    }
  };

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      if (!formData.institution_id) return "Please choose a PG building first";
    }
    if (stepIndex === 1) {
      if (!formData.admission.floor_id) return "Please select a floor level";
    }
    if (stepIndex === 2) {
      if (!formData.admission.room_id) return "Please select a room";
    }
    if (stepIndex === 3) {
      if (!formData.admission.bed_id) return "Please allocate a specific bed space";
      if (!formData.admission.check_in_date) return "Check-in date is required";
    }
    if (stepIndex === 4) {
      if (!formData.basic_details.full_name.trim()) return "Resident name is required";
      if (!formData.basic_details.phone.trim()) return "Resident phone is required";
    }
    if (stepIndex === 5) {
      if (!formData.guardian_details.guardian_name.trim()) return "Emergency guardian name is required";
      if (!formData.guardian_details.guardian_phone.trim()) return "Emergency guardian phone is required";
    }
    if (stepIndex === 7) {
      if (formData.deposit_paid && !formData.security_deposit) {
        return "Add security deposit rate before entering deposit paid value";
      }
    }
    return "";
  };

  const handleStepClick = (stepIndex) => {
    if (stepIndex < activeStep) {
      setActiveStep(stepIndex);
      setError("");
      return;
    }

    for (let index = activeStep; index < stepIndex; index += 1) {
      const stepError = validateStep(index);
      if (stepError) {
        setError(stepError);
        return;
      }
    }

    setError("");
    setActiveStep(stepIndex);
  };

  const handleNext = () => {
    const validationError = validateStep(activeStep);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setActiveStep((currentStep) => Math.min(currentStep + 1, tenantOnboardingSteps.length - 1));
  };

  const handlePrevious = () => {
    setError("");
    setActiveStep((currentStep) => Math.max(currentStep - 1, 0));
  };

  const handleSubmit = async () => {
    const validationError = validateStep(0) || validateStep(1) || validateStep(2) || validateStep(3) || validateStep(4) || validateStep(5);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(TENANT_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: buildCreateFormData(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Tenant onboarding failed");
      }

      navigate("/tenant/active");
    } catch (apiError) {
      setError(apiError.message || "Tenant onboarding failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1: Choose PG
  const renderChoosePg = () => {
    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Building2 className="text-orange-500" size={20} />
            Choose PG Building
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-450">
            Select the PG facility where the new tenant will be admitted.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {institutions.map((inst) => {
            const isSelected = Number(formData.institution_id) === Number(inst.id);
            return (
              <motion.div
                key={inst.id}
                whileHover={{ y: -4, shadow: "0 20px 40px -15px rgba(255, 107, 0, 0.06)" }}
                onClick={() => handleInstitutionChange(String(inst.id))}
                className={`cursor-pointer rounded-[32px] border p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-[130px] ${
                  isSelected
                    ? "border-orange-500 bg-orange-50/10 ring-1 ring-orange-500/30 shadow-md shadow-orange-500/5"
                    : "border-slate-150 bg-white hover:border-slate-250 shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)]"
                }`}
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-red-500" />
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-xl border shrink-0 ${
                    isSelected ? "bg-orange-500 text-white border-orange-600 shadow-sm" : "bg-orange-50 text-orange-500 border-orange-100"
                  }`}>
                    <Building2 size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-850 leading-tight">{inst.institution_name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{inst.institution_code || "No Code"}</p>
                  </div>
                </div>

                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center border-t border-slate-50 pt-2.5 mt-2">
                  <span>Selected PG</span>
                  <span className={isSelected ? "text-orange-600" : ""}>{isSelected ? "✓ Active" : "Click to select"}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // Step 2: Floor Selection
  const renderFloorSelection = () => {
    if (!selectedInstitution) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/30 p-12 text-center text-slate-400 font-bold">
          <Building2 size={32} className="mx-auto opacity-30 mb-2" />
          <p className="text-xs">Choose a PG facility in step 1 to configure floor levels.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Warehouse className="text-orange-500" size={20} />
            Visual Floor Level Selection
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Select a floor level. The counts display active inventory layouts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {selectedInstitution.floors.map((floor) => {
            const isSelected = Number(formData.admission.floor_id) === Number(floor.id);
            return (
              <motion.div
                key={floor.id}
                whileHover={{ y: -4, shadow: "0 20px 40px -15px rgba(255, 107, 0, 0.06)" }}
                onClick={() => handleFloorSelect(floor)}
                className={`cursor-pointer rounded-[32px] border p-6 transition-all duration-300 flex flex-col justify-between h-[130px] relative overflow-hidden ${
                  isSelected
                    ? "border-orange-500 bg-orange-50/10 ring-1 ring-orange-500/30 shadow-md shadow-orange-500/5"
                    : "border-slate-150 bg-white hover:border-slate-250 shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)]"
                }`}
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-450 to-red-400" />
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-xl border shrink-0 ${
                    isSelected ? "bg-orange-500 text-white border-orange-600 shadow-sm" : "bg-orange-50 text-orange-500 border-orange-100"
                  }`}>
                    <Warehouse size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-850 leading-tight">{floor.floor_name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Level {floor.floor_number} • {formatLabel(floor.gender_type)}</p>
                  </div>
                </div>

                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center border-t border-slate-50 pt-2.5 mt-2">
                  <span>Rooms: {floor.rooms.length}</span>
                  <span className={isSelected ? "text-orange-600" : ""}>{isSelected ? "✓ Active" : "Click to select"}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // Step 3: Room Selection
  const renderRoomSelection = () => {
    if (!selectedFloor) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/30 p-12 text-center text-slate-400 font-bold">
          <Warehouse size={32} className="mx-auto opacity-30 mb-2" />
          <p className="text-xs">Select a floor level in step 2 to display rooms list.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Home className="text-orange-500" size={20} />
            Visual Room Selection
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Choose a target room. Room maps show active bed slots and configurations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {selectedFloor.rooms.map((room) => {
            const isSelected = Number(formData.admission.room_id) === Number(room.id);
            return (
              <div
                key={room.id}
                onClick={() => handleRoomSelect(room)}
                className="cursor-pointer"
              >
                <RoomCard
                  room={room}
                  floorName={selectedFloor.floor_name}
                  isSelected={isSelected}
                  onClick={() => {}}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Step 4: Bed Selection
  const renderBedSelection = () => {
    if (!selectedRoom) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/30 p-12 text-center text-slate-400 font-bold">
          <Home size={32} className="mx-auto opacity-30 mb-2" />
          <p className="text-xs">Select a room in step 3 to view bed selection layout.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BedDouble className="text-orange-500" size={20} />
            Visual Bed Allocation
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Select one vacant bed slot inside Room {selectedRoom.room_number}. Verify dates.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
          {/* Bed Map Card */}
          <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-50">
              <div>
                <h4 className="text-sm font-black text-slate-850">Room Blueprint Map</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Click the bed space to lock reservation</p>
              </div>

              {formData.admission.bed_id && (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                  <Check size={12} className="stroke-[3]" />
                  Locked: {selectedBed?.bed_number}
                </span>
              )}
            </div>

            <BedLayout
              beds={selectedRoom.beds}
              selectedBedIndex={selectedRoom.beds.findIndex((bed) => {
                return Number(bed.id) === Number(formData.admission.bed_id);
              })}
              onBedClick={(bedIdx) => handleBedSelect(selectedRoom, selectedRoom.beds[bedIdx])}
            />

            {/* Bed color legend */}
            <div className="flex flex-wrap gap-3.5 text-[9px] font-black uppercase tracking-wider text-slate-500 border-t border-slate-50 pt-4 mt-2">
              <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                <span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Vacant
              </span>
              <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                <span className="h-2.5 w-2.5 rounded bg-rose-500" /> Occupied
              </span>
              <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                <span className="h-2.5 w-2.5 rounded bg-amber-505" /> Reserved
              </span>
              <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                <span className="h-2.5 w-2.5 rounded bg-slate-400" /> Maintenance
              </span>
            </div>
          </div>

          {/* Allocation Dates Panel */}
          <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-850">Stay Allocation Settings</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Determine check-in and exit dates</p>
            </div>

            <div className="grid gap-4 mt-2">
              <div className="grid gap-1">
                <label className={sectionLabelClassName}>Check In Date</label>
                <input
                  type="date"
                  value={formData.admission.check_in_date}
                  onChange={(event) => setNestedField("admission", "check_in_date", event.target.value)}
                  className={inputClassName}
                />
              </div>

              <div className="grid gap-1">
                <label className={sectionLabelClassName}>Expected Checkout Date</label>
                <input
                  type="date"
                  value={formData.admission.expected_checkout_date}
                  onChange={(event) =>
                    setNestedField("admission", "expected_checkout_date", event.target.value)
                  }
                  className={inputClassName}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 5: Basic Details
  const renderBasicDetails = () => {
    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-850 tracking-tight flex items-center gap-2">
            <User className="text-orange-500" size={20} />
            Basic Particulars
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Capture tenant identity, contact details, profile photo, and permanent address.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
          {/* Main Info Forms */}
          <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ["full_name", "Full Name"],
              ["phone", "Phone Number"],
              ["email", "Email Address"],
              ["occupation", "Occupation"],
              ["company_name", "Company / College"],
              ["city", "City"],
              ["state", "State"],
              ["pincode", "Pincode"],
            ].map(([name, label]) => (
              <div key={name} className="grid gap-1">
                <label className={sectionLabelClassName}>{label}</label>
                <input
                  type="text"
                  value={formData.basic_details[name]}
                  onChange={(event) => setNestedField("basic_details", name, event.target.value)}
                  className={inputClassName}
                />
              </div>
            ))}

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Gender</label>
              <select
                value={formData.basic_details.gender}
                onChange={(event) => setNestedField("basic_details", "gender", event.target.value)}
                className={inputClassName}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Date Of Birth</label>
              <input
                type="date"
                value={formData.basic_details.date_of_birth}
                onChange={(event) =>
                  setNestedField("basic_details", "date_of_birth", event.target.value)
                }
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1 sm:col-span-2">
              <label className={sectionLabelClassName}>Permanent Address</label>
              <textarea
                value={formData.basic_details.address}
                onChange={(event) => setNestedField("basic_details", "address", event.target.value)}
                rows={3}
                className={textareaClassName}
              />
            </div>
          </div>

          {/* Profile Photo Upload card */}
          <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-850">Profile Photo</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Upload a clear passport image file</p>
            </div>

            <div
              onDragEnter={(e) => handleDrag(e, "profile")}
              onDragOver={(e) => handleDrag(e, "profile")}
              onDragLeave={(e) => handleDrag(e, "profile")}
              onDrop={(e) => handleDrop(e, "profile", (file) => setFormData(c => ({ ...c, profile_photo_file: file })))}
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] cursor-pointer ${
                dragActives["profile"]
                  ? "border-orange-500 bg-orange-50/10"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData(c => ({ ...c, profile_photo_file: e.target.files?.[0] || null }))}
                className="hidden"
                id="profilePhotoInput"
              />

              {formData.profile_photo_file ? (
                <div className="flex flex-col items-center gap-2">
                  {getFilePreview(formData.profile_photo_file) && (
                    <img
                      src={getFilePreview(formData.profile_photo_file)}
                      alt="Preview"
                      className="h-20 w-20 rounded-xl object-cover shadow-sm border border-slate-150"
                    />
                  )}
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">{formData.profile_photo_file.name}</span>
                  <label htmlFor="profilePhotoInput" className="text-[10px] font-black uppercase tracking-wider text-orange-500 hover:text-orange-600 cursor-pointer">Change Image</label>
                </div>
              ) : (
                <label htmlFor="profilePhotoInput" className="flex flex-col items-center gap-2.5 cursor-pointer w-full">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-500 shrink-0">
                    <Upload size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-black text-slate-800">Drag & Drop or Click</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">JPEG, PNG up to 2MB</p>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 6: Guardian Details
  const renderGuardianDetails = () => {
    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-850 tracking-tight flex items-center gap-2">
            <Users className="text-orange-500" size={20} />
            Guardian & Emergency Contacts
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Record emergency contact details and relationships for operational outreach.
          </p>
        </div>

        <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
          {[
            ["guardian_name", "Primary Guardian Name"],
            ["guardian_phone", "Guardian Phone Number"],
            ["guardian_relation", "Guardian Relationship"],
            ["emergency_contact_name", "Emergency Contact Name"],
            ["emergency_contact_phone", "Emergency Contact Phone Number"],
          ].map(([name, label]) => (
            <div key={name} className="grid gap-1">
              <label className={sectionLabelClassName}>{label}</label>
              <input
                type="text"
                value={formData.guardian_details[name]}
                onChange={(event) => setNestedField("guardian_details", name, event.target.value)}
                className={inputClassName}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Step 7: Documents Upload
  const renderDocumentsUpload = () => {
    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-850 tracking-tight flex items-center gap-2">
            <FileText className="text-orange-500" size={20} />
            Document Verification Cards
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Onboard Aadhaar and PAN documents. Drag and drop file uploads to store proof.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formData.documents.map((doc, idx) => {
            const dragKey = `doc-${idx}`;
            return (
              <div
                key={doc.document_type}
                className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-4"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-orange-500 shrink-0">
                    <FileText size={15} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{doc.document_name} Details</h3>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>{doc.document_name} Number</label>
                    <input
                      type="text"
                      value={doc.document_number}
                      onChange={(e) => handleDocumentChange(idx, "document_number", e.target.value)}
                      placeholder={`Enter ${doc.document_name} number`}
                      className={inputClassName}
                    />
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Attach Document File</label>
                    <div
                      onDragEnter={(e) => handleDrag(e, dragKey)}
                      onDragOver={(e) => handleDrag(e, dragKey)}
                      onDragLeave={(e) => handleDrag(e, dragKey)}
                      onDrop={(e) => handleDrop(e, dragKey, (file) => handleDocumentFileChange(idx, file))}
                      className={`rounded-2xl border-2 border-dashed p-5 text-center transition-all flex flex-col items-center justify-center gap-2 min-h-[130px] cursor-pointer ${
                        dragActives[dragKey]
                          ? "border-orange-500 bg-orange-50/10"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleDocumentFileChange(idx, e.target.files?.[0] || null)}
                        className="hidden"
                        id={`fileInput-${idx}`}
                      />

                      {doc.file ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <CheckCircle2 size={24} className="text-emerald-500" />
                          <span className="text-xs font-bold text-slate-800 truncate max-w-[190px]">{doc.file.name}</span>
                          <label htmlFor={`fileInput-${idx}`} className="text-[9px] font-black uppercase tracking-wider text-orange-500 cursor-pointer mt-1">Change File</label>
                        </div>
                      ) : (
                        <label htmlFor={`fileInput-${idx}`} className="flex flex-col items-center gap-2 cursor-pointer w-full">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-orange-500 shrink-0">
                            <Upload size={14} />
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-850">Drag & Drop or Click</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Images or PDF up to 4MB</p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Step 8: Payment Upload
  const renderPaymentUpload = () => {
    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-850 tracking-tight flex items-center gap-2">
            <Landmark className="text-orange-500" size={20} />
            Payment & Deposit Setups
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Log admission collections, security deposit details, check-in states, and attach transaction screenshot bills.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
          {/* Form particulars */}
          <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Bed ID</label>
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                {selectedBed?.bed_number || "Select bed first"}
              </div>
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Total Rent For Month</label>
              <input
                type="number"
                value={formData.payment.agreed_monthly_rent}
                onChange={(event) => setNestedField("payment", "agreed_monthly_rent", event.target.value)}
                className={inputClassName}
                placeholder="Enter monthly rent manually"
              />
            </div>

            <div className="grid gap-1 sm:col-span-2">
              <label className={sectionLabelClassName}>Rent Billing Cycle</label>
              <select
                value={formData.payment.billing_cycle_type}
                onChange={(event) => setNestedField("payment", "billing_cycle_type", event.target.value)}
                className={inputClassName}
              >
                <option value="anniversary">Same date every month</option>
                <option value="calendar_month_prorated">Current month prorated, then 1st to month end</option>
              </select>
            </div>

            {billingPreview ? (
              <div className="sm:col-span-2 rounded-2xl border border-orange-100 bg-orange-50/70 p-4 text-left">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                      {billingPreview.cycleLabel}
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-800">
                      Suggested first collection: {formatCurrency(billingPreview.amount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      Current stay period: {billingPreview.currentPeriodLabel}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      Next due date: {billingPreview.nextDueLabel}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {billingPreview.helperText} This is only a calculation preview based on the monthly rent you entered.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNestedField("payment", "amount", String(billingPreview.amount))}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-orange-200 bg-white px-4 text-[11px] font-black uppercase tracking-wider text-orange-600 shadow-sm transition hover:border-orange-300"
                  >
                    Use Suggested Amount
                  </button>
                </div>
              </div>
            ) : (
              <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs font-semibold text-slate-500">
                Enter the tenant's agreed monthly rent first. The first-cycle collection suggestion will be calculated from that amount only.
              </div>
            )}

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Collected Amount</label>
              <input
                type="number"
                value={formData.payment.amount}
                onChange={(event) => setNestedField("payment", "amount", event.target.value)}
                className={inputClassName}
                placeholder="Enter collected amount manually"
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Transaction Reference</label>
              <input
                type="text"
                value={formData.payment.reference_number}
                onChange={(event) => setNestedField("payment", "reference_number", event.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Payment Type</label>
              <select
                value={formData.payment.payment_type}
                onChange={(event) => setNestedField("payment", "payment_type", event.target.value)}
                className={inputClassName}
              >
                <option value="admission">Admission Fee</option>
                <option value="rent">Rent</option>
                <option value="deposit">Security Deposit</option>
              </select>
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Payment Mode</label>
              <select
                value={formData.payment.payment_mode}
                onChange={(event) => setNestedField("payment", "payment_mode", event.target.value)}
                className={inputClassName}
              >
                <option value="upi">UPI / Scanner</option>
                <option value="cash">Cash Collection</option>
                <option value="bank_transfer">Net Banking</option>
                <option value="card">Credit/Debit Card</option>
              </select>
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Payment Date</label>
              <input
                type="date"
                value={formData.payment.payment_date}
                onChange={(event) => setNestedField("payment", "payment_date", event.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Collection State</label>
              <select
                value={formData.payment.status}
                onChange={(event) => setNestedField("payment", "status", event.target.value)}
                className={inputClassName}
              >
                <option value="completed">Received / Success</option>
                <option value="pending">Pending Settlement</option>
              </select>
            </div>

            {/* Deposit configurations */}
            <div className="grid gap-1 border-t border-slate-100 pt-3 mt-1 sm:col-span-2">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Deposits Configuration</h4>
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Security Deposit Rate</label>
              <input
                type="number"
                value={formData.security_deposit}
                onChange={(event) => setFormData(c => ({ ...c, security_deposit: event.target.value }))}
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Deposit Paid Amount</label>
              <input
                type="number"
                value={formData.deposit_paid}
                onChange={(event) => setFormData(c => ({ ...c, deposit_paid: event.target.value }))}
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Refundable Deposit Portion</label>
              <input
                type="number"
                value={formData.refundable_amount}
                onChange={(event) => setFormData(c => ({ ...c, refundable_amount: event.target.value }))}
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Refund Status</label>
              <select
                value={formData.deposit_refund_status}
                onChange={(event) => setFormData(c => ({ ...c, deposit_refund_status: event.target.value }))}
                className={inputClassName}
              >
                <option value="pending">Pending Clearance</option>
                <option value="partially_refunded">Partially Refunded</option>
                <option value="refunded">Cleared Refund</option>
                <option value="forfeited">Forfeited / Adjusted</option>
              </select>
            </div>

            <div className="grid gap-1 sm:col-span-2">
              <label className={sectionLabelClassName}>Operations Remarks / Notes</label>
              <textarea
                value={formData.notes}
                onChange={(event) => setFormData(c => ({ ...c, notes: event.target.value }))}
                rows={2}
                className={textareaClassName}
                placeholder="Access restrictions, instructions, etc."
              />
            </div>
          </div>

          {/* Payment receipt drag-drop proof */}
          <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-850">Transaction Proof Screenshot</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Upload receipt photo or bank slip</p>
            </div>

            <div
              onDragEnter={(e) => handleDrag(e, "proof")}
              onDragOver={(e) => handleDrag(e, "proof")}
              onDragLeave={(e) => handleDrag(e, "proof")}
              onDrop={(e) => handleDrop(e, "proof", (file) => setFormData(c => ({
                ...c,
                payment: { ...c.payment, payment_proof_file: file }
              })))}
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] cursor-pointer ${
                dragActives["proof"]
                  ? "border-orange-500 bg-orange-50/10"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData(c => ({
                  ...c,
                  payment: { ...c.payment, payment_proof_file: e.target.files?.[0] || null }
                }))}
                className="hidden"
                id="paymentProofInput"
              />

              {formData.payment.payment_proof_file ? (
                <div className="flex flex-col items-center gap-2">
                  {getFilePreview(formData.payment.payment_proof_file) && (
                    <img
                      src={getFilePreview(formData.payment.payment_proof_file)}
                      alt="Receipt Preview"
                      className="h-20 w-20 rounded-xl object-cover shadow-sm border border-slate-150"
                    />
                  )}
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">{formData.payment.payment_proof_file.name}</span>
                  <label htmlFor="paymentProofInput" className="text-[10px] font-black uppercase tracking-wider text-orange-500 hover:text-orange-600 cursor-pointer">Change Image</label>
                </div>
              ) : (
                <label htmlFor="paymentProofInput" className="flex flex-col items-center gap-2.5 cursor-pointer w-full">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-500 shrink-0">
                    <Upload size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-black text-slate-800">Drag & Drop or Click</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Receipt photo up to 3MB</p>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 9: Review & Confirm
  const renderReviewStep = () => {
    const instName = selectedInstitution?.institution_name || "-";
    const flName = selectedFloor?.floor_name || "-";
    const rmName = selectedRoom?.room_number || "-";
    const bdName = selectedBed?.bed_number || "-";

    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-orange-500" size={20} />
            Review Admissions Setup
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Double check coordinates, personal particulars, emergency contacts, and deposits before submitting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stay Allocation */}
          <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-50">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-orange-500 shrink-0">
                <Building2 size={15} />
              </span>
              <h3 className="text-sm font-black text-slate-850">Stay Allocation</h3>
            </div>

            <div className="grid gap-3 text-sm font-semibold text-slate-600">
              <p><span className="font-black text-slate-800">PG Building:</span> {instName}</p>
              <p><span className="font-black text-slate-800">Floor Level:</span> {flName}</p>
              <p><span className="font-black text-slate-800">Room Number:</span> Room {rmName}</p>
              <p><span className="font-black text-slate-800">Allocated Bed:</span> {bdName} ({selectedRoom?.room_type || "-"} Share)</p>
              <p><span className="font-black text-slate-800">Check In Date:</span> {formatDisplayDate(formData.admission.check_in_date)}</p>
              <p><span className="font-black text-slate-800">Stay Duration:</span> {formData.admission.expected_checkout_date ? `Till ${formatDisplayDate(formData.admission.expected_checkout_date)}` : "Open Stay"}</p>
            </div>
          </div>

          {/* Tenant details */}
          <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-50">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-orange-500 shrink-0">
                <User size={15} />
              </span>
              <h3 className="text-sm font-black text-slate-850">Resident Snapshot</h3>
            </div>

            <div className="grid gap-3 text-sm font-semibold text-slate-600">
              <p><span className="font-black text-slate-800">Full Name:</span> {formData.basic_details.full_name || "-"}</p>
              <p><span className="font-black text-slate-800">Phone Code:</span> {formData.basic_details.phone || "-"}</p>
              <p><span className="font-black text-slate-800">Category:</span> {formData.basic_details.occupation || "-"} ({formData.basic_details.company_name || "-"})</p>
              <p><span className="font-black text-slate-800">Guardian:</span> {formData.guardian_details.guardian_name || "-"}</p>
              <p><span className="font-black text-slate-800">Admitted Status:</span> {formData.status || "Pending Verification"}</p>
              <p><span className="font-black text-slate-800">Security Deposit:</span> {formData.security_deposit ? formatCurrency(formData.security_deposit) : "Not added"}</p>
              <p><span className="font-black text-slate-800">Total Rent For Month:</span> {formData.payment.agreed_monthly_rent ? formatCurrency(formData.payment.agreed_monthly_rent) : "Not added"}</p>
              <p><span className="font-black text-slate-800">Paid Amount:</span> {formData.payment.amount ? formatCurrency(formData.payment.amount) : "Not added"}</p>
              <p><span className="font-black text-slate-800">Billing Cycle:</span> {formData.payment.billing_cycle_type === "calendar_month_prorated" ? "Current month prorated, then 1st to month end" : "Same date every month"}</p>
            </div>
          </div>

          {/* Bed Seat map */}
          {selectedBed && (
            <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-4 md:col-span-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-orange-500 shrink-0">
                  <BedDouble size={15} />
                </span>
                <h3 className="text-sm font-black text-slate-850 font-black">Stay Slot Preview</h3>
              </div>

              <div className="max-w-sm mx-auto w-full">
                <BedLayout beds={[selectedBed]} selectedBedIndex={0} onBedClick={() => {}} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Navigation Bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => navigate("/tenant/active")}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-350 hover:text-slate-800"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-left">
            <h1 className="text-xl font-black text-slate-850 tracking-tight leading-none flex items-center gap-2">
              Resident Onboarding Wizard
              <span className="bg-orange-50 text-orange-500 border border-orange-100 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                9 Steps
              </span>
            </h1>
            <p className="mt-1.5 text-xs font-semibold text-slate-400">
              Guided allocations flow mapping building level inventory and resident records.
            </p>
          </div>
        </div>

        {/* Dynamic step headers */}
        <div className="rounded-[32px] border border-slate-150 bg-white p-5 shadow-sm">
          <StepHeader
            steps={tenantOnboardingSteps}
            activeStep={activeStep}
            onStepClick={handleStepClick}
          />
        </div>

        <Error message={error} />

        {loading ? (
          <div className="rounded-[32px] border border-slate-100 bg-white p-16 shadow-sm">
            <PageLoader />
          </div>
        ) : (
          <>
            <section className="relative min-h-[360px] overflow-hidden rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm md:p-8">
              {/* Top Accent line bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-red-500" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                >
                  {activeStep === 0 && renderChoosePg()}
                  {activeStep === 1 && renderFloorSelection()}
                  {activeStep === 2 && renderRoomSelection()}
                  {activeStep === 3 && renderBedSelection()}
                  {activeStep === 4 && renderBasicDetails()}
                  {activeStep === 5 && renderGuardianDetails()}
                  {activeStep === 6 && renderDocumentsUpload()}
                  {activeStep === 7 && renderPaymentUpload()}
                  {activeStep === 8 && renderReviewStep()}
                </motion.div>
              </AnimatePresence>
            </section>

            {/* Stepper Wizard Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={activeStep === 0}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              {activeStep < tenantOnboardingSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 px-5 text-sm font-bold text-white shadow transition-colors"
                >
                  <span>Next Step</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:shadow-lg hover:shadow-orange-500/35 hover:-translate-y-0.5"
                >
                  <ShieldCheck size={16} />
                  <span>{submitting ? "Clearance in progress..." : "Confirm Admissions"}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </TenantShell>
  );
};

export default TenantOnboarding;
