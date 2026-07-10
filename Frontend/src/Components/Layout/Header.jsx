const Header = ({ title, subtitle }) => {
  return (
    <header
      className={`
        flex
        flex-col
        gap-1
        mb-2
      `}
    >
      {/* <span className="text-xs text-slate-400">Welcome back, Admin 👋</span> */}
      <h1
        className={`
          text-2xl
          font-extrabold
          tracking-tight
          text-slate-900
        `}
      >
        {title}
      </h1>
      <p
        className={`
          text-sm
          text-slate-500
        `}
      >
        {subtitle}
      </p>
    </header>
  );
};

export default Header;
