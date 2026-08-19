import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Upload,
  AlertCircle,
  ArrowLeft,
  Phone,
  User,
  Mail,
  Send,
  Loader2,
  Building2,
  Building,
  UtensilsCrossed,
  Calendar,
  CheckCircle,
  LogOut
} from "lucide-react";
import {
  SUPPORT_PUBLIC_INSTITUTIONS,
  SUPPORT_PUBLIC_CHAT_USER,
  SUPPORT_PUBLIC_CHAT_USER_REGISTER,
  MEAL_TRACKER_TENANT_VERIFY,
  MEAL_TRACKER_TENANT_GET,
  MEAL_TRACKER_TENANT_SAVE
} from "../../Utils/Constants";

const PublicSupportCreate = () => {
  const navigate = useNavigate();

  // STEP 1: Live Support States
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [institutions, setInstitutions] = useState([]);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution_id: "",
    message: "",
  });
  
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // STEP 2: Meal Preferences States
  const [mealSelectedInstId, setMealSelectedInstId] = useState("");
  const [mealPhone, setMealPhone] = useState("");
  const [mealTenant, setMealTenant] = useState(null);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealError, setMealError] = useState("");
  const [mealSuccess, setMealSuccess] = useState("");

  const [mealDate, setMealDate] = useState(new Date().toISOString().split("T")[0]);
  const [mealLocked, setMealLocked] = useState(false);
  const [breakfast, setBreakfast] = useState("taking");
  const [lunch, setLunch] = useState("taking");
  const [dinner, setDinner] = useState("taking");
  const [fullDayLeave, setFullDayLeave] = useState(false);
  const [vacation, setVacation] = useState(false);
  const [reason, setReason] = useState("");

  const [loadingInst, setLoadingInst] = useState(true);

  // Load institutions list for dropdowns
  useEffect(() => {
    const fetchInstitutions = async () => {
      setLoadingInst(true);
      try {
        const res = await fetch(SUPPORT_PUBLIC_INSTITUTIONS);
        const data = await res.json();
        if (data.success) {
          setInstitutions(data.data || []);
          if (data.data.length > 0) {
            setFormData((prev) => ({ ...prev, institution_id: data.data[0].id.toString() }));
            setMealSelectedInstId(data.data[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Failed to load institutions:", err);
      } finally {
        setLoadingInst(false);
      }
    };
    fetchInstitutions();

    // Check if session exists in sessionStorage
    const savedSession = sessionStorage.getItem("tenant_meal_session");
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      setMealTenant(parsed);
      loadMealTenantData(parsed.id, mealDate);
    }
  }, []);

  // Fetch preferences whenever verified meal tenant or selected date changes
  useEffect(() => {
    if (mealTenant) {
      loadMealTenantData(mealTenant.id, mealDate);
    }
  }, [mealDate, mealTenant]);

  const loadMealTenantData = async (tenantId, date) => {
    try {
      const res = await fetch(`${MEAL_TRACKER_TENANT_GET}/${tenantId}?date=${date}`);
      const json = await res.json();
      if (json.success) {
        if (json.data.today) {
          const rec = json.data.today;
          setBreakfast(rec.breakfast);
          setLunch(rec.lunch);
          setDinner(rec.dinner);
          setFullDayLeave(rec.full_day_leave);
          setVacation(rec.vacation);
          setReason(rec.reason || "");
          setMealLocked(true);
        } else {
          setBreakfast("taking");
          setLunch("taking");
          setDinner("taking");
          setFullDayLeave(false);
          setVacation(false);
          setReason("");
          setMealLocked(false);
        }
      }
    } catch (err) {
      console.error("Error loading preferences data:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Attachment must be less than 10MB");
        return;
      }
      setAttachment(file);
      setError("");

      const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
        setAttachmentPreview(URL.createObjectURL(file));
      } else {
        setAttachmentPreview("pdf-placeholder");
      }
    }
  };

  // Submit support phone number
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError("Please enter a valid mobile number");
      return;
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      setError("Mobile number must be exactly 10 digits");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${SUPPORT_PUBLIC_CHAT_USER}?phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();

      if (data.success) {
        if (data.exists) {
          navigate(`/support/chat/${data.user.id}`);
        } else {
          if (data.suggestedInfo) {
            setFormData((prev) => ({
              ...prev,
              name: data.suggestedInfo.name || "",
              email: data.suggestedInfo.email || "",
              institution_id: data.suggestedInfo.institution_id ? data.suggestedInfo.institution_id.toString() : prev.institution_id
            }));
          }
          setStep("register");
        }
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Register support user & submit message
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = new FormData();
      payload.append("phone", phone.trim());
      payload.append("name", formData.name.trim());
      payload.append("email", formData.email.trim());
      payload.append("institution_id", formData.institution_id);
      payload.append("message", formData.message.trim());
      if (attachment) {
        payload.append("attachment", attachment);
      }

      const res = await fetch(SUPPORT_PUBLIC_CHAT_USER_REGISTER, {
        method: "POST",
        body: payload,
      });

      const data = await res.json();
      if (data.success) {
        navigate(`/support/chat/${data.user.id}`);
      } else {
        setError(data.message || "Failed to start conversation.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // Verify meal tenant phone login
  const handleMealVerify = async (e) => {
    e.preventDefault();
    if (!mealSelectedInstId) {
      setMealError("Please select your PG / Hostel.");
      return;
    }
    if (!mealPhone) {
      setMealError("Please enter your registered phone number.");
      return;
    }

    setMealLoading(true);
    setMealError("");
    setMealSuccess("");
    try {
      const res = await fetch(MEAL_TRACKER_TENANT_VERIFY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: mealPhone.trim(),
          institutionId: mealSelectedInstId
        })
      });

      const json = await res.json();
      if (json.success) {
        setMealTenant(json.data);
        sessionStorage.setItem("tenant_meal_session", JSON.stringify(json.data));
        loadMealTenantData(json.data.id, mealDate);
      } else {
        setMealError(json.message || "Verification failed. Check credentials.");
      }
    } catch (err) {
      setMealError("Failed to verify. Please try again.");
    } finally {
      setMealLoading(false);
    }
  };

  // Save meal preferences from the portal
  const handleSaveMealPreferences = async (e) => {
    e.preventDefault();
    if (!mealTenant) return;

    const now = new Date();
    const limit = new Date(`${mealDate}T23:59:59`);
    if (now > limit) {
      setMealError("Cannot save or modify preferences for past dates.");
      return;
    }

    setMealLoading(true);
    setMealError("");
    setMealSuccess("");
    try {
      const res = await fetch(MEAL_TRACKER_TENANT_SAVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: mealTenant.id,
          institutionId: mealTenant.institution_id,
          mealDate: mealDate,
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
        setMealSuccess("Meal preferences updated successfully!");
        setMealLocked(true);
        loadMealTenantData(mealTenant.id, mealDate);
      } else {
        setMealError(json.message || "Failed to save preferences.");
      }
    } catch (err) {
      setMealError("Error connecting to server.");
    } finally {
      setMealLoading(false);
    }
  };

  const handleMealLogout = () => {
    sessionStorage.removeItem("tenant_meal_session");
    setMealTenant(null);
    setMealPhone("");
    setMealError("");
    setMealSuccess("");
    setMealLocked(false);
  };

  const selectedPG = institutions.find(
    (inst) => String(inst.id) === String(mealSelectedInstId || formData.institution_id)
  );

  const isLiveSupportVisible = institutions.length > 0 ? (selectedPG ? selectedPG.live_support_enabled : true) : false;
  const isMealTrackerVisible = institutions.length > 0 ? (selectedPG ? selectedPG.meal_tracker_enabled : true) : false;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start p-4 md:p-6 text-slate-100 font-sans selection:bg-orange-500/30 overflow-y-auto relative">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Top Header Row */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-8 z-10">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-slate-100 transition shadow-lg backdrop-blur-md cursor-pointer select-none"
        >
          <ArrowLeft size={14} />
          <span>Go Back</span>
        </Link>
        <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Tenant Services Portal</span>
      </div>

      {/* PG Selector Bar - commented out for now
      {institutions.length > 0 && (
        <div className="w-full max-w-xl mx-auto mb-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold z-10">
          <div className="flex items-center gap-2">
            <Building className="text-orange-500 shrink-0" size={16} />
            <span className="text-slate-350">Select Your PG / Hostel:</span>
          </div>
          <select
            value={mealSelectedInstId}
            onChange={(e) => {
              const val = e.target.value;
              setMealSelectedInstId(val);
              setFormData(prev => ({ ...prev, institution_id: val }));
            }}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl h-10 px-3 min-w-[200px] outline-none focus:border-orange-500 cursor-pointer"
          >
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id.toString()}>
                {inst.institution_name}
              </option>
            ))}
          </select>
        </div>
      )}
      */}

      {/* Main Grid/Flex Container */}
      <div className={`w-full z-10 transition-all ${
        isLiveSupportVisible && isMealTrackerVisible
          ? "max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
          : "max-w-xl mx-auto flex flex-col gap-6"
      }`}>
          
          {/* LEFT COLUMN: LIVE SUPPORT DESK */}
          {isLiveSupportVisible && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col min-h-[480px] w-full"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-500" />
          
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 font-bold mb-6 transition cursor-pointer select-none self-start"
          >
            <ArrowLeft size={14} />
            <span>Back to Login</span>
          </button>

          <div className="flex items-center space-x-4 mb-6">
            {/* Bobbing head agent graphic */}
            <div className="relative w-14 h-14 bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-orange-500/5">
              <div className="w-10 h-10 relative flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="absolute top-1 w-7 h-5 border-t-2 border-slate-300 rounded-t-full"></div>
                <div className="w-6 h-6 bg-amber-100 rounded-full absolute top-2.5 flex items-center justify-center shadow-inner">
                  <div className="flex space-x-2 absolute top-2">
                    <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                    <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                  </div>
                  <div className="w-2.5 h-1 border-b-2 border-slate-700 rounded-b-full absolute bottom-1.5"></div>
                </div>
                <div className="absolute left-1.5 top-4.5 w-1 h-2.5 bg-slate-600 rounded-full"></div>
                <div className="absolute right-1.5 top-4.5 w-1 h-2.5 bg-slate-600 rounded-full"></div>
              </div>
              <div className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900 animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-lg font-black bg-gradient-to-r from-orange-400 to-amber-250 bg-clip-text text-transparent">
                Live Agent
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                {step === "phone" 
                  ? "Verify Your Number to Start Chatting with Our Agent ." 
                  : "Complete details below to start support request."}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2 text-red-400 text-[11px] font-bold">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "phone" ? (
              <motion.form
                key="phone-step"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handlePhoneSubmit}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Phone size={14} />
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 9876543210"
                      className="w-full h-11 bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 text-xs text-slate-100 placeholder:text-slate-655 focus:border-orange-500/50 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-1 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 font-black text-slate-950 rounded-xl flex items-center justify-center text-xs tracking-wider uppercase cursor-pointer disabled:opacity-50 transition shadow-lg shadow-orange-500/10 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Support</span>
                      <Send size={12} />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register-step"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-4"
              >
                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 font-black block uppercase tracking-wider">Number</span>
                    <span className="text-xs text-slate-200 font-bold">{phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="text-xs text-orange-500 hover:text-orange-400 font-bold cursor-pointer transition"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full h-10 bg-slate-950/80 border border-slate-800 rounded-xl px-3 text-xs text-slate-100 placeholder:text-slate-655 focus:border-orange-500/50 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    className="w-full h-10 bg-slate-950/80 border border-slate-800 rounded-xl px-3 text-xs text-slate-100 placeholder:text-slate-655 focus:border-orange-500/50 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Hostel / PG</label>
                  <input
                    type="text"
                    disabled
                    value={selectedPG ? selectedPG.institution_name : ""}
                    className="w-full h-10 bg-slate-950/40 border border-slate-850 rounded-xl px-3 text-xs text-slate-405 font-bold outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Support Query</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={2}
                    placeholder="What issue/feedback do you have..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-655 focus:border-orange-500/50 resize-none"
                  />
                </div>

                {/* Attachment */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-xl cursor-pointer text-xs font-bold text-slate-300">
                    <Upload size={14} />
                    <span>Upload file</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {attachment && (
                    <span className="text-[10px] text-slate-450 truncate max-w-[160px] font-bold">{attachment.name}</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 font-black text-slate-950 rounded-xl flex items-center justify-center text-xs tracking-wider uppercase cursor-pointer disabled:opacity-50 transition"
                >
                  {loading ? "Connecting..." : "Submit Support Request"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      )}

        {/* RIGHT COLUMN: DAILY MEAL PREFERENCES */}
        {isMealTrackerVisible && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col min-h-[480px] w-full"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-lg">
              <UtensilsCrossed className="text-emerald-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                Tenant Meal Preference
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                Update your daily breakfast, lunch, and dinner attendance.
              </p>
            </div>
          </div>

          {mealError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2 text-red-400 text-[11px] font-bold">
              <AlertCircle size={14} className="shrink-0" />
              <span>{mealError}</span>
            </div>
          )}
          {mealSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-2 text-emerald-400 text-[11px] font-bold">
              <CheckCircle size={14} className="shrink-0" />
              <span>{mealSuccess}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!mealTenant ? (
              <motion.form
                key="meal-login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleMealVerify}
                className="space-y-4"
              >


                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Registered Phone Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Phone size={14} />
                    </span>
                    <input
                      type="tel"
                      required
                      value={mealPhone}
                      onChange={(e) => setMealPhone(e.target.value)}
                      placeholder="Enter registered mobile number..."
                      className="w-full h-11 bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 text-xs text-slate-100 placeholder:text-slate-650 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={mealLoading}
                  className="w-full h-11 mt-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 font-black text-white rounded-xl flex items-center justify-center text-xs tracking-wider uppercase cursor-pointer disabled:opacity-50 transition shadow-lg shadow-emerald-500/10"
                >
                  {mealLoading ? "Verifying tenant..." : "Access Meal Tracker"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="meal-preferences"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSaveMealPreferences}
                className="space-y-4"
              >
                {/* Active Session Info */}
                <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-550 font-black block uppercase tracking-wider">
                      {mealTenant.full_name}
                    </span>
                    <span className="text-[10px] text-slate-350 font-bold">
                      {mealTenant.floor_name || "PG"} · Room {mealTenant.room_number || "-"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMealLogout}
                    className="flex items-center gap-1 h-7 px-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black rounded-lg cursor-pointer hover:bg-rose-500/20"
                  >
                    <LogOut size={10} />
                    Switch
                  </button>
                </div>

                {/* Preference Date Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-450">Preference Date</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Calendar size={14} />
                    </span>
                    <input
                      type="date"
                      value={mealDate}
                      onChange={(e) => setMealDate(e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      className="w-full pl-9 pr-4 h-10 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-bold text-slate-100 focus:border-emerald-500/50 outline-none cursor-pointer"
                    />
                  </div>
                </div>
                {/* Leave / Vacation Quick Choice Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={mealLocked || mealLoading}
                    onClick={() => {
                      setFullDayLeave(!fullDayLeave);
                      if (!fullDayLeave) setVacation(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition duration-200 ${
                      mealLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    } ${
                      fullDayLeave ? "bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/15" : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-[11px] font-black">Full-Day Leave</span>
                    <span className={`text-[8px] font-bold ${fullDayLeave ? "text-amber-950" : "text-slate-500"}`}>Skip today's meals</span>
                  </button>

                  <button
                    type="button"
                    disabled={mealLocked || mealLoading}
                    onClick={() => {
                      setVacation(!vacation);
                      if (!vacation) setFullDayLeave(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition duration-200 ${
                      mealLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    } ${
                      vacation ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20" : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-[11px] font-black">Vacation</span>
                    <span className={`text-[8px] font-bold ${vacation ? "text-rose-100" : "text-slate-500"}`}>Long-term leave</span>
                  </button>
                </div>

                {/* Meal Attendance Buttons Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Breakfast", val: breakfast, setter: setBreakfast },
                    { label: "Lunch", val: lunch, setter: setLunch },
                    { label: "Dinner", val: dinner, setter: setDinner }
                  ].map((meal, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl border flex flex-col gap-2 transition ${
                      mealLocked || fullDayLeave || vacation ? "opacity-25 bg-slate-950/20 border-slate-900" : "bg-slate-950/40 border-slate-800"
                    }`}>
                      <span className="text-[9px] font-black text-slate-350 uppercase tracking-wider">{meal.label}</span>
                      <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-bold w-full">
                        <button
                          type="button"
                          disabled={mealLocked || fullDayLeave || vacation}
                          onClick={() => meal.setter("taking")}
                          className={`flex-1 py-1 text-[9px] rounded-md transition ${
                            mealLocked || fullDayLeave || vacation ? "cursor-not-allowed" : "cursor-pointer"
                          } ${
                            meal.val === "taking" && !(fullDayLeave || vacation) ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/10" : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          Take
                        </button>
                        <button
                          type="button"
                          disabled={mealLocked || fullDayLeave || vacation}
                          onClick={() => meal.setter("skipping")}
                          className={`flex-1 py-1 text-[9px] rounded-md transition ${
                            mealLocked || fullDayLeave || vacation ? "cursor-not-allowed" : "cursor-pointer"
                          } ${
                            meal.val === "skipping" || fullDayLeave || vacation ? "bg-rose-500 text-white font-black shadow-md shadow-rose-500/10" : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Remarks/Reason (Optional) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Leave Reason / Remarks (Optional)</label>
                  <textarea
                    value={reason}
                    rows={1}
                    disabled={mealLocked || mealLoading}
                    placeholder="Reason for leave/skip..."
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder:text-slate-650 focus:border-emerald-500/50 resize-none outline-none disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={mealLocked || mealLoading}
                  className={`w-full h-11 font-black rounded-xl flex items-center justify-center text-xs tracking-wider uppercase cursor-pointer disabled:opacity-60 transition shadow-lg gap-2 ${
                    mealLocked 
                      ? "bg-slate-850 border border-slate-800 text-slate-500 cursor-not-allowed shadow-none" 
                      : "bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 shadow-emerald-500/10 active:scale-[0.99]"
                  }`}
                >
                  {mealLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Updating preferences...</span>
                    </>
                  ) : mealLocked ? (
                    <>
                      <span>Preferences Locked</span>
                    </>
                  ) : (
                    <>
                      <span>Save Preferences</span>
                      <Send size={12} />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
          </motion.div>
        )}
      </div>

    </div>
  );
};

export default PublicSupportCreate;
