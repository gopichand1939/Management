import { useState, useEffect } from "react";
import {
  UtensilsCrossed,
  Phone,
  Building,
  CheckCircle,
  XCircle,
  LogOut,
  Calendar,
  Save,
  Clock,
  History,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageLoader from "../Common/PageLoader";
import Error from "../Common/Error";
import {
  SUPPORT_PUBLIC_INSTITUTIONS,
  MEAL_TRACKER_TENANT_VERIFY,
  MEAL_TRACKER_TENANT_GET,
  MEAL_TRACKER_TENANT_SAVE
} from "../../Utils/Constants";

const TenantMealTracker = () => {
  // Verification states
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstId, setSelectedInstId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Tenant Session
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Preference Edit states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [breakfast, setBreakfast] = useState("taking");
  const [lunch, setLunch] = useState("taking");
  const [dinner, setDinner] = useState("taking");
  const [fullDayLeave, setFullDayLeave] = useState(false);
  const [vacation, setVacation] = useState(false);
  const [reason, setReason] = useState("");
  const [locked, setLocked] = useState(false);

  // History list
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch Public Institutions on load
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const res = await fetch(SUPPORT_PUBLIC_INSTITUTIONS);
        const data = await res.json();
        if (data.success) {
          setInstitutions(data.data || []);
        }
      } catch (err) {
        console.error("Failed to load institutions", err);
      }
    };

    // Check if session exists in sessionStorage
    const savedSession = sessionStorage.getItem("tenant_meal_session");
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      setTenant(parsed);
      loadTenantData(parsed.id, selectedDate);
    }

    loadInstitutions();
  }, []);

  // Whenever verified tenant or selected date changes, fetch preferences and history
  useEffect(() => {
    if (tenant) {
      loadTenantData(tenant.id, selectedDate);
    }
  }, [selectedDate, tenant]);

  // Load preferences for selected date & historical entries
  const loadTenantData = async (tenantId, date) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${MEAL_TRACKER_TENANT_GET}/${tenantId}?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setHistory(json.data.history || []);
        
        // If a record exists for this date, populate the state
        if (json.data.today) {
          const rec = json.data.today;
          setBreakfast(rec.breakfast);
          setLunch(rec.lunch);
          setDinner(rec.dinner);
          setFullDayLeave(rec.full_day_leave);
          setVacation(rec.vacation);
          setReason(rec.reason || "");
          
          const isAllTaking = rec.breakfast === "taking" && 
                              rec.lunch === "taking" && 
                              rec.dinner === "taking" && 
                              !rec.full_day_leave && 
                              !rec.vacation;
          setLocked(!isAllTaking);
        } else {
          // Defaults
          setBreakfast("taking");
          setLunch("taking");
          setDinner("taking");
          setFullDayLeave(false);
          setVacation(false);
          setReason("");
          setLocked(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Verify phone login
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!selectedInstId) {
      setError("Please select your PG / Hostel.");
      return;
    }
    if (!phoneNumber) {
      setError("Please enter your registered phone number.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(MEAL_TRACKER_TENANT_VERIFY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
          institutionId: selectedInstId
        })
      });

      const json = await res.json();
      if (json.success) {
        setTenant(json.data);
        sessionStorage.setItem("tenant_meal_session", JSON.stringify(json.data));
        loadTenantData(json.data.id, selectedDate);
      } else {
        setError(json.message || "Verification failed. Check credentials.");
      }
    } catch (err) {
      setError("Failed to verify. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle saving of preferences
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    if (!tenant) return;

    // Validation check: cutoff time limit
    const now = new Date();
    const limit = new Date(`${selectedDate}T23:59:59`);
    if (now > limit) {
      setError("Cannot save or modify preferences for past dates.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(MEAL_TRACKER_TENANT_SAVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          institutionId: tenant.institution_id,
          mealDate: selectedDate,
          breakfast: fullDayLeave || vacation ? "skipping" : breakfast,
          lunch: fullDayLeave || vacation ? "skipping" : lunch,
          dinner: fullDayLeave || vacation ? "skipping" : dinner,
          fullDayLeave: fullDayLeave,
          vacation: vacation,
          reason: reason
        })
      });

      const json = await res.json();
      if (json.success) {
        setSuccess("Your meal preferences have been updated!");
        setLocked(true);
        loadTenantData(tenant.id, selectedDate);
      } else {
        setError(json.message || "Failed to save preferences.");
      }
    } catch (err) {
      setError("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  // Logout / clear session
  const handleLogout = () => {
    sessionStorage.removeItem("tenant_meal_session");
    setTenant(null);
    setPhoneNumber("");
    setHistory([]);
    setError("");
    setSuccess("");
    setLocked(false);
  };

  // Automatically update skipped state if leave or vacation checked
  const isSkipped = fullDayLeave || vacation;

  const activePG = institutions.find(
    (inst) => String(inst.id) === String(selectedInstId || (tenant && tenant.institution_id))
  );
  const isMealTrackerEnabled = activePG ? activePG.meal_tracker_enabled : true;

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#0F2027] via-[#203A43] to-[#2C5364] flex items-center justify-center p-4 sm:p-6">
      
      <AnimatePresence mode="wait">
        {!tenant ? (
          
          /* VERIFICATION / LOGIN VIEW */
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 flex flex-col gap-6"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-inner">
                <UtensilsCrossed className="text-orange-500" size={28} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daily Meal Preferences</h1>
              <p className="text-xs font-bold text-slate-400 max-w-[260px]">
                Sign in with your registered phone number to manage your breakfast, lunch, and dinner.
              </p>
            </div>

            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              
              {/* Institution PG Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Select PG / Hostel</label>
                <div className="relative flex items-center">
                  <Building size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedInstId}
                    onChange={(e) => setSelectedInstId(e.target.value)}
                    className="w-full pl-10 pr-8 h-12 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none"
                  >
                    <option value="">-- Choose PG Hostel --</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.institution_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Registered Phone Number</label>
                <div className="relative flex items-center">
                  <Phone size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    placeholder="Enter phone number..."
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-4 h-12 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  />
                </div>
              </div>

              {error && <Error message={error} />}

              {!isMealTrackerEnabled && selectedInstId && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center space-x-2 text-rose-600 text-xs font-bold mt-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Meal tracking is disabled for this PG.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (!isMealTrackerEnabled && !!selectedInstId)}
                className="w-full h-12 mt-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm rounded-xl cursor-pointer shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Authenticating..." : "Access Meal Tracker"}
              </button>

            </form>

          </motion.div>

        ) : (
          
          /* MEAL PREFERENCE VIEW */
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 flex flex-col gap-6"
          >
            
            {/* Session Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">Welcome, {tenant.full_name}</h2>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  PG: {tenant.floor_name || "-"} · Room {tenant.room_number || "-"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 h-9 px-3 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100/70 font-black text-[11px] rounded-xl cursor-pointer transition-all"
              >
                <LogOut size={12} />
                Logout
              </button>
            </div>
            {!isMealTrackerEnabled ? (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-sm font-black text-slate-800">Meal Preference Tracker Disabled</h3>
                <p className="text-xs font-bold text-slate-400 max-w-sm">
                  The Daily Meal preference Tracker has been disabled by the administrator for this PG.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSavePreferences} className="flex flex-col gap-5">
                
                {/* Date selection & status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Select Preference Date</label>
                    <div className="relative flex items-center">
                      <Calendar size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                        className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
                    <Clock className="text-orange-500 shrink-0" size={18} />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Status</span>
                      <span className="text-xs font-bold text-slate-700">Modifying choices for {selectedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Leave & Vacation Checkboxes */}
                <div className="grid grid-cols-2 gap-4">
                  <label className={`p-4 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                    locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    fullDayLeave ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-slate-50/50 border-slate-150 hover:bg-slate-100/50"
                  }`}>
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={fullDayLeave}
                      onChange={(e) => {
                        setFullDayLeave(e.target.checked);
                        if (e.target.checked) setVacation(false);
                      }}
                      className="sr-only"
                    />
                    <span className="text-xs font-black text-slate-900">Full-Day Leave</span>
                    <span className="text-[10px] font-semibold text-slate-400">Skips all meals for the day</span>
                  </label>

                  <label className={`p-4 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                    locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    vacation ? "bg-rose-50 border-rose-200 shadow-sm" : "bg-slate-50/50 border-slate-150 hover:bg-slate-100/50"
                  }`}>
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={vacation}
                      onChange={(e) => {
                        setVacation(e.target.checked);
                        if (e.target.checked) setFullDayLeave(false);
                      }}
                      className="sr-only"
                    />
                    <span className="text-xs font-black text-slate-900">Vacation</span>
                    <span className="text-[10px] font-semibold text-slate-400">Mark all meals skipped</span>
                  </label>
                </div>

                {/* Meal Choices Toggles */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Individual Meals</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: "Breakfast", field: "breakfast", val: breakfast, setter: setBreakfast },
                      { label: "Lunch", field: "lunch", val: lunch, setter: setLunch },
                      { label: "Dinner", field: "dinner", val: dinner, setter: setDinner }
                    ].map((meal, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                        locked || isSkipped ? "opacity-60 bg-slate-100 border-slate-200 select-none" : "bg-white border-slate-150"
                      }`}>
                        <span className="text-xs font-black text-slate-800">{meal.label}</span>
                        
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 font-bold w-full">
                          <button
                            type="button"
                            disabled={locked || isSkipped}
                            onClick={() => meal.setter("taking")}
                            className={`flex-1 py-1.5 text-[10px] rounded-md transition-all ${
                              locked || isSkipped ? "cursor-not-allowed" : "cursor-pointer"
                            } ${
                              meal.val === "taking" && !isSkipped
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Taking
                          </button>
                          <button
                            type="button"
                            disabled={locked || isSkipped}
                            onClick={() => meal.setter("skipping")}
                            className={`flex-1 py-1.5 text-[10px] rounded-md transition-all ${
                              locked || isSkipped ? "cursor-not-allowed" : "cursor-pointer"
                            } ${
                              meal.val === "skipping" || isSkipped
                                ? "bg-rose-600 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leave & Remarks Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Leave Reason / Remarks (Optional)</label>
                  <textarea
                    value={reason}
                    rows={2}
                    disabled={locked}
                    placeholder="Enter remarks/reason for leave or skipped meals..."
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:border-orange-500/50 disabled:opacity-50"
                  />
                </div>

                {error && <Error message={error} />}
                {success && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl px-4 py-3 shadow-sm flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600" />
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={locked || loading}
                  className={`w-full h-12 font-black text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    locked 
                      ? "bg-slate-300 border border-slate-200 text-slate-500 cursor-not-allowed shadow-none" 
                      : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]"
                  }`}
                >
                  <Save size={16} />
                  {loading ? "Saving Changes..." : locked ? "Preferences Locked" : "Save Preferences"}
                </button>

              </form>
            )}

            {/* PREVIOUS ENTRIES HISTORY LIST */}
            <div className="mt-4 border-t pt-5">
              <h3 className="text-sm font-black text-[#0B1F3A] mb-3.5 flex items-center gap-1.5">
                <History size={16} />
                My Preference History (Recent)
              </h3>

              {historyLoading ? (
                <div className="py-6 flex justify-center"><PageLoader /></div>
              ) : history.length === 0 ? (
                <p className="text-center font-bold text-slate-400 py-6 text-xs">No preference history entries found.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto pr-1 grid gap-3">
                  {history.map((log) => {
                    const formattedDate = new Date(log.meal_date).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    });
                    const isSkippedLog = log.full_day_leave || log.vacation;

                    return (
                      <div key={log.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs">{formattedDate}</span>
                          {log.vacation ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black rounded">Vacation</span>
                          ) : log.full_day_leave ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded">Leave</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded">Updated</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[9px] font-black text-slate-550 uppercase tracking-wide">
                          <span>Breakfast: <strong className={log.breakfast === "taking" && !isSkippedLog ? "text-emerald-600" : "text-rose-600"}>{log.breakfast === "taking" && !isSkippedLog ? "Yes" : "No"}</strong></span>
                          <span>Lunch: <strong className={log.lunch === "taking" && !isSkippedLog ? "text-emerald-600" : "text-rose-600"}>{log.lunch === "taking" && !isSkippedLog ? "Yes" : "No"}</strong></span>
                          <span>Dinner: <strong className={log.dinner === "taking" && !isSkippedLog ? "text-emerald-600" : "text-rose-600"}>{log.dinner === "taking" && !isSkippedLog ? "Yes" : "No"}</strong></span>
                        </div>
                        {log.reason && (
                          <p className="text-[10px] font-bold text-slate-400 italic">
                            Reason: "{log.reason}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TenantMealTracker;
