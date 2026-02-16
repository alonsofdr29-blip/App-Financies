import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import SmallCard from "./SmallCard";

export default function ChartCard({
  pieData,
  totals,
  balanceAccent,
  chartView,
  setChartView,
  expensesByCategory,
  eur,
  neutralColor = "#64748b",
}) {
  const chartData = chartView === "categories" ? expensesByCategory : pieData;
  const centerTitle = chartView === "balance" ? "Balance neto" : "Gasto total";
  const centerValue = chartView === "balance" ? eur(totals.balance) : eur(totals.expense);

  return (
    <SmallCard className="p-4">
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 dark:border-slate-700 dark:from-slate-900/80 dark:to-slate-900/55">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Visualizacion</p>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {chartView === "balance" ? "Balance general" : "Gasto por categoria"}
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
              Categorias
            </button>
          </div>
        </div>

        <div className="relative mt-4 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart key={`${chartView}-${chartData.length}`}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="88%"
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry?.color ?? neutralColor} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [eur(value), name]} contentStyle={{ borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="rounded-2xl bg-white/90 px-4 py-2 text-center shadow-sm ring-1 ring-slate-300 backdrop-blur dark:bg-slate-900/85 dark:ring-slate-700">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{centerTitle}</div>
              <div className={`text-lg font-extrabold ${chartView === "balance" ? balanceAccent : "text-rose-700 dark:text-rose-400"}`}>{centerValue}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {chartData.map((x) => (
            <span
              key={x.name}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900/80"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: x?.color ?? neutralColor }} />
              {x.name}: <span className="font-extrabold">{eur(x.value)}</span>
            </span>
          ))}
        </div>
      </div>
    </SmallCard>
  );
}
