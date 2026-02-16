export default function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  className = "",
  title,
  disabled,
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary:
      "bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-700 text-white shadow-[0_12px_28px_rgba(2,6,23,0.35)] hover:shadow-[0_16px_30px_rgba(14,116,144,0.35)] hover:brightness-105 " +
      "dark:from-slate-700 dark:via-slate-700 dark:to-cyan-600",
    soft:
      "bg-white/90 text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100 " +
      "dark:bg-slate-800/85 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700",
    ghost:
      "bg-transparent text-slate-800 hover:bg-slate-100/90 " +
      "dark:text-slate-100 dark:hover:bg-slate-800/70",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };

  return (
    <button
      title={title}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
