import { useState, useEffect, useRef } from "react";
import { Lock, ArrowRight, User, Eye, EyeOff, XCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { USER_LOGIN } from "../../Utils/Constants";
import { getDefaultRoute } from "../../Utils/MenuPermissions";
import { setAuthUser } from "../../Redux/User/UserSlice";

import loginBg from "../../Assets/login-image-blr-stay.png";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ── Local state only — no Redux reads here ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const showError = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast("Kindly Enter Correct Credentials");
    timerRef.current = setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(USER_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          latitude: null,
          longitude: null,
          device_info: navigator.userAgent,
          platform: "Web",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showError();
        return;
      }

      // Success — navigate away
      dispatch(setAuthUser(data));
      navigate(getDefaultRoute(data.user), { replace: true });

    } catch {
      showError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white lg:overflow-hidden select-none">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-5 right-5 z-[9999] flex items-start gap-3 bg-white border border-red-100 shadow-[0_8px_32px_rgba(239,68,68,0.2)] rounded-2xl px-4 py-3.5 min-w-[280px] max-w-[340px] overflow-hidden"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 shrink-0">
              <XCircle size={18} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-slate-800">Login Failed</p>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{toast}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
            <motion.div
              className="absolute bottom-0 left-0 h-[3px] bg-red-400 rounded-b-2xl"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 4, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Left image panel ── */}
      <div className="w-full h-56 sm:h-72 lg:w-[65%] lg:h-screen relative overflow-hidden bg-[#0B1F3A] shrink-0">
        <motion.img
          src={loginBg}
          alt="BLR Stay"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className="absolute top-4 right-4 z-20 block lg:hidden">
          <Link
            to="/support/new"
            className="group relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs font-bold text-white rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 shadow-md"
          >
            <span className="relative px-3.5 py-1.5 bg-slate-900/90 rounded-full text-[11px] flex items-center gap-1.5 cursor-pointer">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Get Support &amp; Give Feedback
            </span>
          </Link>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="w-full lg:w-[35%] min-h-0 lg:h-screen flex flex-col justify-between p-6 sm:p-8 md:p-10 xl:p-12 bg-white shrink-0 relative overflow-y-auto z-10">

        {/* Desktop support button */}
        <div className="absolute top-4 right-4 z-20 hidden lg:block">
          <Link
            to="/support/new"
            className="group relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs font-bold text-[#0B1F3A] rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 shadow-sm"
          >
            <span className="relative px-3.5 py-1.5 bg-white rounded-full group-hover:bg-opacity-0 group-hover:text-white text-[11px] flex items-center gap-1.5 cursor-pointer transition-all ease-in duration-75">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Get Support &amp; Give Feedback
            </span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="w-full max-w-md mx-auto flex flex-col justify-center text-left"
        >
          {/* Logo */}
          <div className="flex items-center gap-4 mb-6">
            <svg className="w-12 h-12 shrink-0" viewBox="0 0 100 100" fill="none">
              <defs>
                <clipPath id="pinClip">
                  <path d="M50 92 C 50 92 82 66 82 45 C 82 26 68 12 50 12 C 32 12 18 26 18 45 C 18 66 50 92 50 92 Z" />
                </clipPath>
              </defs>
              <path d="M50 92 C 50 92 82 66 82 45 C 82 26 68 12 50 12 C 32 12 18 26 18 45 C 18 66 50 92 50 92 Z" fill="#F59E0B" />
              <g clipPath="url(#pinClip)">
                <polygon points="10,100 10,48 50,28 90,48 90,100" fill="#0B1F3A" />
                <path d="M12 49 L50 29 L88 49" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="65" y="22" width="6" height="12" fill="white" />
                <rect x="42" y="50" width="6" height="6" fill="white" rx="0.5" />
                <rect x="52" y="50" width="6" height="6" fill="white" rx="0.5" />
                <rect x="42" y="60" width="6" height="6" fill="white" rx="0.5" />
                <rect x="52" y="60" width="6" height="6" fill="white" rx="0.5" />
              </g>
            </svg>
            <span className="text-2xl xl:text-3xl font-black tracking-tight text-[#0B1F3A] leading-none flex items-center">
              BLR<span className="text-[#F59E0B] ml-1">STAY</span>
            </span>
          </div>

          <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-[#0B1F3A] mb-1">Welcome Back</h1>
          <p className="text-[11px] font-semibold text-slate-400 mb-6">Sign in to continue to your dashboard</p>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="grid gap-5">

            {/* Email */}
            <div className="grid gap-2">
              <label htmlFor="email" className="text-xs font-black text-[#0B1F3A] tracking-wide">Username</label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200/80 px-3.5 group focus-within:border-[#F59E0B] focus-within:ring-4 focus-within:ring-[#F59E0B]/10 transition-all duration-200 bg-white">
                <User size={18} className="text-slate-400 shrink-0 group-focus-within:text-[#F59E0B] transition-colors duration-200" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-300 text-sm font-semibold"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <label htmlFor="password" className="text-xs font-black text-[#0B1F3A] tracking-wide">Password</label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200/80 px-3.5 group focus-within:border-[#F59E0B] focus-within:ring-4 focus-within:ring-[#F59E0B]/10 transition-all duration-200 bg-white">
                <Lock size={18} className="text-slate-400 shrink-0 group-focus-within:text-[#F59E0B] transition-colors duration-200" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-300 text-sm font-semibold"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-[#F59E0B] transition-colors shrink-0 mr-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me / Forgot */}
            <div className="flex items-center justify-between text-xs font-bold mt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-500 hover:text-slate-700 transition-colors">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#0B1F3A]" />
                <span>Remember Me</span>
              </label>
              <span className="text-blue-500 hover:text-blue-600 cursor-pointer transition-colors">Forgot Password?</span>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-3 rounded-xl bg-gradient-to-r from-[#0B1F3A] to-[#1a3861] hover:from-[#1a3861] hover:to-[#0B1F3A] active:scale-[0.985] text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(11,31,58,0.15)] hover:shadow-[0_0_24px_rgba(245,158,11,0.35)] transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight size={16} className="stroke-[3]" />
              {loading ? "Signing in..." : "Login"}
            </button>

          </form>
        </motion.div>

        <div className="mt-4 flex flex-col items-center">
          <span className="text-[10px] font-black text-slate-400">© 2026 BLR STAY. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
