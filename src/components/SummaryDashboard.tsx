"use client";

import { TrendingDown, TrendingUp, Wallet, AlertTriangle, CheckCircle, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExpenseStore } from "@/store/expenseStore";
import { formatCurrency, formatMonth, monthOptions } from "@/lib/utils";

const MONTHS = monthOptions();

export function SummaryDashboard() {
  const {
    currency,
    incomeSources,
    activeView,
    selectedMonth,
    setSelectedMonth,
    totalIncome,
    totalExpenses,
    balance,
    personStats,
  } = useExpenseStore();
  const isHousehold = activeView === "household";

  const scopedSources = incomeSources.filter((s) => (s.scope ?? "household") === activeView);
  const income = totalIncome();
  const expenses = totalExpenses();
  const remaining = balance();
  const expenseRatio = income > 0 ? (expenses / income) * 100 : 0;
  const stats = personStats();

  const healthStatus = (() => {
    if (expenseRatio <= 50)
      return {
        label: "Excelente",
        color: "text-emerald-500",
        bg: "bg-emerald-50 dark:bg-emerald-950",
        icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
      };
    if (expenseRatio <= 75)
      return {
        label: "Moderado",
        color: "text-amber-500",
        bg: "bg-amber-50 dark:bg-amber-950",
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      };
    return {
      label: "Crítico",
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-950",
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
    };
  })();

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-foreground">Resumen Financiero</h2>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Global summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-500" />
              Ingreso Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(income, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">{scopedSources.length} fuente(s)</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Gasto del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(expenses, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatMonth(selectedMonth)} — {income > 0 ? `${expenseRatio.toFixed(1)}% del ingreso` : "sin ingresos"}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${remaining >= 0 ? "border-l-emerald-500" : "border-l-red-500"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Saldo Restante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${remaining >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {formatCurrency(remaining, currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {remaining >= 0 ? "Balance positivo" : "Balance negativo"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-person cards (only when 2+ people in household view) */}
      {isHousehold && scopedSources.length >= 2 && stats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Aporte por Persona — {formatMonth(selectedMonth)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {stats.map((stat) => {
              const isOverpaying = stat.difference > 0;
              const isEven = Math.abs(stat.difference) < 1;
              return (
                <Card
                  key={stat.id}
                  className="relative overflow-hidden"
                  style={{ borderTopColor: stat.color, borderTopWidth: "3px" }}
                >
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{stat.name}</span>
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                      >
                        {(stat.salaryRatio * 100).toFixed(0)}% sueldo
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sueldo</span>
                        <span className="font-medium">{formatCurrency(stat.salary, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Esperado pagar</span>
                        <span className="font-medium text-muted-foreground">
                          {formatCurrency(stat.expectedExpenses, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1.5">
                        <span className="text-muted-foreground font-medium">Pagará realmente</span>
                        <span className="font-bold" style={{ color: stat.color }}>
                          {formatCurrency(stat.actualExpenses, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Difference indicator */}
                    {!isEven && (
                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${
                          isOverpaying
                            ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                        }`}
                      >
                        <span>{isOverpaying ? "▲" : "▼"}</span>
                        <span>
                          {isOverpaying ? "Paga de más" : "Ahorra"}{" "}
                          {formatCurrency(Math.abs(stat.difference), currency)}
                        </span>
                      </div>
                    )}
                    {isEven && (
                      <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>Pago equitativo</span>
                      </div>
                    )}

                    {/* Salary progress bar */}
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(stat.salaryRatio * 100, 100)}%`,
                          backgroundColor: stat.color,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Health bar */}
      {income > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Salud Financiera</span>
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${healthStatus.bg}`}
              >
                {healthStatus.icon}
                <span className={healthStatus.color}>{healthStatus.label}</span>
              </div>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  expenseRatio <= 50
                    ? "bg-emerald-500"
                    : expenseRatio <= 75
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.min(expenseRatio, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span className="font-medium">{expenseRatio.toFixed(1)}% en gastos</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
