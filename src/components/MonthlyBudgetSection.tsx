"use client";

import { TrendingUp, TrendingDown, Calendar, PiggyBank, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExpenseStore } from "@/store/expenseStore";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { cn } from "@/lib/utils";

function StatRow({
  label,
  value,
  currency,
  highlight,
  sign,
  sub,
}: {
  label: string;
  value: number;
  currency: "CLP" | "USD";
  highlight?: "green" | "red" | "blue" | "teal" | "orange";
  sign?: boolean;
  sub?: string;
}) {
  const colorMap = {
    green: "text-emerald-500",
    red: "text-red-500",
    blue: "text-blue-500",
    teal: "text-teal-500",
    orange: "text-orange-500",
  };
  const color = highlight ? colorMap[highlight] : "text-foreground";
  const prefix = sign ? (value >= 0 ? "+" : "") : "";

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={cn("font-semibold text-sm", color)}>
          {prefix}{formatCurrency(value, currency)}
        </span>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function MonthlyBudgetSection() {
  const {
    currency,
    selectedMonth,
    dailyBudget,
    setDailyBudget,
    totalBankBalance,
    pendingExpensesTotal,
    netAvailable,
    daysRemainingInMonth,
    dailyAvailable,
    projectedSavings,
    bankAccounts,
  } = useExpenseStore();

  const balance = totalBankBalance();
  const pending = pendingExpensesTotal();
  const net = netAvailable();
  const days = daysRemainingInMonth();
  const perDay = dailyAvailable();
  const savings = projectedSavings();
  const hasBankData = bankAccounts.length > 0;
  const hasDailyBudget = dailyBudget > 0;

  const savingsPositive = savings >= 0;
  const perDayVsBudget = dailyBudget > 0 ? perDay - dailyBudget : null;

  return (
    <Card className="border-2 border-dashed border-teal-200 dark:border-teal-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PiggyBank className="h-5 w-5 text-teal-500" />
          Presupuesto del Mes
          <span className="text-sm font-normal text-muted-foreground ml-1">
            — {formatMonth(selectedMonth)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {!hasBankData ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Agrega cuentas bancarias para activar los cálculos de presupuesto
          </p>
        ) : (
          <>
            {/* Balance breakdown */}
            <div className="divide-y divide-border rounded-lg bg-secondary/20 px-4">
              <StatRow
                label="Saldo total en cuentas"
                value={balance}
                currency={currency}
                highlight="teal"
              />
              <StatRow
                label="Gastos pendientes (por pagar)"
                value={-pending}
                currency={currency}
                highlight={pending > 0 ? "red" : undefined}
                sub={pending > 0 ? "Se descontarán del disponible" : undefined}
              />
              <div className="border-t-2 border-border mt-1 pt-1">
                <StatRow
                  label="Neto disponible"
                  value={net}
                  currency={currency}
                  highlight={net >= 0 ? "green" : "red"}
                />
              </div>
            </div>

            {/* Days & daily rate */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3 text-center">
                <Calendar className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-500">{days}</p>
                <p className="text-xs text-muted-foreground">días restantes</p>
              </div>
              <div className="rounded-lg bg-secondary/40 border border-border p-3 text-center">
                <Zap className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-500">
                  {days > 0 ? formatCurrency(Math.round(perDay), currency).replace(/\$/g, "").trim() : "—"}
                </p>
                <p className="text-xs text-muted-foreground">disponible/día</p>
              </div>
            </div>

            {/* Daily budget input */}
            <div className="pt-2 space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Meta de gasto diario
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    className="pl-6 text-sm h-9"
                    type="number"
                    min={0}
                    value={dailyBudget || ""}
                    onChange={(e) => setDailyBudget(parseFloat(e.target.value) || 0)}
                    placeholder="Ej: 27500"
                  />
                </div>
                <span className="text-sm text-muted-foreground shrink-0">CLP / día</span>
              </div>

              {hasDailyBudget && perDayVsBudget !== null && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-md",
                    perDayVsBudget >= 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                  )}
                >
                  {perDayVsBudget >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    Disponible diario {perDayVsBudget >= 0 ? "supera" : "está por debajo de"} tu meta
                    en {formatCurrency(Math.abs(Math.round(perDayVsBudget)), currency)}/día
                  </span>
                </div>
              )}
            </div>

            {/* Projected savings */}
            {hasDailyBudget && days > 0 && (
              <div
                className={cn(
                  "rounded-lg p-4 border mt-2",
                  savingsPositive
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900"
                    : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {savingsPositive ? "🎯 Ahorro proyectado" : "⚠️ Déficit proyectado"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {savingsPositive
                        ? `Si gastas ${formatCurrency(dailyBudget, currency)}/día los próximos ${days} días`
                        : `Con ${formatCurrency(dailyBudget, currency)}/día no alcanza para cubrir los ${days} días restantes`}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-xl font-bold shrink-0",
                      savingsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {savingsPositive ? "+" : ""}{formatCurrency(Math.round(savings), currency)}
                  </p>
                </div>

                {/* Savings breakdown */}
                <div className="mt-3 space-y-1 text-xs text-muted-foreground border-t border-current/10 pt-2">
                  <div className="flex justify-between">
                    <span>Neto disponible</span>
                    <span>{formatCurrency(Math.round(net), currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gasto proyectado ({days}d × {formatCurrency(dailyBudget, currency)})</span>
                    <span>− {formatCurrency(dailyBudget * days, currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground border-t border-current/10 pt-1">
                    <span>Resultado</span>
                    <span className={savingsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                      {formatCurrency(Math.round(savings), currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {days === 0 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                El mes seleccionado ya finalizó — cambia al mes actual para ver el presupuesto diario
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
