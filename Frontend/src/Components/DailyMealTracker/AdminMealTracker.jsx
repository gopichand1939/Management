import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  UtensilsCrossed,
  Search,
  Calendar,
  Layers,
  Home,
  Check,
  X as CloseIcon,
  Printer,
  FileSpreadsheet,
  History,
  Save,
  Building,
  AlertTriangle,
  ClipboardList,
  DollarSign,
  TrendingUp,
  UserX,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageLoader from "../Common/PageLoader";
import Error from "../Common/Error";
import {
  MEAL_TRACKER_SUMMARY,
  MEAL_TRACKER_LIST,
  MEAL_TRACKER_SAVE,
  MEAL_TRACKER_BULK_SAVE,
  MEAL_TRACKER_MONTHLY_REPORT,
  MEAL_TRACKER_DAYWISE_REPORT,
  MEAL_TRACKER_ACTUAL_STATS_SAVE,
  MEAL_TRACKER_TENANT_GET,
  PG_ADMIN_MY_INSTITUTION,
  INSTITUTION_LIST,
  MEAL_TRACKER_SETTINGS_GET,
  MEAL_TRACKER_SETTINGS_SAVE
} from "../../Utils/Constants";
import { getAuthHeaders } from "../Tenant/tenantHelpers";
import Sidebar from "../Layout/Sidebar";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const pageFlipVariants = {
  initial: {
    rotateY: -10,
    opacity: 0,
    transformOrigin: "left center",
    scale: 0.98
  },
  animate: {
    rotateY: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut" }
  },
  exit: {
    rotateY: 10,
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.25, ease: "easeIn" }
  }
};

const AdminMealTracker = () => {
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  // Institution Selection (Supports Super Admin and PG Admin)
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [instLoading, setInstLoading] = useState(false);

  // Core State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [mealsData, setMealsData] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalActiveTenants: 0,
    breakfastCount: 0,
    lunchCount: 0,
    dinnerCount: 0,
    fullDayLeaveCount: 0,
    vacationCount: 0,
    skippedMealsCount: 0,
    kitchenPrepCount: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters & Search
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Grid Edit States
  const [editedRecords, setEditedRecords] = useState({});
  const [selectedTenantIds, setSelectedTenantIds] = useState([]);

  // Active View Tab: 'daily' | 'monthly' | 'daywise' | 'settings'
  const [activeTab, setActiveTab] = useState("daily");

  // Day-wise Report States
  const getPastDateStr = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  };
  const [daywiseStartDate, setDaywiseStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [daywiseEndDate, setDaywiseEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [daywiseReportData, setDaywiseReportData] = useState([]);
  const [daywiseLoading, setDaywiseLoading] = useState(false);

  // Cooked and Leftover Input States (for main Daily Tracker screen)
  const [bfCooked, setBfCooked] = useState("");
  const [bfLeft, setBfLeft] = useState("");
  const [lhCooked, setLhCooked] = useState("");
  const [lhLeft, setLhLeft] = useState("");
  const [dnCooked, setDnCooked] = useState("");
  const [dnLeft, setDnLeft] = useState("");
  const [actualDailyExpenseInput, setActualDailyExpenseInput] = useState("");

  // Portal settings states
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [liveSupportEnabled, setLiveSupportEnabled] = useState(true);
  const [mealTrackerEnabled, setMealTrackerEnabled] = useState(true);

  // Toast notifications state
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (summaryData) {
      setBfCooked(summaryData.breakfastCooked !== undefined ? String(summaryData.breakfastCooked) : String(summaryData.breakfastCount || 0));
      setBfLeft(summaryData.breakfastLeft !== undefined ? String(summaryData.breakfastLeft) : "0");
      setLhCooked(summaryData.lunchCooked !== undefined ? String(summaryData.lunchCooked) : String(summaryData.lunchCount || 0));
      setLhLeft(summaryData.lunchLeft !== undefined ? String(summaryData.lunchLeft) : "0");
      setDnCooked(summaryData.dinnerCooked !== undefined ? String(summaryData.dinnerCooked) : String(summaryData.dinnerCount || 0));
      setDnLeft(summaryData.dinnerLeft !== undefined ? String(summaryData.dinnerLeft) : "0");
      setActualDailyExpenseInput(summaryData.actualDailyExpense !== undefined && summaryData.actualDailyExpense !== null ? String(summaryData.actualDailyExpense) : "");
    }
  }, [summaryData]);

  const dateCards = useMemo(() => {
    const today = new Date();
    const cards = [];
    let containsSelected = false;

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = date.getDate();
      const monthName = date.toLocaleDateString("en-US", { month: "short" });
      const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayName;
      if (dateStr === selectedDate) containsSelected = true;
      cards.push({ dateStr, dayName, dayNum, monthName, label });
    }

    if (!containsSelected && selectedDate) {
      const date = new Date(selectedDate + "T00:00:00");
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = date.getDate();
      const monthName = date.toLocaleDateString("en-US", { month: "short" });
      cards.push({ dateStr: selectedDate, dayName, dayNum, monthName, label: "Selected" });
    }

    return cards;
  }, [selectedDate]);

  const [breakfastInput, setBreakfastInput] = useState("40");
  const [breakfastMode, setBreakfastMode] = useState("unit");

  const [lunchInput, setLunchInput] = useState("60");
  const [lunchMode, setLunchMode] = useState("unit");

  const [dinnerInput, setDinnerInput] = useState("60");
  const [dinnerMode, setDinnerMode] = useState("unit");

  // Load from localStorage on date/PG change
  useEffect(() => {
    if (!selectedInstitutionId || !selectedDate) return;

    const key = `meal_exp_${selectedInstitutionId}_${selectedDate}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBreakfastInput(parsed.breakfastInput ?? "40");
        setBreakfastMode(parsed.breakfastMode ?? "unit");
        setLunchInput(parsed.lunchInput ?? "60");
        setLunchMode(parsed.lunchMode ?? "unit");
        setDinnerInput(parsed.dinnerInput ?? "60");
        setDinnerMode(parsed.dinnerMode ?? "unit");
      } catch (e) {
        console.error("Failed to parse saved meal expenses", e);
      }
    } else {
      // Defaults
      setBreakfastInput("40");
      setBreakfastMode("unit");
      setLunchInput("60");
      setLunchMode("unit");
      setDinnerInput("60");
      setDinnerMode("unit");
    }
  }, [selectedDate, selectedInstitutionId]);

  // Save to localStorage when values change
  useEffect(() => {
    if (!selectedInstitutionId || !selectedDate) return;

    const key = `meal_exp_${selectedInstitutionId}_${selectedDate}`;
    const payload = {
      breakfastInput,
      breakfastMode,
      lunchInput,
      lunchMode,
      dinnerInput,
      dinnerMode
    };
    localStorage.setItem(key, JSON.stringify(payload));
  }, [breakfastInput, breakfastMode, lunchInput, lunchMode, dinnerInput, dinnerMode, selectedDate, selectedInstitutionId]);

  const bPlateRate = useMemo(() => {
    if (breakfastMode === "unit") return Number(breakfastInput || 0);
    return summaryData.breakfastCount > 0 ? Number((Number(breakfastInput || 0) / summaryData.breakfastCount).toFixed(2)) : 0;
  }, [breakfastInput, breakfastMode, summaryData.breakfastCount]);

  const totalBSpent = useMemo(() => {
    if (breakfastMode === "unit") return (summaryData.breakfastCount || 0) * Number(breakfastInput || 0);
    return Number(breakfastInput || 0);
  }, [breakfastInput, breakfastMode, summaryData.breakfastCount]);

  const lPlateRate = useMemo(() => {
    if (lunchMode === "unit") return Number(lunchInput || 0);
    return summaryData.lunchCount > 0 ? Number((Number(lunchInput || 0) / summaryData.lunchCount).toFixed(2)) : 0;
  }, [lunchInput, lunchMode, summaryData.lunchCount]);

  const totalLSpent = useMemo(() => {
    if (lunchMode === "unit") return (summaryData.lunchCount || 0) * Number(lunchInput || 0);
    return Number(lunchInput || 0);
  }, [lunchInput, lunchMode, summaryData.lunchCount]);

  const dPlateRate = useMemo(() => {
    if (dinnerMode === "unit") return Number(dinnerInput || 0);
    return summaryData.dinnerCount > 0 ? Number((Number(dinnerInput || 0) / summaryData.dinnerCount).toFixed(2)) : 0;
  }, [dinnerInput, dinnerMode, summaryData.dinnerCount]);

  const totalDSpent = useMemo(() => {
    if (dinnerMode === "unit") return (summaryData.dinnerCount || 0) * Number(dinnerInput || 0);
    return Number(dinnerInput || 0);
  }, [dinnerInput, dinnerMode, summaryData.dinnerCount]);

  const totalDailySpent = totalBSpent + totalLSpent + totalDSpent;

  // Monthly Report States
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [monthlyReportData, setMonthlyReportData] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // History Modal States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTenant, setHistoryTenant] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 1. Fetch PG Institutions on mount
  useEffect(() => {
    const fetchInstitutions = async () => {
      setInstLoading(true);
      setError("");
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
        } else {
          setError(data.message || "Failed to load institutions list");
        }
      } catch (err) {
        setError("Error loading PG Hostel list.");
      } finally {
        setInstLoading(false);
      }
    };
    fetchInstitutions();
  }, [isPgAdmin]);

  // 2. Fetch Summary & Daily List
  const fetchDailyData = async (date, instId) => {
    if (!instId) return;
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Summary
      const summaryRes = await fetch(`${MEAL_TRACKER_SUMMARY}?date=${date}&institutionId=${instId}`, {
        headers: getAuthHeaders()
      });
      const summaryJson = await summaryRes.json();
      if (summaryJson.success) {
        setSummaryData(summaryJson.data);
      }

      // 2. Fetch Daily Meals List
      const listRes = await fetch(`${MEAL_TRACKER_LIST}?date=${date}&institutionId=${instId}`, {
        headers: getAuthHeaders()
      });
      const listJson = await listRes.json();
      if (listJson.success) {
        setMealsData(listJson.data);
        setEditedRecords({});
        setSelectedTenantIds([]);
      } else {
        setError(listJson.message || "Failed to fetch daily meals list");
      }
    } catch (err) {
      setError("Error connecting to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Monthly Report
  const fetchMonthlyData = async (year, month, instId) => {
    if (!instId) return;
    setMonthlyLoading(true);
    try {
      const res = await fetch(`${MEAL_TRACKER_MONTHLY_REPORT}?year=${year}&month=${month}&institutionId=${instId}`, {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setMonthlyReportData(json.data);
      } else {
        setError(json.message || "Failed to fetch monthly report");
      }
    } catch (err) {
      setError("Error connecting to the server.");
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Fetch Day-wise Report Data
  const fetchDayWiseData = async (start, end, instId) => {
    if (!instId) return;
    setDaywiseLoading(true);
    setError("");
    try {
      const res = await fetch(`${MEAL_TRACKER_DAYWISE_REPORT}?startDate=${start}&endDate=${end}&institutionId=${instId}`, {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setDaywiseReportData(json.data);
      } else {
        setError(json.message || "Failed to fetch day-wise report");
      }
    } catch (err) {
      setError("Error connecting to the server.");
    } finally {
      setDaywiseLoading(false);
    }
  };

  // Save Cooked & Leftover actual stats
  const handleSaveActualStats = async () => {
    setLoading(true);
    setSuccessMsg("");
    setError("");
    try {
      const res = await fetch(MEAL_TRACKER_ACTUAL_STATS_SAVE, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mealDate: selectedDate,
          institutionId: selectedInstitutionId,
          breakfastCooked: bfCooked,
          breakfastLeft: bfLeft,
          lunchCooked: lhCooked,
          lunchLeft: lhLeft,
          dinnerCooked: dnCooked,
          dinnerLeft: dnLeft,
          actualDailyExpense: actualDailyExpenseInput !== "" ? parseFloat(actualDailyExpenseInput) : null
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Cooked, Leftover & Expense stats saved successfully!");
        setToast({
          message: "Cooked, Leftover & Expense stats saved successfully!",
          type: "success"
        });
        fetchDailyData(selectedDate, selectedInstitutionId);
      } else {
        setError(json.message || "Failed to save stats");
      }
    } catch (err) {
      setError("Error saving actual stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInstitutionId) {
      if (activeTab === "daily") {
        fetchDailyData(selectedDate, selectedInstitutionId);
      } else if (activeTab === "monthly") {
        fetchMonthlyData(reportYear, reportMonth, selectedInstitutionId);
      } else if (activeTab === "daywise") {
        fetchDayWiseData(daywiseStartDate, daywiseEndDate, selectedInstitutionId);
      }
    }
  }, [selectedDate, activeTab, reportYear, reportMonth, daywiseStartDate, daywiseEndDate, selectedInstitutionId]);

  const getCellValue = (tenant, field) => {
    const tenantId = tenant.tenant_id;
    if (editedRecords[tenantId] && editedRecords[tenantId][field] !== undefined) {
      return editedRecords[tenantId][field];
    }
    return tenant[field];
  };

  // Extract unique floors and rooms from mealsData for dropdown filters
  const floors = useMemo(() => {
    const map = new Map();
    mealsData.forEach(m => {
      if (m.floor_id) {
        map.set(m.floor_id, m.floor_name);
      }
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [mealsData]);

  const rooms = useMemo(() => {
    const map = new Map();
    mealsData.forEach(m => {
      if (m.room_id && (selectedFloor === "all" || m.floor_id === Number(selectedFloor))) {
        map.set(m.room_id, m.room_number);
      }
    });
    return [...map.entries()].map(([id, number]) => ({ id, number })).sort((a, b) => String(a.number).localeCompare(String(b.number)));
  }, [mealsData, selectedFloor]);

  // Filtered List
  const filteredMeals = useMemo(() => {
    return mealsData.filter(m => {
      const matchFloor = selectedFloor === "all" || m.floor_id === Number(selectedFloor);
      const matchRoom = selectedRoom === "all" || m.room_id === Number(selectedRoom);
      const matchSearch = !searchQuery ||
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery);
      return matchFloor && matchRoom && matchSearch;
    });
  }, [mealsData, selectedFloor, selectedRoom, searchQuery]);

  // DERIVED DATA: Absentees ("Who has not had")
  const absentees = useMemo(() => {
    const breakfastAbs = [];
    const lunchAbs = [];
    const dinnerAbs = [];

    mealsData.forEach(m => {
      const bState = getCellValue(m, "breakfast");
      const lState = getCellValue(m, "lunch");
      const dState = getCellValue(m, "dinner");
      const isLeave = getCellValue(m, "full_day_leave");
      const isVacation = getCellValue(m, "vacation");

      if (isLeave || isVacation || bState === "skipping") {
        breakfastAbs.push({ id: m.tenant_id, name: m.full_name, room: m.room_number, reason: isVacation ? "Vacation" : isLeave ? "Leave" : (m.reason || "Skipped") });
      }
      if (isLeave || isVacation || lState === "skipping") {
        lunchAbs.push({ id: m.tenant_id, name: m.full_name, room: m.room_number, reason: isVacation ? "Vacation" : isLeave ? "Leave" : (m.reason || "Skipped") });
      }
      if (isLeave || isVacation || dState === "skipping") {
        dinnerAbs.push({ id: m.tenant_id, name: m.full_name, room: m.room_number, reason: isVacation ? "Vacation" : isLeave ? "Leave" : (m.reason || "Skipped") });
      }
    });

    return {
      breakfast: breakfastAbs,
      lunch: lunchAbs,
      dinner: dinnerAbs
    };
  }, [mealsData, editedRecords]);

  // Handle local state edit of a row
  const handleCellChange = (tenantId, field, value) => {
    const currentVal = editedRecords[tenantId] || mealsData.find(m => m.tenant_id === tenantId) || {};

    let updated = {
      ...currentVal,
      tenant_id: tenantId,
      meal_date: selectedDate,
      [field]: value
    };

    if (field === "full_day_leave" && value === true) {
      updated.breakfast = "skipping";
      updated.lunch = "skipping";
      updated.dinner = "skipping";
      updated.vacation = false;
    } else if (field === "vacation" && value === true) {
      updated.breakfast = "skipping";
      updated.lunch = "skipping";
      updated.dinner = "skipping";
      updated.full_day_leave = false;
    }

    setEditedRecords(prev => ({
      ...prev,
      [tenantId]: updated
    }));
  };



  // Save single row
  const handleSaveRow = async (tenant) => {
    const tenantId = tenant.tenant_id;
    const localChanges = editedRecords[tenantId];
    if (!localChanges) return;

    setLoading(true);
    setSuccessMsg("");
    setError("");
    try {
      const res = await fetch(MEAL_TRACKER_SAVE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tenantId: tenantId,
          mealDate: selectedDate,
          institutionId: selectedInstitutionId,
          breakfast: localChanges.breakfast !== undefined ? localChanges.breakfast : tenant.breakfast,
          lunch: localChanges.lunch !== undefined ? localChanges.lunch : tenant.lunch,
          dinner: localChanges.dinner !== undefined ? localChanges.dinner : tenant.dinner,
          fullDayLeave: localChanges.full_day_leave !== undefined ? localChanges.full_day_leave : tenant.full_day_leave,
          vacation: localChanges.vacation !== undefined ? localChanges.vacation : tenant.vacation,
          reason: localChanges.reason !== undefined ? localChanges.reason : tenant.reason
        })
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Preferences saved for ${tenant.full_name}`);
        setToast({
          message: `Preferences saved for ${tenant.full_name}`,
          type: "success"
        });
        fetchDailyData(selectedDate, selectedInstitutionId);
      } else {
        setError(json.message || "Failed to save meal preferences");
        setToast({
          message: json.message || "Failed to save meal preferences",
          type: "error"
        });
      }
    } catch (err) {
      setError("Error saving changes.");
    } finally {
      setLoading(false);
    }
  };

  // Bulk Save
  const handleBulkSave = async () => {
    const recordsToSave = Object.values(editedRecords);
    if (recordsToSave.length === 0) return;

    setLoading(true);
    setSuccessMsg("");
    setError("");
    try {
      const res = await fetch(MEAL_TRACKER_BULK_SAVE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          records: recordsToSave,
          institutionId: selectedInstitutionId
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg("All changes saved successfully!");
        setToast({
          message: "All changes saved successfully!",
          type: "success"
        });
        fetchDailyData(selectedDate, selectedInstitutionId);
      } else {
        setError(json.message || "Failed bulk save operation");
        setToast({
          message: json.message || "Failed bulk save operation",
          type: "error"
        });
      }
    } catch (err) {
      setError("Error during bulk save.");
    } finally {
      setLoading(false);
    }
  };

  // Apply Bulk updates locally
  const handleApplyBulkAction = (actionType, value) => {
    if (selectedTenantIds.length === 0) return;

    const newEdits = { ...editedRecords };
    selectedTenantIds.forEach(id => {
      const original = mealsData.find(m => m.tenant_id === id) || {};
      const currentEdit = newEdits[id] || {};

      let updated = {
        ...original,
        ...currentEdit,
        tenant_id: id,
        meal_date: selectedDate
      };

      if (actionType === "breakfast" || actionType === "lunch" || actionType === "dinner") {
        if (!updated.full_day_leave && !updated.vacation) {
          updated[actionType] = value;
        }
      } else if (actionType === "leave") {
        updated.full_day_leave = value;
        if (value) {
          updated.breakfast = "skipping";
          updated.lunch = "skipping";
          updated.dinner = "skipping";
          updated.vacation = false;
        }
      } else if (actionType === "vacation") {
        updated.vacation = value;
        if (value) {
          updated.breakfast = "skipping";
          updated.lunch = "skipping";
          updated.dinner = "skipping";
          updated.full_day_leave = false;
        }
      }

      newEdits[id] = updated;
    });

    setEditedRecords(newEdits);
  };

  // History logs
  const handleViewHistory = async (tenant) => {
    setHistoryTenant(tenant);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${MEAL_TRACKER_TENANT_GET}/${tenant.tenant_id}?date=${selectedDate}`, {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setHistoryLogs(json.data.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch and save portal configuration settings
  const fetchSettings = async () => {
    if (!selectedInstitutionId) return;
    setSettingsLoading(true);
    try {
      const res = await fetch(`${MEAL_TRACKER_SETTINGS_GET}?institutionId=${selectedInstitutionId}`, {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setLiveSupportEnabled(json.data.live_support_enabled);
        setMealTrackerEnabled(json.data.meal_tracker_enabled);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSuccessMsg("");
    setError("");
    try {
      const res = await fetch(MEAL_TRACKER_SETTINGS_SAVE, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          institutionId: selectedInstitutionId,
          liveSupportEnabled,
          mealTrackerEnabled
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Portal settings updated successfully!");
        setToast({
          message: "Settings updated successfully",
          type: "success"
        });
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setError("Failed to save portal settings.");
        setToast({
          message: "Failed to save portal settings",
          type: "error"
        });
      }
    } catch (err) {
      setError("Connection error saving settings.");
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "settings" && selectedInstitutionId) {
      fetchSettings();
    }
  }, [selectedInstitutionId, activeTab]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["Tenant Name", "Phone", "Floor", "Room", "Breakfast", "Lunch", "Dinner", "Full Day Leave", "Vacation", "Reason/Remarks"];
    const rows = filteredMeals.map(m => [
      m.full_name,
      m.phone,
      m.floor_name || "-",
      m.room_number || "-",
      getCellValue(m, "breakfast") === "taking" ? "Yes" : "No",
      getCellValue(m, "lunch") === "taking" ? "Yes" : "No",
      getCellValue(m, "dinner") === "taking" ? "Yes" : "No",
      getCellValue(m, "full_day_leave") ? "Yes" : "No",
      getCellValue(m, "vacation") ? "Yes" : "No",
      getCellValue(m, "reason") || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daily_meal_sheet_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDayWiseCSV = () => {
    const headers = [
      "Date", 
      "Total Active Tenants", 
      "Breakfast Cooked", 
      "Breakfast Leftover", 
      "Lunch Cooked", 
      "Lunch Leftover", 
      "Dinner Cooked", 
      "Dinner Leftover", 
      "Total Cooked Qty (Parsed)", 
      "Total Leftover Qty (Parsed)",
      "Estimated/Actual Expense (INR)"
    ];
    const rows = daywiseReportData.map(d => {
      const parseQty = (val) => {
        if (typeof val === "number") return val;
        if (!val) return 0;
        const match = val.match(/[\d.]+/);
        if (!match) return 0;
        const parsed = parseFloat(match[0]);
        return isNaN(parsed) ? 0 : parsed;
      };

      const bC = d.breakfast_cooked ?? "0";
      const bL = d.breakfast_left ?? "0";
      const lC = d.lunch_cooked ?? "0";
      const lL = d.lunch_left ?? "0";
      const dC = d.dinner_cooked ?? "0";
      const dL = d.dinner_left ?? "0";

      const totalC = parseQty(bC) + parseQty(lC) + parseQty(dC);
      const totalL = parseQty(bL) + parseQty(lL) + parseQty(dL);

      const dateStr = d.meal_date.split("T")[0];
      const dayExpense = d.actual_daily_expense !== null && d.actual_daily_expense !== undefined
        ? Number(d.actual_daily_expense)
        : getDayExpense(dateStr, parseQty(bC), parseQty(lC), parseQty(dC));

      return [
        dateStr,
        d.total_active_tenants,
        bC,
        bL,
        lC,
        lL,
        dC,
        dL,
        totalC,
        totalL,
        dayExpense
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daywise_meal_report_${daywiseStartDate}_to_${daywiseEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDayExpense = (dateStr, bCount, lCount, dCount) => {
    if (!selectedInstitutionId || !dateStr) return 0;
    const key = `meal_exp_${selectedInstitutionId}_${dateStr}`;
    const saved = localStorage.getItem(key);
    let bInput = "40", bMode = "unit", lInput = "60", lMode = "unit", dInput = "60", dMode = "unit";
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        bInput = parsed.breakfastInput ?? "40";
        bMode = parsed.breakfastMode ?? "unit";
        lInput = parsed.lunchInput ?? "60";
        lMode = parsed.lunchMode ?? "unit";
        dInput = parsed.dinnerInput ?? "60";
        dMode = parsed.dinnerMode ?? "unit";
      } catch (e) {}
    }

    const bSpent = bMode === "unit" ? (bCount * Number(bInput || 0)) : Number(bInput || 0);
    const lSpent = lMode === "unit" ? (lCount * Number(lInput || 0)) : Number(lInput || 0);
    const dSpent = dMode === "unit" ? (dCount * Number(dInput || 0)) : Number(dInput || 0);
    return Math.round(bSpent + lSpent + dSpent);
  };

  const handlePrint = () => {
    window.print();
  };

  const getFormattedDateString = (dateStr) => {
    if (!dateStr) return "";
    const dateObj = new Date(dateStr + "T00:00:00");
    const formatted = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const todayStr = new Date().toISOString().split("T")[0];
    const isToday = dateStr === todayStr;
    return `${formatted}${isToday ? " (Today)" : ""}`;
  };

  const selectedInstitutionName = useMemo(() => {
    const inst = institutions.find(i => String(i.id) === selectedInstitutionId);
    return inst ? inst.institution_name : "Selected PG";
  }, [institutions, selectedInstitutionId]);

  const daywiseSummary = useMemo(() => {
    const totalDays = daywiseReportData.length;
    if (totalDays === 0) {
      return {
        avgActive: 0,
        bCooked: 0,
        bLeft: 0,
        lCooked: 0,
        lLeft: 0,
        dCooked: 0,
        dLeft: 0,
        totalCooked: 0,
        totalLeft: 0,
        totalSpent: 0
      };
    }

    const parseQty = (val) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      const match = val.match(/[\d.]+/);
      if (!match) return 0;
      const parsed = parseFloat(match[0]);
      return isNaN(parsed) ? 0 : parsed;
    };

    const avgActive = Math.round(daywiseReportData.reduce((acc, curr) => acc + (curr.total_active_tenants || 0), 0) / totalDays);
    const bCooked = daywiseReportData.reduce((acc, curr) => acc + parseQty(curr.breakfast_cooked), 0);
    const bLeft = daywiseReportData.reduce((acc, curr) => acc + parseQty(curr.breakfast_left), 0);
    const lCooked = daywiseReportData.reduce((acc, curr) => acc + parseQty(curr.lunch_cooked), 0);
    const lLeft = daywiseReportData.reduce((acc, curr) => acc + parseQty(curr.lunch_left), 0);
    const dCooked = daywiseReportData.reduce((acc, curr) => acc + parseQty(curr.dinner_cooked), 0);
    const dLeft = daywiseReportData.reduce((acc, curr) => acc + parseQty(curr.dinner_left), 0);
    const totalCooked = bCooked + lCooked + dCooked;
    const totalLeft = bLeft + lLeft + dLeft;

    const totalSpent = daywiseReportData.reduce((acc, curr) => {
      if (curr.actual_daily_expense !== null && curr.actual_daily_expense !== undefined) {
        return acc + Number(curr.actual_daily_expense);
      }
      const dateStr = curr.meal_date.split("T")[0];
      return acc + getDayExpense(
        dateStr, 
        parseQty(curr.breakfast_cooked), 
        parseQty(curr.lunch_cooked), 
        parseQty(curr.dinner_cooked)
      );
    }, 0);

    return {
      avgActive,
      bCooked,
      bLeft,
      lCooked,
      lLeft,
      dCooked,
      dLeft,
      totalCooked,
      totalLeft,
      totalSpent
    };
  }, [daywiseReportData, selectedInstitutionId]);

  const todayPieData = useMemo(() => {
    if (!summaryData) return [];
    
    const parseQty = (val) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      const match = val.match(/[\d.]+/);
      if (!match) return 0;
      const parsed = parseFloat(match[0]);
      return isNaN(parsed) ? 0 : parsed;
    };

    const bCooked = parseQty(summaryData.breakfastCooked);
    const bLeft = parseQty(summaryData.breakfastLeft);
    const lCooked = parseQty(summaryData.lunchCooked);
    const lLeft = parseQty(summaryData.lunchLeft);
    const dCooked = parseQty(summaryData.dinnerCooked);
    const dLeft = parseQty(summaryData.dinnerLeft);

    const totalCooked = bCooked + lCooked + dCooked;
    const totalLeft = bLeft + lLeft + dLeft;
    
    const activeTenants = summaryData.totalActiveTenants || 0;
    const totalPossibleMeals = activeTenants * 3;
    const mealsEaten = Math.max(0, totalCooked - totalLeft);
    const mealsSkipped = Math.max(0, totalPossibleMeals - totalCooked);

    return [
      { name: "Consumed", value: mealsEaten, color: "#10B981" },
      { name: "Leftover (Wasted)", value: totalLeft, color: "#EF4444" },
      { name: "Skipped Prefs", value: mealsSkipped, color: "#F59E0B" }
    ].filter(d => d.value > 0);
  }, [summaryData]);

  const periodPieData = useMemo(() => {
    const totalDays = daywiseReportData.length;
    if (totalDays === 0) return [];

    const consumed = Math.max(0, daywiseSummary.totalCooked - daywiseSummary.totalLeft);
    const totalPossible = daywiseSummary.avgActive * 3 * totalDays;
    const skipped = Math.max(0, totalPossible - daywiseSummary.totalCooked);

    return [
      { name: "Consumed", value: consumed, color: "#10B981" },
      { name: "Leftover (Wasted)", value: daywiseSummary.totalLeft, color: "#EF4444" },
      { name: "Skipped Prefs", value: skipped, color: "#F59E0B" }
    ].filter(d => d.value > 0);
  }, [daywiseSummary, daywiseReportData]);

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8 print:p-0 print:bg-white z-10">

        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 print:hidden">
          <div>
            <h1 className="text-2xl font-black text-[#0B1F3A] tracking-tight flex items-center gap-2.5">
              <UtensilsCrossed className="text-orange-500" />
              Daily Meal Tracker
            </h1>
            <p className="text-xs font-bold text-slate-450 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>Review kitchen prep counts, leaves, and manage tenant food logs.</span>
              <span className="h-1 w-1 rounded-full bg-slate-300 hidden sm:inline"></span>
              <span className="text-orange-600 font-extrabold">{getFormattedDateString(selectedDate)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">

            {/* Tab Selector */}
            <div className="flex bg-slate-200/60 p-1 rounded-xl font-bold text-xs text-slate-500 h-10 items-center">
              <button
                onClick={() => setActiveTab("daily")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === "daily" ? "bg-white text-[#0B1F3A] shadow-sm" : "hover:text-slate-800"}`}
              >
                Daily Tracker
              </button>
              <button
                onClick={() => setActiveTab("daywise")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === "daywise" ? "bg-white text-[#0B1F3A] shadow-sm" : "hover:text-slate-800"}`}
              >
                Day-wise Report
              </button>
              <button
                onClick={() => setActiveTab("monthly")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === "monthly" ? "bg-white text-[#0B1F3A] shadow-sm" : "hover:text-slate-800"}`}
              >
                Monthly Report
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === "settings" ? "bg-white text-[#0B1F3A] shadow-sm" : "hover:text-slate-800"}`}
              >
                Portal Settings
              </button>
            </div>

            {/* PG Hostel Selector Dropdown (Small and Top Right) */}
            {/* {institutions.length > 0 && (
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm h-7">
                <Building className="text-orange-500 shrink-0" size={12} />
                <select
                  value={selectedInstitutionId}
                  onChange={(e) => setSelectedInstitutionId(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black text-slate-650 outline-none py-0 pl-0.5 pr-3 cursor-pointer focus:ring-0 focus:outline-none"
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.institution_name}
                    </option>
                  ))}
                </select>
              </div>
            )} */}

          </div>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block mb-8 text-center border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-900">{selectedInstitutionName.toUpperCase()}</h1>
          <h2 className="text-lg font-semibold text-slate-600 mt-1">Daily Kitchen Meal Sheet - {getFormattedDateString(selectedDate)}</h2>
          <p className="text-xs text-slate-400 mt-1">Exported on: {new Date().toLocaleDateString()}</p>
        </div>

        {instLoading ? (
          <PageLoader />
        ) : (
          <div className="flex flex-col gap-6">



            {/* DAILY TRACKER ACTIVE VIEW */}
            {activeTab === "daily" && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDate}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageFlipVariants}
                  style={{ perspective: 1200 }}
                  className="flex flex-col gap-6"
                >
                  {/* Date Cards Horizontal Slider */}
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none print:hidden -mb-2">
                    {/* Custom Calendar Date Card Picker */}
                    <div 
                      onClick={(e) => {
                        const inputEl = e.currentTarget.querySelector('input[type="date"]');
                        if (inputEl) {
                          try {
                            inputEl.showPicker();
                          } catch (err) {
                            inputEl.click();
                          }
                        }
                      }}
                      className="flex-shrink-0 flex flex-col items-center justify-center p-1 w-18 h-11 rounded-lg border bg-white border-slate-100 hover:border-orange-200 hover:shadow-sm text-slate-800 relative cursor-pointer group transition-all duration-300"
                    >
                      <Calendar className="text-orange-500 shrink-0 group-hover:scale-110 transition-transform" size={13} />
                      <span className="text-[8px] font-black text-slate-700 mt-0.5 leading-none">Calendar</span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>

                    {dateCards.map((card) => {
                      const isActive = card.dateStr === selectedDate;
                      return (
                        <button
                          key={card.dateStr}
                          type="button"
                          onClick={() => setSelectedDate(card.dateStr)}
                          className={`flex-shrink-0 flex flex-col items-center justify-center p-1 w-18 h-11 rounded-lg border transition-all duration-300 ${
                            isActive
                              ? "bg-gradient-to-br from-orange-500 to-amber-500 border-orange-400 text-white shadow-lg shadow-orange-500/25 scale-102"
                              : "bg-white border-slate-100 hover:border-orange-200 hover:shadow-sm text-slate-800"
                          } cursor-pointer`}
                        >
                          <span className={`text-[7px] font-black uppercase tracking-wider leading-none ${isActive ? "text-orange-100" : "text-slate-400"}`}>
                            {card.label}
                          </span>
                          <span className="text-[11px] font-black mt-0.5 leading-none">
                            {card.dayNum} {card.monthName}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                  {[
                    { title: "Active Tenants", val: summaryData.totalActiveTenants, color: "text-[#0B1F3A]", bg: "bg-blue-50/70 border-blue-100" },
                    { title: "Breakfast Prep", val: summaryData.breakfastCount, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100" },
                    { title: "Lunch Prep", val: summaryData.lunchCount, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100" },
                    { title: "Dinner Prep", val: summaryData.dinnerCount, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100" },
                    { title: "Full-Day Leave", val: summaryData.fullDayLeaveCount, color: "text-amber-600", bg: "bg-amber-50/50 border-amber-100" },
                    { title: "On Vacation", val: summaryData.vacationCount, color: "text-rose-600", bg: "bg-rose-50/50 border-rose-100" },
                    { title: "Skipped Meals", val: summaryData.skippedMealsCount, color: "text-slate-500", bg: "bg-slate-50 border-slate-100" },
                    { title: "Kitchen Prep", val: summaryData.kitchenPrepCount, color: "text-[#0B1F3A] font-black", bg: "bg-orange-50/80 border-orange-100 ring-2 ring-orange-500/20" }
                  ].map((card, idx) => (
                    <div key={idx} className={`flex flex-col justify-between p-3.5 rounded-2xl border ${card.bg} shadow-sm transition-all duration-300 hover:scale-[1.02]`}>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.title}</span>
                      <span className={`text-xl sm:text-2xl font-black ${card.color} mt-2`}>
                        {card.val !== null ? card.val : 0}
                      </span>
                    </div>
                  ))}
                </div>

                {/* PREPARATION, LEFTOVER & EXPENSE SUMMARY PANEL (NEW) */}
                {/* PREPARATION, LEFTOVER & ABSENTEES ROW (3 Columns) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Prepared vs Left Card */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-[#0B1F3A] uppercase tracking-wider flex items-center gap-2">
                        <ClipboardList className="text-orange-500" size={16} />
                        Plates Cooked & Leftover
                      </h3>
                    </div>
                    <div className="flex flex-col gap-3 mt-1">
                      {[
                        { meal: "Breakfast", cooked: bfCooked, setCooked: setBfCooked, left: bfLeft, setLeft: setBfLeft, req: summaryData.breakfastCount || 0 },
                        { meal: "Lunch", cooked: lhCooked, setCooked: setLhCooked, left: lhLeft, setLeft: setLhLeft, req: summaryData.lunchCount || 0 },
                        { meal: "Dinner", cooked: dnCooked, setCooked: setDnCooked, left: dnLeft, setLeft: setDnLeft, req: summaryData.dinnerCount || 0 }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b pb-2.5 last:border-b-0 last:pb-0 gap-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{item.meal}</span>
                            <span className="text-[9px] font-bold text-slate-400">Req: {item.req} plates</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-24">
                              <span className="text-[9px] font-bold text-slate-400">Cooked:</span>
                              <input
                                type="text"
                                value={item.cooked}
                                onChange={(e) => item.setCooked(e.target.value)}
                                className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-slate-800 text-right p-0 focus:ring-0 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-24">
                              <span className="text-[9px] font-bold text-slate-400">Leftover:</span>
                              <input
                                type="text"
                                value={item.left}
                                onChange={(e) => item.setLeft(e.target.value)}
                                className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-slate-800 text-right p-0 focus:ring-0 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Who is not having / Absentees list (NEW) */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-3">
                    <h3 className="text-xs font-black text-[#0B1F3A] uppercase tracking-wider flex items-center gap-2">
                      <UserX className="text-orange-500" size={16} />
                      Who is not having (Absentees)
                    </h3>

                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[140px] pr-1 mt-1 text-[11px] font-bold">
                      {mealsData.length === 0 ? (
                        <span className="text-slate-400 font-bold py-2 text-center">No loaded data.</span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {absentees.breakfast.length > 0 && (
                            <div>
                              <span className="text-[10px] font-black text-[#0B1F3A] uppercase">Breakfast Skippers:</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {absentees.breakfast.map(a => (
                                  <span key={a.id} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700" title={`Room ${a.room}: ${a.reason}`}>
                                    {a.name} ({a.room || "-"})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {absentees.lunch.length > 0 && (
                            <div className="mt-1.5">
                              <span className="text-[10px] font-black text-[#0B1F3A] uppercase">Lunch Skippers:</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {absentees.lunch.map(a => (
                                  <span key={a.id} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700" title={`Room ${a.room}: ${a.reason}`}>
                                    {a.name} ({a.room || "-"})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {absentees.dinner.length > 0 && (
                            <div className="mt-1.5">
                              <span className="text-[10px] font-black text-[#0B1F3A] uppercase">Dinner Skippers:</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {absentees.dinner.map(a => (
                                  <span key={a.id} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700" title={`Room ${a.room}: ${a.reason}`}>
                                    {a.name} ({a.room || "-"})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {absentees.breakfast.length === 0 && absentees.lunch.length === 0 && absentees.dinner.length === 0 && (
                            <span className="text-slate-400 font-bold py-2 text-center">Everyone is taking all meals today!</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meal Performance Pie Chart Card */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-3 min-h-[220px]">
                    <h3 className="text-xs font-black text-[#0B1F3A] uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="text-orange-500" size={16} />
                      Today's Meal Performance
                    </h3>
                    
                    <div className="flex-1 min-h-[140px] flex items-center justify-center relative">
                      {todayPieData.length === 0 ? (
                        <span className="text-slate-400 font-bold text-xs py-10">No data logged.</span>
                      ) : (
                        <div className="w-full h-full flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="w-28 h-28 relative shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={todayPieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={28}
                                  outerRadius={44}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {todayPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value} meals`} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          
                          {/* Legend breakdown */}
                          <div className="flex flex-col gap-1.5 flex-1 text-[10px] font-bold text-slate-650">
                            {todayPieData.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="truncate">{item.name}:</span>
                                <span className="ml-auto font-black text-slate-800 shrink-0">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                 {/* Meal Expense Spent Card (Wide & Small Height) */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4 print:hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-xs font-black text-[#0B1F3A] uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="text-orange-500" size={16} />
                      Spent & Expense Spent (For {selectedDate})
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 w-44">
                        <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">Direct Exp (₹):</span>
                        <input
                          type="number"
                          value={actualDailyExpenseInput}
                          onChange={(e) => setActualDailyExpenseInput(e.target.value)}
                          placeholder="Enter direct exp..."
                          className="w-full bg-transparent border-none outline-none text-[11px] font-black text-slate-800 text-right p-0 focus:ring-0 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={handleSaveActualStats}
                          className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all rounded-xl cursor-pointer shadow-md active:scale-98 flex items-center gap-1.5"
                        >
                          <Save size={14} />
                          Save Daily Stats & Expenses
                        </button>
                        <span className="text-[9px] font-bold text-slate-400">
                          * Auto-saves daily after 10 PM
                        </span>
                      </div>
                      <span className="text-sm font-black text-orange-600 shrink-0">
                        Total Day Expenses: ₹{summaryData.actualDailyExpense !== undefined && summaryData.actualDailyExpense !== null ? summaryData.actualDailyExpense : totalDailySpent}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                    {[
                      { label: "Breakfast", count: summaryData.breakfastCount || 0, input: breakfastInput, setInput: setBreakfastInput, mode: breakfastMode, setMode: setBreakfastMode, calculated: totalBSpent, altCalculated: bPlateRate },
                      { label: "Lunch", count: summaryData.lunchCount || 0, input: lunchInput, setInput: setLunchInput, mode: lunchMode, setMode: setLunchMode, calculated: totalLSpent, altCalculated: lPlateRate },
                      { label: "Dinner", count: summaryData.dinnerCount || 0, input: dinnerInput, setInput: setDinnerInput, mode: dinnerMode, setMode: setDinnerMode, calculated: totalDSpent, altCalculated: dPlateRate }
                    ].map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-4">
                        <div className="flex flex-col gap-1 min-w-[120px]">
                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{c.label} ({c.count} plates)</span>
                          <div className="flex gap-1.5 mt-1 font-bold text-[8px] uppercase text-slate-400">
                            <button
                              type="button"
                              onClick={() => c.setMode("unit")}
                              className={`px-2 py-0.5 rounded cursor-pointer ${c.mode === "unit" ? "bg-orange-500 text-white" : "bg-slate-200 hover:text-slate-600"}`}
                            >
                              Per Plate
                            </button>
                            <button
                              type="button"
                              onClick={() => c.setMode("total")}
                              className={`px-2 py-0.5 rounded cursor-pointer ${c.mode === "total" ? "bg-orange-500 text-white" : "bg-slate-200 hover:text-slate-600"}`}
                            >
                              Total
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 w-28">
                          <input
                            type="number"
                            value={c.input}
                            onChange={(e) => c.setInput(e.target.value)}
                            placeholder={c.mode === "unit" ? "Rate/plate" : "Total spent"}
                            className="w-full bg-white border border-slate-200 rounded-lg h-8 px-2 text-xs font-bold outline-none text-slate-700 text-right"
                          />
                          <span className="text-[10px] font-black text-slate-500">
                            {c.mode === "unit" ? `Total: ₹${c.calculated}` : `Rate: ₹${c.altCalculated}/pl`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error and Success Alerts */}
                <AnimatePresence>
                  {error && <Error message={error} />}
                  {successMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl px-4 py-3 shadow-sm flex items-center gap-2"
                    >
                      <Check size={16} className="text-emerald-600" />
                      {successMsg}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Print Only Summary Table */}
                <div className="hidden print:block mb-6">
                  <table className="w-full text-sm border border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-150">
                        <th className="p-2 border">Metric</th>
                        <th className="p-2 border">Count</th>
                        <th className="p-2 border">Metric</th>
                        <th className="p-2 border">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border font-bold">Total Active Tenants</td>
                        <td className="p-2 border">{summaryData.totalActiveTenants}</td>
                        <td className="p-2 border font-bold">Full Day Leaves</td>
                        <td className="p-2 border">{summaryData.fullDayLeaveCount}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border font-bold">Breakfast Taking</td>
                        <td className="p-2 border">{summaryData.breakfastCount}</td>
                        <td className="p-2 border font-bold">Vacations Active</td>
                        <td className="p-2 border">{summaryData.vacationCount}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border font-bold">Lunch Taking</td>
                        <td className="p-2 border">{summaryData.lunchCount}</td>
                        <td className="p-2 border font-bold">Total Skipped Meals</td>
                        <td className="p-2 border">{summaryData.skippedMealsCount}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border font-bold">Dinner Taking</td>
                        <td className="p-2 border">{summaryData.dinnerCount}</td>
                        <td className="p-2 border font-bold text-orange-600">Kitchen Prep Count (B+L+D)</td>
                        <td className="p-2 border font-bold text-orange-600">{summaryData.kitchenPrepCount}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Filter Bar Panel */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                  <div className="flex flex-wrap items-center gap-3">

                    {/* Date Input */}
                    <div className="relative flex items-center">
                      <Calendar size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                      />
                    </div>

                    {/* Floor select */}
                    <div className="relative flex items-center">
                      <Layers size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <select
                        value={selectedFloor}
                        onChange={(e) => { setSelectedFloor(e.target.value); setSelectedRoom("all"); }}
                        className="pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none"
                      >
                        <option value="all">All Floors</option>
                        {floors.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Room select */}
                    <div className="relative flex items-center">
                      <Home size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <select
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        className="pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none"
                      >
                        <option value="all">All Rooms</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>Room {r.number}</option>
                        ))}
                      </select>
                    </div>

                    {/* Search query */}
                    <div className="relative flex items-center">
                      <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        placeholder="Search tenant or phone..."
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 w-52 h-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                      />
                    </div>

                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 h-10 px-4 text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all rounded-xl cursor-pointer"
                    >
                      <Printer size={14} />
                      Print
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 h-10 px-4 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all rounded-xl cursor-pointer shadow-sm"
                    >
                      <FileSpreadsheet size={14} />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Bulk Modification Panel */}
                {selectedTenantIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-orange-50 border border-orange-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-orange-500" size={18} />
                      <span className="text-xs font-black text-orange-950">
                        Bulk Action: {selectedTenantIds.length} tenants selected.
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleApplyBulkAction("breakfast", "taking")}
                        className="px-3 h-8 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black rounded-lg cursor-pointer hover:bg-emerald-100"
                      >
                        Taking Breakfast
                      </button>
                      <button
                        onClick={() => handleApplyBulkAction("breakfast", "skipping")}
                        className="px-3 h-8 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-black rounded-lg cursor-pointer hover:bg-rose-100"
                      >
                        Skip Breakfast
                      </button>
                      <button
                        onClick={() => handleApplyBulkAction("lunch", "taking")}
                        className="px-3 h-8 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black rounded-lg cursor-pointer hover:bg-emerald-100"
                      >
                        Taking Lunch
                      </button>
                      <button
                        onClick={() => handleApplyBulkAction("lunch", "skipping")}
                        className="px-3 h-8 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-black rounded-lg cursor-pointer hover:bg-rose-100"
                      >
                        Skip Lunch
                      </button>
                      <button
                        onClick={() => handleApplyBulkAction("dinner", "taking")}
                        className="px-3 h-8 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black rounded-lg cursor-pointer hover:bg-emerald-100"
                      >
                        Taking Dinner
                      </button>
                      <button
                        onClick={() => handleApplyBulkAction("dinner", "skipping")}
                        className="px-3 h-8 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-black rounded-lg cursor-pointer hover:bg-rose-100"
                      >
                        Skip Dinner
                      </button>
                      <button
                        onClick={() => handleApplyBulkAction("leave", true)}
                        className="px-3 h-8 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black rounded-lg cursor-pointer hover:bg-amber-100"
                      >
                        Mark Leave
                      </button>
                      <button
                        onClick={() => handleApplyBulkAction("vacation", true)}
                        className="px-3 h-8 bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black rounded-lg cursor-pointer hover:bg-rose-200"
                      >
                        Mark Vacation
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Loader */}
                {loading ? (
                  <PageLoader />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">

                    {/* Table Header / Global save */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between print:hidden">
                      <span className="text-xs font-black text-[#0B1F3A]">Active Tenant List ({filteredMeals.length} found)</span>
                      {Object.keys(editedRecords).length > 0 && (
                        <motion.button
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          onClick={handleBulkSave}
                          className="flex items-center gap-1.5 px-4 h-9 text-xs font-black text-white bg-orange-500 hover:bg-orange-600 transition-all rounded-xl shadow-md shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
                        >
                          <Save size={14} />
                          Save Unsaved Changes ({Object.keys(editedRecords).length})
                        </motion.button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse text-left min-w-[900px] table-fixed">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="p-4 w-12 text-center print:hidden">
                              <input
                                type="checkbox"
                                checked={selectedTenantIds.length === filteredMeals.length && filteredMeals.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTenantIds(filteredMeals.map(m => m.tenant_id));
                                  } else {
                                    setSelectedTenantIds([]);
                                  }
                                }}
                                className="rounded border-slate-300 text-orange-500 focus:ring-orange-500/10 cursor-pointer h-4 w-4"
                              />
                            </th>
                            <th className="p-4 w-48">Tenant Details</th>
                            <th className="p-4 w-32">Room / Floor</th>
                            <th className="p-4 w-40 text-center">Breakfast</th>
                            <th className="p-4 w-40 text-center">Lunch</th>
                            <th className="p-4 w-40 text-center">Dinner</th>
                            <th className="p-4 w-28 text-center">Leave</th>
                            <th className="p-4 w-28 text-center">Vacation</th>
                            <th className="p-4 w-48">Reason/Remarks</th>
                            <th className="p-4 w-24 text-center print:hidden">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                          {filteredMeals.length === 0 ? (
                            <tr>
                              <td colSpan="10" className="p-8 text-center font-bold text-slate-400">
                                No active tenants matched your query or filters.
                              </td>
                            </tr>
                          ) : (
                            filteredMeals.map((tenant) => {
                              const tId = tenant.tenant_id;
                              const hasUnsavedChanges = !!editedRecords[tId];
                              const breakfastVal = getCellValue(tenant, "breakfast");
                              const lunchVal = getCellValue(tenant, "lunch");
                              const dinnerVal = getCellValue(tenant, "dinner");
                              const leaveVal = getCellValue(tenant, "full_day_leave");
                              const vacationVal = getCellValue(tenant, "vacation");
                              const reasonVal = getCellValue(tenant, "reason") || "";

                              const isDisabled = leaveVal || vacationVal;

                              return (
                                <tr key={tId} className={`transition-colors hover:bg-slate-50/50 ${hasUnsavedChanges ? "bg-orange-50/10" : ""}`}>

                                  {/* Checkbox */}
                                  <td className="p-4 text-center print:hidden">
                                    <input
                                      type="checkbox"
                                      checked={selectedTenantIds.includes(tId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedTenantIds(prev => [...prev, tId]);
                                        } else {
                                          setSelectedTenantIds(prev => prev.filter(id => id !== tId));
                                        }
                                      }}
                                      className="rounded border-slate-300 text-orange-500 focus:ring-orange-500/10 cursor-pointer h-4 w-4"
                                    />
                                  </td>

                                  {/* Details */}
                                  <td className="p-4">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-slate-900 text-sm">{tenant.full_name}</span>
                                      <span className="text-[10px] font-bold text-slate-400">{tenant.phone}</span>
                                    </div>
                                  </td>

                                  {/* Room/Floor */}
                                  <td className="p-4">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-800">Room {tenant.room_number || "-"}</span>
                                      <span className="text-[10px] font-bold text-slate-400">{tenant.floor_name || "-"}</span>
                                    </div>
                                  </td>

                                  {/* Breakfast */}
                                  <td className="p-4 text-center">
                                    <div className="inline-flex rounded-lg p-0.5 bg-slate-100/80 font-bold border border-slate-200/50">
                                      <button
                                        disabled={isDisabled}
                                        onClick={() => handleCellChange(tId, "breakfast", "taking")}
                                        className={`px-3 py-1 text-[10px] rounded-md transition-all ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                          } ${breakfastVal === "taking" && !isDisabled
                                            ? "bg-emerald-600 text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                          }`}
                                      >
                                        Taking
                                      </button>
                                      <button
                                        disabled={isDisabled}
                                        onClick={() => handleCellChange(tId, "breakfast", "skipping")}
                                        className={`px-3 py-1 text-[10px] rounded-md transition-all ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                          } ${breakfastVal === "skipping" || isDisabled
                                            ? "bg-rose-600 text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                          }`}
                                      >
                                        Skip
                                      </button>
                                    </div>
                                  </td>

                                  {/* Lunch */}
                                  <td className="p-4 text-center">
                                    <div className="inline-flex rounded-lg p-0.5 bg-slate-100/80 font-bold border border-slate-200/50">
                                      <button
                                        disabled={isDisabled}
                                        onClick={() => handleCellChange(tId, "lunch", "taking")}
                                        className={`px-3 py-1 text-[10px] rounded-md transition-all ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                          } ${lunchVal === "taking" && !isDisabled
                                            ? "bg-emerald-600 text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                          }`}
                                      >
                                        Taking
                                      </button>
                                      <button
                                        disabled={isDisabled}
                                        onClick={() => handleCellChange(tId, "lunch", "skipping")}
                                        className={`px-3 py-1 text-[10px] rounded-md transition-all ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                          } ${lunchVal === "skipping" || isDisabled
                                            ? "bg-rose-600 text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                          }`}
                                      >
                                        Skip
                                      </button>
                                    </div>
                                  </td>

                                  {/* Dinner */}
                                  <td className="p-4 text-center">
                                    <div className="inline-flex rounded-lg p-0.5 bg-slate-100/80 font-bold border border-slate-200/50">
                                      <button
                                        disabled={isDisabled}
                                        onClick={() => handleCellChange(tId, "dinner", "taking")}
                                        className={`px-3 py-1 text-[10px] rounded-md transition-all ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                          } ${dinnerVal === "taking" && !isDisabled
                                            ? "bg-emerald-600 text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                          }`}
                                      >
                                        Taking
                                      </button>
                                      <button
                                        disabled={isDisabled}
                                        onClick={() => handleCellChange(tId, "dinner", "skipping")}
                                        className={`px-3 py-1 text-[10px] rounded-md transition-all ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                          } ${dinnerVal === "skipping" || isDisabled
                                            ? "bg-rose-600 text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                          }`}
                                      >
                                        Skip
                                      </button>
                                    </div>
                                  </td>

                                  {/* Leave */}
                                  <td className="p-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={leaveVal}
                                      onChange={(e) => handleCellChange(tId, "full_day_leave", e.target.checked)}
                                      className="rounded border-slate-350 text-amber-500 focus:ring-amber-500/10 cursor-pointer h-4 w-4"
                                    />
                                  </td>

                                  {/* Vacation */}
                                  <td className="p-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={vacationVal}
                                      onChange={(e) => handleCellChange(tId, "vacation", e.target.checked)}
                                      className="rounded border-slate-350 text-rose-500 focus:ring-rose-500/10 cursor-pointer h-4 w-4"
                                    />
                                  </td>

                                  {/* Remarks */}
                                  <td className="p-4">
                                    <input
                                      type="text"
                                      value={reasonVal}
                                      placeholder="Enter remarks/reason..."
                                      onChange={(e) => handleCellChange(tId, "reason", e.target.value)}
                                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] outline-none focus:border-orange-500/50"
                                    />
                                  </td>

                                  {/* Actions */}
                                  <td className="p-4 text-center print:hidden">
                                    <div className="flex items-center justify-center gap-2">
                                      {hasUnsavedChanges && (
                                        <button
                                          onClick={() => handleSaveRow(tenant)}
                                          className="p-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 hover:text-orange-800 cursor-pointer transition-colors"
                                          title="Save Changes"
                                        >
                                          <Save size={14} />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleViewHistory(tenant)}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 cursor-pointer transition-colors"
                                        title="View Logs History"
                                      >
                                        <History size={14} />
                                      </button>
                                    </div>
                                  </td>

                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}

                </motion.div>
              </AnimatePresence>
            )}

            {/* DAY-WISE MEAL CONSUMPTION REPORT VIEW */}
            {activeTab === "daywise" && (
              <div className="flex flex-col gap-6">

                {/* Filter Bar */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Start Date */}
                    <div className="relative flex items-center">
                      <Calendar size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={daywiseStartDate}
                        onChange={(e) => setDaywiseStartDate(e.target.value)}
                        className="pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-400">to</span>
                    {/* End Date */}
                    <div className="relative flex items-center">
                      <Calendar size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={daywiseEndDate}
                        onChange={(e) => setDaywiseEndDate(e.target.value)}
                        className="pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 h-10 px-4 text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all rounded-xl cursor-pointer"
                    >
                      <Printer size={14} />
                      Print Report
                    </button>
                    <button
                      onClick={handleExportDayWiseCSV}
                      className="flex items-center gap-1.5 h-10 px-4 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all rounded-xl cursor-pointer shadow-sm"
                    >
                      <FileSpreadsheet size={14} />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Period Summary & Pie Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Period summary cards (takes 2 cols on large screen) */}
                  <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { title: "Avg Tenants", val: daywiseSummary.avgActive, color: "text-[#0B1F3A]", bg: "bg-blue-50/70 border-blue-100" },
                      { title: "Breakfast Cooked / Left", val: `${daywiseSummary.bCooked} / ${daywiseSummary.bLeft}`, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100" },
                      { title: "Lunch Cooked / Left", val: `${daywiseSummary.lCooked} / ${daywiseSummary.lLeft}`, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100" },
                      { title: "Dinner Cooked / Left", val: `${daywiseSummary.dCooked} / ${daywiseSummary.dLeft}`, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100" },
                      { title: "Total Cooked / Left", val: `${daywiseSummary.totalCooked} / ${daywiseSummary.totalLeft}`, color: "text-orange-600", bg: "bg-orange-50/50 border-orange-100" },
                      { title: "Est. Expense", val: `₹${daywiseSummary.totalSpent}`, color: "text-rose-650 font-black", bg: "bg-rose-50 border-rose-100" }
                    ].map((card, idx) => (
                      <div key={idx} className={`flex flex-col justify-between p-3.5 rounded-2xl border ${card.bg} shadow-sm transition-all duration-300 hover:scale-[1.02]`}>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.title}</span>
                        <span className={`text-sm sm:text-base font-black ${card.color} mt-2`}>
                          {card.val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Right: Period Pie Chart Card (takes 1 col) */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-3 min-h-[220px]">
                    <h3 className="text-xs font-black text-[#0B1F3A] uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="text-orange-500" size={16} />
                      Period Meal Performance
                    </h3>
                    
                    <div className="flex-1 min-h-[140px] flex items-center justify-center relative">
                      {periodPieData.length === 0 ? (
                        <span className="text-slate-400 font-bold text-xs py-10">No data logged.</span>
                      ) : (
                        <div className="w-full h-full flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="w-28 h-28 relative shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={periodPieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={28}
                                  outerRadius={44}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {periodPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value} meals`} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          
                          {/* Legend breakdown */}
                          <div className="flex flex-col gap-1.5 flex-1 text-[10px] font-bold text-slate-655">
                            {periodPieData.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="truncate">{item.name}:</span>
                                <span className="ml-auto font-black text-slate-800 shrink-0">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Day-wise Details Table */}
                {daywiseLoading ? (
                  <PageLoader />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse text-left min-w-[800px] table-fixed">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="p-4 w-32">Date</th>
                            <th className="p-4 w-28 text-center">Active Tenants</th>
                            <th className="p-4 w-36 text-center">Breakfast (Cooked / Left)</th>
                            <th className="p-4 w-36 text-center">Lunch (Cooked / Left)</th>
                            <th className="p-4 w-36 text-center">Dinner (Cooked / Left)</th>
                            <th className="p-4 w-40 text-center">Total (Cooked / Left)</th>
                            <th className="p-4 w-32 text-center">Est. Expense</th>
                            <th className="p-4 w-28 text-center print:hidden">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                          {daywiseReportData.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="p-8 text-center font-bold text-slate-400">
                                No records found for the selected date range.
                              </td>
                            </tr>
                          ) : (
                            daywiseReportData.map((row) => {
                              const dateStr = row.meal_date.split("T")[0];
                              const parseQty = (val) => {
                                if (typeof val === "number") return val;
                                if (!val) return 0;
                                const match = val.match(/[\d.]+/);
                                if (!match) return 0;
                                const parsed = parseFloat(match[0]);
                                return isNaN(parsed) ? 0 : parsed;
                              };

                              const bC = row.breakfast_cooked ?? "0";
                              const bL = row.breakfast_left ?? "0";
                              const lC = row.lunch_cooked ?? "0";
                              const lL = row.lunch_left ?? "0";
                              const dC = row.dinner_cooked ?? "0";
                              const dL = row.dinner_left ?? "0";

                              const totalC = parseQty(bC) + parseQty(lC) + parseQty(dC);
                              const totalL = parseQty(bL) + parseQty(lL) + parseQty(dL);
                              const dayExpense = row.actual_daily_expense !== null && row.actual_daily_expense !== undefined
                                ? Number(row.actual_daily_expense)
                                : getDayExpense(dateStr, parseQty(bC), parseQty(lC), parseQty(dC));

                              return (
                                <tr key={dateStr} className="transition-colors hover:bg-slate-50/50">
                                  <td className="p-4 font-bold text-slate-900">
                                    {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric"
                                    })}
                                  </td>
                                  <td className="p-4 text-center font-bold text-slate-650">{row.total_active_tenants}</td>
                                  <td className="p-4 text-center">
                                    <span className="text-emerald-600 font-bold">{bC}</span>
                                    <span className="text-slate-300 mx-1">/</span>
                                    <span className="text-rose-600 font-bold">{bL}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className="text-emerald-600 font-bold">{lC}</span>
                                    <span className="text-slate-300 mx-1">/</span>
                                    <span className="text-rose-600 font-bold">{lL}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className="text-emerald-600 font-bold">{dC}</span>
                                    <span className="text-slate-300 mx-1">/</span>
                                    <span className="text-rose-600 font-bold">{dL}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-black">{totalC}</span>
                                    <span className="text-slate-300 mx-1">/</span>
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded font-black">{totalL}</span>
                                  </td>
                                  <td className="p-4 text-center font-bold text-orange-600">₹{dayExpense}</td>
                                  <td className="p-4 text-center print:hidden">
                                    <button
                                      onClick={() => {
                                        setSelectedDate(dateStr);
                                        setActiveTab("daily");
                                      }}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-700 rounded-lg font-black transition-colors cursor-pointer"
                                    >
                                      View Details
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* MONTHLY CONSUMPTION REPORT VIEW */}
            {activeTab === "monthly" && (
              <div className="flex flex-col gap-6">

                {/* Filter Bar */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                  <div className="flex flex-wrap items-center gap-3">

                    {/* Year Select */}
                    <div className="relative flex items-center">
                      <Calendar size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <select
                        value={reportYear}
                        onChange={(e) => setReportYear(parseInt(e.target.value))}
                        className="pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none"
                      >
                        {[2024, 2025, 2026, 2027].map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    {/* Month Select */}
                    <div className="relative flex items-center">
                      <ClipboardList size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <select
                        value={reportMonth}
                        onChange={(e) => setReportMonth(parseInt(e.target.value))}
                        className="pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none"
                      >
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((mth, i) => (
                          <option key={i + 1} value={i + 1}>{mth}</option>
                        ))}
                      </select>
                    </div>

                  </div>

                  {/* Action Buttons */}
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 h-10 px-4 text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all rounded-xl cursor-pointer"
                  >
                    <Printer size={14} />
                    Print Monthly Report
                  </button>
                </div>

                {/* Print Header for Monthly */}
                <div className="hidden print:block text-center mb-6">
                  <h2 className="text-lg font-bold text-slate-800">Monthly Meal Consumption Report - {reportMonth}/{reportYear}</h2>
                </div>

                {/* Monthly Report Table */}
                {monthlyLoading ? (
                  <PageLoader />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse text-left min-w-[700px] table-fixed">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="p-4 w-48">Tenant Name</th>
                            <th className="p-4 w-32">Room Number</th>
                            <th className="p-4 w-36 text-center">Breakfasts Taken</th>
                            <th className="p-4 w-36 text-center">Lunches Taken</th>
                            <th className="p-4 w-36 text-center">Dinners Taken</th>
                            <th className="p-4 w-36 text-center">Leave/Vacation Days</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                          {monthlyReportData.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="p-8 text-center font-bold text-slate-400">
                                No monthly records found for the selected period.
                              </td>
                            </tr>
                          ) : (
                            monthlyReportData.map((row) => (
                              <tr key={row.tenant_id} className="transition-colors hover:bg-slate-50/50">
                                <td className="p-4 font-bold text-slate-900">{row.full_name}</td>
                                <td className="p-4 font-bold text-slate-650">Room {row.room_number || "-"}</td>
                                <td className="p-4 text-center text-emerald-600 font-bold">{row.breakfast_taken} days</td>
                                <td className="p-4 text-center text-emerald-600 font-bold">{row.lunch_taken} days</td>
                                <td className="p-4 text-center text-emerald-600 font-bold">{row.dinner_taken} days</td>
                                <td className="p-4 text-center text-amber-600 font-bold">{row.leave_days} days</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* PORTAL SETTINGS VIEW */}
            {activeTab === "settings" && (
              <div className="bg-white border border-slate-150 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-6 font-satoshi max-w-2xl mx-auto w-full">
                <div>
                  <h2 className="text-base font-black text-[#0B1F3A] tracking-tight">Tenant Portal Configuration</h2>
                  <p className="text-[11px] text-slate-455 font-bold mt-0.5">Toggle visibility of public support and meal preference tracker sections on the tenant portal.</p>
                </div>

                {settingsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-orange-500" size={24} />
                    <span className="text-xs font-bold text-slate-450">Loading settings...</span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                      {/* Live Support Toggle */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black text-slate-800">Live Support Desk Card</span>
                          <span className="text-[10px] text-slate-450 font-bold leading-tight">Allow tenants to open tickets and chat directly with staff.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLiveSupportEnabled(!liveSupportEnabled)}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                            liveSupportEnabled ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              liveSupportEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Meal Tracker Toggle */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black text-slate-800">Meal Preference Tracker Card</span>
                          <span className="text-[10px] text-slate-450 font-bold leading-tight">Allow tenants to verify details and set daily meal attendance logs.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMealTrackerEnabled(!mealTrackerEnabled)}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                            mealTrackerEnabled ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              mealTrackerEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={settingsLoading}
                      className="h-10 mt-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl flex items-center justify-center uppercase tracking-wider transition cursor-pointer disabled:opacity-50 shadow-md shadow-orange-500/10"
                    >
                      {settingsLoading ? "Saving..." : "Save Configuration"}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* TENANT MEAL HISTORY LOGS MODAL */}
      <AnimatePresence>
        {isHistoryModalOpen && historyTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-10 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#0B1F3A]">Meal Logs History</h3>
                  <p className="text-xs font-bold text-slate-400">Past 30 entries for {historyTenant.full_name}</p>
                </div>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              {historyLoading ? (
                <PageLoader />
              ) : (
                <div className="max-h-96 overflow-y-auto pr-1">
                  {historyLogs.length === 0 ? (
                    <p className="text-center font-bold text-slate-400 py-8">No past logs available.</p>
                  ) : (
                    <div className="grid gap-3.5">
                      {historyLogs.map((log) => {
                        const formattedDate = new Date(log.meal_date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        });
                        const isSkipped = log.full_day_leave || log.vacation;

                        return (
                          <div key={log.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 text-[13px]">{formattedDate}</span>
                              {log.vacation ? (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black rounded">Vacation</span>
                              ) : log.full_day_leave ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded">Leave</span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-wide">
                              <span className="flex items-center gap-1">
                                Breakfast:
                                <strong className={log.breakfast === "taking" && !isSkipped ? "text-emerald-600" : "text-rose-600"}>
                                  {log.breakfast === "taking" && !isSkipped ? "Yes" : "No"}
                                </strong>
                              </span>
                              <span className="flex items-center gap-1">
                                Lunch:
                                <strong className={log.lunch === "taking" && !isSkipped ? "text-emerald-600" : "text-rose-600"}>
                                  {log.lunch === "taking" && !isSkipped ? "Yes" : "No"}
                                </strong>
                              </span>
                              <span className="flex items-center gap-1">
                                Dinner:
                                <strong className={log.dinner === "taking" && !isSkipped ? "text-emerald-600" : "text-rose-600"}>
                                  {log.dinner === "taking" && !isSkipped ? "Yes" : "No"}
                                </strong>
                              </span>
                            </div>
                            {log.reason && (
                              <p className="text-[11px] font-bold text-slate-450 italic mt-0.5">
                                Reason: "{log.reason}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex w-[360px] items-center gap-3.5 rounded-2xl border bg-white p-4 shadow-2xl transition-all duration-300 ${
          toast.type === "success" 
            ? "border-l-4 border-l-emerald-500 border-slate-100/50" 
            : "border-l-4 border-l-rose-500 border-slate-100/50"
        }`}>
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            toast.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}>
            {toast.type === "success" ? <Check size={18} className="stroke-[2.5]" /> : <AlertTriangle size={18} className="stroke-[2.5]" />}
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-black text-slate-800 leading-tight">
              {toast.type === "success" ? "Success" : "Error"}
            </p>
            <p className="text-[11px] font-bold text-slate-450 mt-0.5 leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 cursor-pointer">
            <CloseIcon size={14} />
          </button>
        </div>
      )}

    </div>
  );
};

export default AdminMealTracker;
