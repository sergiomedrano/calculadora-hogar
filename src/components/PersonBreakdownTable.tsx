"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExpenseStore } from "@/store/expenseStore";
import { CATEGORIES, PERSON_COLORS } from "@/types";
import { formatCurrency, formatMonth, currentMonth } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function PersonBreakdownTable() {
  const { expenses, incomeSources, activeView, currency, selectedMonth } = useExpenseStore();

  // Scoped sources for this view
  const scopedSources = incomeSources.filter((s) => (s.scope ?? "household") === activeView);

  // Expenses visible in this month (scoped + month-aware)
  const monthExpenses = expenses.filter(
    (e) =>
      (e.scope ?? "household") === activeView &&
      (e.isRecurring || (e.month || currentMonth()) === selectedMonth)
  );

  if (monthExpenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            📋 Desglose por Persona — {formatMonth(selectedMonth)}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground text-sm">
          No hay gastos registrados para {formatMonth(selectedMonth)}.
        </CardContent>
      </Card>
    );
  }

  // Use month-specific income amounts for salary ratio
  const totalSalary = scopedSources.reduce((s, i) => {
    const monthlyAmt = i.monthlyAmounts?.[selectedMonth] ?? i.amount ?? 0;
    return s + monthlyAmt;
  }, 0);

  // Get the effective amount for an expense in the selected month
  function expenseAmount(expenseId: string): number {
    const e = monthExpenses.find((exp) => exp.id === expenseId);
    if (!e) return 0;
    const md = e.monthlyData?.[selectedMonth];
    if (md) return md.amount || 0;
    // Backward compat
    const leg = e as any;
    const isOrigin = e.month === selectedMonth;
    return leg.monthlyAmounts?.[selectedMonth] ??
      (isOrigin ? leg.amount ?? e.defaultAmount ?? 0 : e.defaultAmount ?? 0);
  }

  function getPersonShare(expenseId: string, personId: string): number {
    const expense = monthExpenses.find((e) => e.id === expenseId);
    if (!expense) return 0;
    const amount = expenseAmount(expenseId);
    if (expense.splitMode === "assigned") {
      return expense.assignedTo === personId ? amount : 0;
    }
    const person = scopedSources.find((p) => p.id === personId);
    if (!person) return 0;
    const personIncome = person.monthlyAmounts?.[selectedMonth] ?? person.amount ?? 0;
    const ratio = totalSalary > 0 ? personIncome / totalSalary : 1 / scopedSources.length;
    return amount * ratio;
  }

  const personTotals: Record<string, number> = {};
  for (const person of scopedSources) {
    personTotals[person.id] = monthExpenses.reduce(
      (sum, e) => sum + getPersonShare(e.id, person.id),
      0
    );
  }
  const grandTotal = monthExpenses.reduce((s, e) => s + expenseAmount(e.id), 0);

  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    items: monthExpenses.filter((e) => e.category === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          📋 Desglose por Persona — {formatMonth(selectedMonth)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-2.5 font-semibold text-foreground">Gasto</th>
              <th className="text-right px-4 py-2.5 font-semibold text-foreground">Total</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground text-xs">Modo</th>
              {scopedSources.map((person, idx) => (
                <th
                  key={person.id}
                  className="text-right px-4 py-2.5 font-semibold"
                  style={{ color: PERSON_COLORS[idx % PERSON_COLORS.length] }}
                >
                  {person.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byCategory.map(({ cat, items }) => (
              <>
                <tr key={`cat-${cat.key}`} className="bg-secondary/20">
                  <td colSpan={3 + scopedSources.length} className="px-4 py-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {cat.emoji} {cat.label}
                    </span>
                  </td>
                </tr>
                {items.map((expense, i) => {
                  const amount = expenseAmount(expense.id);
                  return (
                    <tr
                      key={expense.id}
                      className={cn(
                        "border-b border-border/40 hover:bg-secondary/10 transition-colors",
                        i === items.length - 1 && "border-b-2 border-border"
                      )}
                    >
                      <td className="px-4 py-2 text-foreground pl-8">
                        {expense.name}
                        {expense.isRecurring && <span className="ml-1 text-indigo-400 text-xs">🔁</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-foreground">
                        {formatCurrency(amount, currency)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {expense.splitMode === "assigned" ? "👤" : "⚖"}
                        </span>
                      </td>
                      {scopedSources.map((person, idx) => {
                        const share = getPersonShare(expense.id, person.id);
                        const pct = amount > 0 ? (share / amount) * 100 : 0;
                        const color = PERSON_COLORS[idx % PERSON_COLORS.length];
                        return (
                          <td key={person.id} className="px-4 py-2 text-right">
                            {share > 0 ? (
                              <span className="font-medium" style={{ color }}>
                                {formatCurrency(share, currency)}
                                <span className="text-xs text-muted-foreground ml-1">({pct.toFixed(0)}%)</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            ))}

            <tr className="bg-secondary/40 font-semibold border-t-2 border-border">
              <td className="px-4 py-3 text-foreground">TOTAL</td>
              <td className="px-4 py-3 text-right text-foreground">{formatCurrency(grandTotal, currency)}</td>
              <td />
              {scopedSources.map((person, idx) => {
                const color = PERSON_COLORS[idx % PERSON_COLORS.length];
                return (
                  <td key={person.id} className="px-4 py-3 text-right">
                    <span style={{ color }} className="font-bold">
                      {formatCurrency(personTotals[person.id] ?? 0, currency)}
                    </span>
                    <div className="text-xs text-muted-foreground font-normal">
                      {grandTotal > 0 ? `${(((personTotals[person.id] ?? 0) / grandTotal) * 100).toFixed(1)}%` : "—"}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
