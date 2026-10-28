"use client";

import { useState } from "react";
import { AlertTriangle, Bell, X, CheckCircle2 } from "lucide-react";
import { useExpenseStore } from "@/store/expenseStore";
import { CATEGORIES } from "@/types";
import { formatCurrency, cn, parseLocalDate } from "@/lib/utils";

const URGENCY_CONFIG = {
  overdue: {
    label: "Vencido",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  today: {
    label: "Vence hoy",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  soon: {
    label: "Próximo",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    icon: <Bell className="h-3.5 w-3.5" />,
  },
  upcoming: {
    label: "En camino",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    icon: <Bell className="h-3.5 w-3.5" />,
  },
};

function daysLabel(diff: number): string {
  if (diff < 0) return `Venció hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? "s" : ""}`;
  if (diff === 0) return "Vence hoy";
  if (diff === 1) return "Vence mañana";
  return `Vence en ${diff} días`;
}

export function DueAlertsBar() {
  const { upcomingDueItems, toggleExpensePaid, selectedMonth, currency } = useExpenseStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const alerts = upcomingDueItems(7).filter((a) => !dismissed.has(a.expense.id));

  if (alerts.length === 0) return null;

  const urgentCount = alerts.filter((a) => a.urgency === "overdue" || a.urgency === "today").length;

  return (
    <div className={cn("rounded-xl border overflow-hidden", urgentCount > 0 ? "border-red-200 dark:border-red-800" : "border-amber-200 dark:border-amber-800")}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={cn("w-full flex items-center justify-between px-4 py-3", urgentCount > 0 ? "bg-red-50 dark:bg-red-950/50" : "bg-amber-50 dark:bg-amber-950/50")}
      >
        <div className="flex items-center gap-2">
          {urgentCount > 0
            ? <AlertTriangle className="h-4 w-4 text-red-500" />
            : <Bell className="h-4 w-4 text-amber-500" />}
          <span className={cn("font-semibold text-sm", urgentCount > 0 ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400")}>
            {urgentCount > 0 ? `${urgentCount} pago${urgentCount !== 1 ? "s" : ""} urgente${urgentCount !== 1 ? "s" : ""}` : "Próximos vencimientos"}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", urgentCount > 0 ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300")}>
            {alerts.length} item{alerts.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{collapsed ? "▼ Ver" : "▲ Ocultar"}</span>
      </button>

      {!collapsed && (
        <div className="divide-y divide-border">
          {alerts.map((alert) => {
            const cfg = URGENCY_CONFIG[alert.urgency];
            const cat = CATEGORIES.find((c) => c.key === alert.expense.category);
            const dueDate = alert.monthData.dueDate ? parseLocalDate(alert.monthData.dueDate) : null;
            return (
              <div key={alert.expense.id} className={cn("flex items-center gap-3 px-4 py-3", cfg.bg)}>
                <span className="text-lg shrink-0">{cat?.emoji ?? "📋"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">
                      {alert.expense.name || cat?.label}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1", cfg.badge)}>
                      {cfg.icon}{daysLabel(alert.daysUntilDue)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatCurrency(alert.monthData.amount, currency)}
                    {dueDate && (
                      <> · vence {dueDate.toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleExpensePaid(alert.expense.id, selectedMonth)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-800 font-medium transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Pagar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissed((prev) => new Set([...prev, alert.expense.id]))}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {collapsed && (
        <div className="px-4 py-2 flex items-center gap-2 flex-wrap">
          {alerts.map((alert) => {
            const cfg = URGENCY_CONFIG[alert.urgency];
            const cat = CATEGORIES.find((c) => c.key === alert.expense.category);
            return (
              <span key={alert.expense.id} className={cn("text-xs px-2.5 py-1 rounded-full font-medium", cfg.badge)}>
                {cat?.emoji} {alert.expense.name || cat?.label} · {daysLabel(alert.daysUntilDue)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
