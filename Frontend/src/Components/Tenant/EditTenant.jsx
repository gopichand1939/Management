import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Warehouse,
  Home,
  BedDouble,
  CheckCircle2,
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
  TENANT_EDIT,
  TENANT_VIEW,
  TENANT_VACANT_BEDS,
} from "../../Utils/Constants";
import {
  buildEditFormData,
  buildTenantStats,
  defaultTenantForm,
  formatCurrency,
  formatDisplayDate,
  getAssetUrl,
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

const EditTenant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [vacantHierarchy, setVacantHierarchy] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [formData, setFormData] = useState(defaultTenantForm);

  // Drag-and-drop state
  const [dragActives, setDragActives] = useState({});

  useEffect(() => {
    const fetchSetupAndTenantData = async () => {
      setLoading(true);
      setError("");

      try {
        const [institutionsResponse, vacantBedsResponse, tenantResponse] = await Promise.all([
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
          fetch(TENANT_VIEW, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ id }),
          }),
        ]);

        const institutionsData = await institutionsResponse.json();
        const vacantBedsData = await vacantBedsResponse.json();
        const tenantData = await tenantResponse.json();

        if (!institutionsResponse.ok) {
          throw new Error(institutionsData.message || "Institution fetch failed");
        }

        if (!vacantBedsResponse.ok) {
          throw new Error(vacantBedsData.message || "Vacant beds fetch failed");
        }

        if (!tenantResponse.ok) {
          throw new Error(tenantData.message || "Tenant data fetch failed");
        }

        const institutionList = institutionsData.institutions || [];
        const currentTenant = tenantData.tenant;

        if (!currentTenant) {
          throw new Error("Tenant profile not found");
        }

        const admissionPayment = (currentTenant.payments || []).find(p => p.payment_type === "admission")
          || (currentTenant.payments || [])[0]
          || {};

        // Map existing tenant data into formData structure
        const formattedTenantForm = {
          institution_id: String(currentTenant.institution_id || ""),
          admission: {
            floor_id: String(currentTenant.floor_id || ""),
            room_id: String(currentTenant.room_id || ""),
            bed_id: String(currentTenant.bed_id || ""),
            check_in_date: currentTenant.check_in_date ? currentTenant.check_in_date.split("T")[0] : "",
            expected_checkout_date: currentTenant.expected_checkout_date ? currentTenant.expected_checkout_date.split("T")[0] : "",
          },
          basic_details: {
            full_name: currentTenant.full_name || "",
            phone: currentTenant.phone || "",
            email: currentTenant.email || "",
            gender: currentTenant.gender || "male",
            date_of_birth: currentTenant.date_of_birth ? currentTenant.date_of_birth.split("T")[0] : "",
            occupation: currentTenant.occupation || "",
            company_name: currentTenant.company_name || "",
            address: currentTenant.address || "",
            city: currentTenant.city || "",
            state: currentTenant.state || "",
            pincode: currentTenant.pincode || "",
          },
          guardian_details: {
            guardian_name: currentTenant.guardian_name || "",
            guardian_phone: currentTenant.guardian_phone || "",
            guardian_relation: currentTenant.guardian_relation || "",
            emergency_contact_name: currentTenant.emergency_contact_name || "",
            emergency_contact_phone: currentTenant.emergency_contact_phone || "",
          },
          profile_photo_url: currentTenant.profile_photo?.file_url || currentTenant.profile_photo?.url || (typeof currentTenant.profile_photo === "string" ? currentTenant.profile_photo : ""),
          profile_photo_object: currentTenant.profile_photo || null,
          profile_photo_file: null,
          documents: [
            {
              document_name: "Aadhaar",
              document_type: "aadhaar",
              document_number: (currentTenant.documents || []).find(d => d.document_type === "aadhaar")?.document_number || "",
              file: null,
              document_url: (currentTenant.documents || []).find(d => d.document_type === "aadhaar")?.file_url || (currentTenant.documents || []).find(d => d.document_type === "aadhaar")?.document_url || "",
              file_name: (currentTenant.documents || []).find(d => d.document_type === "aadhaar")?.file_name || "",
              mime_type: (currentTenant.documents || []).find(d => d.document_type === "aadhaar")?.mime_type || "",
            },
            {
              document_name: "PAN",
              document_type: "pan",
              document_number: (currentTenant.documents || []).find(d => d.document_type === "pan")?.document_number || "",
              file: null,
              document_url: (currentTenant.documents || []).find(d => d.document_type === "pan")?.file_url || (currentTenant.documents || []).find(d => d.document_type === "pan")?.document_url || "",
              file_name: (currentTenant.documents || []).find(d => d.document_type === "pan")?.file_name || "",
              mime_type: (currentTenant.documents || []).find(d => d.document_type === "pan")?.mime_type || "",
            },
            ...((currentTenant.documents || [])
              .filter(d => d.document_type !== "aadhaar" && d.document_type !== "pan")
              .map(d => ({
                document_name: d.document_name,
                document_type: d.document_type,
                document_number: d.document_number || "",
                file: null,
                document_url: d.file_url || d.document_url || "",
                file_name: d.file_name || "",
                mime_type: d.mime_type || "",
              }))
            )
          ],
          payment: {
            id: admissionPayment.id || null,
            agreed_monthly_rent: String(currentTenant.agreed_monthly_rent || ""),
            amount: admissionPayment.amount !== undefined && admissionPayment.amount !== null ? String(admissionPayment.amount) : "",
            payment_type: admissionPayment.payment_type || "admission",
            payment_mode: admissionPayment.payment_mode || "cash",
            payment_date: admissionPayment.payment_date ? admissionPayment.payment_date.split("T")[0] : "",
            billing_cycle_type: currentTenant.billing_cycle_type || "anniversary",
            reference_number: admissionPayment.reference_number || "",
            notes: admissionPayment.notes || "",
            status: admissionPayment.status || "completed",
            payment_proof_file: null,
            payment_proof_url: admissionPayment.payment_proof_url || "",
          },
          notes: currentTenant.notes || "",
          status: currentTenant.status || "active",
          security_deposit: String(currentTenant.security_deposit || ""),
          deposit_paid: String(currentTenant.deposit_paid || ""),
          refundable_amount: String(currentTenant.refundable_amount || ""),
          deposit_refund_status: currentTenant.deposit_refund_status || "pending",
        };

        setFormData(formattedTenantForm);

        // Inject the tenant's current bed into the list of vacant beds if it is not already there
        let allBeds = vacantBedsData.beds || [];
        if (currentTenant.bed_id) {
          const hasCurrentBed = allBeds.some(b => Number(b.id) === Number(currentTenant.bed_id));
          if (!hasCurrentBed) {
            allBeds = [
              ...allBeds,
              {
                id: Number(currentTenant.bed_id),
                bed_number: currentTenant.bed_number || "-",
                bed_type: currentTenant.bed_type || "single",
                rent_override: currentTenant.rent_override || null,
                status: "vacant", // mark as vacant/selectable in frontend
                institution_id: currentTenant.institution_id,
                institution_name: currentTenant.institution_name,
                floor_id: currentTenant.floor_id,
                floor_name: currentTenant.floor_name,
                floor_number: currentTenant.floor_number,
                room_id: currentTenant.room_id,
                room_number: currentTenant.room_number,
                room_type: currentTenant.room_type,
                capacity: currentTenant.capacity,
                rent_amount: currentTenant.room_rent_amount,
              }
            ];
          }
        }

        const hierarchy = groupVacantBeds(allBeds, institutionList);

        setInstitutions(institutionList);
        setVacantHierarchy(hierarchy);
        setSelectedFloorId(Number(currentTenant.floor_id));
        setSelectedRoomId(Number(currentTenant.room_id));

      } catch (apiError) {
        setError(apiError.message || "Unable to load tenant details");
      } finally {
        setLoading(false);
      }
    };

    fetchSetupAndTenantData();
  }, [id, isPgAdmin]);

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
          // Add the current tenant's bed to the hierarchy representation if missing
          const inst = data.institution;
          setSelectedInstitutionHierarchy(inst);
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
      const response = await fetch(TENANT_EDIT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: buildEditFormData(formData, id),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Tenant update failed");
      }

      navigate("/tenant/active");
    } catch (apiError) {
      setError(apiError.message || "Tenant update failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Render Choose PG
  const renderChoosePg = () => {
    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Building2 className="text-orange-500" size={20} />
            Choose PG Building
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Select the PG facility where the tenant is admitted.
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

  // Floor Selection
  const renderFloorSelection = () => {
    if (!selectedInstitution) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/30 p-12 text-center text-slate-400 font-bold">
          <Building2 size={32} className="mx-auto opacity-30 mb-2" />
          <p className="text-xs">Choose a PG facility to configure floor levels.</p>
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

  // Room Selection
  const renderRoomSelection = () => {
    if (!selectedFloor) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/30 p-12 text-center text-slate-400 font-bold">
          <Warehouse size={32} className="mx-auto opacity-30 mb-2" />
          <p className="text-xs">Select a floor level to display rooms list.</p>
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

  // Bed Selection
  const renderBedSelection = () => {
    if (!selectedRoom) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/30 p-12 text-center text-slate-400 font-bold">
          <Home size={32} className="mx-auto opacity-30 mb-2" />
          <p className="text-xs">Select a room to view bed selection layout.</p>
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

  // Basic particulars form
  const renderBasicDetails = () => {
    const fields = formData.basic_details;

    const handleProfilePhotoChange = (file) => {
      setFormData((currentState) => ({
        ...currentState,
        profile_photo_file: file,
      }));
    };

    const previewUrl =
      formData.profile_photo_file
        ? getFilePreview(formData.profile_photo_file)
        : getAssetUrl(formData.profile_photo_url);

    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <User className="text-orange-500" size={20} />
            Resident Basic Particulars
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Fill in the tenant's primary bio details.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 items-start">
          {/* Profile Photo Uploader */}
          <div className="flex flex-col items-center gap-3">
            <span className={sectionLabelClassName}>Profile Image</span>
            <div
              className={`relative h-36 w-36 overflow-hidden rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-orange-500/30 hover:bg-orange-50/5 transition-all flex flex-col items-center justify-center cursor-pointer group ${
                dragActives.profile ? "border-orange-500 bg-orange-50/10" : ""
              }`}
              onDragEnter={(e) => handleDrag(e, "profile")}
              onDragOver={(e) => handleDrag(e, "profile")}
              onDragLeave={(e) => handleDrag(e, "profile")}
              onDrop={(e) => handleDrop(e, "profile", handleProfilePhotoChange)}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Upload size={24} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                  <span className="text-[10px] font-bold text-slate-400 mt-2 text-center px-4 leading-normal">
                    Drag profile photo or click to browse
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleProfilePhotoChange(e.target.files?.[0])}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            {formData.profile_photo_file && (
              <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                Photo selected
              </span>
            )}
          </div>

          {/* Core Info Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Resident Full Name</label>
              <input
                type="text"
                value={fields.full_name}
                onChange={(e) => setNestedField("basic_details", "full_name", e.target.value)}
                placeholder="e.g. John Doe"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Telephone Phone</label>
              <input
                type="text"
                value={fields.phone}
                onChange={(e) => setNestedField("basic_details", "phone", e.target.value)}
                placeholder="e.g. 9876543210"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Email Address</label>
              <input
                type="email"
                value={fields.email}
                onChange={(e) => setNestedField("basic_details", "email", e.target.value)}
                placeholder="e.g. john@company.com"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Gender</label>
              <select
                value={fields.gender}
                onChange={(e) => setNestedField("basic_details", "gender", e.target.value)}
                className={inputClassName}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Date of Birth</label>
              <input
                type="date"
                value={fields.date_of_birth}
                onChange={(e) => setNestedField("basic_details", "date_of_birth", e.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Occupation</label>
              <input
                type="text"
                value={fields.occupation}
                onChange={(e) => setNestedField("basic_details", "occupation", e.target.value)}
                placeholder="e.g. Software Engineer"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1 sm:col-span-2">
              <label className={sectionLabelClassName}>Company or College Name</label>
              <input
                type="text"
                value={fields.company_name}
                onChange={(e) => setNestedField("basic_details", "company_name", e.target.value)}
                placeholder="e.g. Google India"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1 sm:col-span-2">
              <label className={sectionLabelClassName}>Permanent Address</label>
              <input
                type="text"
                value={fields.address}
                onChange={(e) => setNestedField("basic_details", "address", e.target.value)}
                placeholder="Flat No, Street, Landmark"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>City</label>
              <input
                type="text"
                value={fields.city}
                onChange={(e) => setNestedField("basic_details", "city", e.target.value)}
                placeholder="City"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>State</label>
              <input
                type="text"
                value={fields.state}
                onChange={(e) => setNestedField("basic_details", "state", e.target.value)}
                placeholder="State"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-1">
              <label className={sectionLabelClassName}>Pincode</label>
              <input
                type="text"
                value={fields.pincode}
                onChange={(e) => setNestedField("basic_details", "pincode", e.target.value)}
                placeholder="6-digit PIN"
                className={inputClassName}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Guardian details
  const renderGuardianDetails = () => {
    const fields = formData.guardian_details;
    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="text-orange-500" size={20} />
            Guardian & Emergency Contacts
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Registered secondary contacts for verification or emergency fallback.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-1">
            <label className={sectionLabelClassName}>Primary Guardian Name</label>
            <input
              type="text"
              value={fields.guardian_name}
              onChange={(e) => setNestedField("guardian_details", "guardian_name", e.target.value)}
              placeholder="e.g. Robert Doe"
              className={inputClassName}
            />
          </div>

          <div className="grid gap-1">
            <label className={sectionLabelClassName}>Guardian Phone</label>
            <input
              type="text"
              value={fields.guardian_phone}
              onChange={(e) => setNestedField("guardian_details", "guardian_phone", e.target.value)}
              placeholder="e.g. 9876543210"
              className={inputClassName}
            />
          </div>

          <div className="grid gap-1">
            <label className={sectionLabelClassName}>Guardian Relation</label>
            <input
              type="text"
              value={fields.guardian_relation}
              onChange={(e) => setNestedField("guardian_details", "guardian_relation", e.target.value)}
              placeholder="e.g. Father"
              className={inputClassName}
            />
          </div>

          <div className="h-px bg-slate-100 sm:col-span-2 my-2" />

          <div className="grid gap-1">
            <label className={sectionLabelClassName}>Emergency Contact Name</label>
            <input
              type="text"
              value={fields.emergency_contact_name}
              onChange={(e) => setNestedField("guardian_details", "emergency_contact_name", e.target.value)}
              placeholder="e.g. Jane Doe"
              className={inputClassName}
            />
          </div>

          <div className="grid gap-1">
            <label className={sectionLabelClassName}>Emergency Contact Phone</label>
            <input
              type="text"
              value={fields.emergency_contact_phone}
              onChange={(e) => setNestedField("guardian_details", "emergency_contact_phone", e.target.value)}
              placeholder="e.g. 9876543210"
              className={inputClassName}
            />
          </div>
        </div>
      </div>
    );
  };

  // Documents Upload
  const renderDocumentsUpload = () => {
    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="text-orange-500" size={20} />
            Identity Verification Documents
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Attach Aadhaar, PAN, and other verification docs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {formData.documents.map((doc, index) => {
            const previewUrl = doc.file ? getFilePreview(doc.file) : getAssetUrl(doc.document_url);
            return (
              <div
                key={index}
                className="rounded-3xl border border-slate-150 p-5 bg-white shadow-sm flex flex-col gap-4 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-400" />
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Document type</h3>
                    <p className="text-sm font-black text-slate-800 mt-1.5">{doc.document_name}</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Document ID Number</label>
                    <input
                      type="text"
                      value={doc.document_number}
                      onChange={(e) => handleDocumentChange(index, "document_number", e.target.value)}
                      placeholder="e.g. 12-digit Aadhaar / PAN"
                      className={inputClassName}
                    />
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Select File / Image</label>
                    <div
                      className={`relative h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-orange-500/30 hover:bg-orange-50/5 transition-all flex flex-col items-center justify-center cursor-pointer group ${
                        dragActives[index] ? "border-orange-500 bg-orange-50/10" : ""
                      }`}
                      onDragEnter={(e) => handleDrag(e, index)}
                      onDragOver={(e) => handleDrag(e, index)}
                      onDragLeave={(e) => handleDrag(e, index)}
                      onDrop={(e) => handleDrop(e, index, (file) => handleDocumentFileChange(index, file))}
                    >
                      {previewUrl ? (
                        <div className="relative w-full h-full flex items-center justify-center p-1 group/preview">
                          {(doc.file?.type?.includes("pdf") || String(previewUrl).toLowerCase().includes(".pdf")) ? (
                            <div className="flex items-center gap-2">
                              <FileText className="text-red-500" size={20} />
                              <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
                                {doc.file ? doc.file.name : "Existing PDF"}
                              </span>
                            </div>
                          ) : (
                            <img
                              src={previewUrl}
                              alt={doc.document_name}
                              className="h-full w-full object-contain rounded-xl"
                            />
                          )}
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200 rounded-xl flex items-center justify-center gap-2">
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-white text-slate-800 rounded-lg text-[10px] font-black uppercase tracking-wider shadow hover:bg-slate-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View
                            </a>
                            <span className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow">
                              Change
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload size={16} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                          <span className="text-[9px] font-bold text-slate-400 mt-1.5">
                            Drag document file here
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        onChange={(e) => handleDocumentFileChange(index, e.target.files?.[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
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

  // Payment Setup & billing
  const renderPaymentUpload = () => {
    const proofPreviewUrl = formData.payment.payment_proof_file 
      ? getFilePreview(formData.payment.payment_proof_file) 
      : getAssetUrl(formData.payment.payment_proof_url);

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
                accept="image/*,.pdf"
                onChange={(e) => setFormData(c => ({
                  ...c,
                  payment: { ...c.payment, payment_proof_file: e.target.files?.[0] || null }
                }))}
                className="hidden"
                id="paymentProofInput"
              />

              {proofPreviewUrl ? (
                <div className="relative w-full h-full flex items-center justify-center p-1 group/proof">
                  {(formData.payment.payment_proof_file?.type?.includes("pdf") || String(proofPreviewUrl).toLowerCase().includes(".pdf")) ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <FileText className="text-red-500" size={24} />
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                        {formData.payment.payment_proof_file ? formData.payment.payment_proof_file.name : "Existing PDF Receipt"}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={proofPreviewUrl}
                      alt="Receipt Preview"
                      className="h-28 w-full object-contain rounded-xl"
                    />
                  )}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/proof:opacity-100 transition-opacity duration-200 rounded-xl flex items-center justify-center gap-2">
                    <a
                      href={proofPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-white text-slate-800 rounded-lg text-[10px] font-black uppercase tracking-wider shadow hover:bg-slate-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </a>
                    <span className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow">
                      Change
                    </span>
                  </div>
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

  // Review & Confirm details
  const renderReviewConfirm = () => {
    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-orange-500" size={20} />
            Review & Save Stay File
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-455">
            Review updated records before committing changes.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Allocation card */}
          <div className="rounded-3xl border border-slate-150 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Selected Allocation</h4>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 border border-orange-100/50 text-orange-500 shrink-0">
                <BedDouble size={18} />
              </span>
              <div>
                <p className="text-sm font-black text-slate-800">
                  {selectedInstitution?.institution_name || "-"}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {selectedFloor?.floor_name || "-"} • Room {selectedRoom?.room_number || "-"} • {selectedBed?.bed_number || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Basic particulars */}
          <div className="rounded-3xl border border-slate-150 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Bio Snapshot</h4>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 border border-orange-100/50 text-orange-500 shrink-0">
                <User size={18} />
              </span>
              <div>
                <p className="text-sm font-black text-slate-800">
                  {formData.basic_details.full_name || "Not entered"}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  Phone: {formData.basic_details.phone || "-"} • Email: {formData.basic_details.email || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Operational notes */}
        <div className="grid gap-1">
          <label className={sectionLabelClassName}>General Operational Notes</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Add general remarks, special instructions or notes..."
            className={textareaClassName}
          />
        </div>
      </div>
    );
  };

  const renderActiveStep = () => {
    switch (activeStep) {
      case 0:
        return renderChoosePg();
      case 1:
        return renderFloorSelection();
      case 2:
        return renderRoomSelection();
      case 3:
        return renderBedSelection();
      case 4:
        return renderBasicDetails();
      case 5:
        return renderGuardianDetails();
      case 6:
        return renderDocumentsUpload();
      case 7:
        return renderPaymentUpload();
      case 8:
        return renderReviewConfirm();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <TenantShell>
        <div className="rounded-[32px] border border-slate-100 bg-white p-16 shadow-sm flex justify-center items-center">
          <PageLoader />
        </div>
      </TenantShell>
    );
  }

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Header Title */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 justify-between">
          <div className="text-left">
            <h1 className="text-xl font-black text-slate-850 tracking-tight leading-none">
              Edit Resident File
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-1.5">
              Update room occupancy, tenant details, contacts, and documents.
            </p>
          </div>
        </div>

        <Error message={error} />

        {/* Multi-step progress tracker */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-150 p-2 flex overflow-x-auto shadow-sm gap-1 no-scrollbar">
          {tenantOnboardingSteps.map((stepLabel, idx) => {
            const isActive = activeStep === idx;
            const isCompleted = idx < activeStep;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleStepClick(idx)}
                className={`relative rounded-xl px-3.5 py-2 text-[10px] font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : isCompleted
                    ? "text-orange-600 bg-orange-50 border-orange-100/50"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {stepLabel}
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-[32px] border border-slate-150 p-6 shadow-sm min-h-[360px]">
          {renderActiveStep()}
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={activeStep === 0 || submitting}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-650 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft size={14} />
            <span>Back</span>
          </button>

          {activeStep === tenantOnboardingSteps.length - 1 ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50"
            >
              <span>{submitting ? "Saving..." : "Save Changes"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-5 text-xs font-bold text-white shadow-md transition hover:bg-slate-900"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </TenantShell>
  );
};

export default EditTenant;
