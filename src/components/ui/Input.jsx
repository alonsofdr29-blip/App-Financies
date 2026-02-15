export default function Input({ label, value, onChange, placeholder, type = "text", right }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</div>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border px-3 py-3 text-sm outline-none border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-teal-700/40"
        />
        {right ? <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">{right}</div> : null}
      </div>
    </label>
  );
}
