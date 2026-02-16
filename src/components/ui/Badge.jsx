export default function Badge({ label, emoji }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        "bg-cyan-50/95 text-slate-800 ring-cyan-200",
        "dark:bg-cyan-500/15 dark:text-cyan-100 dark:ring-cyan-500/30",
      ].join(" ")}
    >
      <span className="text-[11px] leading-none text-cyan-700 dark:text-cyan-200">{emoji ?? "TAG"}</span>
      {label}
    </span>
  );
}
