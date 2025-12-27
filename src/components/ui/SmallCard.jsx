export default function SmallCard({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-3xl border shadow-sm",
        "border-neutral-200 bg-white",
        "dark:border-white/10 dark:bg-white/5 dark:shadow-none",
        "backdrop-blur-xl",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
