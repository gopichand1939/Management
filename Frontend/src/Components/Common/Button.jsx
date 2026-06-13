const Button = ({
  children,
  icon: Icon,
  type = "button",
  variant = "primary",
  onClick,
  disabled = false,
}) => {
  const className = variant === "secondary"
    ? `
        inline-flex
        min-h-[40px]
        cursor-pointer
        items-center
        justify-center
        gap-2
        rounded-xl
        border
        border-slate-200/80
        bg-slate-50
        px-4
        text-sm
        font-bold
        text-slate-700
        transition-all
        duration-200
        hover:bg-slate-100
        hover:text-slate-900
        hover:-translate-y-0.5
        disabled:cursor-not-allowed
        disabled:opacity-50
      `
    : `
        inline-flex
        min-h-[40px]
        cursor-pointer
        items-center
        justify-center
        gap-2
        rounded-xl
        px-4
        text-sm
        font-extrabold
        text-white
        transition-all
        duration-200
        bg-gradient-to-r
        from-orange-500
        to-red-500
        hover:from-orange-600
        hover:to-red-600
        hover:-translate-y-0.5
        shadow-md
        shadow-orange-500/10
        hover:shadow-lg
        hover:shadow-orange-500/15
        disabled:cursor-not-allowed
        disabled:opacity-60
      `;

  return (
    <button
      className={className}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={16} />}
      <span>{children}</span>
    </button>
  );
};

export default Button;
