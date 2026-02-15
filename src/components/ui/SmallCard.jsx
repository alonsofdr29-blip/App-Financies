export default function SmallCard({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-3xl border shadow-[0_16px_45px_rgba(15,23,42,0.08)]",
        "border-slate-200/70 bg-white/92",
        "dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-[0_18px_45px_rgba(2,6,23,0.45)]",
        "backdrop-blur-xl",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
