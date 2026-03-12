import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Cloud,
  Download,
  FileDown,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  Pencil,
  PieChart as PieChartIcon,
  PiggyBank,
  Plus,
  Repeat2,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import "./index.css";
import { APP_NAME, CATEGORY_EMOJI_OPTIONS, CURRENCIES, DEFAULT_CATEGORIES, PAYMENT_METHODS } from "./lib/defaults";
import {
  addMonths,
  createDateFromMonthDay,
  createId,
  formatMoney,
  getMonthOptions,
  monthKeyFromDate,
  monthLabel,
  sortByDateDesc,
  todayIso,
  toAmount,
} from "./lib/format";
import {
  createDefaultGoal,
  loadLocalFinanceState,
  normalizeFinanceState,
  saveLocalFinanceState,
  markReminderSent,
  wasReminderSent,
} from "./lib/storage";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const cardShell =
  "rounded-[26px] border border-sky-400/20 bg-slate-950/88 backdrop-blur-xl shadow-[0_22px_55px_rgba(2,132,199,0.22)]";
const fieldClass =
  "w-full rounded-2xl border border-sky-400/20 bg-slate-900/80 px-4 py-3 text-sm font-medium text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/20";
const ghostButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-400/20 bg-slate-900/80 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-300/50 bg-sky-500 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50";
const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20";
const sectionLabel = "text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300";

const fallbackCategoryByKind = {
  expense: { id: "", name: "Sin categoria", emoji: "\u{1F9FE}", color: "#64748b", kind: "expense" },
  income: { id: "", name: "Sin categoria", emoji: "\u{1FA99}", color: "#22c55e", kind: "income" },
};

function createCloudSeedCategories() {
  return DEFAULT_CATEGORIES.map((category) => ({
    id: createId(),
    ...category,
    createdAt: new Date().toISOString(),
  }));
}

function metricFlowLabel(value, total, emptyLabel) {
  if (total <= 0 || value <= 0) return emptyLabel;
  return `${Math.round((value / total) * 100)}% del flujo del mes`;
}

function metricBalanceLabel(balance, total) {
  if (total <= 0) return "Sin movimientos este mes";
  if (balance === 0) return "Balance totalmente equilibrado";
  return `${balance > 0 ? "Balance positivo" : "Balance en negativo"} del ${Math.round((Math.abs(balance) / total) * 100)}%`;
}

function getTotalsForTransactions(items) {
  return items.reduce(
    (acc, item) => {
      if (item.kind === "income") acc.income += Number(item.amount) || 0;
      else acc.expense += Number(item.amount) || 0;
      return acc;
    },
    { income: 0, expense: 0 }
  );
}

function buildMonthTotals(transactions, monthKey) {
  const monthItems = transactions.filter((item) => monthKeyFromDate(item.date) === monthKey);
  const { income, expense } = getTotalsForTransactions(monthItems);
  return {
    income,
    expense,
    balance: income - expense,
    count: monthItems.length,
  };
}

function buildCategoryMeta(item, categoriesById) {
  const category = categoriesById[item.categoryId] || null;
  if (category) return category;
  return {
    id: item.categoryId || "",
    name: item.categoryName || "Sin categoria",
    emoji: item.categoryEmoji || (item.kind === "income" ? "\u{1FA99}" : "\u{1F9FE}"),
    color: item.kind === "income" ? "#22c55e" : "#64748b",
    kind: item.kind,
  };
}

function upsertMonthlyPlan(plans, monthKey, updater) {
  const current = plans.find((plan) => plan.monthKey === monthKey) || {
    id: createId(),
    monthKey,
    totalBudget: 0,
    categoryBudgets: {},
    createdAt: new Date().toISOString(),
  };
  const nextPlan = updater(current);
  const exists = plans.some((plan) => plan.monthKey === monthKey);
  return exists ? plans.map((plan) => (plan.monthKey === monthKey ? nextPlan : plan)) : [...plans, nextPlan];
}

function removeCategoryFromPlans(plans, categoryId) {
  return plans.map((plan) => {
    const nextBudgets = { ...(plan.categoryBudgets || {}) };
    delete nextBudgets[categoryId];
    return { ...plan, categoryBudgets: nextBudgets };
  });
}

function buildDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportTransactionsCsv(rows) {
  const header = ["Fecha", "Tipo", "Titulo", "Categoria", "Metodo", "Importe", "Nota"];
  const data = rows.map((row) => [
    row.date,
    row.kind === "income" ? "Ingreso" : "Gasto",
    row.title,
    `${row.categoryEmoji || ""} ${row.categoryName || "Sin categoria"}`.trim(),
    row.paymentMethod,
    Number(row.amount).toFixed(2),
    row.note || "",
  ]);
  const csv = [header, ...data]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  buildDownload("neoncash-movimientos.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8;");
}

function buildTransactionPayload(input, category) {
  return {
    id: input.id || createId(),
    kind: input.kind,
    title: input.title.trim(),
    amount: toAmount(input.amount),
    date: input.date || todayIso(),
    paymentMethod: input.paymentMethod,
    note: input.note.trim(),
    categoryId: category?.id || "",
    categoryName: category?.name || fallbackCategoryByKind[input.kind].name,
    categoryEmoji: category?.emoji || fallbackCategoryByKind[input.kind].emoji,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function isRecurringActiveForMonth(entry, monthKey) {
  if (!entry.active) return false;
  if (entry.startMonth && monthKey < entry.startMonth) return false;
  if (entry.endMonth && monthKey > entry.endMonth) return false;
  return true;
}

function buildDueRecurringTransactions(entries, transactions, monthKey) {
  const existing = new Set(
    transactions
      .filter((item) => monthKeyFromDate(item.date) === monthKey && item.recurringSourceId)
      .map((item) => `${item.recurringSourceId}-${item.date}`)
  );

  return entries
    .filter((entry) => isRecurringActiveForMonth(entry, monthKey))
    .map((entry) => {
      const date = createDateFromMonthDay(monthKey, entry.dayOfMonth);
      return {
        id: createId(),
        kind: entry.kind,
        title: entry.title,
        amount: Number(entry.amount) || 0,
        date,
        paymentMethod: entry.paymentMethod,
        note: entry.note,
        categoryId: entry.categoryId || "",
        categoryName: entry.categoryName,
        categoryEmoji: entry.categoryEmoji,
        recurringSourceId: entry.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    })
    .filter((item) => !existing.has(`${item.recurringSourceId}-${item.date}`));
}

function mapCloudProfile(row) {
  return {
    currency: row?.currency || "EUR",
    reminderDay: Number(row?.reminder_day) || 5,
    notificationsEnabled: Boolean(row?.notifications_enabled),
    locale: row?.locale || "es-ES",
  };
}

function mapCloudCategory(row) {
  return {
    id: row.id,
    slug: row.slug || "",
    name: row.name,
    emoji: row.emoji,
    kind: row.kind,
    color: row.color || "#22d3ee",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCloudTransaction(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    amount: Number(row.amount) || 0,
    date: row.transaction_date,
    paymentMethod: row.payment_method,
    note: row.note || "",
    categoryId: row.category_id || "",
    categoryName: row.category_name,
    categoryEmoji: row.category_emoji,
    recurringSourceId: row.recurring_source_id || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCloudRecurring(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    amount: Number(row.amount) || 0,
    dayOfMonth: Number(row.day_of_month) || 1,
    paymentMethod: row.payment_method,
    note: row.note || "",
    categoryId: row.category_id || "",
    categoryName: row.category_name,
    categoryEmoji: row.category_emoji,
    active: Boolean(row.active),
    startMonth: row.start_month,
    endMonth: row.end_month || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCloudGoal(row) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    targetAmount: Number(row.target_amount) || 0,
    savedAmount: Number(row.saved_amount) || 0,
    deadline: row.deadline || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCloudPlan(row) {
  return {
    id: row.id,
    monthKey: row.month_key,
    totalBudget: Number(row.total_budget) || 0,
    categoryBudgets: row.category_budgets || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function GlassCard({ children, className = "" }) {
  return <section className={`${cardShell} ${className}`}>{children}</section>;
}

function SectionHeading({ icon: Icon, eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className={sectionLabel}>{eyebrow}</p>
        <div className="mt-2 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 lg:text-lg">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, hint, icon: Icon, accent = "cyan" }) {
  const accents = {
    cyan: "border border-sky-400/20 bg-sky-500/10 text-sky-300",
    emerald: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    rose: "border border-rose-400/20 bg-rose-500/10 text-rose-300",
    amber: "border border-amber-400/20 bg-amber-500/10 text-amber-300",
  };

  return (
    <GlassCard className="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 lg:text-[1.7rem]">{value}</p>
          <p className="mt-1 text-xs text-slate-500 lg:text-sm">{hint}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-2xl ${accents[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </GlassCard>
  );
}

function CollapsibleCard({
  icon,
  eyebrow,
  title,
  subtitle,
  action,
  isOpen,
  onToggle,
  children,
  className = "",
  bodyClassName = "",
}) {
  return (
    <GlassCard className={`flex min-h-0 flex-col overflow-hidden ${className}`}>
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="min-w-0 flex-1">
          <SectionHeading icon={icon} eyebrow={eyebrow} title={title} subtitle={subtitle} action={action} />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-slate-900/75 text-sky-300 transition hover:border-sky-400/40 hover:bg-sky-500/10"
          aria-expanded={isOpen}
        >
          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen ? <div className={`min-h-0 overflow-hidden border-t border-sky-400/10 ${bodyClassName}`}>{children}</div> : null}
    </GlassCard>
  );
}
function AuthScreen({ authMode, setAuthMode, authForm, setAuthForm, onSubmit, onGoogle, authBusy, authError }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.15),transparent_24%),radial-gradient(circle_at_70%_80%,rgba(56,189,248,0.18),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-10 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Futurista, sincronizada y lista para varios dispositivos
            </span>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
              Controla tu dinero con una cabina financiera de estilo ne�n.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Registra gastos e ingresos, visualiza el balance del mes, automatiza movimientos recurrentes y entra desde cualquier dispositivo con tu cuenta.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <GlassCard className="p-5">
                <p className={sectionLabel}>01</p>
                <p className="mt-3 text-lg font-semibold text-white">{"\u{1F354}"} Categorias vivas</p>
                <p className="mt-2 text-sm text-slate-500">Emojis, colores, edicion y vistas por categoria.</p>
              </GlassCard>
              <GlassCard className="p-5">
                <p className={sectionLabel}>02</p>
                <p className="mt-3 text-lg font-semibold text-white">{"\u{1F4CA}"} Analitica mensual</p>
                <p className="mt-2 text-sm text-slate-500">Grafico circular, balance entre ingresos y gastos y presupuesto del mes.</p>
              </GlassCard>
              <GlassCard className="p-5">
                <p className={sectionLabel}>03</p>
                <p className="mt-3 text-lg font-semibold text-white">{"\u2601\uFE0F"} Sesion segura</p>
                <p className="mt-2 text-sm text-slate-500">Email, contrasena y Google con datos sincronizados.</p>
              </GlassCard>
            </div>
          </div>

          <GlassCard className="p-6 lg:p-7">
            <p className={sectionLabel}>Acceso</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{authMode === "signin" ? "Entrar a tu cabina" : "Crear tu cuenta"}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {authMode === "signin"
                ? "Accede con email o Google para mantener todos tus datos sincronizados."
                : "Crea tu cuenta y luego podras entrar desde movil, tablet o PC."}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  authMode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  authMode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Crear cuenta
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-600">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
                    className={`${fieldClass} pl-11`}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-600">Contrasena</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                    className={`${fieldClass} pl-11`}
                    placeholder="Minimo 6 caracteres"
                    required
                  />
                </div>
              </label>

              {authError ? (
                <div className="rounded-2xl border border-rose-400/25 bg-rose-50 px-4 py-3 text-sm text-rose-700">{authError}</div>
              ) : null}

              <button type="submit" disabled={authBusy} className={`${primaryButton} w-full`}>
                {authBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {authMode === "signin" ? "Entrar" : "Crear cuenta"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              o continua con
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button type="button" onClick={onGoogle} disabled={authBusy} className={`${ghostButton} w-full`}>
              <Cloud className="h-4 w-4 text-slate-500" />
              Google
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [financeState, setFinanceState] = useState(() => loadLocalFinanceState());
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [syncBusy, setSyncBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => monthKeyFromDate(new Date()));
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState("all");
  const deferredSearch = useDeferredValue(search);

  const [authMode, setAuthMode] = useState("signin");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const [transactionForm, setTransactionForm] = useState({
    id: "",
    kind: "expense",
    title: "",
    amount: "",
    categoryId: "",
    date: todayIso(),
    paymentMethod: "card",
    note: "",
    createdAt: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    id: "",
    kind: "expense",
    name: "",
    emoji: CATEGORY_EMOJI_OPTIONS[0],
    color: "#22d3ee",
  });

  const [recurringForm, setRecurringForm] = useState({
    id: "",
    kind: "expense",
    title: "",
    amount: "",
    categoryId: "",
    dayOfMonth: 5,
    paymentMethod: "card",
    note: "",
    active: true,
    startMonth: monthKeyFromDate(new Date()),
    endMonth: "",
  });

  const [goalForm, setGoalForm] = useState({
    name: "",
    emoji: "\u{1F3AF}",
    targetAmount: "",
    savedAmount: "",
    deadline: "",
  });
  const [leftPanel, setLeftPanel] = useState("categories");
  const [rightPanel, setRightPanel] = useState("budget");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddRecurring, setQuickAddRecurring] = useState(false);
  const [isLeftPanelExpanded, setIsLeftPanelExpanded] = useState(true);
  const [isMovementsExpanded, setIsMovementsExpanded] = useState(true);
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(true);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState("overview");


  const cloudMode = Boolean(session?.user && isSupabaseConfigured);
  const currentUserId = session?.user?.id || "";
  const profileName = session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "Modo local";
  const authRedirectUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");

  useEffect(() => {
    setIsLeftPanelExpanded(true);
  }, [leftPanel]);

  useEffect(() => {
    setIsRightPanelExpanded(true);
  }, [rightPanel]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!errorMessage) return undefined;
    const timeout = window.setTimeout(() => setErrorMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [errorMessage]);

  useEffect(() => {
    if (!cloudMode) {
      saveLocalFinanceState(financeState);
    }
  }, [financeState, cloudMode]);

  async function loadCloudFinance(userId) {
    if (!supabase) return;

    const defaultProfile = {
      user_id: userId,
      currency: "EUR",
      reminder_day: 5,
      notifications_enabled: false,
      locale: "es-ES",
    };

    const profileResult = await supabase.from("finance_profiles").upsert(defaultProfile).select().single();
    if (profileResult.error) throw profileResult.error;

    const [categoriesResult, transactionsResult, recurringResult, goalsResult, plansResult] = await Promise.all([
      supabase.from("finance_categories").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("finance_transactions").select("*").eq("user_id", userId).order("transaction_date", { ascending: false }),
      supabase.from("finance_recurring_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("finance_savings_goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("finance_monthly_plans").select("*").eq("user_id", userId).order("month_key", { ascending: false }),
    ]);

    if (categoriesResult.error) throw categoriesResult.error;
    if (transactionsResult.error) throw transactionsResult.error;
    if (recurringResult.error) throw recurringResult.error;
    if (goalsResult.error) throw goalsResult.error;
    if (plansResult.error) throw plansResult.error;

    let categories = categoriesResult.data || [];
    if (categories.length === 0) {
      const seeded = createCloudSeedCategories().map((category) => ({
        id: category.id,
        user_id: userId,
        slug: category.slug,
        name: category.name,
        emoji: category.emoji,
        kind: category.kind,
        color: category.color,
      }));
      const seededResult = await supabase.from("finance_categories").insert(seeded).select("*");
      if (seededResult.error) throw seededResult.error;
      categories = seededResult.data || [];
    }

    const nextState = normalizeFinanceState({
      settings: mapCloudProfile(profileResult.data),
      categories: categories.map(mapCloudCategory),
      transactions: (transactionsResult.data || []).map(mapCloudTransaction),
      recurringEntries: (recurringResult.data || []).map(mapCloudRecurring),
      savingsGoals: (goalsResult.data || []).map(mapCloudGoal),
      monthlyPlans: (plansResult.data || []).map(mapCloudPlan),
    });

    startTransition(() => setFinanceState(nextState));
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setAuthLoading(false);
        setErrorMessage(error.message);
        return;
      }
      setSession(data.session || null);
      if (data.session?.user?.id) {
        loadCloudFinance(data.session.user.id)
          .catch((loadError) => setErrorMessage(loadError.message || "No se pudo sincronizar"))
          .finally(() => setAuthLoading(false));
      } else {
        setAuthLoading(false);
      }
    });

    const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user?.id) {
        loadCloudFinance(nextSession.user.id).catch((loadError) => setErrorMessage(loadError.message || "No se pudo sincronizar"));
      } else {
        setFinanceState(loadLocalFinanceState());
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      listener.data.subscription.unsubscribe();
    };
  }, []);

  async function applyMutation({ localUpdate, cloudTask, successMessage }) {
    setErrorMessage("");
    try {
      if (cloudMode && currentUserId) {
        setSyncBusy(true);
        await cloudTask(currentUserId);
        await loadCloudFinance(currentUserId);
      } else {
        setFinanceState((prev) => normalizeFinanceState(localUpdate(prev)));
      }
      if (successMessage) setToast(successMessage);
    } catch (error) {
      setErrorMessage(error.message || "No se pudo guardar el cambio.");
    } finally {
      setSyncBusy(false);
    }
  }

  const categoriesById = useMemo(
    () => Object.fromEntries(financeState.categories.map((category) => [category.id, category])),
    [financeState.categories]
  );

  const currentPlan = useMemo(
    () => financeState.monthlyPlans.find((plan) => plan.monthKey === selectedMonth) || null,
    [financeState.monthlyPlans, selectedMonth]
  );

  const monthTransactions = useMemo(
    () => sortByDateDesc(financeState.transactions.filter((item) => monthKeyFromDate(item.date) === selectedMonth)),
    [financeState.transactions, selectedMonth]
  );

  const currentTotals = useMemo(() => buildMonthTotals(financeState.transactions, selectedMonth), [financeState.transactions, selectedMonth]);

  const savingsRate = currentTotals.income > 0 ? Math.round((currentTotals.balance / currentTotals.income) * 100) : 0;
  const budgetTotal = Number(currentPlan?.totalBudget) || 0;
  const budgetProgress = budgetTotal > 0 ? Math.min(100, Math.round((currentTotals.expense / budgetTotal) * 100)) : 0;
  const budgetRemaining = budgetTotal - currentTotals.expense;
  const cloudStatusMessage = cloudMode
    ? "Sesion iniciada y datos sincronizados entre dispositivos."
    : isSupabaseConfigured
    ? "Supabase listo. Solo falta iniciar sesion."
    : "Modo local: falta configurar las variables de entorno para activar la nube.";

  const expenseCategories = useMemo(
    () => financeState.categories.filter((category) => category.kind === "expense"),
    [financeState.categories]
  );

  useEffect(() => {
    const matching = financeState.categories.filter((category) => category.kind === transactionForm.kind);
    if (matching.length === 0) return;
    const valid = matching.some((category) => category.id === transactionForm.categoryId);
    if (!valid) {
      setTransactionForm((prev) => ({ ...prev, categoryId: matching[0].id }));
    }
  }, [financeState.categories, transactionForm.kind, transactionForm.categoryId]);

  useEffect(() => {
    const matching = financeState.categories.filter((category) => category.kind === recurringForm.kind);
    if (matching.length === 0) return;
    const valid = matching.some((category) => category.id === recurringForm.categoryId);
    if (!valid) {
      setRecurringForm((prev) => ({ ...prev, categoryId: matching[0].id }));
    }
  }, [financeState.categories, recurringForm.kind, recurringForm.categoryId]);

  const monthOptions = useMemo(() => {
    const fromData = financeState.transactions.map((item) => monthKeyFromDate(item.date));
    return Array.from(new Set([selectedMonth, ...getMonthOptions(selectedMonth, 10), ...fromData])).sort().reverse();
  }, [financeState.transactions, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return monthTransactions.filter((item) => {
      const passKind = filterKind === "all" ? true : item.kind === filterKind;
      const passQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        (item.categoryName || "").toLowerCase().includes(query) ||
        (item.note || "").toLowerCase().includes(query);
      return passKind && passQuery;
    });
  }, [monthTransactions, deferredSearch, filterKind]);
  const dashboardTransactions = filteredTransactions;
  const balancePieData = useMemo(() => {
    const incomeValue = Math.max(0, Number(currentTotals.income) || 0);
    const expenseValue = Math.max(0, Number(currentTotals.expense) || 0);
    const total = incomeValue + expenseValue;

    if (total === 0) {
      return [{ name: "Sin movimientos", value: 1, color: "#334155" }];
    }

    return [
      { name: "Ingresos", value: incomeValue, color: "#22c55e" },
      { name: "Gastos", value: expenseValue, color: "#f97316" },
    ].filter((entry) => entry.value > 0);
  }, [currentTotals.expense, currentTotals.income]);
  const trackedBalanceTotal = currentTotals.income + currentTotals.expense;
  const balanceLegendData = balancePieData.filter((entry) => entry.name !== "Sin movimientos");

  const recurringToApply = useMemo(
    () => buildDueRecurringTransactions(financeState.recurringEntries, financeState.transactions, selectedMonth),
    [financeState.recurringEntries, financeState.transactions, selectedMonth]
  );

  useEffect(() => {
    if (recurringToApply.length === 0) return;

    applyMutation({
      localUpdate: (prev) => ({
        ...prev,
        transactions: sortByDateDesc([...prev.transactions, ...recurringToApply]),
      }),
      cloudTask: async (userId) => {
        const payload = recurringToApply.map((item) => ({
          id: item.id,
          user_id: userId,
          kind: item.kind,
          title: item.title,
          amount: item.amount,
          transaction_date: item.date,
          payment_method: item.paymentMethod,
          note: item.note,
          category_id: item.categoryId || null,
          category_name: item.categoryName,
          category_emoji: item.categoryEmoji,
          recurring_source_id: item.recurringSourceId,
        }));
        const result = await supabase.from("finance_transactions").insert(payload);
        if (result.error) throw result.error;
      },
      successMessage: `${recurringToApply.length} movimiento(s) recurrente(s) aplicado(s).`,
    });
  }, [recurringToApply]);

  const reminderDue =
    selectedMonth === monthKeyFromDate(new Date()) &&
    new Date().getDate() >= Number(financeState.settings.reminderDay || 5) &&
    monthTransactions.length === 0;

  useEffect(() => {
    if (!reminderDue) return;
    if (!financeState.settings.notificationsEnabled) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (wasReminderSent(selectedMonth)) return;

    const notification = new Notification("NeonCash te recuerda", {
      body: "Todavia no has registrado movimientos este mes. ?",
    });
    notification.onclick = () => window.focus();
    markReminderSent(selectedMonth);
  }, [reminderDue, financeState.settings.notificationsEnabled, selectedMonth]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError("");

    try {
      if (authMode === "signin") {
        const result = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });
        if (result.error) throw result.error;
        setToast("Sesion iniciada.");
      } else {
        const result = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: { emailRedirectTo: authRedirectUrl },
        });
        if (result.error) throw result.error;
        if (!result.data.session) {
          setToast("Cuenta creada. Revisa tu correo para confirmar el acceso.");
        }
      }
    } catch (error) {
      setAuthError(error.message || "No se pudo completar el acceso.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleAuth() {
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authRedirectUrl },
      });
      if (result.error) throw result.error;
    } catch (error) {
      setAuthBusy(false);
      setAuthError(error.message || "No se pudo iniciar con Google.");
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    const result = await supabase.auth.signOut();
    if (result.error) {
      setErrorMessage(result.error.message || "No se pudo cerrar sesion.");
      return;
    }
    setToast("Sesion cerrada.");
  }

  function resetTransactionForm(kind = transactionForm.kind) {
    const categoryPool = financeState.categories.filter((category) => category.kind === kind);
    setTransactionForm({
      id: "",
      kind,
      title: "",
      amount: "",
      categoryId: categoryPool[0]?.id || "",
      date: todayIso(),
      paymentMethod: "card",
      note: "",
      createdAt: "",
    });
  }

  function openQuickAdd(kind = "expense") {
    resetTransactionForm(kind);
    setQuickAddRecurring(false);
    setIsQuickAddOpen(true);
  }

  async function saveTransaction(event) {
    event.preventDefault();
    const amount = toAmount(transactionForm.amount);
    if (amount <= 0) {
      setErrorMessage("El importe debe ser mayor que cero.");
      return;
    }

    const category = categoriesById[transactionForm.categoryId] || fallbackCategoryByKind[transactionForm.kind];
    const resolvedTitle = transactionForm.title.trim() || category?.name || (transactionForm.kind === "expense" ? "Gasto rapido" : "Ingreso rapido");
    const payload = buildTransactionPayload({ ...transactionForm, title: resolvedTitle, amount }, category);
    const isEditing = Boolean(transactionForm.id);
    const recurringPayload = !isEditing && quickAddRecurring
      ? {
          id: createId(),
          kind: payload.kind,
          title: payload.title,
          amount: payload.amount,
          dayOfMonth: new Date(payload.date).getDate(),
          paymentMethod: payload.paymentMethod,
          note: payload.note,
          categoryId: payload.categoryId || "",
          categoryName: payload.categoryName,
          categoryEmoji: payload.categoryEmoji,
          active: true,
          startMonth: monthKeyFromDate(payload.date),
          endMonth: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : null;

    await applyMutation({
      localUpdate: (prev) => {
        const exists = prev.transactions.some((item) => item.id === payload.id);
        const nextTransactions = exists
          ? prev.transactions.map((item) => (item.id === payload.id ? payload : item))
          : [payload, ...prev.transactions];
        return {
          ...prev,
          transactions: sortByDateDesc(nextTransactions),
          recurringEntries: recurringPayload ? [recurringPayload, ...prev.recurringEntries] : prev.recurringEntries,
        };
      },
      cloudTask: async (userId) => {
        const transactionResult = await supabase.from("finance_transactions").upsert({
          id: payload.id,
          user_id: userId,
          kind: payload.kind,
          title: payload.title,
          amount: payload.amount,
          transaction_date: payload.date,
          payment_method: payload.paymentMethod,
          note: payload.note,
          category_id: payload.categoryId || null,
          category_name: payload.categoryName,
          category_emoji: payload.categoryEmoji,
          recurring_source_id: payload.recurringSourceId || null,
        });
        if (transactionResult.error) throw transactionResult.error;
        if (recurringPayload) {
          const recurringResult = await supabase.from("finance_recurring_entries").insert({
            id: recurringPayload.id,
            user_id: userId,
            kind: recurringPayload.kind,
            title: recurringPayload.title,
            amount: recurringPayload.amount,
            day_of_month: recurringPayload.dayOfMonth,
            payment_method: recurringPayload.paymentMethod,
            note: recurringPayload.note,
            category_id: recurringPayload.categoryId || null,
            category_name: recurringPayload.categoryName,
            category_emoji: recurringPayload.categoryEmoji,
            active: true,
            start_month: recurringPayload.startMonth,
            end_month: null,
          });
          if (recurringResult.error) throw recurringResult.error;
        }
      },
      successMessage: recurringPayload
        ? "Movimiento y recurrente guardados."
        : isEditing
          ? "Movimiento actualizado."
          : "Movimiento guardado.",
    });

    setQuickAddRecurring(false);
    setIsQuickAddOpen(false);
    resetTransactionForm(transactionForm.kind);
  }

  function startEditTransaction(item) {
    setTransactionForm({
      id: item.id,
      kind: item.kind,
      title: item.title,
      amount: String(item.amount),
      categoryId: item.categoryId,
      date: item.date,
      paymentMethod: item.paymentMethod,
      note: item.note,
      createdAt: item.createdAt,
    });
    setQuickAddRecurring(false);
    setIsQuickAddOpen(true);
  }

  async function deleteTransaction(id) {
    await applyMutation({
      localUpdate: (prev) => ({
        ...prev,
        transactions: prev.transactions.filter((item) => item.id !== id),
      }),
      cloudTask: async (userId) => {
        const result = await supabase.from("finance_transactions").delete().eq("user_id", userId).eq("id", id);
        if (result.error) throw result.error;
      },
      successMessage: "Movimiento eliminado.",
    });

    if (transactionForm.id === id) resetTransactionForm(transactionForm.kind);
  }

  async function saveCategory(event) {
    event.preventDefault();
    if (!categoryForm.name.trim()) {
      setErrorMessage("La categoria necesita un nombre.");
      return;
    }

    const payload = {
      id: categoryForm.id || createId(),
      slug: categoryForm.name.trim().toLowerCase().replaceAll(" ", "-"),
      name: categoryForm.name.trim(),
      emoji: categoryForm.emoji,
      kind: categoryForm.kind,
      color: categoryForm.color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await applyMutation({
      localUpdate: (prev) => {
        const exists = prev.categories.some((category) => category.id === payload.id);
        const nextCategories = exists
          ? prev.categories.map((category) => (category.id === payload.id ? { ...category, ...payload } : category))
          : [...prev.categories, payload];
        return { ...prev, categories: nextCategories };
      },
      cloudTask: async (userId) => {
        const result = await supabase.from("finance_categories").upsert({
          id: payload.id,
          user_id: userId,
          slug: payload.slug,
          name: payload.name,
          emoji: payload.emoji,
          kind: payload.kind,
          color: payload.color,
        });
        if (result.error) throw result.error;
      },
      successMessage: categoryForm.id ? "Categoria actualizada." : "Categoria creada.",
    });

    setCategoryForm({ id: "", kind: categoryForm.kind, name: "", emoji: CATEGORY_EMOJI_OPTIONS[0], color: "#22d3ee" });
  }

  function editCategory(category) {
    setCategoryForm({
      id: category.id,
      kind: category.kind,
      name: category.name,
      emoji: category.emoji,
      color: category.color || "#22d3ee",
    });
  }

  async function deleteCategory(category) {
    const confirmed = window.confirm(`Eliminar ${category.emoji} ${category.name}?`);
    if (!confirmed) return;

    const updatedPlans = removeCategoryFromPlans(financeState.monthlyPlans, category.id);

    await applyMutation({
      localUpdate: (prev) => ({
        ...prev,
        categories: prev.categories.filter((item) => item.id !== category.id),
        transactions: prev.transactions.map((item) =>
          item.categoryId === category.id ? { ...item, categoryId: "" } : item
        ),
        recurringEntries: prev.recurringEntries.map((item) =>
          item.categoryId === category.id ? { ...item, categoryId: "" } : item
        ),
        monthlyPlans: removeCategoryFromPlans(prev.monthlyPlans, category.id),
      }),
      cloudTask: async (userId) => {
        const [txResult, recurringResult, deleteResult] = await Promise.all([
          supabase.from("finance_transactions").update({ category_id: null }).eq("user_id", userId).eq("category_id", category.id),
          supabase.from("finance_recurring_entries").update({ category_id: null }).eq("user_id", userId).eq("category_id", category.id),
          supabase.from("finance_categories").delete().eq("user_id", userId).eq("id", category.id),
        ]);
        if (txResult.error) throw txResult.error;
        if (recurringResult.error) throw recurringResult.error;
        if (deleteResult.error) throw deleteResult.error;
        if (updatedPlans.length > 0) {
          const plansPayload = updatedPlans.map((plan) => ({
            id: plan.id,
            user_id: userId,
            month_key: plan.monthKey,
            total_budget: Number(plan.totalBudget) || 0,
            category_budgets: plan.categoryBudgets || {},
          }));
          const planResult = await supabase.from("finance_monthly_plans").upsert(plansPayload, { onConflict: "user_id,month_key" });
          if (planResult.error) throw planResult.error;
        }
      },
      successMessage: "Categoria eliminada.",
    });

    if (categoryForm.id === category.id) {
      setCategoryForm({ id: "", kind: category.kind, name: "", emoji: CATEGORY_EMOJI_OPTIONS[0], color: "#22d3ee" });
    }
  }

  async function saveRecurring(event) {
    event.preventDefault();
    if (!recurringForm.title.trim()) {
      setErrorMessage("El recurrente necesita un titulo.");
      return;
    }
    if (toAmount(recurringForm.amount) <= 0) {
      setErrorMessage("El importe recurrente debe ser mayor que cero.");
      return;
    }

    const category = categoriesById[recurringForm.categoryId] || fallbackCategoryByKind[recurringForm.kind];
    const payload = {
      id: recurringForm.id || createId(),
      kind: recurringForm.kind,
      title: recurringForm.title.trim(),
      amount: toAmount(recurringForm.amount),
      dayOfMonth: Number(recurringForm.dayOfMonth) || 1,
      paymentMethod: recurringForm.paymentMethod,
      note: recurringForm.note.trim(),
      categoryId: category.id || "",
      categoryName: category.name,
      categoryEmoji: category.emoji,
      active: recurringForm.active,
      startMonth: recurringForm.startMonth,
      endMonth: recurringForm.endMonth,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await applyMutation({
      localUpdate: (prev) => {
        const exists = prev.recurringEntries.some((entry) => entry.id === payload.id);
        const nextEntries = exists
          ? prev.recurringEntries.map((entry) => (entry.id === payload.id ? payload : entry))
          : [payload, ...prev.recurringEntries];
        return { ...prev, recurringEntries: nextEntries };
      },
      cloudTask: async (userId) => {
        const result = await supabase.from("finance_recurring_entries").upsert({
          id: payload.id,
          user_id: userId,
          kind: payload.kind,
          title: payload.title,
          amount: payload.amount,
          day_of_month: payload.dayOfMonth,
          payment_method: payload.paymentMethod,
          note: payload.note,
          category_id: payload.categoryId || null,
          category_name: payload.categoryName,
          category_emoji: payload.categoryEmoji,
          active: payload.active,
          start_month: payload.startMonth,
          end_month: payload.endMonth || null,
        });
        if (result.error) throw result.error;
      },
      successMessage: payload.id === recurringForm.id ? "Recurrente actualizado." : "Recurrente guardado.",
    });

    setRecurringForm({
      id: "",
      kind: recurringForm.kind,
      title: "",
      amount: "",
      categoryId: financeState.categories.find((category) => category.kind === recurringForm.kind)?.id || "",
      dayOfMonth: 5,
      paymentMethod: "card",
      note: "",
      active: true,
      startMonth: selectedMonth,
      endMonth: "",
    });
  }

  async function deleteRecurring(id) {
    await applyMutation({
      localUpdate: (prev) => ({
        ...prev,
        recurringEntries: prev.recurringEntries.filter((entry) => entry.id !== id),
      }),
      cloudTask: async (userId) => {
        const result = await supabase.from("finance_recurring_entries").delete().eq("user_id", userId).eq("id", id);
        if (result.error) throw result.error;
      },
      successMessage: "Recurrente eliminado.",
    });
  }

  async function toggleRecurring(entry) {
    await applyMutation({
      localUpdate: (prev) => ({
        ...prev,
        recurringEntries: prev.recurringEntries.map((item) =>
          item.id === entry.id ? { ...item, active: !item.active } : item
        ),
      }),
      cloudTask: async (userId) => {
        const result = await supabase
          .from("finance_recurring_entries")
          .update({ active: !entry.active })
          .eq("user_id", userId)
          .eq("id", entry.id);
        if (result.error) throw result.error;
      },
      successMessage: !entry.active ? "Recurrente activado." : "Recurrente pausado.",
    });
  }

  async function saveGoal(event) {
    event.preventDefault();
    if (!goalForm.name.trim()) {
      setErrorMessage("La meta necesita un nombre.");
      return;
    }
    if (toAmount(goalForm.targetAmount) <= 0) {
      setErrorMessage("La meta debe tener un objetivo mayor que cero.");
      return;
    }

    const payload = {
      id: createId(),
      name: goalForm.name.trim(),
      emoji: goalForm.emoji,
      targetAmount: toAmount(goalForm.targetAmount),
      savedAmount: toAmount(goalForm.savedAmount),
      deadline: goalForm.deadline,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await applyMutation({
      localUpdate: (prev) => ({
        ...prev,
        savingsGoals: [payload, ...prev.savingsGoals],
      }),
      cloudTask: async (userId) => {
        const result = await supabase.from("finance_savings_goals").insert({
          id: payload.id,
          user_id: userId,
          name: payload.name,
          emoji: payload.emoji,
          target_amount: payload.targetAmount,
          saved_amount: payload.savedAmount,
          deadline: payload.deadline || null,
        });
        if (result.error) throw result.error;
      },
      successMessage: "Meta creada.",
    });

    setGoalForm({ name: "", emoji: "\u{1F3AF}", targetAmount: "", savedAmount: "", deadline: "" });
  }

  async function deleteGoal(id) {
    await applyMutation({
      localUpdate: (prev) => ({
        ...prev,
        savingsGoals: prev.savingsGoals.filter((goal) => goal.id !== id),
      }),
      cloudTask: async (userId) => {
        const result = await supabase.from("finance_savings_goals").delete().eq("user_id", userId).eq("id", id);
        if (result.error) throw result.error;
      },
      successMessage: "Meta eliminada.",
    });
  }

  async function adjustGoal(goal, delta) {
    const nextValue = Math.max(0, (Number(goal.savedAmount) || 0) + delta);
    await applyMutation({
      localUpdate: (prev) => ({
        ...prev,
        savingsGoals: prev.savingsGoals.map((item) =>
          item.id === goal.id ? { ...item, savedAmount: nextValue } : item
        ),
      }),
      cloudTask: async (userId) => {
        const result = await supabase
          .from("finance_savings_goals")
          .update({ saved_amount: nextValue })
          .eq("user_id", userId)
          .eq("id", goal.id);
        if (result.error) throw result.error;
      },
      successMessage: "Meta actualizada.",
    });
  }

  async function updateSettings(patch) {
    const nextSettings = { ...financeState.settings, ...patch };
    await applyMutation({
      localUpdate: (prev) => ({ ...prev, settings: nextSettings }),
      cloudTask: async (userId) => {
        const result = await supabase.from("finance_profiles").upsert({
          user_id: userId,
          currency: nextSettings.currency,
          reminder_day: Number(nextSettings.reminderDay) || 5,
          notifications_enabled: Boolean(nextSettings.notificationsEnabled),
          locale: nextSettings.locale || "es-ES",
        });
        if (result.error) throw result.error;
      },
      successMessage: "Preferencias guardadas.",
    });
  }

  async function updateBudgetTotal(value) {
    const amount = Math.max(0, toAmount(value));
    const nextPlans = upsertMonthlyPlan(financeState.monthlyPlans, selectedMonth, (plan) => ({
      ...plan,
      totalBudget: amount,
    }));
    const plan = nextPlans.find((item) => item.monthKey === selectedMonth);

    await applyMutation({
      localUpdate: (prev) => ({
        ...prev,
        monthlyPlans: upsertMonthlyPlan(prev.monthlyPlans, selectedMonth, (current) => ({ ...current, totalBudget: amount })),
      }),
      cloudTask: async (userId) => {
        const result = await supabase.from("finance_monthly_plans").upsert(
          {
            id: plan.id,
            user_id: userId,
            month_key: selectedMonth,
            total_budget: amount,
            category_budgets: plan.categoryBudgets || {},
          },
          { onConflict: "user_id,month_key" }
        );
        if (result.error) throw result.error;
      },
      successMessage: "Presupuesto total actualizado.",
    });
  }

  async function updateCategoryBudget(categoryId, value) {
    const amount = Math.max(0, toAmount(value));
    const nextPlans = upsertMonthlyPlan(financeState.monthlyPlans, selectedMonth, (plan) => ({
      ...plan,
      categoryBudgets: {
        ...(plan.categoryBudgets || {}),
        [categoryId]: amount,
      },
    }));
    const plan = nextPlans.find((item) => item.monthKey === selectedMonth);

    await applyMutation({
      localUpdate: (prev) => ({
        ...prev,
        monthlyPlans: upsertMonthlyPlan(prev.monthlyPlans, selectedMonth, (current) => ({
          ...current,
          categoryBudgets: {
            ...(current.categoryBudgets || {}),
            [categoryId]: amount,
          },
        })),
      }),
      cloudTask: async (userId) => {
        const result = await supabase.from("finance_monthly_plans").upsert(
          {
            id: plan.id,
            user_id: userId,
            month_key: selectedMonth,
            total_budget: Number(plan.totalBudget) || 0,
            category_budgets: plan.categoryBudgets || {},
          },
          { onConflict: "user_id,month_key" }
        );
        if (result.error) throw result.error;
      },
      successMessage: "Presupuesto por categoria guardado.",
    });
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      setErrorMessage("Este navegador no soporta notificaciones.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      updateSettings({ notificationsEnabled: true });
      setToast("Notificaciones activadas.");
    }
  }

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050816] text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/5 px-5 py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" />
          Cargando tu cabina financiera...
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !session) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        onSubmit={handleAuthSubmit}
        onGoogle={handleGoogleAuth}
        authBusy={authBusy}
        authError={authError}
      />
    );
  }

  return (
    <div className="neo-theme min-h-screen bg-[#040b16] text-slate-100">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 lg:max-w-[1520px] lg:px-5 lg:py-4">
        <header className={`${cardShell} shrink-0 px-4 py-3 lg:px-4`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={sectionLabel}>Resumen</p>
                <h1 className="mt-1 text-[1.7rem] font-semibold tracking-tight text-slate-900">{APP_NAME}</h1>
                <p className="mt-1 text-sm text-slate-500">Tus finanzas del mes en una vista clara y rapida.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                    <Cloud className="h-3.5 w-3.5" />
                    {cloudMode ? "Sincronizacion activa" : isSupabaseConfigured ? "Inicia sesion" : "Modo local"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                    <UserRound className="h-3.5 w-3.5" />
                    {profileName}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:items-end">
              <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1">
                <button type="button" onClick={() => setSelectedMonth(addMonths(selectedMonth, -1))} className={ghostButton}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none"
                >
                  {monthOptions.map((monthKey) => (
                    <option key={monthKey} value={monthKey}>
                      {monthLabel(monthKey, financeState.settings.locale)}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className={ghostButton}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="hidden flex-wrap gap-2 lg:flex">
                <button type="button" onClick={() => exportTransactionsCsv(monthTransactions)} className={ghostButton}>
                  <Download className="h-4 w-4" />
                  CSV
                </button>
                <button type="button" onClick={() => window.print()} className={ghostButton}>
                  <FileDown className="h-4 w-4" />
                  PDF
                </button>
                {cloudMode ? (
                  <button type="button" onClick={handleSignOut} className={ghostButton}>
                    <LogOut className="h-4 w-4" />
                    Salir
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <section className="mt-3 shrink-0 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatCard
            label="Ingresos"
            value={formatMoney(currentTotals.income, financeState.settings.currency, financeState.settings.locale)}
            hint={metricFlowLabel(currentTotals.income, trackedBalanceTotal, "Sin ingresos registrados este mes")}
            icon={ArrowUpRight}
            accent="emerald"
          />
          <StatCard
            label="Gastos"
            value={formatMoney(currentTotals.expense, financeState.settings.currency, financeState.settings.locale)}
            hint={metricFlowLabel(currentTotals.expense, trackedBalanceTotal, "Sin gastos registrados este mes")}
            icon={ArrowDownRight}
            accent="rose"
          />
          <StatCard
            label="Balance"
            value={formatMoney(currentTotals.balance, financeState.settings.currency, financeState.settings.locale)}
            hint={metricBalanceLabel(currentTotals.balance, trackedBalanceTotal)}
            icon={Wallet}
          />
          <StatCard
            label="Ahorro"
            value={`${Number.isFinite(savingsRate) ? savingsRate : 0}%`}
            hint={budgetTotal > 0 ? `${budgetProgress}% del presupuesto usado` : "Configura un objetivo mensual"}
            icon={PiggyBank}
            accent="amber"
          />
        </section>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { value: "overview", label: "Resumen" },
            { value: "tools", label: "Herramientas" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveWorkspaceTab(tab.value)}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activeWorkspaceTab === tab.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeWorkspaceTab === "overview" ? (
        <main className="mt-3 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start 2xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="order-1 grid gap-4 xl:self-start">
            <GlassCard className="flex min-h-0 flex-col p-4 shadow-[0_18px_42px_rgba(8,15,30,0.38)] lg:p-5">
              <SectionHeading
                icon={Plus}
                eyebrow="Movimiento rapido"
                title="Anade gasto o ingreso"
                subtitle="Este es el acceso principal de la app: registra un movimiento en segundos y vuelve al resumen."
              />

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => openQuickAdd("expense")}
                  className="flex items-center justify-between rounded-[28px] border border-sky-300/45 bg-sky-500/18 px-5 py-6 text-left transition hover:border-sky-300 hover:bg-sky-500/24 shadow-[0_18px_40px_rgba(14,165,233,0.18)]"
                >
                  <div>
                    <p className={sectionLabel}>Accion principal</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">Nuevo gasto</h3>
                    <p className="mt-1 text-sm text-slate-600">Categoria, importe y listo. Es la via mas rapida para el dia a dia.</p>
                  </div>
                  <span className="grid h-16 w-16 place-items-center rounded-3xl bg-sky-500 text-[34px] text-white shadow-[0_16px_34px_rgba(14,165,233,0.26)]">{"\u{1F4B8}"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openQuickAdd("income")}
                  className="flex items-center justify-between rounded-[28px] border border-sky-300/20 bg-slate-950/35 px-5 py-5 text-left transition hover:border-sky-300/40 hover:bg-sky-500/10"
                >
                  <div>
                    <p className={sectionLabel}>Tambien rapido</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">Nuevo ingreso</h3>
                    <p className="mt-1 text-sm text-slate-600">Usa el mismo flujo rapido para salario, extras o devoluciones.</p>
                  </div>
                  <span className="grid h-14 w-14 place-items-center rounded-3xl bg-sky-100 text-[30px] text-sky-700">{"\u2728"}</span>
                </button>
              </div>
            </GlassCard>

            <GlassCard className="flex min-h-0 flex-col p-4 shadow-[0_18px_42px_rgba(8,15,30,0.38)] lg:p-5">
              <SectionHeading
                icon={PieChartIcon}
                eyebrow="Presupuesto"
                title="Presupuesto del mes"
                subtitle={budgetTotal > 0 ? `Te quedan ${formatMoney(budgetRemaining, financeState.settings.currency, financeState.settings.locale)}.` : "Define un limite mensual para controlar mejor el gasto."}
              />

              <div className="mt-4">
                <label>
                  <span className="mb-2 block text-sm text-slate-600">Limite total mensual</span>
                  <input
                    className={fieldClass}
                    value={String(currentPlan?.totalBudget || "")}
                    onChange={(event) => updateBudgetTotal(event.target.value)}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </label>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Uso del presupuesto</span>
                    <span>{budgetTotal > 0 ? `${budgetProgress}%` : "Sin definir"}</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${budgetProgress < 70 ? "bg-emerald-400" : budgetProgress < 90 ? "bg-amber-400" : "bg-rose-400"}`}
                      style={{ width: `${budgetTotal > 0 ? budgetProgress : 8}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 max-h-[320px] space-y-2.5 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                  {expenseCategories.slice(0, 4).map((category) => {
                    const spent = monthTransactions
                      .filter((item) => item.kind === "expense" && item.categoryId === category.id)
                      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
                    const categoryBudget = Number(currentPlan?.categoryBudgets?.[category.id]) || 0;
                    const used = categoryBudget > 0 ? Math.min(100, Math.round((spent / categoryBudget) * 100)) : 0;

                    return (
                      <div key={category.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{category.emoji} {category.name}</p>
                            <p className="mt-1 text-sm text-slate-500">Gastado: {formatMoney(spent, financeState.settings.currency, financeState.settings.locale)}</p>
                          </div>
                          <div className="w-[140px] shrink-0">
                            <input
                              className={fieldClass}
                              type="number"
                              step="0.01"
                              value={String(categoryBudget || "")}
                              onChange={(event) => updateCategoryBudget(category.id, event.target.value)}
                              placeholder="Presupuesto"
                            />
                          </div>
                        </div>
                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div className={`h-full rounded-full ${used < 70 ? "bg-emerald-400" : used < 90 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${used}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="order-2 min-w-0 grid gap-4">
            <GlassCard className="flex min-h-[360px] min-w-0 flex-col overflow-hidden p-4 lg:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <SectionHeading
                  icon={PieChartIcon}
                  eyebrow="Balance"
                  title="Balance entre ingresos y gastos"
                  subtitle="La lectura principal del mes: cuanto entra, cuanto sale y cuanto te queda."
                />

                <div className="rounded-[24px] border border-sky-300/20 bg-slate-950/30 px-4 py-3 lg:min-w-[220px] lg:text-right">
                  <p className={sectionLabel}>Balance neto</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">{formatMoney(currentTotals.balance, financeState.settings.currency, financeState.settings.locale)}</p>
                  <p className="mt-1 text-xs text-slate-500">{trackedBalanceTotal > 0 ? `${Math.round((Math.abs(currentTotals.balance) / trackedBalanceTotal) * 100)}% sobre el flujo del mes` : "Sin actividad este mes"}</p>
                </div>
              </div>

              <div className="mt-5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                <div className="rounded-[28px] border border-sky-300/20 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),rgba(8,15,28,0.92)_68%)] p-4 shadow-[0_18px_40px_rgba(3,10,24,0.32)]">
                  <div className="mx-auto h-[250px] w-full max-w-[340px] sm:h-[290px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={balancePieData} dataKey="value" nameKey="name" innerRadius={0} outerRadius="90%" paddingAngle={4} stroke="rgba(4,11,22,0.9)" strokeWidth={5}>
                          {balancePieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatMoney(value, financeState.settings.currency, financeState.settings.locale)}
                          contentStyle={{ borderRadius: 18, background: "#08111f", border: "1px solid rgba(56,189,248,0.3)", color: "#eff6ff", boxShadow: "0 18px 40px rgba(3,10,24,0.4)" }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid gap-3 lg:self-stretch lg:content-center">
                  {balanceLegendData.length > 0 ? (
                    balanceLegendData.map((entry) => (
                      <div key={entry.name} className="rounded-[22px] border border-sky-300/15 bg-slate-950/25 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-slate-100">{entry.name}</p>
                              <p className="text-xs text-slate-500">{trackedBalanceTotal > 0 ? `${Math.round((entry.value / trackedBalanceTotal) * 100)}% del total` : "0% del total"}</p>
                            </div>
                          </div>
                          <p className="text-base font-semibold text-slate-100">{formatMoney(entry.value, financeState.settings.currency, financeState.settings.locale)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-sky-300/20 bg-slate-950/20 px-4 py-5 text-sm text-slate-500">Aun no hay datos suficientes para comparar ingresos y gastos.</div>
                  )}
                </div>
              </div>
            </GlassCard>

            <CollapsibleCard
              icon={Search}
              eyebrow="Movimientos"
              title={`Registro de ${monthLabel(selectedMonth, financeState.settings.locale)}`}
              subtitle={`${filteredTransactions.length} resultado(s). Lista completa con scroll.`}
              action={
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "Todos" },
                    { value: "income", label: "Ingresos" },
                    { value: "expense", label: "Gastos" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilterKind(item.value)}
                      className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                        filterKind === item.value ? "bg-white text-slate-900 shadow-sm" : "bg-white text-slate-500"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              }
              isOpen={isMovementsExpanded}
              onToggle={() => setIsMovementsExpanded((prev) => !prev)}
              className="min-h-[460px]"
              bodyClassName="flex min-h-[360px] flex-1 flex-col overflow-hidden px-3 pb-3"
            >
              <div className="mt-4 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Buscar por titulo, categoria o nota"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 pb-1 [scrollbar-gutter:stable]">
                <AnimatePresence initial={false}>
                  {filteredTransactions.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500"
                    >
                      Sin movimientos para este filtro. Prueba con otra busqueda o cambia de mes.
                    </motion.div>
                  ) : (
                    dashboardTransactions.map((item) => {
                      const category = buildCategoryMeta(item, categoriesById);
                      const payment = PAYMENT_METHODS.find((method) => method.value === item.paymentMethod);
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          className="rounded-[24px] border border-slate-200 bg-white p-3.5"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-3">
                              <span
                                className="grid h-14 w-14 place-items-center rounded-2xl text-2xl"
                                style={{ backgroundColor: `${category.color || "#22d3ee"}20`, color: category.color || "#22d3ee" }}
                              >
                                {category.emoji}
                              </span>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-semibold text-slate-900">{item.title}</p>
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                    {item.kind === "income" ? "Ingreso" : "Gasto"}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                  <span>{category.emoji} {category.name}</span>
                                  <span>/</span>
                                  <span>{payment?.emoji} {payment?.label}</span>
                                  <span>/</span>
                                  <span>{new Date(item.date).toLocaleDateString(financeState.settings.locale)}</span>
                                </div>
                                {item.note ? <p className="mt-2 text-sm text-slate-500">{item.note}</p> : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 md:self-start">
                              <div className={`text-right text-lg font-semibold ${item.kind === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                                {item.kind === "income" ? "+" : "-"} {formatMoney(item.amount, financeState.settings.currency, financeState.settings.locale)}
                              </div>
                              <button type="button" onClick={() => startEditTransaction(item)} className={ghostButton}>
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => deleteTransaction(item.id)} className={dangerButton}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </CollapsibleCard>
          </div>
        </main>
        ) : null}

        {activeWorkspaceTab === "tools" ? (
        <section className="mt-3">
          <GlassCard className="p-4 shadow-[0_18px_42px_rgba(8,15,30,0.38)] lg:p-5">
            <SectionHeading
              icon={Settings2}
              eyebrow="Herramientas"
              title="Categorias, presupuesto y automatizaciones"
              subtitle="Todo lo secundario queda recogido aqui: entra cuando quieras para editar categorias, presupuestos, metas o ajustes."
            />

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="grid gap-4">
                <GlassCard className="p-3 shadow-[0_16px_38px_rgba(8,15,30,0.38)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={sectionLabel}>Organizacion</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">Categorias y recurrentes</p>
                    </div>
                    <select value={leftPanel} onChange={(event) => setLeftPanel(event.target.value)} className="w-full rounded-2xl border border-sky-400/20 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-sky-400 sm:min-w-[180px] sm:w-auto">
                      <option value="categories">Categorias</option>
                      <option value="recurring">Recurrentes</option>
                    </select>
                  </div>
                </GlassCard>
            {leftPanel === "categories" ? (
              <CollapsibleCard
                icon={Sparkles}
                eyebrow="Categorias"
                title="Editables y con emoji"
                subtitle="Sin simbolos rotos ni bloques descuadrados."
                isOpen={isLeftPanelExpanded}
                onToggle={() => setIsLeftPanelExpanded((prev) => !prev)}
                className="min-h-0"
                bodyClassName="max-h-[46vh] overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable] xl:max-h-[calc(100vh-28rem)]"
              >
<form className="mt-4 space-y-3" onSubmit={saveCategory}>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    {[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCategoryForm((prev) => ({ ...prev, kind: option.value }))}
                        className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${categoryForm.kind === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_96px]">
                    <label>
                      <span className="mb-1.5 block text-sm text-slate-600">Nombre</span>
                      <input className={fieldClass} value={categoryForm.name} onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Ej: Mascotas" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-sm text-slate-600">Color</span>
                      <input className="h-[48px] w-full rounded-2xl border border-slate-200 bg-white p-2" type="color" value={categoryForm.color} onChange={(event) => setCategoryForm((prev) => ({ ...prev, color: event.target.value }))} />
                    </label>
                  </div>

                  <div>
                    <span className="mb-1.5 block text-sm text-slate-600">Emoji</span>
                    <div className="grid grid-cols-8 gap-2">
                      {CATEGORY_EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setCategoryForm((prev) => ({ ...prev, emoji }))}
                          className={`grid h-10 w-10 place-items-center rounded-2xl border text-lg transition ${categoryForm.emoji === emoji ? "border-slate-300 bg-slate-100" : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <button type="submit" className={primaryButton}><Plus className="h-4 w-4" />{categoryForm.id ? "Actualizar" : "Crear"}</button>
                    <button type="button" className={ghostButton} onClick={() => setCategoryForm({ id: "", kind: categoryForm.kind, name: "", emoji: CATEGORY_EMOJI_OPTIONS[0], color: "#22d3ee" })}>Limpiar</button>
                  </div>
                </form>

                <div className="mt-4 grid gap-2 2xl:grid-cols-2">
                  {financeState.categories.filter((category) => category.kind === categoryForm.kind).map((category) => (
                    <div key={category.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{category.name}</p>
                          <p className="mt-0.5 text-sm text-slate-500">{category.kind === "income" ? "Ingreso" : "Gasto"}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end gap-1.5">
                        <button type="button" onClick={() => editCategory(category)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => deleteCategory(category)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleCard>
            ) : null}

            {leftPanel === "recurring" ? (
              <CollapsibleCard
                icon={Repeat2}
                eyebrow="Recurrentes"
                title="Automatiza pagos e ingresos"
                subtitle="Solo lo importante, en formato compacto."
                isOpen={isLeftPanelExpanded}
                onToggle={() => setIsLeftPanelExpanded((prev) => !prev)}
                className="min-h-0"
                bodyClassName="max-h-[46vh] overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable] xl:max-h-[calc(100vh-28rem)]"
              >
<form className="mt-4 space-y-3" onSubmit={saveRecurring}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label><span className="mb-1.5 block text-sm text-slate-600">Titulo</span><input className={fieldClass} value={recurringForm.title} onChange={(event) => setRecurringForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Ej: Alquiler" /></label>
                    <label><span className="mb-1.5 block text-sm text-slate-600">Importe</span><input className={fieldClass} value={recurringForm.amount} onChange={(event) => setRecurringForm((prev) => ({ ...prev, amount: event.target.value }))} type="number" step="0.01" /></label>
                    <label><span className="mb-1.5 block text-sm text-slate-600">Tipo</span><select className={fieldClass} value={recurringForm.kind} onChange={(event) => setRecurringForm((prev) => ({ ...prev, kind: event.target.value }))}><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label>
                    <label><span className="mb-1.5 block text-sm text-slate-600">Categoria</span><select className={fieldClass} value={recurringForm.categoryId} onChange={(event) => setRecurringForm((prev) => ({ ...prev, categoryId: event.target.value }))}>{financeState.categories.filter((category) => category.kind === recurringForm.kind).map((category) => (<option key={category.id} value={category.id}>{category.emoji} {category.name}</option>))}</select></label>
                    <label><span className="mb-1.5 block text-sm text-slate-600">Dia</span><input className={fieldClass} value={recurringForm.dayOfMonth} onChange={(event) => setRecurringForm((prev) => ({ ...prev, dayOfMonth: event.target.value }))} type="number" min="1" max="31" /></label>
                    <label><span className="mb-1.5 block text-sm text-slate-600">Inicio</span><input className={fieldClass} value={recurringForm.startMonth} onChange={(event) => setRecurringForm((prev) => ({ ...prev, startMonth: event.target.value }))} type="month" /></label>
                  </div>
                  <button type="submit" className={primaryButton}><Repeat2 className="h-4 w-4" />Guardar</button>
                </form>

                <div className="mt-4 space-y-2">
                  {financeState.recurringEntries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">Todavia no tienes movimientos recurrentes.</div>
                  ) : (
                    financeState.recurringEntries.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{entry.categoryEmoji} {entry.title}</p>
                            <p className="mt-1 text-sm text-slate-500">Dia {entry.dayOfMonth} � {entry.kind === "income" ? "Ingreso" : "Gasto"} � {formatMoney(entry.amount, financeState.settings.currency, financeState.settings.locale)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => toggleRecurring(entry)} className="inline-flex rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{entry.active ? "Pausar" : "Activar"}</button>
                            <button type="button" onClick={() => deleteRecurring(entry.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-400/35 bg-rose-500/10 text-rose-100"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleCard>
            ) : null}
              </div>
              <div className="grid gap-4">
                <GlassCard className="p-3 shadow-[0_16px_38px_rgba(8,15,30,0.38)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={sectionLabel}>Control</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">Presupuesto, metas y ajustes</p>
                    </div>
                    <select value={rightPanel} onChange={(event) => setRightPanel(event.target.value)} className="w-full rounded-2xl border border-sky-400/20 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-sky-400 sm:min-w-[180px] sm:w-auto">
                      <option value="budget">Presupuesto</option>
                      <option value="goals">Metas</option>
                      <option value="settings">Ajustes</option>
                    </select>
                  </div>
                </GlassCard>
            {rightPanel === "budget" ? (
              <CollapsibleCard
                icon={PieChartIcon}
                eyebrow="Presupuesto"
                title="Presupuesto rapido"
                subtitle={budgetTotal > 0 ? `Te quedan ${formatMoney(budgetRemaining, financeState.settings.currency, financeState.settings.locale)}.` : "Define un limite mensual para controlar mejor el gasto."}
                isOpen={isRightPanelExpanded}
                onToggle={() => setIsRightPanelExpanded((prev) => !prev)}
                className="min-h-0"
                bodyClassName="max-h-[46vh] overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable] xl:max-h-[calc(100vh-28rem)]"
              >
<div className="mt-4">
                  <label>
                    <span className="mb-2 block text-sm text-slate-600">Limite total mensual</span>
                    <input
                      className={fieldClass}
                      value={String(currentPlan?.totalBudget || "")}
                      onChange={(event) => updateBudgetTotal(event.target.value)}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </label>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Uso del presupuesto</span>
                      <span>{budgetTotal > 0 ? `${budgetProgress}%` : "Sin definir"}</span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${budgetProgress < 70 ? "bg-emerald-400" : budgetProgress < 90 ? "bg-amber-400" : "bg-rose-400"}`}
                        style={{ width: `${budgetTotal > 0 ? budgetProgress : 8}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {expenseCategories.slice(0, 4).map((category) => {
                    const spent = monthTransactions
                      .filter((item) => item.kind === "expense" && item.categoryId === category.id)
                      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
                    const categoryBudget = Number(currentPlan?.categoryBudgets?.[category.id]) || 0;
                    const used = categoryBudget > 0 ? Math.min(100, Math.round((spent / categoryBudget) * 100)) : 0;

                    return (
                      <div key={category.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{category.emoji} {category.name}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              Gastado: {formatMoney(spent, financeState.settings.currency, financeState.settings.locale)}
                            </p>
                          </div>
                          <div className="w-full max-w-[180px]">
                            <input
                              className={fieldClass}
                              type="number"
                              step="0.01"
                              value={String(categoryBudget || "")}
                              onChange={(event) => updateCategoryBudget(category.id, event.target.value)}
                              placeholder="Presupuesto"
                            />
                          </div>
                        </div>
                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div className={`h-full rounded-full ${used < 70 ? "bg-emerald-400" : used < 90 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${used}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleCard>
            ) : null}

            {rightPanel === "goals" ? (
              <CollapsibleCard
                icon={Target}
                eyebrow="Metas"
                title="Objetivos de ahorro"
                subtitle="Suma aportaciones poco a poco y controla tu progreso."
                isOpen={isRightPanelExpanded}
                onToggle={() => setIsRightPanelExpanded((prev) => !prev)}
                className="min-h-0"
                bodyClassName="max-h-[46vh] overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable] xl:max-h-[calc(100vh-28rem)]"
              >
<form className="mt-4 grid gap-3" onSubmit={saveGoal}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-sm text-slate-600">Nombre</span>
                      <input className={fieldClass} value={goalForm.name} onChange={(event) => setGoalForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Viaje a Japon" />
                    </label>
                    <label>
                      <span className="mb-2 block text-sm text-slate-600">Emoji</span>
                      <input className={fieldClass} value={goalForm.emoji} onChange={(event) => setGoalForm((prev) => ({ ...prev, emoji: event.target.value }))} placeholder="\u2708\uFE0F" />
                    </label>
                    <label>
                      <span className="mb-2 block text-sm text-slate-600">Objetivo</span>
                      <input className={fieldClass} value={goalForm.targetAmount} onChange={(event) => setGoalForm((prev) => ({ ...prev, targetAmount: event.target.value }))} type="number" step="0.01" />
                    </label>
                    <label>
                      <span className="mb-2 block text-sm text-slate-600">Ya ahorrado</span>
                      <input className={fieldClass} value={goalForm.savedAmount} onChange={(event) => setGoalForm((prev) => ({ ...prev, savedAmount: event.target.value }))} type="number" step="0.01" />
                    </label>
                  </div>
                  <label>
                    <span className="mb-2 block text-sm text-slate-600">Fecha objetivo</span>
                    <input className={fieldClass} value={goalForm.deadline} onChange={(event) => setGoalForm((prev) => ({ ...prev, deadline: event.target.value }))} type="date" />
                  </label>
                  <button type="submit" className={primaryButton}>
                    <Target className="h-4 w-4" />
                    Crear meta
                  </button>
                </form>

                <div className="mt-4 space-y-2.5">
                  {(financeState.savingsGoals.length > 0 ? financeState.savingsGoals : [createDefaultGoal()]).map((goal, index) => {
                    const isDemo = financeState.savingsGoals.length === 0;
                    const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) : 0;
                    return (
                      <div key={goal.id || index} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{goal.emoji} {goal.name}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatMoney(goal.savedAmount, financeState.settings.currency, financeState.settings.locale)} de {formatMoney(goal.targetAmount, financeState.settings.currency, financeState.settings.locale)}
                            </p>
                          </div>
                          {!isDemo ? (
                            <button type="button" onClick={() => deleteGoal(goal.id)} className={dangerButton}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-cyan-400" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {!isDemo ? (
                            <>
                              <button type="button" onClick={() => adjustGoal(goal, 50)} className={ghostButton}>+50</button>
                              <button type="button" onClick={() => adjustGoal(goal, 100)} className={ghostButton}>+100</button>
                              <button type="button" onClick={() => adjustGoal(goal, -50)} className={ghostButton}>-50</button>
                            </>
                          ) : (
                            <span className="text-sm text-slate-500">Crea tu primera meta para activarla.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleCard>
            ) : null}

            {rightPanel === "settings" ? (
              <CollapsibleCard
                icon={Settings2}
                eyebrow="Ajustes"
                title="Moneda, recordatorios y sincronizacion"
                subtitle="La moneda es editable y las notificaciones te ayudan a no olvidar el registro."
                isOpen={isRightPanelExpanded}
                onToggle={() => setIsRightPanelExpanded((prev) => !prev)}
                className="min-h-0"
                bodyClassName="max-h-[46vh] overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable] xl:max-h-[calc(100vh-28rem)]"
              >
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-600">Moneda</span>
                    <select
                      className={fieldClass}
                      value={financeState.settings.currency}
                      onChange={(event) => updateSettings({ currency: event.target.value })}
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-600">Dia del recordatorio mensual</span>
                    <input
                      className={fieldClass}
                      type="number"
                      min="1"
                      max="28"
                      value={financeState.settings.reminderDay}
                      onChange={(event) => {
                        const nextReminderDay = Math.max(1, Math.min(28, Number(event.target.value) || 1));
                        updateSettings({ reminderDay: nextReminderDay });
                      }}
                    />
                  </label>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Notificaciones {"\u{1F514}"}</p>
                        <p className="mt-1 text-sm text-slate-500">Muestran un aviso si abres la app y no has registrado movimientos este mes.</p>
                      </div>
                      <button type="button" onClick={enableNotifications} className={primaryButton}>
                        <Bell className="h-4 w-4" />
                        Activar
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Cloud className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-semibold text-slate-900">Estado de la nube</p>
                        <p className="text-sm text-slate-500">{cloudStatusMessage}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
                    <p className="font-semibold text-slate-900">Extras incluidos {"\u2705"}</p>
                    <p className="mt-2">Presupuestos, recurrentes, metas de ahorro, exportacion CSV/PDF y recordatorios listos para usar.</p>
                  </div>
                </div>
              </CollapsibleCard>
            ) : null}
              </div>
            </div>
          </GlassCard>
        </section>
        ) : null}

        <AnimatePresence>
          {isQuickAddOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 grid place-items-center bg-slate-900/35 p-3 backdrop-blur-sm"
            >
              <motion.form
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                onSubmit={saveTransaction}
                className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[28px] border border-slate-200 bg-white px-4 py-5 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:px-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Movimiento rapido</p>
                    <h2 className="mt-2 text-2xl font-semibold">{transactionForm.id ? "Editar movimiento" : transactionForm.kind === "expense" ? "Gasto expres" : "Ingreso rapido"}</h2>
                    <p className="mt-1 text-sm text-slate-500">{transactionForm.id ? "Actualiza categoria, importe o nombre en el mismo flujo rapido." : transactionForm.kind === "expense" ? "Elige categoria, escribe el importe y anade nombre solo si quieres." : "Mismo flujo rapido para anadir ingresos en segundos."}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-200 bg-white text-slate-500 transition hover:border-sky-400 hover:text-sky-600"
                  >
                    �
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  {[
                    { value: "expense", label: "Gasto \u{1F4B8}", active: "bg-sky-500 text-white" },
                    { value: "income", label: "Ingreso \u{2705}", active: "bg-sky-500 text-white" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTransactionForm((prev) => ({ ...prev, kind: option.value, categoryId: financeState.categories.find((category) => category.kind === option.value)?.id || prev.categoryId }))}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${transactionForm.kind === option.value ? option.active : "text-slate-500"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid gap-4">
                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Categoria</span>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {financeState.categories.filter((category) => category.kind === transactionForm.kind).slice(0, transactionForm.kind === "expense" ? 9 : 6).map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setTransactionForm((prev) => ({
                            ...prev,
                            categoryId: category.id,
                            title: transactionForm.kind === "expense" && !prev.title.trim() ? category.name : prev.title,
                          }))}
                          className={`rounded-2xl border px-3 py-3 text-left transition ${transactionForm.categoryId === category.id ? "border-sky-400 bg-sky-50 shadow-[0_8px_20px_rgba(14,165,233,0.12)]" : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-sky-50/60"}`}
                        >
                          <div className="text-center text-3xl">{category.emoji}</div>
                          <div className="mt-2 text-center text-sm font-semibold text-slate-800">{category.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Importe (EUR)</span>
                    <input className="w-full rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-3xl font-semibold outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" value={transactionForm.amount} onChange={(event) => setTransactionForm((prev) => ({ ...prev, amount: event.target.value }))} type="number" step="0.01" placeholder="0.00" autoFocus />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{transactionForm.kind === "expense" ? "Nombre opcional" : "Descripcion"}</span>
                    <input className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" value={transactionForm.title} onChange={(event) => setTransactionForm((prev) => ({ ...prev, title: event.target.value }))} placeholder={transactionForm.kind === "expense" ? "Ej: Cafe con Marta" : "Ej: Nomina de marzo"} />
                  </label>

                  {transactionForm.kind === "income" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Fecha</span>
                        <input className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" value={transactionForm.date} onChange={(event) => setTransactionForm((prev) => ({ ...prev, date: event.target.value }))} type="date" />
                      </label>
                      <label>
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Notas</span>
                        <input className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" value={transactionForm.note} onChange={(event) => setTransactionForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Opcional..." />
                      </label>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-600">
                      Fecha automatica: <span className="font-semibold text-slate-800">{new Date(transactionForm.date).toLocaleDateString(financeState.settings.locale)}</span>
                    </div>
                  )}

                  <label className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={quickAddRecurring} onChange={(event) => setQuickAddRecurring(event.target.checked)} />
                    Recurrente mensual
                  </label>
                </div>

                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={() => setIsQuickAddOpen(false)} className="flex-1 rounded-2xl border border-sky-200 bg-white px-4 py-3 font-semibold text-slate-700">Cancelar</button>
                  <button type="submit" className="flex-1 rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.24)]">{transactionForm.id ? "Guardar cambios" : "Anadir"}</button>
                </div>
              </motion.form>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {(toast || errorMessage) && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm space-y-3 lg:inset-x-auto lg:right-5"
            >
              {toast ? (
                <div className="rounded-2xl border border-cyan-400/25 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                  {toast}
                </div>
              ) : null}
              {errorMessage ? (
                <div className="rounded-2xl border border-rose-400/25 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}












