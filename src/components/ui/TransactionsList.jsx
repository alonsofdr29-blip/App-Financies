import React from "react";
import { Search, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SmallCard from "./ui/SmallCard";
import Badge from "./ui/Badge";

export default function TransactionsList({
  items,
  query,
  setQuery,
  filterKind,
  setFilterKind,
  removeItem,
  eur,
  categoryEmojis,
}) {
  return (
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
          {items.length === 0 ? (
            <div className="rounded-2xl bg-neutral-50 p-4 text-center text-sm text-neutral-500 dark:bg-white/5 dark:text-neutral-300">
              No hay movimientos
            </div>
          ) : (
            items.map((it) => (
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
                    emoji={categoryEmojis[it.category || "Otros"]}
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
  );
}
