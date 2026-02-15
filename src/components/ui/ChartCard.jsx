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

  return (
    <SmallCard className="p-4">
      <div className="rounded-3xl bg-slate-50/90 ring-1 ring-slate-200 dark:bg-slate-900/75 dark:ring-slate-700 p-4">
        <div className="relative mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart key={`${chartView}-${chartData.length}`}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="65%"
                outerRadius="90%"
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

          {chartView === "balance" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="rounded-3xl bg-white/90 px-4 py-3 text-center shadow-sm ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/85 dark:ring-slate-700">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-300">Balance</div>
                <div className={`text-lg font-extrabold ${balanceAccent}`}>{eur(totals.balance)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {chartData.map((x) => (
            <span
              key={x.name}
              className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold ring-1 ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-700"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: x?.color ?? neutralColor }} />
              {x.name}: <span className="font-extrabold">{eur(x.value)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setChartView("balance")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            chartView === "balance"
              ? "bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 text-white"
              : "bg-white/70 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700"
          }`}
          type="button"
        >
          Balance
        </button>
        <button
          onClick={() => setChartView("categories")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            chartView === "categories"
              ? "bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 text-white"
              : "bg-white/70 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700"
          }`}
          type="button"
        >
          Categorías
        </button>
      </div>
    </SmallCard>
  );
}
