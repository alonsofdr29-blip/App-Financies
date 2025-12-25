import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Comida: { bg: "bg-amber-50", ring: "ring-amber-200", text: "text-amber-800" },
  Casa: { bg: "bg-blue-50", ring: "ring-blue-200", text: "text-blue-800" },
  Transporte: { bg: "bg-indigo-50", ring: "ring-indigo-200", text: "text-indigo-800" },
  Ocio: { bg: "bg-pink-50", ring: "ring-pink-200", text: "text-pink-800" },
  Salud: { bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-800" },
  Suscripciones: { bg: "bg-purple-50", ring: "ring-purple-200", text: "text-purple-800" },
  Sueldo: { bg: "bg-green-50", ring: "ring-green-200", text: "text-green-800" },
  Extra: { bg: "bg-lime-50", ring: "ring-lime-200", text: "text-lime-800" },
  Ventas: { bg: "bg-teal-50", ring: "ring-teal-200", text: "text-teal-800" },
  Regalo: { bg: "bg-rose-50", ring: "ring-rose-200", text: "text-rose-800" },
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
  const style = CATEGORY_BADGES[label] || {
    bg: "bg-neutral-50",
    ring: "ring-neutral-200",
    text: "text-neutral-800",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-1 ${style.bg} ${style.ring} ${style.text}`}
      aria-label={label}
    >
      {typeof CATEGORY_EMOJIS !== "undefined" && CATEGORY_EMOJIS[label] ? (
        <>
          <span className="text-sm leading-none">{CATEGORY_EMOJIS[label]}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        <>
          <Tag className="h-3 w-3 opacity-70" />
          {label}
        </>
      )}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", type = "button", className = "" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-800 shadow-[0_10px_25px_rgba(0,0,0,0.18)]",
    soft: "bg-white text-neutral-900 hover:bg-neutral-50 ring-1 ring-neutral-200 shadow-sm",
    ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100",
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
    <div className="grid grid-cols-2 rounded-2xl bg-neutral-100 p-1">
      <button
        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
          value === "expense" ? "bg-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
        }`}
        onClick={() => onChange("expense")}
        type="button"
      >
        Gasto
      </button>
      <button
        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
          value === "income" ? "bg-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
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
      <div className="mb-1 text-xs font-semibold text-neutral-600">{label}</div>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200"
        />
        {right ? <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">{right}</div> : null}
      </div>
    </label>
  );
}

function SmallCard({ children, className = "" }) {
  return (
    <div className={`rounded-3xl border border-neutral-200/70 bg-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur ${className}`}>
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
    <SmallCard className="mt-4 p-4 lg:py-3">
      <div>
        <div className="text-xs font-semibold text-neutral-500">Gráfico</div>
        <div className="text-base font-extrabold text-neutral-900">
          Ingresos vs Gastos
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-neutral-50 ring-1 ring-neutral-200 p-4">
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

        <div className="mt-4 flex flex-wrap gap-2">
          {pieData.map((x, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 ring-neutral-200"
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: x.color }}
              />
              <div className="text-neutral-700">{x.name}:</div>
              <div className="font-extrabold text-neutral-900">
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
    totals.balance > 0 ? "text-green-700" : totals.balance < 0 ? "text-red-700" : "text-neutral-900";

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-neutral-50 to-neutral-100">
      <div className="mx-auto w-full px-4 py-4">
        <div className="text-center p-8">App inicializada. Si quieres, restauraré el JSX original paso a paso.</div>
      </div>
    </div>
  );
}
