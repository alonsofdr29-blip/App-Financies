export default function Input({ label, value, onChange, placeholder, type = "text", right }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">{label}</div>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border px-3 py-3 text-sm outline-none border-neutral-200 bg-white text-neutral-900 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus:ring-white/15"
        />
        {right ? <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">{right}</div> : null}
      </div>
    </label>
  );
}
