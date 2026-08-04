import { useState, useEffect } from "react";
import { Lock, ArrowRight, User, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import Error from "../Common/Error";
import useLogin from "../../Hooks/useLogin";
import { USER_LOGIN } from "../../Utils/Constants";
import { getDefaultRoute } from "../../Utils/MenuPermissions";
import {
  setAuthUser,
  setUserError,
  setUserLoading,
} from "../../Redux/User/UserSlice";

import loginBg from "../../Assets/login-image-blr-stay.png";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    formData,
    loading,
    error,
    handleChange,
  } = useLogin();

  // Proactively request location permission on mount to avoid race condition during login submit
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        (err) => console.warn("Proactive geolocation prompt status:", err.message),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    dispatch(setUserLoading(true));
    dispatch(setUserError(""));

    let locationData = { latitude: null, longitude: null };

    // Request device location via Geolocation API
    try {
      locationData = await new Promise((resolve) => {
        if (!navigator.geolocation) {
          return resolve({ latitude: null, longitude: null });
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          async (error) => {
            console.warn("Geolocation query error or denied. Falling back to IP Geolocation:", error.message);
            try {
              const ipResponse = await fetch("https://ipapi.co/json/");
              const ipData = await ipResponse.json();
              resolve({
                latitude: ipData.latitude || null,
                longitude: ipData.longitude || null,
              });
            } catch (fallbackError) {
              console.warn("IP Geolocation lookup fallback failed:", fallbackError);
              resolve({ latitude: null, longitude: null });
            }
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      });
    } catch (e) {
      console.warn("Geolocation fetch error:", e);
    }

    // Determine platform
    const platform = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "App" : "Web";

    // Extract basic browser, operating system, and hardware model details
    const getBrowserAndOS = () => {
      const ua = navigator.userAgent;
      let browser = "Unknown Browser";
      let os = "Unknown OS";
      let hardware = "";

      if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("SamsungBrowser")) browser = "Samsung Browser";
      else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
      else if (ua.includes("Trident")) browser = "Internet Explorer";
      else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
      else if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Safari")) browser = "Safari";

      if (ua.includes("Windows NT")) os = "Windows";
      else if (ua.includes("Mac OS X")) os = "macOS";
      else if (ua.includes("Android")) {
        os = "Android";
        // Parse Android device model
        const androidMatch = ua.match(/Android\s+\d+;\s+([^;)]+)/i);
        if (androidMatch && androidMatch[1]) {
          const model = androidMatch[1].trim();
          if (!model.includes("Build") && !model.includes("Version")) {
            hardware = ` (${model})`;
          }
        }
      }
      else if (ua.includes("iPhone")) {
        os = "iOS";
        hardware = " (iPhone)";
      }
      else if (ua.includes("iPad")) {
        os = "iOS";
        hardware = " (iPad)";
      }
      else if (ua.includes("Linux")) os = "Linux";

      return `${browser} on ${os}${hardware}`;
    };

    const loginPayload = {
      ...formData,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      device_info: getBrowserAndOS(),
      platform: platform,
    };

    try {
      const response = await fetch(USER_LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        dispatch(setUserError(data.message || "Login failed"));
        return;
      }

      dispatch(setAuthUser(data));
      navigate(getDefaultRoute(data.user), { replace: true });
    } catch (errorData) {
      dispatch(setUserError(errorData.message));
    } finally {
      dispatch(setUserLoading(false));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white lg:overflow-hidden select-none">
      {/* Left side visual panel - 65% width on desktop, hidden on mobile */}
      <div className="hidden lg:block lg:w-[65%] lg:h-screen relative overflow-hidden bg-[#0B1F3A] shrink-0">
        <motion.img
          src={loginBg}
          alt="BLR Stay Premium Residence"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>

      {/* Right side form panel - 35% width on desktop, centered contents */}
      <div className="w-full lg:w-[35%] min-h-screen lg:h-screen flex flex-col justify-between p-6 sm:p-8 md:p-10 xl:p-12 bg-white shrink-0 relative overflow-y-auto">
        {/* Support & Feedback Button in Top Right */}
        <div className="absolute top-6 right-6 lg:top-8 lg:right-8 z-20">
          <Link
            to="/support/new"
            className="group relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs font-bold text-[#0B1F3A] rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-orange-200 transition-all duration-300 shadow-sm shadow-orange-500/10 hover:shadow-md hover:shadow-orange-500/20"
          >
            <span className="relative px-3.5 py-1.5 transition-all ease-in duration-75 bg-white rounded-full group-hover:bg-opacity-0 hover:text-white text-[11px] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Get Support & Feedback
            </span>
          </Link>
        </div>

        {/* Form Container with animated fade-in */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="w-full max-w-md mx-auto flex flex-col justify-center text-left"
        >
          {/* Logo Section */}
          <div className="flex items-center gap-4 mb-6 justify-start">
            <svg
              className="w-12 h-12 shrink-0"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <clipPath id="pinClip">
                  <path d="M50 92 C 50 92 82 66 82 45 C 82 26 68 12 50 12 C 32 12 18 26 18 45 C 18 66 50 92 50 92 Z" />
                </clipPath>
              </defs>
              {/* Background pin shape filled with orange */}
              <path d="M50 92 C 50 92 82 66 82 45 C 82 26 68 12 50 12 C 32 12 18 26 18 45 C 18 66 50 92 50 92 Z" fill="#F59E0B" />
              {/* Bottom section of the pin filled with dark blue, clipped to the pin shape */}
              <g clipPath="url(#pinClip)">
                <polygon points="10,100 10,48 50,28 90,48 90,100" fill="#0B1F3A" />
                {/* White roof line stroke */}
                <path d="M12 49 L50 29 L88 49" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                {/* Chimney on the right side of the roof */}
                <rect x="65" y="22" width="6" height="12" fill="white" />
                {/* 4 White Window Squares */}
                <rect x="42" y="50" width="6" height="6" fill="white" rx="0.5" />
                <rect x="52" y="50" width="6" height="6" fill="white" rx="0.5" />
                <rect x="42" y="60" width="6" height="6" fill="white" rx="0.5" />
                <rect x="52" y="60" width="6" height="6" fill="white" rx="0.5" />
              </g>
            </svg>
            <div className="flex flex-col text-left justify-center">
              <span className="text-2xl xl:text-3xl font-black tracking-tight text-[#0B1F3A] leading-none flex items-center">
                BLR<span className="text-[#F59E0B] ml-1">STAY</span>
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-[#0B1F3A] mb-1">
            Welcome Back
          </h1>
          <p className="text-[11px] font-semibold text-slate-400 mb-6">
            Sign in to continue to your dashboard
          </p>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="grid gap-5">
            {/* Username/Email Field */}
            <div className="grid gap-2">
              <label
                htmlFor="email"
                className="text-xs font-black text-[#0B1F3A] tracking-wide"
              >
                Username
              </label>
              <div
                className={`
                  flex
                  h-12
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-slate-200/80
                  px-3.5
                  text-slate-400
                  transition-all
                  duration-200
                  group
                  focus-within:border-[#F59E0B]
                  focus-within:ring-4
                  focus-within:ring-[#F59E0B]/10
                  bg-white
                `}
              >
                <User size={18} className="text-slate-450 shrink-0 group-focus-within:text-[#F59E0B] transition-colors duration-200" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  placeholder="Enter your username"
                  onChange={handleChange}
                  className="w-full border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-300 text-sm font-semibold"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="grid gap-2">
              <label
                htmlFor="password"
                className="text-xs font-black text-[#0B1F3A] tracking-wide"
              >
                Password
              </label>
              <div
                className={`
                  flex
                  h-12
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-slate-200/80
                  px-3.5
                  text-slate-400
                  transition-all
                  duration-200
                  group
                  focus-within:border-[#F59E0B]
                  focus-within:ring-4
                  focus-within:ring-[#F59E0B]/10
                  bg-white
                `}
              >
                <Lock size={18} className="text-slate-450 shrink-0 group-focus-within:text-[#F59E0B] transition-colors duration-200" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  placeholder="Enter your password"
                  onChange={handleChange}
                  className="w-full border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-300 text-sm font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-650 group-focus-within:text-[#F59E0B] transition-colors shrink-0 mr-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between text-xs mt-1 font-bold">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-500 hover:text-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-350 text-[#0B1F3A] focus:ring-[#0B1F3A]/10"
                />
                <span>Remember Me</span>
              </label>
              <span className="text-blue-500 hover:text-blue-600 cursor-pointer transition-colors">
                Forgot Password?
              </span>
            </div>

            <Error message={error} />

            {/* Large Premium Gradient Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full
                h-12
                mt-3
                rounded-xl
                bg-gradient-to-r
                from-[#0B1F3A]
                to-[#1a3861]
                hover:from-[#1a3861]
                hover:to-[#0B1F3A]
                active:scale-[0.985]
                text-white
                font-black
                text-sm
                flex
                items-center
                justify-center
                gap-2
                shadow-[0_4px_12px_rgba(11,31,58,0.15)]
                hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]
                transition-all
                duration-300
                cursor-pointer
                disabled:opacity-50
                disabled:cursor-not-allowed
              `}
            >
              <ArrowRight size={16} className="stroke-[3]" />
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </motion.div>

        {/* Footer info & Signup Link */}
        <div className="mt-4 flex flex-col items-center gap-3">
          <Link
            to="/register"
            className="text-xs font-black text-blue-500 hover:text-blue-600 hover:underline transition-all"
          >
            Create new admin account
          </Link>
          <span className="text-[10px] font-black text-slate-350">
            © 2026 BLR STAY. All rights reserved.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
