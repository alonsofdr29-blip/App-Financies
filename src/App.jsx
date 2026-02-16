import React, { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import { Plus, Trash2, Wallet, Download, Upload, Search, ArrowUpRight, ArrowDownRight, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import SmallCard from "./components/ui/SmallCard";
import Button from "./components/ui/Button";
import Badge from "./components/ui/Badge";
import Segmented from "./components/ui/Segmented";
import Input from "./components/ui/Input";
import ChartCard from "./components/ui/ChartCard";

const THEME_KEY = "finanzas_theme";
const STORAGE_KEY = "finanzas_personales_v2";

const CHART_COLORS = {
  income: "#0f766e",
  expense: "#e11d48",
  savings: "#0e7490",
  neutral: "#64748b",
};

const SUGGESTED_CATEGORIES = {
  expense: ["Comida", "Casa", "Transporte", "Ocio", "Salud", "Suscripciones", "Otros"],
  income: ["Sueldo", "Extra", "Ventas", "Regalo", "Otros"],
};

const CATEGORY_CODES = {
  Comida: "CO",
  Casa: "CA",
  Transporte: "TR",
  Ocio: "OC",
  Salud: "SA",
  Suscripciones: "SU",
  Sueldo: "IN",
  Extra: "EX",
  Ventas: "VE",
  Regalo: "RG",
  Otros: "OT",
};

const CATEGORY_META = {
  Comida: { color: "#d97706" },
  Casa: { color: "#0f766e" },
  Transporte: { color: "#334155" },
  Ocio: { color: "#be123c" },
  Salud: { color: "#0d9488" },
  Suscripciones: { color: "#1e293b" },
  Sueldo: { color: "#047857" },
  Extra: { color: "#65a30d" },
  Ventas: { color: "#0891b2" },
  Regalo: { color: "#e11d48" },
  Otros: { color: "#6b7280" },
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
  const text = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
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
      if (!parsed?.months) throw new Error("Formato invalido");
      setDb(parsed);
      alert("Importacion completada");
    } catch {
      alert("No se pudo importar el archivo.");
    }
  };
  reader.readAsText(file);
}

function BudgetRow({ name, code, spent, budget, onChange }) {
  const b = Number(budget || 0);
  const s = Number(spent || 0);
  const pct = b > 0 ? Math.min(100, Math.round((s / b) * 100)) : 0;
  const remaining = b - s;

  const bar =
    b <= 0
      ? "bg-slate-200 dark:bg-slate-700"
      : pct < 70
      ? "bg-emerald-500"
      : pct < 90
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/75">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-cyan-50 px-1 text-[10px] font-extrabold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-100">
              {code}
            </span>
            <div className="truncate text-sm font-extrabold">{name}</div>
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
            Gastado: <span className="font-extrabold">{eur(s)}</span>
            {b > 0 ? (
              <>
                {" "}
                | Presupuesto: <span className="font-extrabold">{eur(b)}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="w-28 shrink-0">
          <div className="mb-1 text-right text-[11px] font-bold text-slate-500 dark:text-slate-300">{b > 0 ? `${pct}%` : "--"}</div>
          <input
            value={String(budget ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder="EUR"
            type="number"
            className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm font-semibold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900/75 dark:text-white dark:focus:border-cyan-600 dark:focus:ring-cyan-900/35"
          />
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/70">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>

      {b > 0 && (
        <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
          {remaining >= 0 ? (
            <>
              Disponible: <span className="font-extrabold">{eur(remaining)}</span>
            </>
          ) : (
            <>
              Excedido: <span className="font-extrabold text-rose-600 dark:text-rose-400">{eur(Math.abs(remaining))}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
      ? "text-emerald-700 dark:text-emerald-400"
      : totals.balance < 0
      ? "text-rose-700 dark:text-rose-400"
      : "text-slate-900 dark:text-slate-100";

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
      return [...top, { name: "Otros", value: otrosValue, color: CATEGORY_META.Otros.color || CHART_COLORS.neutral }].filter(
        (c) => c.value > 0
      );
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
      const passQuery = !q ? true : (it.name || "").toLowerCase().includes(q) || (it.category || "").toLowerCase().includes(q);
      return passKind && passQuery;
    });
  }, [safeMonthData.items, query, filterKind]);

  function addItem() {
    const a = clampNumber(amount);
    if (!name.trim()) return alert("Escribe un nombre.");
    if (a <= 0) return alert("El importe debe ser mayor a 0.");

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
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_680px_at_0%_0%,rgba(14,116,144,0.18),transparent_58%),radial-gradient(900px_560px_at_100%_5%,rgba(15,23,42,0.08),transparent_58%)] dark:bg-[radial-gradient(1100px_680px_at_5%_0%,rgba(8,145,178,0.24),transparent_60%),radial-gradient(900px_580px_at_95%_10%,rgba(2,6,23,0.42),transparent_56%)]" />

      <div className="relative mx-auto w-full max-w-[1600px] px-4 py-5 lg:px-8">
        <header className="mb-4 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/75">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-700 text-white shadow-[0_10px_24px_rgba(2,6,23,0.3)]">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Control mensual</p>
                <h1 className="text-xl font-extrabold tracking-tight">App Finanzas</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="soft" onClick={() => exportJSON(db)} className="px-3 sm:px-4" title="Exportar respaldo">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
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
              <Button variant="soft" onClick={() => fileInputRef.current?.click()} className="px-3 sm:px-4" title="Importar respaldo">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar</span>
              </Button>

              <Button variant="soft" onClick={() => setDarkMode((v) => !v)} className="px-3 sm:px-4" title="Cambiar tema">
                {darkMode ? "Modo claro" : "Modo oscuro"}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Ingresos</p>
              <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">{eur(totals.income)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Gastos</p>
              <p className="text-lg font-extrabold text-rose-700 dark:text-rose-400">{eur(totals.expense)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Balance</p>
              <p className={`text-lg font-extrabold ${balanceAccent}`}>{eur(totals.balance)}</p>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-12 lg:h-[calc(100vh-220px)]">
          <div className="lg:col-span-5 lg:h-full min-h-0">
            <div className="space-y-4 lg:h-full lg:overflow-auto lg:pr-2">
              <SmallCard className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Periodo activo</p>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{monthLabel(month)}</h2>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-300/80 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900/70">
                    <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-transparent outline-none" />
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <SmallCard className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">Ingresos</p>
                        <p className="mt-1 text-xl font-extrabold">{eur(totals.income)}</p>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                        <ArrowUpRight className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                      </div>
                    </div>
                  </SmallCard>

                  <SmallCard className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">Gastos</p>
                        <p className="mt-1 text-xl font-extrabold">{eur(totals.expense)}</p>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 dark:bg-rose-500/10">
                        <ArrowDownRight className="h-5 w-5 text-rose-700 dark:text-rose-300" />
                      </div>
                    </div>
                  </SmallCard>

                  <SmallCard className="col-span-2 p-3">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">Balance neto</p>
                    <p className={`mt-1 text-2xl font-extrabold ${balanceAccent}`}>{eur(totals.balance)}</p>
                  </SmallCard>
                </div>
              </SmallCard>

              <SmallCard className="p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Nuevo movimiento</p>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Carga rapida</h2>
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
                    right={<span className="text-sm font-extrabold text-slate-500">EUR</span>}
                  />

                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Categoria</div>
                    <div className="flex flex-wrap gap-2">
                      {(SUGGESTED_CATEGORIES[kind] || []).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCategory(c)}
                          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition ${
                            (category || "").trim() === c
                              ? "bg-slate-900 text-white ring-slate-900 dark:bg-cyan-500 dark:text-slate-950 dark:ring-cyan-400"
                              : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-slate-700"
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
                        placeholder="Escribe otra categoria"
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-cyan-600 dark:focus:ring-cyan-900/35"
                      />
                    </div>
                  </div>

                  <Button onClick={addItem} className="py-3">
                    <Plus className="h-4 w-4" />
                    Anadir {kind === "income" ? "ingreso" : "gasto"}
                  </Button>
                </div>
              </SmallCard>

              <SmallCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Presupuesto</p>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Plan vs real</h2>
                  </div>
                  <div className="text-sm font-extrabold">{eur(safeMonthData.budgetTotal || 0)}</div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Total del mes</div>
                  <input
                    type="number"
                    value={String(safeMonthData.budgetTotal ?? "")}
                    onChange={(e) => setBudgetTotal(e.target.value)}
                    placeholder="EUR"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-cyan-600 dark:focus:ring-cyan-900/35"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {["Comida", "Casa", "Transporte", "Ocio", "Salud", "Suscripciones", "Otros"].map((cat) => (
                    <BudgetRow
                      key={cat}
                      name={cat}
                      code={CATEGORY_CODES[cat] ?? "OT"}
                      spent={spentByCategory[cat] || 0}
                      budget={safeMonthData.budgets?.[cat] ?? 0}
                      onChange={(v) => setBudgetForCategory(cat, v)}
                    />
                  ))}
                </div>
              </SmallCard>
            </div>
          </div>

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

              <SmallCard className="p-4 lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden min-h-0">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Movimientos</p>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Registro del mes</h2>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                      <input
                        placeholder="Buscar por nombre o categoria"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-transparent text-sm font-semibold outline-none text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-400"
                      />
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>

                    <select
                      value={filterKind}
                      onChange={(e) => setFilterKind(e.target.value)}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
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
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                        No hay movimientos para los filtros actuales.
                      </div>
                    ) : (
                      filteredItems.map((it) => (
                        <motion.div
                          key={it.id}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60"
                        >
                          <div className="flex items-center gap-3">
                            <Badge label={it.category || "Otros"} emoji={CATEGORY_CODES[it.category || "Otros"]} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{it.name}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                                {new Date(it.createdAt).toLocaleString("es-ES")}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className={"font-extrabold " + (it.kind === "income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                              {eur(it.amount)}
                            </div>
                            <button
                              onClick={() => removeItem(it.id)}
                              className="inline-flex items-center justify-center rounded-2xl bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
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
  );
}
