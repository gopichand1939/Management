import { Check } from "lucide-react";
import { motion } from "framer-motion";

const StepHeader = ({ steps, activeStep, onStepClick }) => {
  const progressPercent = (activeStep / (steps.length - 1)) * 100;

  return (
    <div className="w-full relative overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pb-3 pt-2">
      {/* Container for step indicators and lines */}
      <div className="relative flex items-start justify-between min-w-[880px] px-4">
        
        {/* Step Connecting Line (Background) */}
        <div className="absolute top-[18px] left-[5%] right-[5%] h-[3px] bg-slate-100 rounded-full z-0 shadow-inner" />
        
        {/* Step Connecting Line (Active Progress) */}
        <div className="absolute top-[18px] left-[5%] right-[5%] h-[3px] z-0">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "spring", damping: 20, stiffness: 80 }}
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
          />
        </div>

        {/* Steps Loop */}
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;

          return (
            <div 
              key={step} 
              className="flex flex-col items-center relative z-10 group"
              style={{ width: `${100 / steps.length}%` }}
            >
              {/* Clickable button wrapping the indicator circle */}
              <button
                type="button"
                onClick={() => onStepClick(index)}
                className="focus:outline-none flex flex-col items-center bg-transparent border-0 cursor-pointer p-0"
              >
                {/* Step Circle Indicator */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition-all duration-300 relative border-2 ${
                    isActive
                      ? "bg-gradient-to-r from-orange-500 to-red-500 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.45)] ring-4 ring-orange-500/15 font-black scale-110"
                      : isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                      : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-350 group-hover:text-slate-600 shadow-sm"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={14} className="stroke-[3]" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </motion.div>

                {/* Text labels container */}
                <div className="flex flex-col items-center mt-2.5 px-1">
                  <span 
                    className={`text-[9px] font-black uppercase tracking-wider transition-colors duration-200 ${
                      isActive 
                        ? "text-orange-500" 
                        : isCompleted 
                        ? "text-emerald-600" 
                        : "text-slate-400"
                    }`}
                  >
                    Step {index + 1}
                  </span>
                  
                  <span
                    className={`text-[11px] font-extrabold leading-tight mt-0.5 text-center whitespace-normal max-w-[90px] transition-colors duration-200 ${
                      isActive
                        ? "text-slate-900 font-black scale-[1.02]"
                        : isCompleted
                        ? "text-slate-700 hover:text-slate-900"
                        : "text-slate-500 group-hover:text-slate-800"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepHeader;

