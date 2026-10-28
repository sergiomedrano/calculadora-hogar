"use client";

import { useState } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, Circle, CalendarClock, RefreshCw, StickyNote, Infinity,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useExpenseStore, isVisibleInMonth, getMonthData } from "@/store/expenseStore";
import { CATEGORIES, PERSON_COLORS } from "@/types";
import type { ExpenseCategory, SplitMode } from "@/types";
import { formatCurrency, cn, parseLocalDate } from "@/lib/utils";

// ─── Schema ──────────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  category: z.string().min(1, "Selecciona una categoría"),
  name: z.string().min(1, "El nombre es requerido"),
  amount: z.number().min(0, "El monto debe ser ≥ 0"),
  splitMode: z.enum(["proportional", "assigned"]),
  assignedTo: z.string().nullable(),
  dueDate: z.string().nullable(),
  isRecurring: z.boolean(),
  /** null = sin cuotas (infinito); número = cuota actual */
  currentInstallment: z.number().min(1).nullable().optional(),
  /** null = sin cuotas (infinito); número = total de cuotas */
  totalInstallments: z.number().min(1).nullable().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calcula el número de cuota que corresponde a `displayMonth` para un gasto
 * con cuotas. Devuelve null si no aplica o está fuera de rango.
 */
function getInstallmentForMonth(
  expense: { month: string; currentInstallment?: number; totalInstallments?: number },
  displayMonth: string
): number | null {
  if (!expense.totalInstallments || !expense.currentInstallment || !expense.month) return null;
  const [oy, om] = expense.month.split("-").map(Number);
  const [dy, dm] = displayMonth.split("-").map(Number);
  const diff = (dy - oy) * 12 + (dm - om);
  const installment = expense.currentInstallment + diff;
  if (installment < 1 || installment > expense.totalInstallments) return null;
  return installment;
}

function dueDateBadge(dueDate: string | null | undefined, isPaid: boolean) {
  if (!dueDate || isPaid) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(dueDate);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dateStr = due.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  if (diff < 0)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 font-medium">⚠ Vencido · {dateStr}</span>;
  if (diff === 0)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 font-medium">🔔 Hoy · {dateStr}</span>;
  if (diff <= 3)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 font-medium">⏰ {diff}d · {dateStr}</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium">📅 {dateStr}</span>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SplitSelect({
  value, assignedTo, onChange, activeView,
}: {
  value: SplitMode; assignedTo: string | null;
  onChange: (m: SplitMode, a: string | null) => void; activeView: string;
}) {
  const { incomeSources } = useExpenseStore();
  const scopedSources = incomeSources.filter((s) => (s.scope ?? "household") === activeView);
  if (activeView === "personal" || scopedSources.length <= 1) return null;
  const selectVal = value === "proportional" ? "proportional" : (assignedTo ?? "proportional");
  return (
    <Select
      value={selectVal}
      onValueChange={(v) =>
        v === "proportional" ? onChange("proportional", null) : onChange("assigned", v)
      }
    >
      <SelectTrigger className="h-7 text-xs w-36 px-2"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="proportional">⚖ Proporcional</SelectItem>
        {scopedSources.map((p, idx) => (
          <SelectItem key={p.id} value={p.id}>
            <span style={{ color: PERSON_COLORS[idx % PERSON_COLORS.length] }}>●</span> {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Toggle "Sin cuotas ♾ / Con cuotas 🔢" para usar en los formularios.
 * "Sin cuotas" limpia los campos; "Con cuotas" los inicializa si están vacíos.
 */
function RecurringModeToggle({
  hasInstallments,
  onSelectInfinite,
  onSelectInstallments,
}: {
  hasInstallments: boolean;
  onSelectInfinite: () => void;
  onSelectInstallments: () => void;
}) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden text-xs">
      <button
        type="button"
        onClick={onSelectInfinite}
        className={cn(
          "flex items-center gap-1 px-2 py-1 transition-colors",
          !hasInstallments
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="El gasto se repite indefinidamente cada mes"
      >
        <Infinity className="h-3 w-3" /> Sin cuotas
      </button>
      <button
        type="button"
        onClick={onSelectInstallments}
        className={cn(
          "flex items-center gap-1 px-2 py-1 border-l border-border transition-colors",
          hasInstallments
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="El gasto tiene un número fijo de cuotas"
      >
        🔢 Con cuotas
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExpenseSection() {
  const {
    expenses, currency, selectedMonth, activeView, incomeSources,
    addExpense, updateExpense, updateExpenseMonthData, removeExpense, toggleExpensePaid,
    expensesByCategory,
  } = useExpenseStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<ExpenseCategory>>(
    new Set(CATEGORIES.map((c) => c.key))
  );
  const [addingTo, setAddingTo] = useState<ExpenseCategory | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const byCategory = expensesByCategory();
  const isHousehold = activeView === "household";
  const scopedSources = incomeSources.filter((s) => (s.scope ?? "household") === activeView);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<ExpenseFormValues>({
      resolver: zodResolver(expenseSchema),
      defaultValues: {
        category: "", name: "", amount: 0,
        splitMode: "proportional", assignedTo: null, dueDate: null,
        isRecurring: false, currentInstallment: null, totalInstallments: null,
      },
    });

  const selectedCategory = watch("category");
  const formSplitMode = watch("splitMode");
  const formIsRecurring = watch("isRecurring");
  const formCurrentInstallment = watch("currentInstallment");
  const formTotalInstallments = watch("totalInstallments");
  const formHasInstallments = !!(formCurrentInstallment || formTotalInstallments);

  const startAdding = (cat: ExpenseCategory) => {
    setAddingTo(cat);
    setValue("category", cat);
  };

  const onSubmit = (data: ExpenseFormValues) => {
    const hasInstallments = data.isRecurring && data.currentInstallment && data.totalInstallments;
    addExpense({
      category: data.category as ExpenseCategory,
      name: data.name,
      month: selectedMonth,
      splitMode: data.splitMode,
      assignedTo: data.assignedTo,
      isRecurring: data.isRecurring,
      defaultAmount: data.amount,
      currentInstallment: hasInstallments ? data.currentInstallment! : undefined,
      totalInstallments: hasInstallments ? data.totalInstallments! : undefined,
      monthlyData: {
        [selectedMonth]: {
          amount: data.amount,
          isPaid: false,
          dueDate: data.dueDate || null,
          notes: undefined,
        },
      },
    });
    reset({
      category: data.category,
      name: "", amount: 0,
      splitMode: data.splitMode, assignedTo: data.assignedTo,
      dueDate: null, isRecurring: data.isRecurring,
      currentInstallment: null, totalInstallments: null,
    });
    setAddingTo(null);
  };

  // ── Filtro correcto: usa isVisibleInMonth del store (respeta cuotas) ────────
  const visibleExpenses = expenses.filter(
    (e) =>
      (e.scope ?? "household") === activeView &&
      isVisibleInMonth(e, selectedMonth)
  );

  // Resumen pagado/pendiente — usa getMonthData del store para herencia correcta
  let paidCount = 0, pendingCount = 0, pendingTotal = 0;
  for (const e of visibleExpenses) {
    const md = getMonthData(e, selectedMonth);
    if (md.isPaid) paidCount++;
    else { pendingCount++; pendingTotal += md.amount || 0; }
  }

  const toggleCategory = (cat: ExpenseCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // ── Controles de cuota reutilizables para el formulario ───────────────────
  const installmentControls = (
    <>
      <RecurringModeToggle
        hasInstallments={formHasInstallments}
        onSelectInfinite={() => {
          setValue("currentInstallment", null);
          setValue("totalInstallments", null);
        }}
        onSelectInstallments={() => {
          if (!formCurrentInstallment) setValue("currentInstallment", 1);
          if (!formTotalInstallments) setValue("totalInstallments", 2);
        }}
      />
      {formHasInstallments && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Cuota</span>
          <Input
            type="number" min={1}
            className="w-14 h-7 text-xs px-2"
            placeholder="1"
            {...register("currentInstallment", { valueAsNumber: true })}
          />
          <span>de</span>
          <Input
            type="number" min={1}
            className="w-14 h-7 text-xs px-2"
            placeholder="3"
            {...register("totalInstallments", { valueAsNumber: true })}
          />
        </div>
      )}
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">🧾 Gastos</CardTitle>
          {visibleExpenses.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              {pendingCount > 0 && (
                <span className="text-orange-500 font-medium">
                  ⏳ {pendingCount} por pagar · {formatCurrency(pendingTotal, currency)}
                </span>
              )}
              {paidCount > 0 && (
                <span className="text-emerald-500 font-medium">
                  ✅ {paidCount} pagado{paidCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {CATEGORIES.map((cat) => {
          const catExpenses = visibleExpenses.filter((e) => e.category === cat.key);
          const catTotal = byCategory[cat.key] || 0;
          const isExpanded = expandedCategories.has(cat.key);

          const catPending = catExpenses.filter(
            (e) => !getMonthData(e, selectedMonth).isPaid
          ).length;

          return (
            <div key={cat.key} className="border border-border rounded-lg overflow-hidden">
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{cat.emoji}</span>
                  <span className="font-medium text-sm text-foreground">{cat.label}</span>
                  {catExpenses.length > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">{catExpenses.length}</Badge>
                  )}
                  {catPending > 0 && (
                    <Badge className="text-xs px-1.5 py-0 bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 border-0">
                      {catPending} pendiente{catPending !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {catTotal > 0 && (
                    <span className="text-sm font-semibold text-red-500">{formatCurrency(catTotal, currency)}</span>
                  )}
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 pt-2 space-y-2">
                  {catExpenses.map((expense) => {
                    // Lee datos del mes actual (con herencia de dueDate para recurrentes)
                    const md = getMonthData(expense, selectedMonth);

                    // El monto de este mes difiere del valor base del gasto
                    const hasMonthOverride = expense.isRecurring &&
                      expense.monthlyData?.[selectedMonth] !== undefined &&
                      md.amount !== expense.defaultAmount;

                    const notesOpen = expandedNotes.has(expense.id);
                    const hasInstallments = !!(expense.currentInstallment && expense.totalInstallments);
                    const installmentLabel = hasInstallments
                      ? getInstallmentForMonth(expense, selectedMonth)
                      : null;

                    return (
                      <div
                        key={expense.id}
                        className={cn(
                          "rounded-md border p-2 space-y-2 group transition-colors",
                          md.isPaid
                            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                            : expense.isRecurring
                            ? "border-indigo-200/60 bg-indigo-50/30 dark:border-indigo-900/60 dark:bg-indigo-950/20"
                            : "border-border/60 bg-secondary/10"
                        )}
                      >
                        {/* ── Fila 1: paid toggle · nombre · monto · botones ── */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExpensePaid(expense.id, selectedMonth)}
                            className="shrink-0 transition-colors"
                            title={md.isPaid ? "Marcar como pendiente" : "Marcar como pagado"}
                          >
                            {md.isPaid
                              ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              : <Circle className="h-5 w-5 text-muted-foreground hover:text-orange-400" />}
                          </button>

                          <Input
                            className={cn("flex-1 text-sm h-8", md.isPaid && "line-through text-muted-foreground")}
                            value={expense.name}
                            onChange={(e) => updateExpense(expense.id, { name: e.target.value })}
                            placeholder="Nombre"
                          />

                          {/* Monto — independiente por mes */}
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <Input
                              className={cn("pl-5 w-28 text-sm h-8", md.isPaid && "text-muted-foreground")}
                              type="number"
                              min={0}
                              value={md.amount || ""}
                              onChange={(e) =>
                                updateExpenseMonthData(expense.id, selectedMonth, {
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                              title="Monto de este mes (independiente)"
                            />
                          </div>

                          {/* Recurring toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              const next = !expense.isRecurring;
                              updateExpense(expense.id, {
                                isRecurring: next,
                                // Al quitar recurrencia, limpia cuotas también
                                ...(next ? {} : { currentInstallment: undefined, totalInstallments: undefined }),
                              });
                            }}
                            className={cn(
                              "shrink-0 p-1 rounded transition-colors",
                              expense.isRecurring
                                ? "text-indigo-500 bg-indigo-100 dark:bg-indigo-900"
                                : "text-muted-foreground hover:text-indigo-400"
                            )}
                            title={expense.isRecurring ? "Quitar recurrencia" : "Marcar como recurrente"}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>

                          {/* Notes toggle */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedNotes((prev) => {
                                const next = new Set(prev);
                                if (next.has(expense.id)) next.delete(expense.id);
                                else next.add(expense.id);
                                return next;
                              })
                            }
                            className={cn(
                              "shrink-0 p-1 rounded transition-colors",
                              md.notes
                                ? "text-amber-500 bg-amber-100 dark:bg-amber-900"
                                : "text-muted-foreground hover:text-amber-400",
                              notesOpen && "text-amber-500"
                            )}
                            title="Notas del mes"
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                          </button>

                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeExpense(expense.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* ── Fila 2: recurrencia · split · fecha · badges ── */}
                        <div className="flex items-center gap-2 flex-wrap pl-7">
                          {expense.isRecurring && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Badge: Recurrente o Cuota X/Y */}
                              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-medium flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                {hasInstallments && installmentLabel != null
                                  ? `Cuota ${installmentLabel}/${expense.totalInstallments}`
                                  : "Recurrente"}
                              </span>

                              {/* Toggle Sin cuotas / Con cuotas */}
                              <div className="flex rounded-md border border-border/60 overflow-hidden text-xs">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateExpense(expense.id, {
                                      currentInstallment: undefined,
                                      totalInstallments: undefined,
                                    })
                                  }
                                  className={cn(
                                    "flex items-center gap-0.5 px-1.5 py-0.5 transition-colors",
                                    !hasInstallments
                                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                  title="Sin límite de cuotas"
                                >
                                  <Infinity className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!hasInstallments) {
                                      updateExpense(expense.id, {
                                        currentInstallment: 1,
                                        totalInstallments: 2,
                                      });
                                    }
                                  }}
                                  className={cn(
                                    "px-1.5 py-0.5 border-l border-border/60 transition-colors",
                                    hasInstallments
                                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                  title="Con cuotas"
                                >
                                  🔢
                                </button>
                              </div>

                              {/* Inputs de cuotas (solo cuando tiene cuotas) */}
                              {hasInstallments && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span>Cuota</span>
                                  <input
                                    type="number" min={1}
                                    className="w-12 h-6 text-xs px-1.5 rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    value={expense.currentInstallment ?? ""}
                                    placeholder="1"
                                    onChange={(ev) => {
                                      const v = parseInt(ev.target.value);
                                      updateExpense(expense.id, { currentInstallment: isNaN(v) ? undefined : v });
                                    }}
                                  />
                                  <span>de</span>
                                  <input
                                    type="number" min={1}
                                    className="w-12 h-6 text-xs px-1.5 rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    value={expense.totalInstallments ?? ""}
                                    placeholder="3"
                                    onChange={(ev) => {
                                      const v = parseInt(ev.target.value);
                                      updateExpense(expense.id, { totalInstallments: isNaN(v) ? undefined : v });
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {isHousehold && (
                            <SplitSelect
                              value={expense.splitMode || "proportional"}
                              assignedTo={expense.assignedTo}
                              activeView={activeView}
                              onChange={(splitMode, assignedTo) =>
                                updateExpense(expense.id, { splitMode, assignedTo })
                              }
                            />
                          )}

                          {/* Fecha de vencimiento — independiente por mes */}
                          <div className="flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <input
                              type="date"
                              className="h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              value={md.dueDate || ""}
                              onChange={(e) =>
                                updateExpenseMonthData(expense.id, selectedMonth, {
                                  dueDate: e.target.value || null,
                                })
                              }
                            />
                            {md.dueDate && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateExpenseMonthData(expense.id, selectedMonth, { dueDate: null })
                                }
                                className="text-muted-foreground hover:text-foreground text-xs"
                              >✕</button>
                            )}
                          </div>
                          {dueDateBadge(md.dueDate, md.isPaid)}
                          {md.isPaid && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 font-medium">
                              ✅ Pagado
                            </span>
                          )}
                          {/* Monto diferente al base de este gasto recurrente */}
                          {hasMonthOverride && (
                            <span className="text-xs text-amber-500" title="Este mes tiene un monto distinto al habitual">
                              ≠ base ({formatCurrency(expense.defaultAmount, currency)})
                            </span>
                          )}
                        </div>

                        {/* ── Notas — por mes ── */}
                        {notesOpen && (
                          <div className="pl-7">
                            <textarea
                              className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                              rows={2}
                              placeholder="Nota para este mes (cuota, referencia, etc.)"
                              value={md.notes ?? ""}
                              onChange={(e) =>
                                updateExpenseMonthData(expense.id, selectedMonth, { notes: e.target.value })
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* ── Formulario inline por categoría ── */}
                  {addingTo === cat.key ? (
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2"
                    >
                      <input type="hidden" {...register("category")} />
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <Input
                            className="text-sm h-8"
                            placeholder="Nombre del gasto"
                            autoFocus
                            {...register("name")}
                          />
                          {errors.name && (
                            <p className="text-xs text-destructive mt-0.5">{errors.name.message}</p>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                          <Input
                            className="pl-5 w-28 text-sm h-8" type="number" min={0} placeholder="0"
                            {...register("amount", { valueAsNumber: true })}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button type="submit" size="sm" className="h-8 px-3">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button" variant="ghost" size="sm" className="h-8"
                            onClick={() => { setAddingTo(null); reset(); }}
                          >✕</Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isHousehold && scopedSources.length > 1 && (
                          <Select
                            value={formSplitMode === "proportional"
                              ? "proportional"
                              : (watch("assignedTo") ?? "proportional")}
                            onValueChange={(v) => {
                              if (v === "proportional") {
                                setValue("splitMode", "proportional");
                                setValue("assignedTo", null);
                              } else {
                                setValue("splitMode", "assigned");
                                setValue("assignedTo", v);
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs w-36 px-2">
                              <SelectValue placeholder="Responsable" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="proportional">⚖ Proporcional</SelectItem>
                              {scopedSources.map((p, idx) => (
                                <SelectItem key={p.id} value={p.id}>
                                  <span style={{ color: PERSON_COLORS[idx % PERSON_COLORS.length] }}>●</span> {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <div className="flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="date"
                            className="h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            {...register("dueDate")}
                          />
                        </div>
                        {/* Botón recurrente */}
                        <button
                          type="button"
                          onClick={() => {
                            const next = !formIsRecurring;
                            setValue("isRecurring", next);
                            if (!next) {
                              setValue("currentInstallment", null);
                              setValue("totalInstallments", null);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors",
                            formIsRecurring
                              ? "border-indigo-300 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-700"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <RefreshCw className="h-3 w-3" />
                          {formIsRecurring ? "Recurrente ✓" : "¿Recurrente?"}
                        </button>
                        {/* Modo cuotas (solo cuando es recurrente) */}
                        {formIsRecurring && installmentControls}
                      </div>
                    </form>
                  ) : (
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="w-full h-8 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 mt-1"
                      onClick={() => startAdding(cat.key)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Agregar en {cat.label}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Formulario rápido ── */}
        <div className="pt-2 border-t border-border">
          <Label className="text-xs text-muted-foreground mb-2 block">Agregar gasto rápido</Label>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedCategory} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger className="flex-1 text-sm h-9"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>{cat.emoji} {cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register("category")} />
              <Input
                className="flex-1 text-sm h-9" placeholder="Nombre"
                {...register("name")}
              />
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  className="pl-5 w-full sm:w-28 text-sm h-9" type="number" min={0} placeholder="0"
                  {...register("amount", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isHousehold && scopedSources.length > 1 && (
                <Select
                  value={formSplitMode === "proportional"
                    ? "proportional"
                    : (watch("assignedTo") ?? "proportional")}
                  onValueChange={(v) => {
                    if (v === "proportional") {
                      setValue("splitMode", "proportional");
                      setValue("assignedTo", null);
                    } else {
                      setValue("splitMode", "assigned");
                      setValue("assignedTo", v);
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs w-36 px-2">
                    <SelectValue placeholder="Responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proportional">⚖ Proporcional</SelectItem>
                    {scopedSources.map((p, idx) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span style={{ color: PERSON_COLORS[idx % PERSON_COLORS.length] }}>●</span> {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="date"
                  className="h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  {...register("dueDate")}
                />
              </div>
              {/* Botón recurrente */}
              <button
                type="button"
                onClick={() => {
                  const next = !formIsRecurring;
                  setValue("isRecurring", next);
                  if (!next) {
                    setValue("currentInstallment", null);
                    setValue("totalInstallments", null);
                  }
                }}
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors",
                  formIsRecurring
                    ? "border-indigo-300 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-700"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <RefreshCw className="h-3 w-3" />
                {formIsRecurring ? "Recurrente ✓" : "¿Recurrente?"}
              </button>
              {/* Modo cuotas (solo cuando es recurrente) */}
              {formIsRecurring && installmentControls}
              <Button type="submit" size="sm" className="h-7 ml-auto gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Agregar
              </Button>
            </div>
            {(errors.category || errors.name) && (
              <p className="text-xs text-destructive mt-1">
                {errors.category?.message || errors.name?.message}
              </p>
            )}
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
