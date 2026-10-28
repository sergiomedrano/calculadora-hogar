"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExpenseStore } from "@/store/expenseStore";
import { CATEGORIES, PERSON_COLORS } from "@/types";
import { formatCurrency } from "@/lib/utils";

function useChartData() {
  const { expensesByCategory, expensesByPerson, incomeSources, activeView, currency, monthlyTrend } =
    useExpenseStore();
  const byCategory = expensesByCategory();
  const byPerson = expensesByPerson();

  const isPersonal = activeView === "personal";

  // Only include income sources that belong to the current view
  const scopedSources = incomeSources.filter((s) => (s.scope ?? "household") === activeView);

  const donutData = CATEGORIES.filter((cat) => (byCategory[cat.key] || 0) > 0).map((cat) => ({
    name: cat.label,
    value: byCategory[cat.key] || 0,
    color: cat.color,
    emoji: cat.emoji,
  }));

  // In the personal view we never split by income proportion — only household view
  // gets the per-person stacked bar and per-person trend lines.
  const stackedData = (!isPersonal)
    ? CATEGORIES.filter((cat) => (byCategory[cat.key] || 0) > 0).map((cat) => {
        const row: Record<string, number | string> = { category: cat.emoji + " " + cat.label };
        for (const person of scopedSources) {
          row[person.name] = Math.round(byPerson[person.id]?.byCategory[cat.key] || 0);
        }
        return row;
      })
    : [];

  const trend = monthlyTrend(6);

  return { donutData, stackedData, trend, scopedSources, currency, isPersonal };
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CurrencyTooltip({ active, payload, label }: TooltipProps) {
  const { currency } = useExpenseStore();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-semibold" style={{ color: item.color }}>
            {formatCurrency(item.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutTooltip({ active, payload }: TooltipProps) {
  const { currency } = useExpenseStore();
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground">{item.name}</p>
      <p className="font-bold mt-1" style={{ color: item.color }}>
        {formatCurrency(item.value, currency)}
      </p>
    </div>
  );
}

export function ExpenseChart() {
  const { donutData, stackedData, trend, scopedSources, currency, isPersonal } = useChartData();
  const total = donutData.reduce((s, d) => s + d.value, 0);
  // In personal view never split by income proportion, even if there are multiple income sources
  const multiPerson = !isPersonal && scopedSources.length >= 2;

  if (donutData.length === 0 && trend.every((t) => t.total === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">📊 Gráficos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <div className="text-5xl mb-3">📉</div>
          <p className="text-sm">Agrega gastos para ver los gráficos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Donut + Stacked Bar */}
      <div className={`grid grid-cols-1 ${multiPerson ? "lg:grid-cols-2" : ""} gap-4`}>
        {/* Donut chart */}
        {donutData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="w-56 h-56 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-2">
                  {donutData.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs">
                          <span className="text-foreground font-medium truncate">
                            {item.emoji} {item.name}
                          </span>
                          <span className="text-muted-foreground ml-2 shrink-0">
                            {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5 mt-0.5">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatCurrency(item.value, currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stacked bar by person (only when 2+ people and data exists) */}
        {multiPerson && stackedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aporte por Persona y Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stackedData}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatCurrency(v, currency).replace(/\s/g, "")}
                    tick={{ fontSize: 10 }}
                    width={80}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 10 }}
                    width={110}
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
                  {scopedSources.map((person, idx) => (
                    <Bar
                      key={person.id}
                      dataKey={person.name}
                      stackId="a"
                      fill={PERSON_COLORS[idx % PERSON_COLORS.length]}
                      radius={idx === scopedSources.length - 1 ? [0, 4, 4, 0] : undefined}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 2: Monthly trend line */}
      {trend.some((t) => t.total > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendencia Mensual (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v, currency).replace(/\s/g, "")}
                  tick={{ fontSize: 10 }}
                  width={82}
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
                {multiPerson ? (
                  scopedSources.map((person, idx) => (
                    <Line
                      key={person.id}
                      type="monotone"
                      dataKey={(d: Record<string, unknown>) => {
                        const bp = d.byPerson as Record<string, number>;
                        return Math.round(bp[person.id] || 0);
                      }}
                      name={person.name}
                      stroke={PERSON_COLORS[idx % PERSON_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))
                ) : (
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total gastos"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
