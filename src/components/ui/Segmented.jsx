export default function Segmented({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:ring-slate-700">
      <button
        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
          value === "expense"
            ? "bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 text-white shadow-sm"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        }`}
        onClick={() => onChange("expense")}
        type="button"
      >
        Gasto
      </button>
      <button
        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
          value === "income"
            ? "bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 text-white shadow-sm"
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
