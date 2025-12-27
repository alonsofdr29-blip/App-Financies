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
      "bg-neutral-900 text-white hover:bg-neutral-800 " +
      "dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90",
    soft:
      "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 " +
      "dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/15",
    ghost:
      "bg-transparent text-neutral-900 hover:bg-neutral-100 " +
      "dark:text-neutral-100 dark:hover:bg-white/10",
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
