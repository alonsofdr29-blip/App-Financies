export const APP_NAME = "NeonCash";

export const DEFAULT_SETTINGS = {
  currency: "EUR",
  reminderDay: 5,
  notificationsEnabled: false,
  locale: "es-ES",
};

export const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "Dolar" },
  { code: "GBP", symbol: "£", label: "Libra" },
];

export const PAYMENT_METHODS = [
  { value: "card", label: "Tarjeta", emoji: "\u{1F4B3}" },
  { value: "cash", label: "Efectivo", emoji: "\u{1F4B5}" },
  { value: "transfer", label: "Transferencia", emoji: "\u{1F3E6}" },
  { value: "bizum", label: "Bizum", emoji: "\u{1F4F2}" },
  { value: "other", label: "Otro", emoji: "\u{1F9FE}" },
];

export const CATEGORY_EMOJI_OPTIONS = [
  "\u{1F354}",
  "\u{1F3E0}",
  "\u{1F697}",
  "\u{1F6CD}\uFE0F",
  "\u{1F3AE}",
  "\u{1F48A}",
  "\u{1F4DA}",
  "\u{1F4A1}",
  "\u2708\uFE0F",
  "\u{1F3CB}\uFE0F",
  "\u{1F436}",
  "\u{1F381}",
  "\u{1F4BC}",
  "\u{1F4C8}",
  "\u{1F4B8}",
  "\u{1F9FE}",
  "\u{1F6E0}\uFE0F",
  "\u{1F9D1}\u200D\u{1F4BB}",
  "\u{1F3AC}",
  "\u2615",
  "\u{1FA99}",
  "\u{1F9E0}",
  "\u{1F30D}",
  "\u26A1",
];

export const DEFAULT_CATEGORIES = [
  { slug: "food", name: "Comida", emoji: "\u{1F354}", kind: "expense", color: "#f59e0b" },
  { slug: "home", name: "Casa", emoji: "\u{1F3E0}", kind: "expense", color: "#22c55e" },
  { slug: "transport", name: "Transporte", emoji: "\u{1F697}", kind: "expense", color: "#38bdf8" },
  { slug: "shopping", name: "Compras", emoji: "\u{1F6CD}\uFE0F", kind: "expense", color: "#ec4899" },
  { slug: "leisure", name: "Ocio", emoji: "\u{1F3AE}", kind: "expense", color: "#8b5cf6" },
  { slug: "health", name: "Salud", emoji: "\u{1F48A}", kind: "expense", color: "#14b8a6" },
  { slug: "study", name: "Estudios", emoji: "\u{1F4DA}", kind: "expense", color: "#f97316" },
  { slug: "bills", name: "Facturas", emoji: "\u{1F4A1}", kind: "expense", color: "#eab308" },
  { slug: "travel", name: "Viajes", emoji: "\u2708\uFE0F", kind: "expense", color: "#06b6d4" },
  { slug: "salary", name: "Sueldo", emoji: "\u{1F4BC}", kind: "income", color: "#10b981" },
  { slug: "freelance", name: "Freelance", emoji: "\u{1F9D1}\u200D\u{1F4BB}", kind: "income", color: "#0ea5e9" },
  { slug: "investments", name: "Inversiones", emoji: "\u{1F4C8}", kind: "income", color: "#84cc16" },
  { slug: "gift", name: "Extra", emoji: "\u{1F381}", kind: "income", color: "#f43f5e" },
  { slug: "refund", name: "Reembolso", emoji: "\u{1F4B8}", kind: "income", color: "#22c55e" },
];
