import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Wallet,
  Download,
  Upload,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

const STORAGE_KEY = "finanzas_personales_v2";
const THEME_KEY = "finanzas_theme";

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

  const bar = b <= 0 ? "bg-slate-200 dark:bg-slate-700" : pct < 70 ? "bg-emerald-500" : pct < 90 ? "bg-amber-500" : "bg-rose-500";

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
                | Limite: <span className="font-extrabold">{eur(b)}</span>
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

function StatTile({ label, value, hint, icon: Icon, tone = "neutral" }) {
  const tones = {
    neutral: "text-slate-900 dark:text-slate-100",
    positive: "text-emerald-700 dark:text-emerald-400",
    negative: "text-rose-700 dark:text-rose-400",
    accent: "text-cyan-700 dark:text-cyan-400",
  };

  return (
    <div className="rounded-2xl border border-slate-200/85 bg-white/95 p-3 dark:border-slate-700 dark:bg-slate-800/65">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}</p>
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700/80 dark:text-slate-200">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={`mt-2 text-xl font-extrabold ${tones[tone]}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">{hint}</p>
    </div>
  );
}

// Componente de gráfico circular simple con SVG
function SimplePieChart({ data, centerLabel, centerValue, balanceAccent, isBalance }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Sin datos para mostrar
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Sin datos para mostrar
      </div>
    );
  }

  let currentAngle = -90; // Empezar desde arriba
  const radius = 90;
  const innerRadius = 56;
  const centerX = 120;
  const centerY = 120;

  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const x3 = centerX + innerRadius * Math.cos(endRad);
    const y3 = centerY + innerRadius * Math.sin(endRad);
    const x4 = centerX + innerRadius * Math.cos(startRad);
    const y4 = centerY + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ');

    return {
      path: pathData,
      color: item.color || CHART_COLORS.neutral,
      name: item.name,
      value: item.value,
      percentage: percentage.toFixed(1)
    };
  });

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg width="240" height="240" viewBox="0 0 240 240" className="transform">
        {slices.map((slice, index) => (
          <g key={index}>
            <path
              d={slice.path}
              fill={slice.color}
              className="transition-all duration-300 hover:opacity-80"
            />
          </g>
        ))}
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-2xl bg-white/90 px-4 py-2 text-center shadow-sm ring-1 ring-slate-300 backdrop-blur dark:bg-slate-900/85 dark:ring-slate-700">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{centerLabel}</div>
          <div className={`text-lg font-extrabold ${isBalance ? balanceAccent : "text-rose-700 dark:text-rose-400"}`}>{centerValue}</div>
        </div>
      </div>
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

  const [query, setQuery] = useState("");
  const [filterKind, setFilterKind] = useState("all");
  const [chartView, setChartView] = useState("balance");

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

  const expenseItemsCount = useMemo(
    () => safeMonthData.items.filter((it) => it.kind === "expense").length,
    [safeMonthData.items]
  );

  const averageExpense = expenseItemsCount > 0 ? totals.expense / expenseItemsCount : 0;

  const budgetTotal = Number(safeMonthData.budgetTotal || 0);
  const budgetProgress = budgetTotal > 0 ? Math.min(100, Math.round((totals.expense / budgetTotal) * 100)) : 0;
  const budgetRemaining = budgetTotal - totals.expense;
  const budgetStatus =
    budgetTotal <= 0
      ? "Aun no has definido un presupuesto mensual."
      : budgetRemaining >= 0
      ? `Te quedan ${eur(budgetRemaining)} de presupuesto.`
      : `Llevas ${eur(Math.abs(budgetRemaining))} por encima del presupuesto.`;

  const savingsRate = totals.income > 0 ? Math.round((totals.balance / totals.income) * 100) : 0;
  const savingsSummary =
    totals.income <= 0
      ? "Agrega ingresos para calcular tu tasa de ahorro."
      : savingsRate >= 20
      ? "Buen ritmo de ahorro para este mes."
      : savingsRate >= 0
      ? "Puedes mejorar el ahorro reduciendo gasto variable."
      : "Tus gastos superan tus ingresos este mes.";

  const lastMovementDate =
    safeMonthData.items[0]?.createdAt != null
      ? new Date(safeMonthData.items[0].createdAt).toLocaleDateString("es-ES")
      : "Sin movimientos";

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return safeMonthData.items.filter((it) => {
      const passKind = filterKind === "all" ? true : it.kind === filterKind;
      const passQuery = !q ? true : (it.name || "").toLowerCase().includes(q) || (it.category || "").toLowerCase().includes(q);
      return passKind && passQuery;
    });
  }, [safeMonthData.items, query, filterKind]);

  const canAddMovement = name.trim().length > 0 && clampNumber(amount) > 0;

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

  // Datos para el gráfico circular por categorías
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

  // Datos para el gráfico circular de balance general
  const pieData = useMemo(() => {
    const data = [];
    if (totals.income > 0) data.push({ name: "Ingresos", value: totals.income, color: CHART_COLORS.income });
    if (totals.expense > 0) data.push({ name: "Gastos", value: totals.expense, color: CHART_COLORS.expense });
    if (totals.balance > 0) data.push({ name: "Ahorro", value: totals.balance, color: CHART_COLORS.savings });
    if (data.length === 0) return [{ name: "Sin datos", value: 1, color: CHART_COLORS.neutral }];
    return data;
  }, [totals]);

  // Comparación entre meses - últimos 6 meses
  const monthComparison = useMemo(() => {
    const allMonths = Object.keys(db.months || {}).sort().reverse();
    const last6Months = allMonths.slice(0, 6).reverse();
    
    return last6Months.map(monthKey => {
      const data = db.months[monthKey];
      const items = data?.items || [];
      
      let income = 0;
      let expense = 0;
      
      for (const it of items) {
        if (it.kind === "income") income += Number(it.amount) || 0;
        else expense += Number(it.amount) || 0;
      }
      
      return {
        month: monthKey,
        label: monthLabel(monthKey).split(' ')[0], // Solo el mes
        income,
        expense,
        balance: income - expense,
      };
    });
  }, [db.months]);

  // Calcular tendencia del balance
  const balanceTrend = useMemo(() => {
    if (monthComparison.length < 2) return null;
    const current = monthComparison[monthComparison.length - 1].balance;
    const previous = monthComparison[monthComparison.length - 2].balance;
    const diff = current - previous;
    const percentChange = previous !== 0 ? Math.round((diff / Math.abs(previous)) * 100) : 0;
    return { diff, percentChange, isPositive: diff >= 0 };
  }, [monthComparison]);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100" style={{background: 'radial-gradient(1200px 700px at -5% -15%, rgba(165, 243, 252, 0.18) 0%, transparent 58%), radial-gradient(980px 560px at 110% 20%, rgba(219, 234, 254, 0.08) 0%, transparent 55%), #edf2f7'}}>
      <div className="relative mx-auto w-full max-w-[1600px] px-4 py-5 lg:px-8">
        <header className="mb-4 rounded-3xl border border-slate-200/80 bg-white/92 p-4 shadow-lg backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/75">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-700 text-white shadow-lg">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Panel financiero</p>
                <h1 className="text-xl font-extrabold tracking-tight">Finanzas Personales</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => exportJSON(db)} className="inline-flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-100 dark:bg-slate-800/85 dark:ring-slate-700 dark:hover:bg-slate-700">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>

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
              <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-100 dark:bg-slate-800/85 dark:ring-slate-700 dark:hover:bg-slate-700">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar</span>
              </button>

              <button onClick={() => setDarkMode((v) => !v)} className="inline-flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-100 dark:bg-slate-800/85 dark:ring-slate-700 dark:hover:bg-slate-700">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="hidden sm:inline">{darkMode ? "Claro" : "Oscuro"}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-12">
            <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-800 p-4 text-white shadow-xl lg:col-span-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100/90">Mes activo</p>
                  <h2 className="text-2xl font-extrabold">{monthLabel(month)}</h2>
                  <p className="mt-1 text-xs font-semibold text-cyan-100/90">{savingsSummary}</p>
                </div>

                <label className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/30 bg-white/10 px-3 py-2 text-sm font-semibold backdrop-blur">
                  <CalendarDays className="h-4 w-4 text-cyan-100" />
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="bg-transparent text-white outline-none"
                    style={{colorScheme: 'dark'}}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-100/90">Movimientos</p>
                  <p className="text-lg font-extrabold">{safeMonthData.items.length}</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-100/90">Ultimo registro</p>
                  <p className="text-lg font-extrabold">{lastMovementDate}</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-100/90">Tasa ahorro</p>
                  <p className="text-lg font-extrabold">{totals.income > 0 ? `${savingsRate}%` : "--"}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-cyan-100/90">
                  <span>Uso de presupuesto</span>
                  <span>{budgetTotal > 0 ? `${budgetProgress}%` : "Sin objetivo"}</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className={`h-full transition-all ${
                      budgetTotal <= 0 ? "bg-white/20" : budgetProgress < 70 ? "bg-emerald-400" : budgetProgress < 90 ? "bg-amber-400" : "bg-rose-400"
                    }`}
                    style={{ width: `${budgetProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-cyan-100/90">{budgetStatus}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
              <StatTile label="Ingresos" value={eur(totals.income)} hint="Entradas del mes" icon={ArrowUpRight} tone="positive" />
              <StatTile label="Gastos" value={eur(totals.expense)} hint="Salidas del mes" icon={ArrowDownRight} tone="negative" />
              <StatTile label="Balance" value={eur(totals.balance)} hint="Ingresos menos gastos" icon={Wallet} tone={totals.balance >= 0 ? "positive" : "negative"} />
              <StatTile label="Gasto medio" value={eur(averageExpense)} hint="Promedio por movimiento de gasto" icon={CalendarDays} tone="accent" />
            </div>
          </div>
        </header>

        {/* Comparación entre meses */}
        {monthComparison.length > 1 && (
          <div className="mb-4 rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-lg backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/78">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Evolución financiera</p>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Comparación entre meses</h2>
              </div>
              {balanceTrend && (
                <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 ${
                  balanceTrend.isPositive 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                }`}>
                  {balanceTrend.isPositive ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  <div className="text-right">
                    <div className="text-xs font-semibold">vs mes anterior</div>
                    <div className="text-lg font-extrabold">
                      {balanceTrend.isPositive ? '+' : ''}{eur(balanceTrend.diff)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico de barras simple */}
            <div className="space-y-4">
              {monthComparison.map((monthData, idx) => {
                const maxValue = Math.max(...monthComparison.map(m => Math.max(m.income, m.expense)));
                const incomeWidth = maxValue > 0 ? (monthData.income / maxValue) * 100 : 0;
                const expenseWidth = maxValue > 0 ? (monthData.expense / maxValue) * 100 : 0;
                const isCurrentMonth = monthData.month === month;

                return (
                  <div key={monthData.month} className={`rounded-2xl border p-4 transition-all ${
                    isCurrentMonth 
                      ? 'border-cyan-300 bg-cyan-50/50 dark:border-cyan-700 dark:bg-cyan-900/20' 
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {monthData.label}
                        </span>
                        {isCurrentMonth && (
                          <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            Actual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ↑ {eur(monthData.income)}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">
                          ↓ {eur(monthData.expense)}
                        </span>
                        <span className={`font-extrabold ${
                          monthData.balance >= 0 
                            ? 'text-emerald-700 dark:text-emerald-400' 
                            : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          = {eur(monthData.balance)}
                        </span>
                      </div>
                    </div>

                    {/* Barras de progreso */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 w-16">
                          Ingreso
                        </span>
                        <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${incomeWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 w-16">
                          Gasto
                        </span>
                        <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500"
                            style={{ width: `${expenseWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumen de tendencias */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Promedio ingresos
                </div>
                <div className="mt-1 text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                  {eur(monthComparison.reduce((sum, m) => sum + m.income, 0) / monthComparison.length)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Promedio gastos
                </div>
                <div className="mt-1 text-lg font-extrabold text-rose-700 dark:text-rose-400">
                  {eur(monthComparison.reduce((sum, m) => sum + m.expense, 0) / monthComparison.length)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Promedio balance
                </div>
                <div className={`mt-1 text-lg font-extrabold ${
                  (monthComparison.reduce((sum, m) => sum + m.balance, 0) / monthComparison.length) >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}>
                  {eur(monthComparison.reduce((sum, m) => sum + m.balance, 0) / monthComparison.length)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900/78">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Nuevo movimiento</p>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Registra un ingreso o gasto</h2>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-100">Paso 1-3</span>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Paso 1 | Tipo</p>
                    <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-300 dark:bg-slate-800/80 dark:ring-slate-700">
                      <button
                        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-all ${
                          kind === "expense"
                            ? "bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-700 text-white shadow-lg"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                        }`}
                        onClick={() => setKind("expense")}
                        type="button"
                      >
                        Gasto
                      </button>
                      <button
                        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-all ${
                          kind === "income"
                            ? "bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-700 text-white shadow-lg"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                        }`}
                        onClick={() => setKind("income")}
                        type="button"
                      >
                        Ingreso
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Paso 2 | Detalles</p>
                    </div>
                    <label className="block">
                      <div className="mb-1 text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">Nombre</div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Supermercado"
                        className="w-full rounded-2xl border border-slate-300/80 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-cyan-600 dark:focus:ring-cyan-900/35"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">Importe</div>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Ej: 25.50"
                          className="w-full rounded-2xl border border-slate-300/80 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-cyan-600 dark:focus:ring-cyan-900/35"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                          <span className="text-sm font-extrabold text-slate-500">EUR</span>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Paso 3 | Categoria</p>
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
                        placeholder="Escribe otra categoria si la necesitas"
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-cyan-600 dark:focus:ring-cyan-900/35"
                      />
                    </div>
                  </div>

                  <button onClick={addItem} disabled={!canAddMovement} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-50 dark:from-slate-700 dark:via-slate-700 dark:to-cyan-600">
                    <Plus className="h-4 w-4" />
                    Guardar movimiento
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900/78">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Presupuesto mensual</p>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Control por categorias</h2>
                  </div>
                  <div className="text-sm font-extrabold">{eur(budgetTotal)}</div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Limite total del mes</div>
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
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="space-y-4">
              {/* Gráfico circular */}
              <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-lg backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/78">
                <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 dark:border-slate-700 dark:from-slate-900/80 dark:to-slate-900/55">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Visualización</p>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {chartView === "balance" ? "Balance general" : "Gasto por categoría"}
                      </h3>
                    </div>

                    <div className="inline-flex rounded-full border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800/70">
                      <button
                        onClick={() => setChartView("balance")}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          chartView === "balance"
                            ? "bg-slate-900 text-white dark:bg-cyan-600 dark:text-slate-950"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                        }`}
                        type="button"
                      >
                        Balance
                      </button>
                      <button
                        onClick={() => setChartView("categories")}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          chartView === "categories"
                            ? "bg-slate-900 text-white dark:bg-cyan-600 dark:text-slate-950"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                        }`}
                        type="button"
                      >
                        Categorías
                      </button>
                    </div>
                  </div>

                  {/* SVG Pie Chart */}
                  <div className="relative mt-4 flex items-center justify-center" style={{ height: '240px' }}>
                    <SimplePieChart 
                      data={chartView === "categories" ? expensesByCategory : pieData}
                      centerLabel={chartView === "balance" ? "Balance neto" : "Gasto total"}
                      centerValue={chartView === "balance" ? eur(totals.balance) : eur(totals.expense)}
                      balanceAccent={totals.balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}
                      isBalance={chartView === "balance"}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(chartView === "categories" ? expensesByCategory : pieData).map((x) => (
                      <span
                        key={x.name}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900/80"
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: x?.color || CHART_COLORS.neutral }} />
                        {x.name}: <span className="font-extrabold">{eur(x.value)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista de movimientos */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900/78">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Movimientos</p>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Registro del mes <span className="text-slate-500 dark:text-slate-300">({filteredItems.length})</span>
                  </h2>
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

              <div className="mt-3 space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                    No hay movimientos para los filtros actuales.
                  </div>
                ) : (
                  filteredItems.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-start justify-between rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`mt-2 inline-flex h-2.5 w-2.5 rounded-full ${
                            it.kind === "income" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />

                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{it.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-cyan-50/95 text-slate-800 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-100 dark:ring-cyan-500/30">
                              <span className="text-[11px] leading-none text-cyan-700 dark:text-cyan-200">{CATEGORY_CODES[it.category || "Otros"]}</span>
                              {it.category || "Otros"}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {it.kind === "income" ? "Ingreso" : "Gasto"}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                              {new Date(it.createdAt).toLocaleString("es-ES")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-3 flex items-center gap-3">
                        <div
                          className={`whitespace-nowrap text-sm font-extrabold ${
                            it.kind === "income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {it.kind === "income" ? "+" : "-"} {eur(it.amount)}
                        </div>
                        <button
                          onClick={() => removeItem(it.id)}
                          className="inline-flex items-center justify-center rounded-2xl bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
                          type="button"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
