export default function Segmented({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 rounded-2xl bg-neutral-100 p-1 dark:bg-white/10">
      <button
        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
          value === "expense"
            ? "bg-white shadow-sm dark:bg-white/15 dark:text-neutral-100"
            : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        }`}
        onClick={() => onChange("expense")}
        type="button"
      >
        Gasto
      </button>
      <button
        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
          value === "income"
            ? "bg-white shadow-sm dark:bg-white/15 dark:text-neutral-100"
            : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        }`}
        onClick={() => onChange("income")}
        type="button"
      >
        Ingreso
      </button>
    </div>
  );
}
