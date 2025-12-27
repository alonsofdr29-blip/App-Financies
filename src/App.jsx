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
import { supabase } from "./lib/supabase";

import SmallCard from "./components/ui/SmallCard";
import Button from "./components/ui/Button";
import Badge from "./components/ui/Badge";
import Segmented from "./components/ui/Segmented";
import Input from "./components/ui/Input";
import ChartCard from "./components/ui/ChartCard";
import AuthGate from "./components/AuthGate";
import Dashboard from "./components/Dashboard";

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
              <span className="font-extrabold text-red-600 dark:text-red-400">
                {eur(Math.abs(remaining))}
              </span>
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
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}
