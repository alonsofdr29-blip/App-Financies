// Nota: depende de CATEGORY_EMOJIS. La pasamos como prop para evitar imports circulares.
export default function Badge({ label, emoji }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-1",
        "bg-neutral-50 ring-neutral-200 text-neutral-800",
        "dark:bg-white/10 dark:ring-white/10 dark:text-neutral-100",
      ].join(" ")}
    >
      <span className="text-sm leading-none">{emoji ?? "🏷️"}</span>
      {label}
    </span>
  );
}
