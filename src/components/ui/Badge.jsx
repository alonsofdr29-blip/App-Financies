// Nota: depende de CATEGORY_EMOJIS. La pasamos como prop para evitar imports circulares.
export default function Badge({ label, emoji }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-1",
        "bg-cyan-50/80 ring-cyan-100 text-slate-800",
        "dark:bg-cyan-500/15 dark:ring-cyan-500/30 dark:text-cyan-100",
      ].join(" ")}
    >
      <span className="text-sm leading-none">{emoji ?? "🏷️"}</span>
      {label}
    </span>
  );
}
