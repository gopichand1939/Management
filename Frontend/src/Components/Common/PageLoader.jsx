import { motion } from "framer-motion";
import { Building2, CheckCircle2 } from "lucide-react";
import React from "react";

const PageLoader = ({ message = "Loading workspace..." }) => {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-7 text-center select-none"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative grid h-20 w-20 place-items-center">
        <motion.div
          className="absolute inset-0 rounded-full border border-orange-100 bg-orange-50/50"
          animate={{ scale: [0.94, 1.04, 0.94], opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
        />

        <svg
          className="absolute h-full w-full -rotate-90"
          viewBox="0 0 80 80"
          aria-hidden="true"
        >
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="#fed7aa"
            strokeWidth="3"
          />
          <motion.circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="#f97316"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="58 214"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "40px 40px" }}
          />
        </svg>

        <motion.div
          className="relative grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 rounded-2xl bg-[linear-gradient(145deg,rgba(255,247,237,0.96),rgba(255,255,255,1)_55%,rgba(239,246,255,0.9))]" />
          <Building2
            size={22}
            strokeWidth={2.5}
            className="relative text-orange-500"
          />
          <motion.span
            className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white shadow-sm"
            animate={{ scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <CheckCircle2 size={11} strokeWidth={3} />
          </motion.span>
        </motion.div>
      </div>

      <div className="space-y-2">
        <p className="m-0 font-satoshi text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
          {message}
        </p>
        <div className="mx-auto h-1 w-20 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full w-8 rounded-full bg-orange-500"
            animate={{ x: [-34, 86] }}
            transition={{ duration: 0.75, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
