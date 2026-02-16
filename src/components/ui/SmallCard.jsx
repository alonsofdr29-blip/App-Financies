export default function SmallCard({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-3xl border border-slate-200/80 bg-white/95",
        "shadow-[0_14px_36px_rgba(15,23,42,0.09)] backdrop-blur-xl",
        "dark:border-slate-700/70 dark:bg-slate-900/78 dark:shadow-[0_16px_42px_rgba(2,6,23,0.5)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
