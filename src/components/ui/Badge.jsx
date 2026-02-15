// Nota: depende de CATEGORY_EMOJIS. La pasamos como prop para evitar imports circulares.
export default function Badge({ label, emoji }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-1",
        "bg-teal-50/90 ring-teal-100 text-slate-800",
        "dark:bg-teal-500/15 dark:ring-teal-500/30 dark:text-teal-100",
      ].join(" ")}
    >
      <span className="text-sm leading-none">{emoji ?? "🏷️"}</span>
      {label}
    </span>
  );
}
