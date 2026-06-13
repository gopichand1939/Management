const StatusBadge = ({ label = "active" }) => {
  const isActive = String(label).toLowerCase() === "active";

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
        ${
          isActive
            ? "border-emerald-100 bg-emerald-50 text-emerald-600"
            : "border-rose-100 bg-rose-50 text-rose-600"
        }
      `}
    >
      <span
        className={`
          w-1.5
          h-1.5
          rounded-full
          ${isActive ? "bg-emerald-500" : "bg-rose-500"}
        `}
      />
      <span>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
    </span>
  );
};

export default StatusBadge;
