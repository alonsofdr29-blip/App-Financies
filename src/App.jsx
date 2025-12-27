import React, { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import {
  Plus,
  Trash2,
  Wallet,
  Download,
  Upload,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import SmallCard from "./components/ui/SmallCard";
import Button from "./components/ui/Button";
import Badge from "./components/ui/Badge";
import Segmented from "./components/ui/Segmented";
import Input from "./components/ui/Input";
import ChartCard from "./components/ui/ChartCard";

/* =========================
   Constantes / Helpers
========================= */

const THEME_KEY = "finanzas_theme";
const STORAGE_KEY = "finanzas_personales_v2";

const CHART_COLORS = {
  income: "#22c55e",
  expense: "#ef4444",
  savings: "#3b82f6",
  neutral: "#6b7280",
};

const SUGGESTED_CATEGORIES = {
  expense: ["Comida", "Casa", "Transporte", "Ocio", "Salud", "Suscripciones", "Otros"],
  income: ["Sueldo", "Extra", "Ventas", "Regalo", "Otros"],
};

const CATEGORY_EMOJIS = {
  Comida: "🍔",
  Casa: "🏠",
  Transporte: "🚗",
  Ocio: "🎮",
  Salud: "💊",
  Suscripciones: "📺",
  Sueldo: "💼",
  Extra: "💰",
  Ventas: "🛒",
  Regalo: "🎁",
  Otros: "📌",
};

const CATEGORY_META = {
  Comida: { icon: "🍔", color: "#f59e0b" },
  Casa: { icon: "🏠", color: "#3b82f6" },
  Transporte: { icon: "🚗", color: "#6366f1" },
  Ocio: { icon: "🎮", color: "#ec4899" },
  Salud: { icon: "💊", color: "#10b981" },
  Suscripciones: { icon: "📺", color: "#8b5cf6" },
  Sueldo: { icon: "💼", color: "#22c55e" },
  Extra: { icon: "💰", color: "#84cc16" },
  Ventas: { icon: "🛒", color: "#14b8a6" },
  Regalo: { icon: "🎁", color: "#fb7185" },
  Otros: { icon: "🧾", color: "#6b7280" },
};

function pad2(n) {
  return String(n).padStart(2, "0");
}
function monthKeyFromDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function monthLabel(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}
function eur(n) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}
function clampNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { months: {} };
    const parsed = JSON.parse(raw);
    if (!parsed?.months) return { months: {} };
    return parsed;
  } catch {
    return { months: {} };
  }
}
function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function exportJSON(db) {
  const data = JSON.stringify(db, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "finanzas.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file, setDb) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      if (!parsed?.months) throw new Error("Formato inválido");
      setDb(parsed);
      alert("Importación completada ✅");
    } catch {
      alert("No he podido importar ese archivo (JSON inválido).");
    }
  };
  reader.readAsText(file);
}

/* =========================
   Presupuesto row
========================= */

function BudgetRow({ name, emoji, spent, budget, onChange }) {
  const b = Number(budget || 0);
  const s = Number(spent || 0);

  const pct = b > 0 ? Math.min(100, Math.round((s / b) * 100)) : 0;
  const remaining = b - s;

  const bar =
    b <= 0
      ? "bg-neutral-200 dark:bg-white/10"
      : pct < 70
      ? "bg-green-500"
      : pct < 90
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <div className="truncate text-sm font-extrabold">{name}</div>
          </div>
          <div className="mt-1 text-xs font-semibold text-neutral-500 dark:text-neutral-300">
            Gastado: <span className="font-extrabold">{eur(s)}</span>
            {b > 0 ? (
              <>
                {" "}
                · Presupuesto: <span className="font-extrabold">{eur(b)}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="w-28 shrink-0">
          <div className="mb-1 text-right text-[11px] font-bold text-neutral-500 dark:text-neutral-300">
            {b > 0 ? `${pct}%` : "—"}
          </div>
          <input
            value={String(budget ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder="€"
            type="number"
            className="w-full rounded-xl border border-neutral-200 bg-white px-2 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-white/15"
          />
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>

      {b > 0 && (
        <div className="mt-2 text-xs font-semibold text-neutral-500 dark:text-neutral-300">
          {remaining >= 0 ? (
            <>
              Te quedan <span className="font-extrabold">{eur(remaining)}</span>
            </>
          ) : (
            <>
              Te pasas por{" "}
              <span className="font-extrabold text-red-600 dark:text-red-400">{eur(Math.abs(remaining))}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
   App
========================= */

export default function App() {
  const [db, setDb] = useState(() => loadDB());
  const [month, setMonth] = useState(() => monthKeyFromDate(new Date()));

  const [darkMode, setDarkMode] = useState(() => {
    const v = localStorage.getItem(THEME_KEY);
    return v ? v === "dark" : false;
  });

  const [kind, setKind] = useState("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  const [chartView, setChartView] = useState("balance");
  const [query, setQuery] = useState("");
  const [filterKind, setFilterKind] = useState("all");

  const fileInputRef = useRef(null);

  useEffect(() => saveDB(db), [db]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem(THEME_KEY, "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem(THEME_KEY, "light");
    }
  }, [darkMode]);

  useEffect(() => {
    setDb((prev) => {
      if (prev.months?.[month]) return prev;
      return {
        ...prev,
        months: {
          ...prev.months,
          [month]: { items: [], budgets: {}, budgetTotal: 0 },
        },
      };
    });
  }, [month]);

  const monthData = db.months?.[month] || { items: [], budgets: {}, budgetTotal: 0 };

  const safeMonthData = useMemo(() => {
    return {
      items: Array.isArray(monthData.items) ? monthData.items : [],
      budgets: monthData.budgets && typeof monthData.budgets === "object" ? monthData.budgets : {},
      budgetTotal: Number.isFinite(Number(monthData.budgetTotal)) ? Number(monthData.budgetTotal) : 0,
    };
  }, [monthData]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const it of safeMonthData.items) {
      if (it.kind === "income") income += Number(it.amount) || 0;
      else expense += Number(it.amount) || 0;
    }
    const balance = income - expense;
    return { income, expense, balance };
  }, [safeMonthData.items]);

  const balanceAccent =
    totals.balance > 0
      ? "text-green-700 dark:text-green-400"
      : totals.balance < 0
      ? "text-red-700 dark:text-red-400"
      : "text-neutral-900 dark:text-neutral-100";

  const expensesByCategory = useMemo(() => {
    const map = {};
    for (const it of safeMonthData.items) {
      if (it.kind !== "expense") continue;
      const cat = it.category || "Otros";
      map[cat] = (map[cat] || 0) + (Number(it.amount) || 0);
    }
    let arr = Object.entries(map)
      .map(([n, value]) => ({
        name: n,
        value,
        color: CATEGORY_META[n]?.color || CHART_COLORS.neutral,
      }))
      .sort((a, b) => b.value - a.value);

    if (arr.length > 6) {
      const top = arr.slice(0, 5);
      const rest = arr.slice(5);
      const otrosValue = rest.reduce((sum, c) => sum + c.value, 0);
      return [
        ...top,
        { name: "Otros", value: otrosValue, color: CATEGORY_META["Otros"]?.color || CHART_COLORS.neutral },
      ].filter((c) => c.value > 0);
    }
    return arr.filter((c) => c.value > 0);
  }, [safeMonthData.items]);

  const pieData = useMemo(() => {
    const data = [];
    if (totals.income > 0) data.push({ name: "Ingresos", value: totals.income, color: CHART_COLORS.income });
    if (totals.expense > 0) data.push({ name: "Gastos", value: totals.expense, color: CHART_COLORS.expense });
    if (totals.balance > 0) data.push({ name: "Ahorro", value: totals.balance, color: CHART_COLORS.savings });
    if (data.length === 0) return [{ name: "Sin datos", value: 1, color: CHART_COLORS.neutral }];
    return data;
  }, [totals]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return safeMonthData.items.filter((it) => {
      const passKind = filterKind === "all" ? true : it.kind === filterKind;
      const passQuery = !q
        ? true
        : (it.name || "").toLowerCase().includes(q) || (it.category || "").toLowerCase().includes(q);
      return passKind && passQuery;
    });
  }, [safeMonthData.items, query, filterKind]);

  function addItem() {
    const a = clampNumber(amount);
    if (!name.trim()) return alert("Escribe un nombre (ej: Supermercado).");
    if (a <= 0) return alert("Escribe un importe mayor que 0.");

    const cat = category.trim() || (kind === "income" ? "Sueldo" : "Comida");

    const it = {
      id: uid(),
      kind,
      name: name.trim(),
      amount: a,
      category: cat,
      createdAt: new Date().toISOString(),
    };

    setDb((prev) => {
      const cur = prev.months?.[month] || { items: [], budgets: {}, budgetTotal: 0 };
      return {
        ...prev,
        months: {
          ...prev.months,
          [month]: { ...cur, items: [it, ...(cur.items || [])] },
        },
      };
    });

    setName("");
    setAmount("");
    setCategory("");
  }

  function removeItem(id) {
    setDb((prev) => {
      const cur = prev.months?.[month] || { items: [], budgets: {}, budgetTotal: 0 };
      return {
        ...prev,
        months: {
          ...prev.months,
          [month]: { ...cur, items: (cur.items || []).filter((x) => x.id !== id) },
        },
      };
    });
  }

  function setBudgetTotal(v) {
    const n = Math.max(0, clampNumber(v));
    setDb((prev) => {
      const cur = prev.months?.[month] || { items: [], budgets: {}, budgetTotal: 0 };
      return {
        ...prev,
        months: {
          ...prev.months,
          [month]: { ...cur, budgetTotal: n },
        },
      };
    });
  }

  function setBudgetForCategory(cat, v) {
    const n = Math.max(0, clampNumber(v));
    setDb((prev) => {
      const cur = prev.months?.[month] || { items: [], budgets: {}, budgetTotal: 0 };
      const nextBudgets = { ...(cur.budgets || {}) };
      nextBudgets[cat] = n;
      return {
        ...prev,
        months: {
          ...prev.months,
          [month]: { ...cur, budgets: nextBudgets },
        },
      };
    });
  }

  const spentByCategory = useMemo(() => {
    const m = {};
    for (const it of safeMonthData.items) {
      if (it.kind !== "expense") continue;
      const cat = it.category || "Otros";
      m[cat] = (m[cat] || 0) + (Number(it.amount) || 0);
    }
    return m;
  }, [safeMonthData.items]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-[#0B0F1A] dark:text-neutral-100">
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(900px_600px_at_20%_0%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(700px_500px_at_80%_20%,rgba(16,185,129,0.14),transparent_60%)]" />
      <div className="relative">
        <div className="mx-auto w-full px-4 py-4 lg:px-8 lg:py-4 lg:h-[calc(100vh-24px)]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-neutral-900 text-white shadow-sm">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Mi dinero</div>
                <div className="text-lg font-extrabold text-neutral-900 dark:text-white">Finanzas</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="soft" onClick={() => exportJSON(db)} className="px-3" title="Exportar">
                <Download className="h-4 w-4" />
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJSON(f, setDb);
                  e.target.value = "";
                }}
              />
              <Button variant="soft" onClick={() => fileInputRef.current?.click()} className="px-3" title="Importar">
                <Upload className="h-4 w-4" />
              </Button>

              <Button variant="soft" onClick={() => setDarkMode((v) => !v)} className="px-3" title="Cambiar modo">
                {darkMode ? "🌙" : "☀️"}
              </Button>
            </div>
          </div>

          {/* Dashboard */}
          <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:h-[calc(100vh-120px)] items-start">
            {/* LEFT */}
            <div className="lg:col-span-5 lg:h-full min-h-0">
              <div className="space-y-4 lg:h-full lg:overflow-auto lg:pr-2 min-h-0">
                {/* Mes + resumen */}
                <SmallCard className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Mes</div>
                      <div className="text-base font-extrabold text-neutral-900 dark:text-white">{monthLabel(month)}</div>
                    </div>
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="rounded-2xl border px-3 py-2 text-sm font-semibold outline-none border-neutral-200 bg-white text-neutral-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <SmallCard className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Ingresos</div>
                          <div className="mt-2 text-xl font-extrabold">{eur(totals.income)}</div>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
                          <ArrowUpRight className="h-5 w-5 text-green-700" />
                        </div>
                      </div>
                    </SmallCard>

                    <SmallCard className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Gastos</div>
                          <div className="mt-2 text-xl font-extrabold">{eur(totals.expense)}</div>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50">
                          <ArrowDownRight className="h-5 w-5 text-red-700" />
                        </div>
                      </div>
                    </SmallCard>

                    <SmallCard className="col-span-2 p-4">
                      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Balance</div>
                      <div className={`mt-2 text-2xl font-extrabold ${balanceAccent}`}>{eur(totals.balance)}</div>
                    </SmallCard>
                  </div>
                </SmallCard>

                {/* Añadir movimiento */}
                <SmallCard className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Añadir movimiento</div>
                      <div className="text-base font-extrabold text-neutral-900 dark:text-white">Rápido y simple</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Segmented value={kind} onChange={setKind} />
                  </div>

                  <div className="mt-3 grid gap-3">
                    <Input label="Nombre" value={name} onChange={setName} placeholder="Ej: Supermercado" />
                    <Input
                      label="Importe"
                      value={amount}
                      onChange={setAmount}
                      placeholder="Ej: 25.50"
                      type="number"
                      right={<span className="text-sm font-extrabold text-neutral-500">€</span>}
                    />

                    <div>
                      <div className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">Categoría</div>
                      <div className="flex flex-wrap gap-2">
                        {(SUGGESTED_CATEGORIES[kind] || []).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCategory(c)}
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition ${
                              (category || "").trim() === c
                                ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white"
                                : "bg-white text-neutral-700 ring-neutral-200 hover:bg-neutral-50 dark:bg-white/10 dark:text-neutral-200 dark:ring-white/10"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2">
                        <input
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="O escribe otra..."
                          className="w-full rounded-2xl border px-3 py-3 text-sm outline-none border-neutral-200 bg-white text-neutral-900 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:focus:ring-white/15"
                        />
                      </div>
                    </div>

                    <Button onClick={addItem} className="py-3">
                      <Plus className="h-4 w-4" />
                      Añadir {kind === "income" ? "ingreso" : "gasto"}
                    </Button>
                  </div>
                </SmallCard>

                {/* Presupuesto */}
                <SmallCard className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Presupuesto</div>
                      <div className="text-base font-extrabold text-neutral-900 dark:text-white">Plan vs Real</div>
                    </div>
                    <div className="text-sm font-extrabold">{eur(safeMonthData.budgetTotal || 0)}</div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">Total del mes</div>
                    <input
                      type="number"
                      value={String(safeMonthData.budgetTotal ?? "")}
                      onChange={(e) => setBudgetTotal(e.target.value)}
                      placeholder="€"
                      className="w-full rounded-2xl border px-3 py-3 text-sm outline-none border-neutral-200 bg-white text-neutral-900 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:focus:ring-white/15"
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    {["Comida", "Casa", "Transporte", "Ocio", "Salud", "Suscripciones", "Otros"].map((cat) => (
                      <BudgetRow
                        key={cat}
                        name={cat}
                        emoji={CATEGORY_EMOJIS[cat] ?? "📌"}
                        spent={spentByCategory[cat] || 0}
                        budget={safeMonthData.budgets?.[cat] ?? 0}
                        onChange={(v) => setBudgetForCategory(cat, v)}
                      />
                    ))}
                  </div>
                </SmallCard>
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-7 lg:h-full lg:overflow-hidden min-h-0">
              <div className="flex flex-col gap-4 lg:h-full lg:overflow-hidden min-h-0">
                <ChartCard
                  pieData={pieData}
                  totals={totals}
                  balanceAccent={balanceAccent}
                  chartView={chartView}
                  setChartView={setChartView}
                  expensesByCategory={expensesByCategory}
                  eur={eur}
                  neutralColor={CHART_COLORS.neutral}
                />

                {/* Movimientos */}
                <SmallCard className="p-4 lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden min-h-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Movimientos</div>
                      <div className="text-base font-extrabold text-neutral-900 dark:text-white">Lista del mes</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center gap-2 rounded-2xl border px-3 py-2 border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5">
                        <input
                          placeholder="Buscar…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          className="w-full bg-transparent text-sm font-semibold outline-none text-neutral-900 placeholder:text-neutral-400 dark:text-white dark:placeholder:text-neutral-400"
                        />
                        <Search className="h-4 w-4 text-neutral-400" />
                      </div>

                      <select
                        value={filterKind}
                        onChange={(e) => setFilterKind(e.target.value)}
                        className="rounded-2xl border px-3 py-2 text-sm font-bold outline-none border-neutral-200 bg-white text-neutral-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      >
                        <option value="all">Todos</option>
                        <option value="income">Ingresos</option>
                        <option value="expense">Gastos</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 lg:flex-1 lg:overflow-auto lg:pr-2 min-h-0">
                    <AnimatePresence>
                      {filteredItems.length === 0 ? (
                        <div className="rounded-2xl bg-neutral-50 p-4 text-center text-sm text-neutral-500 dark:bg-white/5 dark:text-neutral-300">
                          No hay movimientos
                        </div>
                      ) : (
                        filteredItems.map((it) => (
                          <motion.div
                            key={it.id}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="flex items-center justify-between rounded-3xl border p-4 border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]"
                          >
                            <div className="flex items-center gap-3">
                              <Badge
                                label={it.category || "Otros"}
                                emoji={CATEGORY_EMOJIS[it.category || "Otros"]}
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-white">
                                  {it.name}
                                </div>
                                <div className="mt-1 text-xs font-semibold text-neutral-500 dark:text-neutral-300">
                                  {new Date(it.createdAt).toLocaleString("es-ES")}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div
                                className={`font-extrabold ${
                                  it.kind === "income" ? "text-green-700" : "text-red-700"
                                }`}
                              >
                                {eur(it.amount)}
                              </div>
                              <button
                                onClick={() => removeItem(it.id)}
                                className="inline-flex items-center justify-center rounded-2xl p-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/15"
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </SmallCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
