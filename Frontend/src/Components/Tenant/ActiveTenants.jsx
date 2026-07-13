import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  BedDouble,
  Clock3,
  Plus,
  Search,
  Phone,
  UserRound,
  Wallet,
  MoreVertical,
  Compass,
  Building2,
  Calendar,
  X,
  ArrowRight,
  TrendingUp,
  Landmark,
  BadgeIndianRupee,
  CheckCircle2,
  AlertCircle,
  Activity,
  LogOut,
  FolderOpen,
  ArrowLeftRight,
  Upload,
  ShieldCheck,
  Edit2,
} from "lucide-react";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import TenantShell from "./TenantShell";
import BedLayout from "../Institution/components/BedLayout";
import FloorCard from "../Institution/components/FloorCard";
import RoomCard from "../Institution/components/RoomCard";
import {
  TENANT_ACTIVE_LIST,
  TENANT_VIEW,
  TENANT_PAYMENT_VERIFY,
  TENANT_STATS,
  TENANT_VACANT_BEDS,
  TENANT_TRANSFER,
  TENANT_VACATE,
  TENANT_PAYMENT_CREATE,
  TOKEN_KEY,
  INSTITUTION_VIEW,
} from "../../Utils/Constants";
import {
  buildMetricCards,
  formatCurrency,
  formatDisplayDate,
  getAssetUrl,
  getAuthHeaders,
  getStatusBadgeClassName,
  getTodayDate,
  groupVacantBeds,
} from "./tenantHelpers";

const inputClassName =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition-all duration-200 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10";

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

const activityFieldLabels = {
  admission_number: "Admission No.",
  bed_id: "Bed",
  status: "Tenant Status",
  tenant_status: "Tenant Status",
  payment_id: "Payment",
  payment_status: "Payment Status",
  payment_verification_status: "Verification",
  verification_status: "Verification",
  check_in_date: "Check-in",
  checkout_date: "Check-out",
  floor_id: "Floor",
  room_id: "Room",
  amount: "Amount",
  payment_type: "Payment Type",
  payment_mode: "Payment Mode",
  reference_number: "Reference No.",
};

const hiddenActivityFields = new Set([
  "tenant_id",
  "institution_id",
  "performed_by",
  "updated_by",
  "created_by",
]);

const coerceActivityValue = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const formatActivityValue = (key, value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (key.includes("date") || key.endsWith("_at")) {
    return formatDisplayDate(value);
  }

  if (key.includes("amount")) {
    return formatCurrency(value);
  }

  if (key.endsWith("_id") || key === "payment_id") {
    return `#${value}`;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatLabel(item)).join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, nestedValue]) => nestedValue !== null && nestedValue !== undefined && nestedValue !== "")
      .map(([nestedKey, nestedValue]) => `${formatLabel(nestedKey)}: ${formatActivityValue(nestedKey, nestedValue)}`)
      .join(", ");
  }

  return formatLabel(value);
};

const getActivityDetails = (log) => {
  const activityValue = coerceActivityValue(log?.new_value);

  if (!activityValue) {
    return [{ label: "Update", value: "Activity recorded" }];
  }

  if (typeof activityValue !== "object") {
    return [{ label: "Details", value: String(activityValue) }];
  }

  const details = Object.entries(activityValue)
    .filter(([key, value]) => !hiddenActivityFields.has(key) && value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      label: activityFieldLabels[key] || formatLabel(key),
      value: formatActivityValue(key, value),
    }))
    .filter((item) => item.value && item.value !== "-");

  return details.length ? details : [{ label: "Update", value: "Activity recorded" }];
};

const getProfilePhotoUrl = (profilePhoto) => {
  if (!profilePhoto) {
    return null;
  }

  if (typeof profilePhoto === "string") {
    return getAssetUrl(profilePhoto);
  }

  return getAssetUrl(profilePhoto.file_url || profilePhoto.url || "");
};

const getNextDueDate = (tenant) => {
  const pendingDue = tenant?.dues?.find((due) => Number(due.pending_amount || 0) > 0);

  if (pendingDue?.due_date) {
    return pendingDue.due_date;
  }

  if (!tenant?.check_in_date) {
    return null;
  }

  const anchorDate = new Date(tenant.check_in_date);
  if (Number.isNaN(anchorDate.getTime())) {
    return null;
  }

  if (tenant.billing_cycle_type === "calendar_month_prorated") {
    return new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1);
  }

  const nextDueDate = new Date(anchorDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  return nextDueDate;
};

const getJoiningRentOnlyAmount = (tenant) => {
  const paymentAmount = Number(tenant?.joining_payment_amount || 0);
  const monthlyRent = Number(
    tenant?.agreed_monthly_rent ||
    tenant?.room_rent_amount ||
    tenant?.first_cycle_amount ||
    0
  );

  if (monthlyRent > 0) {
    return Math.min(paymentAmount || monthlyRent, monthlyRent);
  }

  const depositAmount = Number(tenant?.deposit_paid || tenant?.security_deposit || 0);
  if (depositAmount > 0 && paymentAmount > depositAmount) {
    return paymentAmount - depositAmount;
  }

  return paymentAmount;
};

const getPreviewKind = (fileUrl = "", mimeType = "") => {
  const normalizedUrl = String(fileUrl || "").toLowerCase();
  const normalizedMime = String(mimeType || "").toLowerCase();

  if (normalizedMime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(normalizedUrl)) {
    return "image";
  }

  if (normalizedMime.includes("pdf") || normalizedUrl.endsWith(".pdf")) {
    return "pdf";
  }

  return "file";
};

const statusTabs = [
  { id: "all", label: "All Tenants" },
  { id: "active", label: "Active" },
  { id: "pending_verification", label: "Pending Approval" },
  { id: "notice_period", label: "Notice" },
  { id: "blocked", label: "Blocked" },
];

const ActiveTenants = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const [tenants, setTenants] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [collectionMonth, setCollectionMonth] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Active Actions overlay dropdown
  const [activeActionsTenantId, setActiveActionsTenantId] = useState(null);

  // Drawers trigger states
  const [transferTenant, setTransferTenant] = useState(null);
  const [vacateTenant, setVacateTenant] = useState(null);
  const [paymentTenant, setPaymentTenant] = useState(null);
  const [selectedTenantProfileId, setSelectedTenantProfileId] = useState(null);
  const [selectedTenantProfile, setSelectedTenantProfile] = useState(null);
  const [loadingTenantProfile, setLoadingTenantProfile] = useState(false);
  const [tenantProfileError, setTenantProfileError] = useState("");
  const [previewAsset, setPreviewAsset] = useState(null);
  const [transferInstitutionHierarchy, setTransferInstitutionHierarchy] = useState(null);
  // Drawers setup data states
  const [vacantBeds, setVacantBeds] = useState([]);
  const [vacantHierarchy, setVacantHierarchy] = useState([]);
  const [transferSelectedFloorId, setTransferSelectedFloorId] = useState(null);
  const [transferSelectedRoomId, setTransferSelectedRoomId] = useState(null);

  // Drawer Form fields states
  const [transferForm, setTransferForm] = useState({
    floor_id: "",
    room_id: "",
    bed_id: "",
    transfer_reason: "",
  });

  const [vacateForm, setVacateForm] = useState({
    checkout_date: getTodayDate(),
    damage_charges: 0,
    refundable_amount: 0,
    deposit_refund_status: "pending",
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_type: "rent",
    payment_mode: "upi",
    payment_date: getTodayDate(),
    reference_number: "",
    notes: "",
    status: "completed",
    payment_proof_file: null,
  });

  const [submittingAction, setSubmittingAction] = useState(false);
  const [dragActives, setDragActives] = useState({});

  const verifyTenantPaymentStatus = async (tenant) => {
    if (!tenant?.latest_payment_id) {
      alert("No collected payment found for this tenant yet.");
      return;
    }

    setSubmittingAction(true);
    try {
      const response = await fetch(TENANT_PAYMENT_VERIFY, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          payment_id: tenant.latest_payment_id,
          tenant_id: tenant.id,
          verification_status: "verified",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Payment verification failed");
      }

      setActiveActionsTenantId(null);
      fetchTenants();
      fetchStats();
    } catch (apiError) {
      alert(apiError.message || "Payment verification failed");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDrag = (event, key) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActives((currentState) => ({
        ...currentState,
        [key]: true,
      }));
      return;
    }

    if (event.type === "dragleave") {
      setDragActives((currentState) => ({
        ...currentState,
        [key]: false,
      }));
    }
  };

  const handleDrop = (event, key, callback) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActives((currentState) => ({
      ...currentState,
      [key]: false,
    }));

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      callback(event.dataTransfer.files[0]);
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(TENANT_ACTIVE_LIST, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Active tenants fetch failed");
      }
      setTenants(data.tenants || []);
    } catch (apiError) {
      setError(apiError.message || "Active tenants fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (month = collectionMonth) => {
    try {
      const response = await fetch(TENANT_STATS, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ collection_month: month }),
      });
      const data = await response.json();
      if (response.ok) {
        setDashboardStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    }
  };

  const openTenantProfileModal = async (tenantId) => {
    setSelectedTenantProfileId(tenantId);
    setSelectedTenantProfile(null);
    setTenantProfileError("");
    setLoadingTenantProfile(true);

    try {
      const response = await fetch(TENANT_VIEW, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: tenantId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Tenant details fetch failed");
      }

      setSelectedTenantProfile(data.tenant || null);
    } catch (apiError) {
      setTenantProfileError(apiError.message || "Tenant details fetch failed");
    } finally {
      setLoadingTenantProfile(false);
    }
  };

  const closeTenantProfileModal = () => {
    setSelectedTenantProfileId(null);
    setSelectedTenantProfile(null);
    setTenantProfileError("");
    setLoadingTenantProfile(false);
    setPreviewAsset(null);
  };

  const fetchVacantBedsForTransfer = async () => {
    try {
      const response = await fetch(TENANT_VACANT_BEDS, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (response.ok) {
        setVacantBeds(data.beds || []);
        // Note: For PG Admin it filters automatically on backend, otherwise we group
        const list = data.beds || [];
        // Map institutions locally
        const mockInsts = list.map(b => ({ id: b.institution_id, institution_name: b.institution_name }));
        setVacantHierarchy(groupVacantBeds(list, mockInsts));
      }
    } catch (err) {
      console.error("Failed to load vacant beds:", err);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    fetchStats(collectionMonth);
  }, [collectionMonth]);

  const monthFilteredTenants = useMemo(() => {
    if (collectionMonth === "all") {
      return tenants;
    }

    return tenants.filter((tenant) => {
      if (!tenant.check_in_date) {
        return false;
      }

      const checkInDate = new Date(tenant.check_in_date);
      if (Number.isNaN(checkInDate.getTime())) {
        return false;
      }

      const tenantMonth = `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, "0")}`;
      return tenantMonth === collectionMonth;
    });
  }, [collectionMonth, tenants]);

  const filteredTenants = useMemo(() => {
    const term = searchText.toLowerCase();
    return monthFilteredTenants.filter((tenant) => {
      const matchesSearch =
        tenant.full_name?.toLowerCase().includes(term) ||
        tenant.phone?.toLowerCase().includes(term) ||
        tenant.institution_name?.toLowerCase().includes(term) ||
        tenant.room_number?.toLowerCase().includes(term) ||
        tenant.bed_number?.toLowerCase().includes(term) ||
        tenant.admission_number?.toLowerCase().includes(term);

      const matchesStatus =
        selectedStatus === "all" || tenant.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [searchText, monthFilteredTenants, selectedStatus]);

  // Handle Transfer submit
  const handleTransferSubmit = async () => {
    if (!transferForm.bed_id) {
      alert("Please select a target vacant bed");
      return;
    }
    setSubmittingAction(true);
    try {
      const response = await fetch(TENANT_TRANSFER, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tenant_id: transferTenant.id,
          institution_id: transferTenant.institution_id,
          floor_id: transferForm.floor_id,
          room_id: transferForm.room_id,
          bed_id: transferForm.bed_id,
          transfer_reason: transferForm.transfer_reason,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Transfer failed");
      }
      setTransferTenant(null);
      setTransferForm({ floor_id: "", room_id: "", bed_id: "", transfer_reason: "" });
      fetchTenants();
      fetchStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Vacate submit
  const handleVacateSubmit = async () => {
    setSubmittingAction(true);
    try {
      const response = await fetch(TENANT_VACATE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tenant_id: vacateTenant.id,
          institution_id: vacateTenant.institution_id,
          checkout_date: vacateForm.checkout_date,
          damage_charges: Number(vacateForm.damage_charges) || 0,
          refundable_amount: Number(vacateForm.refundable_amount) || 0,
          deposit_refund_status: vacateForm.deposit_refund_status,
          notes: vacateForm.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Check-out vacate failed");
      }
      setVacateTenant(null);
      setVacateForm({ checkout_date: getTodayDate(), damage_charges: 0, refundable_amount: 0, deposit_refund_status: "pending", notes: "" });
      fetchTenants();
      fetchStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Add Payment Submit
  const handlePaymentSubmit = async () => {
    if (!paymentForm.amount) {
      alert("Please enter collection amount");
      return;
    }
    setSubmittingAction(true);
    try {
      const bodyFormData = new FormData();
      bodyFormData.append("tenant_id", String(paymentTenant.id));
      bodyFormData.append("amount", String(paymentForm.amount));
      bodyFormData.append("payment_type", paymentForm.payment_type);
      bodyFormData.append("payment_mode", paymentForm.payment_mode);
      bodyFormData.append("payment_date", paymentForm.payment_date);
      bodyFormData.append("reference_number", paymentForm.reference_number);
      bodyFormData.append("notes", paymentForm.notes);
      bodyFormData.append("status", paymentForm.status);
      bodyFormData.append(
        "verification_status",
        paymentForm.status === "completed" ? "verified" : "pending"
      );

      if (paymentForm.payment_proof_file) {
        bodyFormData.append("payment_proof", paymentForm.payment_proof_file);
      }

      const response = await fetch(TENANT_PAYMENT_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: bodyFormData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Payment entry failed");
      }

      if (paymentForm.status === "completed" && data.payment?.id) {
        await fetch(TENANT_PAYMENT_VERIFY, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            payment_id: data.payment.id,
            tenant_id: paymentTenant.id,
            verification_status: "verified",
          }),
        });
      }

      setPaymentTenant(null);
      setPaymentForm({
        amount: "",
        payment_type: "rent",
        payment_mode: "upi",
        payment_date: getTodayDate(),
        reference_number: "",
        notes: "",
        status: "completed",
        payment_proof_file: null,
      });
      fetchTenants();
      fetchStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  useEffect(() => {
    if (!transferTenant?.institution_id) {
      setTransferInstitutionHierarchy(null);
      return;
    }

    const fetchHierarchy = async () => {
      try {
        const response = await fetch(INSTITUTION_VIEW, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ id: Number(transferTenant.institution_id) }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setTransferInstitutionHierarchy(data.institution);
        }
      } catch (err) {
        console.error("Failed to load transfer institution hierarchy", err);
      }
    };

    fetchHierarchy();
  }, [transferTenant?.institution_id]);

  const selectedTransferInstitutionFromVacant = useMemo(() => {
    if (!transferTenant) return null;
    return vacantHierarchy.find(inst => Number(inst.id) === Number(transferTenant.institution_id)) || null;
  }, [transferTenant, vacantHierarchy]);

  const selectedTransferInstitution = transferInstitutionHierarchy || selectedTransferInstitutionFromVacant;

  const selectedTransferFloor = useMemo(() => {
    if (!selectedTransferInstitution) return null;
    return selectedTransferInstitution.floors.find(fl => Number(fl.id) === Number(transferForm.floor_id || transferSelectedFloorId)) || null;
  }, [selectedTransferInstitution, transferForm.floor_id, transferSelectedFloorId]);

  const selectedTransferRoom = useMemo(() => {
    if (!selectedTransferFloor) return null;
    return selectedTransferFloor.rooms.find(rm => Number(rm.id) === Number(transferForm.room_id || transferSelectedRoomId)) || null;
  }, [selectedTransferFloor, transferForm.room_id, transferSelectedRoomId]);

  // Sync selectors inside transfer forms
  useEffect(() => {
    if (!selectedTransferInstitution) return;
    const firstFl = selectedTransferInstitution.floors[0];
    if (firstFl) {
      setTransferSelectedFloorId(firstFl.id);
      setTransferForm(f => ({ ...f, floor_id: String(firstFl.id), room_id: "", bed_id: "" }));
    }
  }, [selectedTransferInstitution]);

  useEffect(() => {
    if (!selectedTransferFloor) return;
    const firstRm = selectedTransferFloor.rooms[0];
    if (firstRm) {
      setTransferSelectedRoomId(firstRm.id);
      setTransferForm(f => ({ ...f, room_id: String(firstRm.id), bed_id: "" }));
    }
  }, [selectedTransferFloor]);

  // Computed display stats
  const activeTenantsCount = monthFilteredTenants.filter(t => t.status === "active").length;
  const pendingTenantsCount = monthFilteredTenants.filter(t => t.status === "pending_verification").length;
  const totalOccupiedBeds = monthFilteredTenants.length;
  const collectionMonthOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
    const today = new Date();
    const monthValues = new Set(Array.from({ length: 12 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }));

    tenants.forEach((tenant) => {
      if (!tenant.check_in_date) return;
      const checkInDate = new Date(tenant.check_in_date);
      if (Number.isNaN(checkInDate.getTime())) return;
      monthValues.add(`${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, "0")}`);
    });

    return [...monthValues]
      .sort((firstMonth, secondMonth) => secondMonth.localeCompare(firstMonth))
      .map((value) => {
        const [year, month] = value.split("-").map(Number);
        return { value, label: formatter.format(new Date(year, month - 1, 1)) };
      });
  }, [tenants]);

  const statItems = [
    {
      label: "Active Residents",
      value: activeTenantsCount,
      icon: UserRound,
      color: "from-emerald-500 to-teal-500 bg-emerald-50 text-emerald-600 border-emerald-100/50",
    },
    {
      label: "Pending Verification",
      value: pendingTenantsCount,
      icon: Clock3,
      color: "from-amber-500 to-orange-500 bg-amber-50 text-amber-500 border-amber-100/50",
    },
    {
      label: "Beds Occupied",
      value: totalOccupiedBeds,
      icon: BedDouble,
      color: "from-sky-500 to-blue-500 bg-sky-50 text-sky-600 border-sky-100/50",
    },
    {
      label: "Overall Collected Rent",
      value: formatCurrency(dashboardStats?.collected_rent || 0),
      icon: Wallet,
      color: "from-violet-500 to-indigo-500 bg-violet-50 text-violet-650 border-violet-100/50",
    },
    {
      label: "Overall Collected Deposit",
      value: formatCurrency(dashboardStats?.collected_deposit || 0),
      icon: Landmark,
      color: "from-orange-500 to-rose-500 bg-orange-50 text-orange-600 border-orange-100/50",
    },
  ];

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Header section with sticky actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              PG Tenant Lifecycle Console
            </h1>
            <p className="text-xs text-slate-400 font-bold mt-1.5">
              Allocate beds, swop rooms, clear check-outs, and verify payments.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate("/tenant/onboarding")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/35 hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus size={15} />
              <span>Add Tenant</span>
            </button>
          </div>
        </div>

        {/* Banners stats grid */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div className="text-left">
              <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Collection Period</span>
              <span className="mt-1 block text-xs font-bold text-slate-600">Rent and deposits are reported separately for tenants who joined in the selected month.</span>
            </div>
            <select
              value={collectionMonth}
              onChange={(event) => setCollectionMonth(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition-all focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10"
              aria-label="Collection month"
            >
              <option value="all">All Months</option>
              {collectionMonthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statItems.map((st, idx) => {
            const Icon = st.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl border border-slate-150 bg-white p-4 shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-left flex justify-between items-center"
              >
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">{st.label}</span>
                  <span className="text-xl font-black text-slate-800 tracking-tight block mt-2 leading-none">{st.value}</span>
                </div>
                <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${st.color.split(" ")[0]} ${st.color.split(" ")[1]} ${st.color.split(" ")[2]}`}>
                  <Icon size={14} />
                </div>
              </div>
            );
          })}
        </div></div>

        {/* Filters and search desk */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3 rounded-[32px] border border-slate-150 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.04)]">
          {/* Status filtering tabs */}
          <div className="flex overflow-x-auto gap-1 w-full md:w-auto pb-1 md:pb-0 scrollbar-thin">
            {statusTabs.map((tb) => {
              const isActive = selectedStatus === tb.id;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setSelectedStatus(tb.id)}
                  className={`rounded-xl px-3.5 py-2 text-[11px] font-black transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {tb.label}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="flex w-full md:max-w-xs items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-slate-400 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:bg-white focus-within:shadow-sm transition-all duration-200 shrink-0">
            <Search size={14} />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search tenant, bed, room..."
              className="h-9 w-full border-0 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-455"
            />
          </div>
        </div>

        <Error message={error} />

        {loading ? (
          <div className="rounded-[32px] border border-slate-100 bg-white p-16 shadow-sm flex justify-center items-center">
            <PageLoader />
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="rounded-[32px] border border-slate-150 bg-white p-20 shadow-sm text-center">
            <UserRound size={36} className="mx-auto text-slate-300" />
            <h3 className="text-base font-black text-slate-700 mt-3.5">No Stay Records Found</h3>
            <p className="text-xs text-slate-400 font-bold mt-1 max-w-xs mx-auto">
              No active stay files match your filters. Onboard a resident to start.
            </p>
          </div>
        ) : (
          /* Cards Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {filteredTenants.map((ten) => (
              (() => {
                const hasJoiningPayment = Boolean(ten.joining_payment_id) &&
                  String(ten.joining_payment_status || "").toLowerCase() === "completed";
                const hasPendingVerification = hasJoiningPayment &&
                  String(ten.joining_payment_verification_status || "").toLowerCase() === "pending";
                const hasVerifiedAdmissionPayment = hasJoiningPayment &&
                  String(ten.joining_payment_verification_status || "").toLowerCase() === "verified";
                const canCollectPayment = !hasJoiningPayment;
                const nextDueDate = getNextDueDate(ten);

                return (
              <motion.div
                key={ten.id}
                whileHover={{ y: -4, shadow: "0 25px 50px -12px rgba(255, 107, 0, 0.05)" }}
                className="rounded-[32px] border border-slate-150 bg-white p-5 hover:border-orange-500/25 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] min-h-[200px]"
              >
                {/* Top gradient border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500" />

                <button
                  type="button"
                  onClick={() => openTenantProfileModal(ten.id)}
                  className="w-full text-left"
                >
                  {/* Top profile banner */}
                  <div className="flex items-start justify-between gap-3 mt-1.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-orange-50 border border-orange-100/50 text-orange-500 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-inner">
                        {getProfilePhotoUrl(ten.profile_photo) ? (
                          <img src={getProfilePhotoUrl(ten.profile_photo)} alt={ten.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <UserRound size={16} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-850 leading-tight truncate max-w-[140px]" title={ten.full_name}>
                          {ten.full_name}
                        </h3>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mt-0.5">
                          {ten.admission_number || "NO ADMISSION ID"}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${getStatusBadgeClassName(ten.status)}`}>
                      {ten.status}
                    </span>
                  </div>

                  {/* Bed Allocation markers */}
                  <div className="mt-4 bg-slate-50/50 border border-slate-100/80 p-3 rounded-2xl flex flex-col gap-1.5 text-xs font-semibold text-slate-550">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate text-slate-650">{ten.institution_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Compass size={13} className="text-slate-400 shrink-0" />
                      <span className="text-slate-650">{ten.floor_name || "Ground"} • Room {ten.room_number} ({ten.bed_number})</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 border-t border-slate-100 pt-2 text-[10px] text-slate-400 uppercase tracking-widest justify-between font-black">
                      <span>Check-in</span>
                      <span className="text-slate-600 font-bold">{formatDisplayDate(ten.check_in_date)}</span>
                    </div>
                  </div>

                  {hasJoiningPayment && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                          Joining Payment Logged
                        </p>
                        <p className="mt-1 text-xs font-bold text-emerald-900">
                          {formatCurrency(getJoiningRentOnlyAmount(ten))}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${getStatusBadgeClassName(
                          ten.joining_payment_verification_status || "pending"
                        )}`}
                      >
                        {ten.joining_payment_verification_status || "pending"}
                      </span>
                    </div>
                  )}
                </button>

                {/* Footer action logs button */}
                <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Phone size={10} />
                    {ten.phone || "No phone"}
                  </span>

                  <div className="flex items-center gap-1.5 relative">
                    <button
                      type="button"
                      onClick={() => openTenantProfileModal(ten.id)}
                      className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg border border-slate-150 bg-white text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all"
                    >
                      File
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveActionsTenantId(activeActionsTenantId === ten.id ? null : ten.id)}
                      className="p-1 rounded-lg border border-slate-100 bg-white text-slate-400 hover:text-slate-700 shadow-sm"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {/* Popover Action Menu */}
                    <AnimatePresence>
                      {activeActionsTenantId === ten.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveActionsTenantId(null)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 bottom-full mb-2 z-20 w-44 rounded-2xl border border-slate-150 bg-white p-1.5 shadow-xl text-xs font-semibold text-slate-700 flex flex-col gap-0.5"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                fetchVacantBedsForTransfer();
                                setTransferTenant(ten);
                                setTransferForm(f => ({ ...f, floor_id: String(ten.floor_id) }));
                                setActiveActionsTenantId(null);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-650"
                            >
                              <ArrowLeftRight size={13} className="text-slate-400" />
                              <span>Transfer Bed</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionsTenantId(null);
                                navigate(`/tenant/edit/${ten.id}`);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-650"
                            >
                              <Edit2 size={13} className="text-slate-400" />
                              <span>Edit Details</span>
                            </button>
                            {hasPendingVerification ? (
                              <button
                                type="button"
                                onClick={() => verifyTenantPaymentStatus(ten)}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 flex items-center gap-2 text-emerald-700"
                              >
                                <ShieldCheck size={13} className="text-emerald-500" />
                                <span>Verify Collected Payment</span>
                              </button>
                            ) : hasVerifiedAdmissionPayment ? (
                              <div className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-sky-700">
                                {nextDueDate
                                  ? `Next Due ${formatDisplayDate(nextDueDate)}`
                                  : "Onboarding Payment Settled"}
                              </div>
                            ) : canCollectPayment ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentTenant(ten);
                                  setActiveActionsTenantId(null);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-650"
                              >
                                <Wallet size={13} className="text-slate-400" />
                                <span>Collect Payment</span>
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setVacateTenant(ten);
                                setVacateForm(f => ({ ...f, refundable_amount: Number(ten.deposit_paid || 0) }));
                                setActiveActionsTenantId(null);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-rose-600 hover:bg-rose-50/50"
                            >
                              <LogOut size={13} className="text-rose-400" />
                              <span>Check Out (Vacate)</span>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
                );
              })()
            ))}
          </div>
        )}
      </div>

      {/* Side-Drawer 1: Transfer Room Bed */}
      <AnimatePresence>
        {selectedTenantProfileId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeTenantProfileModal}
              className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[8px]"
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", damping: 24, stiffness: 240 }}
              className="fixed inset-x-4 top-6 bottom-6 z-50 mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div className="text-left">
                  <h3 className="text-lg font-black tracking-tight text-slate-800">
                    Tenant Onboarding File
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Full stay record, documents, payments, guardian details, and activity log.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeTenantProfileModal}
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {loadingTenantProfile ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center rounded-[28px] border border-slate-100 bg-slate-50/50">
                    <PageLoader />
                  </div>
                ) : tenantProfileError ? (
                  <div className="rounded-[28px] border border-slate-100 bg-white p-6">
                    <Error message={tenantProfileError} />
                  </div>
                ) : selectedTenantProfile ? (
                  <div className="flex flex-col gap-6 text-left">
                    <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            onClick={() => {
                              const photoUrl = getProfilePhotoUrl(selectedTenantProfile.profile_photo);
                              if (photoUrl) {
                                const photoMeta = selectedTenantProfile.profile_photo;
                                setPreviewAsset({
                                  title: `${selectedTenantProfile.full_name}'s Profile Photo`,
                                  url: photoUrl,
                                  kind: getPreviewKind(
                                    typeof photoMeta === "string" ? photoMeta : (photoMeta?.file_url || photoMeta?.url || ""),
                                    typeof photoMeta === "object" ? photoMeta?.mime_type : ""
                                  ),
                                });
                              }
                            }}
                            className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-orange-100 bg-orange-50 text-orange-500 shadow-inner ${getProfilePhotoUrl(selectedTenantProfile.profile_photo) ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                          >
                            {getProfilePhotoUrl(selectedTenantProfile.profile_photo) ? (
                              <img
                                src={getProfilePhotoUrl(selectedTenantProfile.profile_photo)}
                                alt={selectedTenantProfile.full_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserRound size={28} />
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xl font-black tracking-tight text-slate-850">
                                {selectedTenantProfile.full_name}
                              </h4>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClassName(selectedTenantProfile.status)}`}>
                                {selectedTenantProfile.status}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                              {selectedTenantProfile.admission_number || "No admission id"}
                            </p>
                            <p className="mt-3 text-sm font-bold text-slate-600">
                              {selectedTenantProfile.institution_name || "-"} • {selectedTenantProfile.floor_name || "-"} • Room {selectedTenantProfile.room_number || "-"} • {selectedTenantProfile.bed_number || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:min-w-[320px]">
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Check In</p>
                            <p className="mt-2 text-sm font-black text-slate-800">{formatDisplayDate(selectedTenantProfile.check_in_date)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Due</p>
                            <p className="mt-2 text-sm font-black text-slate-800">{formatDisplayDate(getNextDueDate(selectedTenantProfile))}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Rent</p>
                            <p className="mt-2 text-sm font-black text-slate-800">{formatCurrency(selectedTenantProfile.agreed_monthly_rent || selectedTenantProfile.room_rent_amount || 0)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deposit Paid</p>
                            <p className="mt-2 text-sm font-black text-slate-800">{formatCurrency(selectedTenantProfile.deposit_paid || 0)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-[28px] border border-slate-150 bg-white p-5 shadow-sm">
                        <h5 className="text-sm font-black text-slate-800">Personal Details</h5>
                        <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                          <div><span className={sectionLabelClassName}>Phone</span><p>{selectedTenantProfile.phone || "-"}</p></div>
                          <div><span className={sectionLabelClassName}>Email</span><p>{selectedTenantProfile.email || "-"}</p></div>
                          <div><span className={sectionLabelClassName}>Gender</span><p>{formatLabel(selectedTenantProfile.gender)}</p></div>
                          <div><span className={sectionLabelClassName}>Date Of Birth</span><p>{formatDisplayDate(selectedTenantProfile.date_of_birth)}</p></div>
                          <div><span className={sectionLabelClassName}>Occupation</span><p>{formatLabel(selectedTenantProfile.occupation)}</p></div>
                          <div><span className={sectionLabelClassName}>Company / College</span><p>{selectedTenantProfile.company_name || "-"}</p></div>
                          <div className="sm:col-span-2"><span className={sectionLabelClassName}>Address</span><p>{selectedTenantProfile.address || "-"}</p></div>
                          <div><span className={sectionLabelClassName}>City</span><p>{selectedTenantProfile.city || "-"}</p></div>
                          <div><span className={sectionLabelClassName}>State / Pincode</span><p>{selectedTenantProfile.state || "-"} {selectedTenantProfile.pincode || ""}</p></div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-150 bg-white p-5 shadow-sm">
                        <h5 className="text-sm font-black text-slate-800">Guardian & Emergency</h5>
                        <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                          <div><span className={sectionLabelClassName}>Guardian Name</span><p>{selectedTenantProfile.guardian_name || "-"}</p></div>
                          <div><span className={sectionLabelClassName}>Guardian Phone</span><p>{selectedTenantProfile.guardian_phone || "-"}</p></div>
                          <div><span className={sectionLabelClassName}>Guardian Relation</span><p>{selectedTenantProfile.guardian_relation || "-"}</p></div>
                          <div><span className={sectionLabelClassName}>Emergency Contact</span><p>{selectedTenantProfile.emergency_contact_name || "-"}</p></div>
                          <div><span className={sectionLabelClassName}>Emergency Phone</span><p>{selectedTenantProfile.emergency_contact_phone || "-"}</p></div>
                          <div><span className={sectionLabelClassName}>Expected Checkout</span><p>{formatDisplayDate(selectedTenantProfile.expected_checkout_date || selectedTenantProfile.checkout_date)}</p></div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-150 bg-white p-5 shadow-sm">
                        <h5 className="text-sm font-black text-slate-800">Payment & Billing</h5>
                        <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                          <div><span className={sectionLabelClassName}>Billing Cycle</span><p>{selectedTenantProfile.billing_cycle_type === "calendar_month_prorated" ? "Current month prorated" : "Same date every month"}</p></div>
                          <div><span className={sectionLabelClassName}>Anchor Day</span><p>{selectedTenantProfile.billing_cycle_anchor_day || "-"}</p></div>
                          <div><span className={sectionLabelClassName}>First Cycle Start</span><p>{formatDisplayDate(selectedTenantProfile.first_cycle_start_date)}</p></div>
                          <div><span className={sectionLabelClassName}>First Cycle End</span><p>{formatDisplayDate(selectedTenantProfile.first_cycle_end_date)}</p></div>
                          <div><span className={sectionLabelClassName}>First Cycle Amount</span><p>{formatCurrency(selectedTenantProfile.first_cycle_amount || 0)}</p></div>
                          <div><span className={sectionLabelClassName}>Notes</span><p>{selectedTenantProfile.notes || "-"}</p></div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-150 bg-white p-5 shadow-sm">
                        <h5 className="text-sm font-black text-slate-800">Documents Uploaded</h5>
                        <div className="mt-4 grid gap-3">
                          {(selectedTenantProfile.documents || []).length === 0 ? (
                            <p className="text-sm font-semibold text-slate-500">No documents uploaded.</p>
                          ) : (
                            selectedTenantProfile.documents.map((document) => (
                              <div key={document.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black text-slate-800">{document.document_name || "Document"}</p>
                                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{document.document_type || "-"}</p>
                                    <p className="mt-2 text-xs font-semibold text-slate-600">Number: {document.document_number || "-"}</p>
                                  </div>
                                  {document.file_url && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAsset({
                                        title: document.document_name || "Document Preview",
                                        url: getAssetUrl(document.file_url),
                                        kind: getPreviewKind(document.file_url, document.mime_type),
                                      })}
                                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:border-orange-200 hover:text-orange-500"
                                    >
                                      Preview
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-[28px] border border-slate-150 bg-white p-5 shadow-sm">
                        <h5 className="text-sm font-black text-slate-800">Payment Timeline</h5>
                        <div className="mt-4 grid gap-3">
                          {(selectedTenantProfile.payments || []).length === 0 ? (
                            <p className="text-sm font-semibold text-slate-500">No payments logged.</p>
                          ) : (
                            selectedTenantProfile.payments.map((payment) => (
                              <div key={payment.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black text-slate-800">{formatCurrency(payment.amount)}</p>
                                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                      {payment.payment_type || "payment"} • {payment.payment_mode || "mode"} • {formatDisplayDate(payment.payment_date)}
                                    </p>
                                    <p className="mt-2 text-xs font-semibold text-slate-600">Ref: {payment.reference_number || "-"}</p>
                                  </div>
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClassName(payment.verification_status || payment.status || "pending")}`}>
                                    {payment.verification_status || payment.status || "pending"}
                                  </span>
                                </div>
                                {payment.payment_proof_url && (
                                  <div className="mt-3 flex items-center justify-between rounded-2xl border border-orange-100 bg-orange-50/50 px-3 py-2">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                                        Payment Proof
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-slate-600">
                                        Screenshot / receipt uploaded
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAsset({
                                        title: `${payment.payment_type || "Payment"} Proof`,
                                        url: getAssetUrl(payment.payment_proof_url),
                                        kind: getPreviewKind(payment.payment_proof_url),
                                      })}
                                      className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-orange-600 transition hover:border-orange-300"
                                    >
                                      Preview
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-150 bg-white p-5 shadow-sm">
                        <h5 className="text-sm font-black text-slate-800">Activity Timeline</h5>
                        <div className="mt-4 grid gap-3">
                          {(selectedTenantProfile.activity_logs || []).length === 0 ? (
                            <p className="text-sm font-semibold text-slate-500">No activity logs recorded.</p>
                          ) : (
                            selectedTenantProfile.activity_logs.slice(0, 1).map((log) => {
                              const activityDetails = getActivityDetails(log);

                              return (
                                <div key={log.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                                  <p className="text-sm font-black text-slate-800">{formatLabel(log.action || "activity")}</p>
                                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{formatDisplayDate(log.created_at)}</p>
                                  <div className="mt-3 grid gap-2">
                                    {activityDetails.map((item) => (
                                      <div key={`${log.id}-${item.label}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                          {item.label}
                                        </span>
                                        <span className="max-w-[58%] text-right text-xs font-bold text-slate-700 break-words">
                                          {item.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>

            <AnimatePresence>
              {previewAsset && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setPreviewAsset(null)}
                    className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[6px]"
                  />

                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.98 }}
                    transition={{ type: "spring", damping: 24, stiffness: 240 }}
                    className="fixed inset-x-10 top-12 bottom-12 z-[61] mx-auto flex max-w-4xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                      <div className="text-left">
                        <h4 className="text-base font-black text-slate-800">
                          {previewAsset.title || "Preview"}
                        </h4>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          Previewing inside the tenant popup only.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewAsset(null)}
                        className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-auto bg-slate-50/60 p-5">
                      {previewAsset.kind === "image" ? (
                        <div className="flex h-full min-h-[400px] items-center justify-center rounded-[28px] border border-slate-200 bg-white p-4">
                          <img
                            src={previewAsset.url}
                            alt={previewAsset.title || "Preview"}
                            className="max-h-full max-w-full rounded-2xl object-contain"
                          />
                        </div>
                      ) : previewAsset.kind === "pdf" ? (
                        <iframe
                          src={previewAsset.url}
                          title={previewAsset.title || "Preview"}
                          className="h-full min-h-[520px] w-full rounded-[28px] border border-slate-200 bg-white"
                        />
                      ) : (
                        <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white p-6 text-center">
                          <p className="text-sm font-black text-slate-800">Inline preview is not available for this file type.</p>
                          <a
                            href={previewAsset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-orange-600"
                          >
                            Open File
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>

      {/* Side-Drawer 1: Transfer Room Bed */}
      <AnimatePresence>
        {transferTenant && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransferTenant(null)}
              className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[6px]"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 p-6 flex flex-col justify-between border-l border-slate-150 text-left overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-orange-500 border border-orange-100/50">
                      <ArrowLeftRight size={16} />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">Transfer Bed Space</h4>
                      <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">{transferTenant.full_name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransferTenant(null)}
                    className="p-1 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Transfer stay configs */}
                <div className="mt-5 flex flex-col gap-4">
                  {/* Current Stay */}
                  <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Current Bed Space</span>
                    <p className="text-xs font-bold text-slate-700 mt-2">
                      {transferTenant.floor_name} • Room {transferTenant.room_number} • Bed {transferTenant.bed_number}
                    </p>
                  </div>

                  {/* Level selection */}
                  {selectedTransferInstitution ? (
                    <div className="flex flex-col gap-4">
                      <div className="grid gap-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Target Floor Level</label>
                        <select
                          value={transferForm.floor_id}
                          onChange={(e) => {
                            const flId = e.target.value;
                            setTransferSelectedFloorId(Number(flId));
                            setTransferForm(f => ({ ...f, floor_id: flId, room_id: "", bed_id: "" }));
                          }}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
                        >
                          <option value="">Choose Level</option>
                          {selectedTransferInstitution.floors.map(fl => (
                            <option key={fl.id} value={fl.id}>{fl.floor_name}</option>
                          ))}
                        </select>
                      </div>

                      {selectedTransferFloor && (
                        <div className="grid gap-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Room</label>
                          <select
                            value={transferForm.room_id}
                            onChange={(e) => {
                              const rmId = e.target.value;
                              setTransferSelectedRoomId(Number(rmId));
                              setTransferForm(f => ({ ...f, room_id: rmId, bed_id: "" }));
                            }}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
                          >
                            <option value="">Choose Room</option>
                            {selectedTransferFloor.rooms.map(rm => (
                              <option key={rm.id} value={rm.id}>Room {rm.room_number} ({rm.room_type} Share)</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Visual Bed Selection */}
                      {selectedTransferRoom && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                          <div className="mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Available Bed</span>
                          </div>
                          <BedLayout
                            beds={selectedTransferRoom.beds}
                            selectedBedIndex={selectedTransferRoom.beds.findIndex(b => Number(b.id) === Number(transferForm.bed_id))}
                            onBedClick={(bIdx) => {
                              const clickedBed = selectedTransferRoom.beds[bIdx];
                              if (String(clickedBed.status || "").toLowerCase() !== "vacant") {
                                return;
                              }
                              setTransferForm(f => ({ ...f, bed_id: String(clickedBed.id) }));
                            }}
                          />
                        </div>
                      )}

                      <div className="grid gap-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Reason for Transfer</label>
                        <textarea
                          value={transferForm.transfer_reason}
                          onChange={(e) => setTransferForm(f => ({ ...f, transfer_reason: e.target.value }))}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                          placeholder="Upsizing room, payment dues adjustments, complaints, etc."
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No floors configured in this PG hierarchy.</p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setTransferTenant(null)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransferSubmit}
                  disabled={submittingAction}
                  className="flex-1 h-11 rounded-xl bg-slate-800 text-xs font-bold text-white shadow hover:bg-slate-900 transition-all"
                >
                  {submittingAction ? "Processing..." : "Complete Transfer"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Side-Drawer 2: Vacate Check Out stay */}
      <AnimatePresence>
        {vacateTenant && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVacateTenant(null)}
              className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[6px]"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 p-6 flex flex-col justify-between border-l border-slate-150 text-left overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-500 border border-rose-100/50">
                      <LogOut size={16} />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">Check Out Resident</h4>
                      <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">{vacateTenant.full_name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVacateTenant(null)}
                    className="p-1 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-4 text-xs font-semibold text-slate-700">
                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Checkout Exit Date</label>
                    <input
                      type="date"
                      value={vacateForm.checkout_date}
                      onChange={(e) => setVacateForm(f => ({ ...f, checkout_date: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Damage / Maintenance Deductions</label>
                    <input
                      type="number"
                      value={vacateForm.damage_charges}
                      onChange={(e) => setVacateForm(f => ({ ...f, damage_charges: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Final Refundable Deposit</label>
                    <input
                      type="number"
                      value={vacateForm.refundable_amount}
                      onChange={(e) => setVacateForm(f => ({ ...f, refundable_amount: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Deposit Refund Status</label>
                    <select
                      value={vacateForm.deposit_refund_status}
                      onChange={(e) => setVacateForm(f => ({ ...f, deposit_refund_status: e.target.value }))}
                      className={inputClassName}
                    >
                      <option value="pending">Pending Clearance</option>
                      <option value="refunded">Refund Cleared</option>
                      <option value="forfeited">Forfeited / Adjusted</option>
                    </select>
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Check-out Notes</label>
                    <textarea
                      value={vacateForm.notes}
                      onChange={(e) => setVacateForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none text-xs font-bold"
                      placeholder="Security clearance remark, keys returned state, inventory issues, etc."
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setVacateTenant(null)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVacateSubmit}
                  disabled={submittingAction}
                  className="flex-1 h-11 rounded-xl bg-rose-600 text-xs font-bold text-white shadow hover:bg-rose-700 transition-all"
                >
                  {submittingAction ? "Processing..." : "Complete Exit"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Side-Drawer 3: Add Payment Log */}
      <AnimatePresence>
        {paymentTenant && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaymentTenant(null)}
              className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[6px]"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 p-6 flex flex-col justify-between border-l border-slate-150 text-left overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-orange-500 border border-orange-100/50">
                      <Wallet size={16} />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">Collect Payment</h4>
                      <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">{paymentTenant.full_name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentTenant(null)}
                    className="p-1 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-4 text-xs font-semibold text-slate-700">
                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Collection Amount</label>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Payment Type</label>
                    <select
                      value={paymentForm.payment_type}
                      onChange={(e) => setPaymentForm(f => ({ ...f, payment_type: e.target.value }))}
                      className={inputClassName}
                    >
                      <option value="rent">Rent</option>
                      <option value="deposit">Security Deposit</option>
                      <option value="admission">Admission Fee</option>
                    </select>
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Payment Mode</label>
                    <select
                      value={paymentForm.payment_mode}
                      onChange={(e) => setPaymentForm(f => ({ ...f, payment_mode: e.target.value }))}
                      className={inputClassName}
                    >
                      <option value="upi">UPI / Scanner</option>
                      <option value="cash">Cash Collection</option>
                      <option value="bank_transfer">Net Banking</option>
                    </select>
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Reference Number</label>
                    <input
                      type="text"
                      value={paymentForm.reference_number}
                      onChange={(e) => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Payment Date</label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>

                  {/* Drag and Drop Payment Slip */}
                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Upload Proof Screenshot</label>
                    <div
                      onDragEnter={(e) => handleDrag(e, "proof_log")}
                      onDragOver={(e) => handleDrag(e, "proof_log")}
                      onDragLeave={(e) => handleDrag(e, "proof_log")}
                      onDrop={(e) => handleDrop(e, "proof_log", (file) => setPaymentForm(f => ({ ...f, payment_proof_file: file })))}
                      className={`rounded-2xl border-2 border-dashed p-4 text-center transition-all flex flex-col items-center justify-center gap-1.5 min-h-[120px] cursor-pointer ${
                        dragActives["proof_log"]
                          ? "border-orange-500 bg-orange-50/10"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPaymentForm(f => ({ ...f, payment_proof_file: e.target.files?.[0] || null }))}
                        className="hidden"
                        id="proofLogInput"
                      />

                      {paymentForm.payment_proof_file ? (
                        <div className="flex flex-col items-center gap-1">
                          <CheckCircle2 size={20} className="text-emerald-500" />
                          <span className="text-[11px] font-bold text-slate-800 truncate max-w-[190px]">{paymentForm.payment_proof_file.name}</span>
                          <label htmlFor="proofLogInput" className="text-[9px] font-black uppercase tracking-wider text-orange-500 cursor-pointer">Change Image</label>
                        </div>
                      ) : (
                        <label htmlFor="proofLogInput" className="flex flex-col items-center gap-1.5 cursor-pointer w-full">
                          <Upload size={14} className="text-orange-500" />
                          <span className="text-xs font-black text-slate-800">Drag & Drop or Click</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <label className={sectionLabelClassName}>Receipt Remarks</label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentTenant(null)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePaymentSubmit}
                  disabled={submittingAction}
                  className="flex-1 h-11 rounded-xl bg-slate-800 text-xs font-bold text-white shadow hover:bg-slate-900 transition-all"
                >
                  {submittingAction ? "Processing..." : "Save Payment"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </TenantShell>
  );
};

export default ActiveTenants;
