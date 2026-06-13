const InputField = ({
  label,
  name,
  type = "text",
  value,
  placeholder,
  icon: Icon,
  onChange,
}) => {
  return (
    <div
      className={`
        grid
        gap-1.5
      `}
    >
      <label
        htmlFor={name}
        className={`
          text-xs
          font-bold
          text-slate-500
          uppercase
          tracking-wider
        `}
      >
        {label}
      </label>

      <div
        className={`
          flex
          min-h-[42px]
          items-center
          gap-3
          rounded-xl
          border
          border-slate-200
          px-3.5
          text-slate-400
          transition-all
          duration-200
          focus-within:text-orange-500
          focus-within:border-orange-500/50
          focus-within:ring-2
          focus-within:ring-orange-500/10
          bg-white
          shadow-sm
        `}
      >
        {Icon && <Icon size={16} />}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          className={`
            w-full
            border-0
            bg-transparent
            text-slate-800
            outline-none
            placeholder:text-slate-400
            text-sm
          `}
        />
      </div>
    </div>
  );
};

export default InputField;
