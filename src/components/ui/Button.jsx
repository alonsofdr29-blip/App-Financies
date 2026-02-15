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
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-[0_8px_20px_rgba(14,116,144,0.25)] hover:from-blue-600 hover:to-cyan-500 " +
      "dark:from-blue-600 dark:to-cyan-500 dark:hover:from-blue-500 dark:hover:to-cyan-400",
    soft:
      "bg-slate-100 text-slate-800 hover:bg-slate-200 " +
      "dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-700",
    ghost:
      "bg-transparent text-slate-800 hover:bg-slate-100 " +
      "dark:text-slate-100 dark:hover:bg-slate-800/70",
    danger: "bg-red-600 text-white hover:bg-red-500",
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
