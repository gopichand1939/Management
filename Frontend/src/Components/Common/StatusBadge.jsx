const StatusBadge = ({ label, status }) => {
  const displayVal = status !== undefined ? status : (label !== undefined ? label : "active");
  const normVal = String(displayVal).toLowerCase();

  let badgeClass = "border-slate-200 bg-slate-50 text-slate-650";
  let dotClass = "bg-slate-400";

  if (normVal === "active" || normVal === "approved" || normVal === "completed") {
    badgeClass = "border-emerald-100 bg-emerald-50 text-emerald-600";
    dotClass = "bg-emerald-500";
  } else if (normVal === "pending") {
    badgeClass = "border-amber-100 bg-amber-50 text-amber-600";
    dotClass = "bg-amber-500";
  } else if (normVal === "draft") {
    badgeClass = "border-slate-200 bg-slate-50 text-slate-500";
    dotClass = "bg-slate-400";
  } else if (normVal === "rejected" || normVal === "inactive") {
    badgeClass = "border-rose-100 bg-rose-50 text-rose-600";
    dotClass = "bg-rose-500";
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        px-2.5
        py-0.5
        text-xs
        font-semibold
        w-fit
        ${badgeClass}
      `}
    >
      <span
        className={`
          w-1.5
          h-1.5
          rounded-full
          ${dotClass}
        `}
      />
      <span>{displayVal.charAt(0).toUpperCase() + displayVal.slice(1)}</span>
    </span>
  );
};

export default StatusBadge;
