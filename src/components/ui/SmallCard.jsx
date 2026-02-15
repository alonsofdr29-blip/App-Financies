export default function SmallCard({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-3xl border shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
        "border-slate-200/80 bg-white/85",
        "dark:border-slate-700/70 dark:bg-slate-900/70 dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]",
        "backdrop-blur-xl",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
