import { Search } from "lucide-react";

const SearchBar = ({ value, onChange, placeholder = "Search users..." }) => {
  return (
    <div
      className={`
        relative
        w-full
        max-w-xs
      `}
    >
      <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
        <Search size={16} />
      </span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={`
          w-full
          pl-9
          pr-4
          py-2
          bg-slate-50
          border
          border-slate-200
          rounded-xl
          text-xs
          text-slate-800
          placeholder-slate-400
          outline-none
          focus:bg-white
          focus:border-orange-500/50
          focus:ring-2
          focus:ring-orange-500/10
          transition-all
          duration-150
        `}
      />
    </div>
  );
};

export default SearchBar;
