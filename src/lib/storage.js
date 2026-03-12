import { createId } from "./format";
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from "./defaults";

const STORAGE_KEY = "neoncash-local-v1";
const NOTIFICATION_KEY = "neoncash-reminder-v1";

const defaultCategoryByName = Object.fromEntries(DEFAULT_CATEGORIES.map((category) => [category.name.toLowerCase(), category]));
const defaultCategoryBySlug = Object.fromEntries(DEFAULT_CATEGORIES.map((category) => [category.slug, category]));

function seedCategories() {
  return DEFAULT_CATEGORIES.map((category) => ({
    id: `local-${category.slug}`,
    ...category,
    createdAt: new Date().toISOString(),
  }));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasBrokenEmoji(value) {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  return trimmed.length === 0 || /^\?+$/.test(trimmed) || trimmed.includes("�");
}

function inferDefaultCategory(category = {}) {
  const bySlug = category.slug ? defaultCategoryBySlug[category.slug] : null;
  if (bySlug) return bySlug;
  const byName = category.name ? defaultCategoryByName[String(category.name).toLowerCase()] : null;
  return byName || null;
}

function normalizeCategory(category, index) {
  const fallback = inferDefaultCategory(category);
  return {
    id: category.id || `local-migrated-${index}`,
    slug: category.slug || fallback?.slug || String(category.name || `categoria-${index}`).toLowerCase().replaceAll(" ", "-"),
    name: category.name || fallback?.name || `Categoria ${index + 1}`,
    emoji: hasBrokenEmoji(category.emoji) ? fallback?.emoji || "\u{1F9FE}" : category.emoji,
    kind: category.kind || fallback?.kind || "expense",
    color: category.color || fallback?.color || "#22d3ee",
    createdAt: category.createdAt || category.created_at || new Date().toISOString(),
    updatedAt: category.updatedAt || category.updated_at || new Date().toISOString(),
  };
}

function normalizeTransaction(transaction, categories) {
  const linkedCategory = categories.find((category) => category.id === transaction.categoryId) || inferDefaultCategory({
    slug: transaction.categorySlug,
    name: transaction.categoryName,
  });

  return {
    ...transaction,
    categoryEmoji: hasBrokenEmoji(transaction.categoryEmoji)
      ? linkedCategory?.emoji || (transaction.kind === "income" ? "\u{1FA99}" : "\u{1F9FE}")
      : transaction.categoryEmoji,
    categoryName: transaction.categoryName || linkedCategory?.name || "Sin categoria",
    paymentMethod: transaction.paymentMethod || "card",
    note: transaction.note || "",
  };
}

function normalizeGoal(goal, index) {
  return {
    id: goal.id || `goal-${index}`,
    name: goal.name || `Meta ${index + 1}`,
    emoji: hasBrokenEmoji(goal.emoji) ? "\u{1F3AF}" : goal.emoji,
    targetAmount: Number(goal.targetAmount) || 0,
    savedAmount: Number(goal.savedAmount) || 0,
    deadline: goal.deadline || "",
    createdAt: goal.createdAt || new Date().toISOString(),
    updatedAt: goal.updatedAt || new Date().toISOString(),
  };
}

function normalizeRecurring(entry, categories) {
  const linkedCategory = categories.find((category) => category.id === entry.categoryId) || inferDefaultCategory({ name: entry.categoryName });
  return {
    ...entry,
    categoryEmoji: hasBrokenEmoji(entry.categoryEmoji)
      ? linkedCategory?.emoji || (entry.kind === "income" ? "\u{1FA99}" : "\u{1F9FE}")
      : entry.categoryEmoji,
    categoryName: entry.categoryName || linkedCategory?.name || "Sin categoria",
    paymentMethod: entry.paymentMethod || "card",
    note: entry.note || "",
  };
}

export function createEmptyFinanceState() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    categories: seedCategories(),
    transactions: [],
    recurringEntries: [],
    savingsGoals: [],
    monthlyPlans: [],
  };
}

export function normalizeFinanceState(raw) {
  if (!raw || typeof raw !== "object") {
    return createEmptyFinanceState();
  }

  const sourceCategories = ensureArray(raw.categories);
  const categories = (sourceCategories.length > 0 ? sourceCategories : seedCategories()).map(normalizeCategory);

  return {
    settings: {
      ...DEFAULT_SETTINGS,
      ...(raw.settings && typeof raw.settings === "object" ? raw.settings : {}),
    },
    categories,
    transactions: ensureArray(raw.transactions).map((transaction) => normalizeTransaction(transaction, categories)),
    recurringEntries: ensureArray(raw.recurringEntries).map((entry) => normalizeRecurring(entry, categories)),
    savingsGoals: ensureArray(raw.savingsGoals).map(normalizeGoal),
    monthlyPlans: ensureArray(raw.monthlyPlans),
  };
}

export function loadLocalFinanceState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyFinanceState();
    return normalizeFinanceState(JSON.parse(raw));
  } catch {
    return createEmptyFinanceState();
  }
}

export function saveLocalFinanceState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeFinanceState(state)));
}

export function createDefaultGoal() {
  return {
    id: createId(),
    name: "Colchon de seguridad",
    emoji: "\u{1F6E1}\uFE0F",
    targetAmount: 3000,
    savedAmount: 0,
    deadline: "",
    createdAt: new Date().toISOString(),
  };
}

export function wasReminderSent(monthKey) {
  try {
    const raw = localStorage.getItem(NOTIFICATION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.monthKey === monthKey;
  } catch {
    return false;
  }
}

export function markReminderSent(monthKey) {
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify({ monthKey, sentAt: new Date().toISOString() }));
}
