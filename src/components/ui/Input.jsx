export default function Input({ label, value, onChange, placeholder, type = "text", right }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">{label}</div>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-300/80 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-cyan-600 dark:focus:ring-cyan-900/35"
        />
        {right ? <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">{right}</div> : null}
      </div>
    </label>
  );
}
