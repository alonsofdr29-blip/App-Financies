import React, { useEffect, useMemo, useRef, useState } from "react";

const THEME_KEY = "finanzas_theme";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import "./index.css";
import {
  Plus,
  Trash2,
  Wallet,
  Calendar,
  Download,
  Upload,
  Sparkles,
  Tag,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "finanzas_personales_v2";

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
  }).format(n);
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

// Paleta más “app moderna”
const COLORS = {
  income: "#22c55e",
  expense: "#ef4444",
  neutral: "#a3a3a3",
  card: "#ffffff",
  bg: "#0b0b0f",
};

// Categorías sugeridas (puedes editarlas)
const SUGGESTED_CATEGORIES = {
  expense: ["Comida", "Casa", "Transporte", "Ocio", "Salud", "Suscripciones", "Otros"],
  income: ["Sueldo", "Extra", "Ventas", "Regalo", "Otros"],
};

// Colores por categoría (no pasa nada si no existe: cae a neutro)
const CATEGORY_BADGES = {
  Comida: { bg: "bg-amber-50 dark:bg-neutral-700", ring: "ring-amber-200", text: "text-amber-800" },
  Casa: { bg: "bg-blue-50 dark:bg-neutral-700", ring: "ring-blue-200", text: "text-blue-800" },
  Transporte: { bg: "bg-indigo-50 dark:bg-neutral-700", ring: "ring-indigo-200", text: "text-indigo-800" },
  Ocio: { bg: "bg-pink-50 dark:bg-neutral-700", ring: "ring-pink-200", text: "text-pink-800" },
  Salud: { bg: "bg-emerald-50 dark:bg-neutral-700", ring: "ring-emerald-200", text: "text-emerald-800" },
  Suscripciones: { bg: "bg-purple-50 dark:bg-neutral-700", ring: "ring-purple-200", text: "text-purple-800" },
  Sueldo: { bg: "bg-green-50 dark:bg-neutral-700", ring: "ring-green-200", text: "text-green-800" },
  Extra: { bg: "bg-lime-50 dark:bg-neutral-700", ring: "ring-lime-200", text: "text-lime-800" },
  Ventas: { bg: "bg-teal-50 dark:bg-neutral-700", ring: "ring-teal-200", text: "text-teal-800" },
  Regalo: { bg: "bg-rose-50 dark:bg-neutral-700", ring: "ring-rose-200", text: "text-rose-800" },
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

function Badge({ label }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-1",
        "bg-neutral-50 ring-neutral-200 text-neutral-800",
        "dark:bg-white/10 dark:ring-white/10 dark:text-neutral-100",
      ].join(" ")}
    >
      <span className="text-sm leading-none">{CATEGORY_EMOJIS[label] ?? "🏷️"}</span>
      {label}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", type = "button", className = "" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-neutral-900 text-white hover:bg-neutral-800 " +
      "dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90",
    soft:
      "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 " +
      "dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/15",
    ghost:
      "bg-transparent text-neutral-900 hover:bg-neutral-100 " +
      "dark:text-neutral-100 dark:hover:bg-white/10",
    danger: "bg-red-600 text-white hover:bg-red-500",
  };
  return (
    <button type={type} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Segmented({ value, onChange }) {
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

function Input({ label, value, onChange, placeholder, type = "text", right }) {
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

function SmallCard({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-3xl border shadow-sm",
        "border-neutral-200 bg-white",
        "dark:border-white/10 dark:bg-white/5 dark:shadow-none",
        "backdrop-blur-xl",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function exportJSON(db) {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "finanzas-backup.json";
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

function ChartCard({ pieData, totals, balanceAccent, eur }) {
  return (
    <SmallCard className="p-4 lg:py-3">
      <div>
        <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Gráfico</div>
        <div className="text-base font-extrabold text-neutral-900 dark:text-neutral-50">
          Ingresos vs Gastos
        </div>
      </div>

      <div className="rounded-3xl bg-neutral-50 ring-1 ring-neutral-200 dark:bg-white/5 dark:ring-white/10 p-4">
        <div className="relative mx-auto aspect-square w-full max-w-[320px] lg:max-w-[280px]">

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius="68%"
                outerRadius="86%"
                paddingAngle={2}
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [eur(value), name]} />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-3xl bg-white/90 px-5 py-4 text-center shadow-sm ring-1 ring-neutral-200 backdrop-blur">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
                Balance
              </div>
              <div className={`mt-1 text-xl font-extrabold ${balanceAccent}`}>
                {eur(totals.balance)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {pieData.map((x, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-full bg-white ring-1 ring-neutral-200 dark:bg-white/5 dark:ring-white/10 px-3 py-1 text-xs font-semibold"
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: x.color }}
              />
              <div className="text-neutral-700 dark:text-neutral-300">{x.name}:</div>
                <div className="text-neutral-700 dark:text-neutral-200">{x.name}:</div>
              <div className="font-extrabold text-neutral-900 dark:text-neutral-50">
                {eur(x.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SmallCard>
  );
}


export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem(THEME_KEY) === "dark";
  });
  const todayKey = monthKeyFromDate(new Date());

  const [db, setDb] = useState(() => loadDB());
  const [month, setMonth] = useState(todayKey);

  // Form
  const [kind, setKind] = useState("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  // UI helpers
  const [query, setQuery] = useState("");
  const [filterKind, setFilterKind] = useState("all"); // all | income | expense
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

  function ensureMonth(m) {
    setDb((prev) => {
      if (prev.months[m]) return prev;
      return { ...prev, months: { ...prev.months, [m]: { items: [] } } };
    });
  }
  useEffect(() => {
    ensureMonth(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const monthData = db.months[month] || { items: [] };

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const it of monthData.items) {
      if (it.kind === "income") income += it.amount;
      else expense += it.amount;
    }
    const balance = income - expense;
    return { income, expense, balance };
  }, [monthData.items]);

  const pieData = useMemo(() => {
    const hasSomething = totals.income > 0 || totals.expense > 0;
    if (!hasSomething) return [{ name: "Sin datos", value: 1, color: COLORS.neutral }];
    const d = [];
    if (totals.income > 0) d.push({ name: "Ingresos", value: totals.income, color: COLORS.income });
    if (totals.expense > 0) d.push({ name: "Gastos", value: totals.expense, color: COLORS.expense });
    return d;
  }, [totals]);

  const insights = useMemo(() => {
    const has = totals.income > 0 || totals.expense > 0;
    if (!has) return { title: "Empieza fácil", desc: "Añade tu primer gasto o ingreso y verás el gráfico moverse." };

    if (totals.balance > 0) {
      const rate = totals.income > 0 ? Math.round((totals.expense / totals.income) * 100) : 0;
      return { title: "Vas en positivo ✅", desc: `Has gastado aprox. el ${rate}% de tus ingresos este mes.` };
    }
    if (totals.balance < 0) {
      return { title: "Ojo: estás en negativo", desc: "Prueba a reducir gastos o añadir ingresos para equilibrar." };
    }
    return { title: "Balance a cero", desc: "Ingresos y gastos están igualados. ¡Buen control!" };
  }, [totals]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthData.items.filter((it) => {
      const passKind = filterKind === "all" ? true : it.kind === filterKind;
      const passQuery = !q
        ? true
        : (it.name || "").toLowerCase().includes(q) || (it.category || "").toLowerCase().includes(q);
      return passKind && passQuery;
    });
  }, [monthData.items, query, filterKind]);

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
      const cur = prev.months[month] || { items: [] };
      return { ...prev, months: { ...prev.months, [month]: { ...cur, items: [it, ...cur.items] } } };
    });

    setName("");
    setAmount("");
    setCategory("");
  }

  function removeItem(id) {
    setDb((prev) => {
      const cur = prev.months[month] || { items: [] };
      return {
        ...prev,
        months: { ...prev.months, [month]: { ...cur, items: cur.items.filter((x) => x.id !== id) } },
      };
    });
  }

  const balanceAccent =
    totals.balance > 0
      ? "text-green-700 dark:text-green-400"
      : totals.balance < 0
      ? "text-red-700 dark:text-red-400"
      : "text-neutral-900 dark:text-neutral-100";

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-[#0B0F1A] dark:text-neutral-100">
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(900px_600px_at_20%_0%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(700px_500px_at_80%_20%,rgba(16,185,129,0.14),transparent_60%)]" />
      <div className="relative">
        {/* App shell */}
        <div className="mx-auto w-full px-4 py-4 lg:px-8 lg:py-4 lg:h-[calc(100vh-24px)]">
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
              <Button variant="soft" onClick={() => exportJSON(db)} className="px-3">
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
              <Button variant="soft" onClick={() => fileInputRef.current?.click()} className="px-3">
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="soft"
                onClick={() => setDarkMode((v) => !v)}
                className="px-3"
                title="Cambiar modo"
              >
                {darkMode ? "🌙" : "☀️"}
              </Button>
            </div>
          </div>

          {/* DASHBOARD PC */}
          <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:h-[calc(100vh-120px)] items-start">
            {/* IZQUIERDA */}
            <div className="lg:col-span-5 lg:h-full min-h-0">
              <div className="space-y-4 lg:h-full lg:overflow-auto lg:pr-2 min-h-0">
                {/* AQUÍ: tu tarjeta de Mes + Insight + tus tarjetas Ingresos/Gastos/Balance */}

                {/* Month selector */}
                <SmallCard className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Mes</div>
                      <div className="capitalize text-base font-extrabold text-neutral-900 dark:text-white">{monthLabel(month)}</div>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                      <Calendar className="h-4 w-4 text-neutral-500" />
                      <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-transparent text-sm font-semibold text-neutral-900 outline-none dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-2xl bg-neutral-100 p-3 dark:bg-white/10 dark:ring-1 dark:ring-white/10">
                    <Sparkles className="mt-0.5 h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-neutral-900 dark:text-white">{insights.title}</div>
                      <div className="text-xs font-medium text-neutral-600 dark:text-neutral-200">{insights.desc}</div>
                    </div>
                  </div>
                </SmallCard>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-3">
                  <SmallCard className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Ingresos</div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-green-50">
                        <ArrowUpRight className="h-4 w-4 text-green-700" />
                      </div>
                    </div>
                    <div className="mt-2 text-xl font-extrabold text-neutral-900 dark:text-white">{eur(totals.income)}</div>
                  </SmallCard>

                  <SmallCard className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Gastos</div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-red-50">
                        <ArrowDownRight className="h-4 w-4 text-red-700" />
                      </div>
                    </div>
                    <div className="mt-2 text-xl font-extrabold text-neutral-900 dark:text-white">{eur(totals.expense)}</div>
                  </SmallCard>

                  <SmallCard className="col-span-2 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Balance</div>
                      <div className="text-xs font-bold text-neutral-500 dark:text-neutral-300">Ingresos − Gastos</div>
                    </div>
                    <div className={`mt-2 text-2xl font-extrabold ${balanceAccent}`}>{eur(totals.balance)}</div>
                  </SmallCard>

                  {/* Añadir movimiento debajo del balance */}
                  <SmallCard className="col-span-2 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Añadir movimiento</div>
                        <div className="text-base font-extrabold text-neutral-900 dark:text-white">Rápido y simple</div>
                      </div>
                      <div className="w-full sm:w-44">
                        <Segmented value={kind} onChange={setKind} />
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Input label="Nombre" value={name} onChange={setName} placeholder="Ej: Supermercado, Nómina, Netflix…" />

                      <Input
                        label="Importe"
                        value={amount}
                        onChange={setAmount}
                        placeholder="Ej: 25.50"
                        type="number"
                        right={<span className="text-sm font-extrabold text-neutral-500">€</span>}
                      />

                      <div>
                        <div className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-200">Categoría</div>
                        <div className="flex flex-wrap gap-2">
                          {(SUGGESTED_CATEGORIES[kind] || []).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setCategory(c)}
                              className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition
                                ${(category || "").trim() === c
                                  ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white"
                                  : "bg-white text-neutral-800 ring-neutral-200 hover:bg-neutral-50 dark:bg-white/5 dark:text-neutral-100 dark:ring-white/10 dark:hover:bg-white/10"
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
                            placeholder="O escribe otra…"
                            className="w-full rounded-2xl border px-3 py-3 text-sm outline-none border-neutral-200 bg-white text-neutral-900 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus:ring-white/15 font-semibold"
                          />
                        </div>
                      </div>

                      <Button onClick={addItem} className="py-3">
                        <Plus className="h-4 w-4" />
                        Añadir {kind === "income" ? "ingreso" : "gasto"}
                      </Button>
                    </div>
                  </SmallCard>
                </div>

                {/* END LEFT_CONTENT */}
              </div>
            </div>

            {/* DERECHA */}
            <div className="lg:col-span-7 lg:h-full lg:overflow-hidden min-h-0">
              <div className="flex flex-col gap-4 lg:h-full lg:overflow-hidden min-h-0">
                {/* 1) Gráfico (fijo) */}
                <ChartCard pieData={pieData} totals={totals} balanceAccent={balanceAccent} eur={eur} />

                {/** 3) Movimientos */}
                <SmallCard className="p-4 lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden min-h-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-300">Movimientos</div>
                      <div className="text-base font-extrabold text-neutral-900 dark:text-white">Lista del mes</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-2xl border px-3 py-2 border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5">
                        <input
                          placeholder="Buscar…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          className="w-full bg-transparent text-sm font-semibold outline-none text-neutral-900 placeholder:text-neutral-400 dark:text-white dark:placeholder:text-neutral-400"
                        />
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-neutral-400" />
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
                        <div className="rounded-2xl bg-neutral-50 p-4 text-center text-sm text-neutral-500">No hay movimientos</div>
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
                              <Badge label={it.category} />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-white">{it.name}</div>
                                <div className="mt-1 text-xs font-semibold text-neutral-500 dark:text-neutral-300">{new Date(it.createdAt).toLocaleString("es-ES")}</div>
                                                            {/* Si la categoría es "Extra" u "Otros" y se muestra como texto simple */}
                                                            {['Extra', 'Otros'].includes(it.category) && (
                                                              <div className="text-xs font-bold text-neutral-600 dark:text-neutral-200">{it.category}</div>
                                                            )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className={`font-extrabold ${it.kind === 'income' ? 'text-green-700' : 'text-red-700'}`}>{eur(it.amount)}</div>
                              <button
                                onClick={() => removeItem(it.id)}
                                className="inline-flex items-center justify-center rounded-2xl p-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/15"
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
