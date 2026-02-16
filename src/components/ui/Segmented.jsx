export default function Segmented({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-300 dark:bg-slate-800/80 dark:ring-slate-700">
      <button
        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-all ${
          value === "expense"
            ? "bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-700 text-white shadow-[0_8px_20px_rgba(2,6,23,0.25)]"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        }`}
        onClick={() => onChange("expense")}
        type="button"
      >
        Gasto
      </button>
      <button
        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-all ${
          value === "income"
            ? "bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-700 text-white shadow-[0_8px_20px_rgba(2,6,23,0.25)]"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        }`}
        onClick={() => onChange("income")}
        type="button"
      >
        Ingreso
      </button>
    </div>
  );
}
