export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function monthKeyFromDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function addMonths(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return monthKeyFromDate(date);
}

export function monthLabel(monthKey, locale = "es-ES") {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toAmount(value) {
  const clean = typeof value === "string" ? value.replace(",", ".") : value;
  const amount = Number(clean);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

export function formatMoney(value, currency = "EUR", locale = "es-ES") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function sortByDateDesc(list, key = "date") {
  return [...list].sort((a, b) => {
    const aValue = new Date(a[key] ?? a.createdAt ?? 0).getTime();
    const bValue = new Date(b[key] ?? b.createdAt ?? 0).getTime();
    if (bValue !== aValue) return bValue - aValue;
    return String(b.id ?? "").localeCompare(String(a.id ?? ""));
  });
}

export function getMonthOptions(pivotMonth, count = 8) {
  return Array.from({ length: count }, (_, index) => addMonths(pivotMonth, index - Math.floor(count / 2)))
    .sort()
    .reverse();
}

export function lastDayOfMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export function clampDay(day, monthKey) {
  const parsed = Math.max(1, Math.min(31, Number(day) || 1));
  return Math.min(parsed, lastDayOfMonth(monthKey));
}

export function createDateFromMonthDay(monthKey, day) {
  const [year, month] = monthKey.split("-").map(Number);
  const safeDay = clampDay(day, monthKey);
  return `${year}-${pad2(month)}-${pad2(safeDay)}`;
}

export function calculateDelta(current, previous) {
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

