import { Check } from "lucide-react";
import { motion } from "framer-motion";

const StepHeader = ({ steps, activeStep, onStepClick }) => {
  const progressPercent = (activeStep / (steps.length - 1)) * 100;

  return (
    <div className="w-full flex flex-col gap-6 text-left">
      {/* Stepper Header Section */}
      <div className="relative flex flex-col gap-3">
        {/* Progress bar background line */}
        <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
          {/* Animated active progress fill */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "spring", damping: 20, stiffness: 80 }}
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-500 via-orange-400 to-red-500 rounded-full"
          />
        </div>
      </div>

      {/* Steps Selector list */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3.5 ${
        steps.length <= 5 ? "md:grid-cols-5" : "md:grid-cols-5 lg:grid-cols-9"
      }`}>
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;

          return (
            <motion.button
              key={step}
              type="button"
              onClick={() => onStepClick(index)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3.5 rounded-[24px] border p-4 text-left transition-all duration-300 relative overflow-hidden group select-none ${
                isActive
                  ? "border-orange-500/40 bg-orange-50/20 shadow-md shadow-orange-500/5 ring-1 ring-orange-500/40"
                  : isCompleted
                  ? "border-emerald-100/80 bg-emerald-50/20 hover:bg-emerald-50/40"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
              }`}
            >
              {/* Stepper Number circles with active glowing styles */}
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-xs font-black transition-all duration-300 relative ${
                  isActive
                    ? "bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105 ring-4 ring-orange-500/15"
                    : isCompleted
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                    : "bg-slate-50 text-slate-400 border border-slate-150 group-hover:bg-slate-100 group-hover:text-slate-600"
                }`}
              >
                {isCompleted ? <Check size={14} className="stroke-[3]" /> : index + 1}
              </div>

              <div className="flex flex-col min-w-0">
                <span className={`text-[9px] font-black uppercase tracking-wider ${
                  isActive ? "text-orange-500" : isCompleted ? "text-emerald-600" : "text-slate-400"
                }`}>
                  Step {index + 1}
                </span>
                <span
                  className={`text-xs font-black truncate leading-tight mt-0.5 ${
                    isActive
                      ? "text-orange-950"
                      : isCompleted
                      ? "text-emerald-950"
                      : "text-slate-600 group-hover:text-slate-800"
                  }`}
                >
                  {step}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default StepHeader;
