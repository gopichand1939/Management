import BedSeat from "./BedSeat";

const BedsideTable = () => (
  <div className="flex flex-col items-center gap-1 select-none shrink-0">
    <div className="w-6 h-6 rounded-md bg-amber-800/90 border border-amber-900 shadow-sm flex items-center justify-center text-slate-100 relative">
      <span className="text-emerald-300 text-[8px]">☘</span>
      <div className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full bg-white/20" />
    </div>
    <div className="w-4 h-0.5 bg-slate-300/60 rounded-full" />
  </div>
);

const BedLayout = ({ beds, selectedBedIndex, onBedClick }) => {
  const count = beds.length;

  // Render beds based on capacity configuration
  const renderBeds = () => {
    if (count === 1) {
      return (
        <div className="flex items-center gap-4">
          <BedSeat
            bed={beds[0]}
            isSelected={selectedBedIndex === 0}
            onClick={() => onBedClick(0)}
          />
          <BedsideTable />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="flex items-center gap-6">
          <BedSeat
            bed={beds[0]}
            isSelected={selectedBedIndex === 0}
            onClick={() => onBedClick(0)}
          />
          <BedsideTable />
          <BedSeat
            bed={beds[1]}
            isSelected={selectedBedIndex === 1}
            onClick={() => onBedClick(1)}
          />
        </div>
      );
    }

    if (count === 3) {
      return (
        <div className="flex flex-col gap-6 items-center w-full">
          {/* Row 1 */}
          <div className="flex items-center gap-6">
            <BedSeat
              bed={beds[0]}
              isSelected={selectedBedIndex === 0}
              onClick={() => onBedClick(0)}
            />
            <BedsideTable />
            <BedSeat
              bed={beds[1]}
              isSelected={selectedBedIndex === 1}
              onClick={() => onBedClick(1)}
            />
          </div>
          {/* Row 2 */}
          <div className="flex items-center gap-4 pr-10">
            <BedSeat
              bed={beds[2]}
              isSelected={selectedBedIndex === 2}
              onClick={() => onBedClick(2)}
            />
            <BedsideTable />
          </div>
        </div>
      );
    }

    if (count === 4) {
      return (
        <div className="flex flex-col gap-6 items-center w-full">
          {/* Row 1 */}
          <div className="flex items-center gap-6">
            <BedSeat
              bed={beds[0]}
              isSelected={selectedBedIndex === 0}
              onClick={() => onBedClick(0)}
            />
            <BedsideTable />
            <BedSeat
              bed={beds[1]}
              isSelected={selectedBedIndex === 1}
              onClick={() => onBedClick(1)}
            />
          </div>
          {/* Row 2 */}
          <div className="flex items-center gap-6">
            <BedSeat
              bed={beds[2]}
              isSelected={selectedBedIndex === 2}
              onClick={() => onBedClick(2)}
            />
            <BedsideTable />
            <BedSeat
              bed={beds[3]}
              isSelected={selectedBedIndex === 3}
              onClick={() => onBedClick(3)}
            />
          </div>
        </div>
      );
    }

    // Default Dormitory Block layout (5+ beds)
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-5 justify-items-center w-full p-2">
        {beds.map((bed, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5">
            <BedSeat
              bed={bed}
              isSelected={selectedBedIndex === idx}
              onClick={() => onBedClick(idx)}
            />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              #{idx + 1}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center text-center">
      {/* Floorplan Frame Illustration */}
      <div
        className="w-full rounded-2xl border border-slate-200/80 p-6 flex items-center justify-center relative shadow-inner overflow-hidden min-h-[145px]"
        style={{
          background: "repeating-linear-gradient(90deg, #FAF7F2, #FAF7F2 26px, #F3EFE7 27px)",
        }}
      >
        {/* Wall Details */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-450 border-b border-slate-350" />
        
        {/* Architectural Window Illustration */}
        <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-24 h-1.5 bg-slate-650 rounded flex items-center justify-center shadow-sm z-10">
          <div className="w-20 h-0.5 bg-sky-300/90" />
        </div>

        {/* Dynamic Bed Layout */}
        <div className="z-10 py-2 w-full flex justify-center">
          {renderBeds()}
        </div>

        {/* Floor Room Exit detail at bottom */}
        <div className="absolute bottom-0 right-8 w-12 h-1 bg-amber-900/40 rounded-t-sm" />
      </div>
    </div>
  );
};

export default BedLayout;
