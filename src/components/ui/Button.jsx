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
      "bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 text-white shadow-[0_12px_24px_rgba(15,23,42,0.28)] hover:to-teal-600 " +
      "dark:from-slate-700 dark:via-slate-700 dark:to-teal-600 dark:hover:to-teal-500",
    soft:
      "bg-slate-100/95 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200 " +
      "dark:bg-slate-800/80 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700",
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
