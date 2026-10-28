import { create } from "zustand";
import { currentMonth, parseLocalDate } from "@/lib/utils";
import type {
  BankAccount,
  Currency,
  DueAlert,
  ExpenseCategory,
  ExpenseItem,
  IncomeSource,
  MonthlyExpenseData,
  PersonStat,
  SplitMode,
  ViewScope,
} from "@/types";
import { PERSON_COLORS } from "@/types";

interface PersonExpenseBreakdown {
  total: number;
  byCategory: Partial<Record<ExpenseCategory, number>>;
}

interface AppData {
  currency: Currency;
  dailyBudget: number;
  incomeSources: IncomeSource[];
  expenses: ExpenseItem[];
  bankAccounts: BankAccount[];
}

interface ExpenseStore {
  currency: Currency;
  selectedMonth: string;
  activeView: ViewScope;
  incomeSources: IncomeSource[];
  expenses: ExpenseItem[];
  bankAccounts: BankAccount[];
  dailyBudget: number;
  _hydrated: boolean;
  _hydrate: (data: AppData) => void;

  setCurrency: (currency: Currency) => void;
  setSelectedMonth: (month: string) => void;
  setActiveView: (view: ViewScope) => void;
  setDailyBudget: (amount: number) => void;

  // Income
  addIncomeSource: (source: Omit<IncomeSource, "id" | "scope">) => void;
  updateIncomeSource: (id: string, updates: Partial<Omit<IncomeSource, "id">>) => void;
  updateIncomeSourceAmount: (id: string, month: string, amount: number) => void;
  removeIncomeSource: (id: string) => void;

  // Expenses
  /** Add a new expense. monthlyData must include the initial month's data. */
  addExpense: (expense: Omit<ExpenseItem, "id" | "scope">) => void;
  /** Update structural fields: name, category, splitMode, assignedTo, isRecurring, defaultAmount, currentInstallment, totalInstallments */
  updateExpense: (id: string, updates: Partial<Pick<ExpenseItem, "name" | "category" | "splitMode" | "assignedTo" | "isRecurring" | "defaultAmount" | "currentInstallment" | "totalInstallments">>) => void;
  /** Update per-month data for a specific month */
  updateExpenseMonthData: (id: string, month: string, data: Partial<MonthlyExpenseData>) => void;
  removeExpense: (id: string) => void;
  toggleExpensePaid: (id: string, month: string) => void;

  // Bank accounts
  addBankAccount: (account: Omit<BankAccount, "id" | "scope">) => void;
  updateBankAccount: (id: string, updates: Partial<Omit<BankAccount, "id">>) => void;
  removeBankAccount: (id: string) => void;

  // Computed
  totalIncome: (month?: string | null) => number;
  totalExpenses: (month?: string | null) => number;
  balance: (month?: string | null) => number;
  expensesByCategory: (month?: string | null) => Partial<Record<ExpenseCategory, number>>;
  expensesByPerson: (month?: string | null) => Record<string, PersonExpenseBreakdown>;
  personStats: (month?: string | null) => PersonStat[];
  monthlyTrend: (months?: number) => { month: string; label: string; byPerson: Record<string, number>; total: number }[];
  totalBankBalance: () => number;
  pendingExpensesTotal: (month?: string | null) => number;
  netAvailable: (month?: string | null) => number;
  daysRemainingInMonth: () => number;
  dailyAvailable: (month?: string | null) => number;
  projectedSavings: (month?: string | null) => number;
  upcomingDueItems: (days?: number) => DueAlert[];
}

let nextId = 1;
function generateId(): string {
  return `id_${Date.now()}_${nextId++}`;
}

function resolveMonth(month: string | null | undefined, selectedMonth: string): string | null {
  if (month === null) return null;
  return month ?? selectedMonth;
}

function scopeOf(item: { scope?: ViewScope }): ViewScope {
  return item.scope ?? "household";
}

function getIncomeAmount(source: IncomeSource, month: string): number {
  return source.monthlyAmounts?.[month] ?? source.amount ?? 0;
}

/**
 * Get per-month data for an expense.
 * Handles backward compatibility with old format (top-level amount/isPaid/notes/dueDate
 * and separate monthlyAmounts/monthlyPaid/monthlyDueDates arrays).
 *
 * For recurring expenses, the due-date DAY is inherited from the origin month so that
 * e.g. a bill due on the 15th always appears on the 15th of every month.
 */
export function getMonthData(expense: ExpenseItem, month: string): MonthlyExpenseData {
  // New format: data is in monthlyData — return as-is (explicit per-month override)
  if (expense.monthlyData?.[month]) return expense.monthlyData[month];

  // For recurring expenses, inherit the due-date day from the origin month.
  // Example: origin dueDate "2026-10-15" → November → "2026-11-15"
  let inheritedDueDate: string | null = null;
  if (expense.isRecurring && expense.monthlyData?.[expense.month]?.dueDate) {
    const originDueDate = expense.monthlyData[expense.month].dueDate as string;
    const dayStr = originDueDate.split("-")[2]; // e.g. "15"
    const [yr, mo] = month.split("-");
    // Clamp to last day of target month (handles months shorter than origin day, e.g. Feb)
    const lastDay = new Date(parseInt(yr), parseInt(mo), 0).getDate();
    const day = Math.min(parseInt(dayStr, 10), lastDay);
    inheritedDueDate = `${yr}-${mo}-${String(day).padStart(2, "0")}`;
  }

  // Backward compat: old format had top-level fields + separate override maps
  const e = expense as any;
  const isOrigin = (e.month ?? "") === month;

  const amount =
    e.monthlyAmounts?.[month] ??
    (isOrigin ? (e.amount ?? expense.defaultAmount ?? 0) : (expense.defaultAmount ?? 0));

  const isPaid =
    e.monthlyPaid?.[month] ??
    (isOrigin ? (e.isPaid ?? false) : false);

  const dueDate =
    inheritedDueDate ??
    e.monthlyDueDates?.[month] ??
    (isOrigin || expense.isRecurring ? (e.dueDate ?? null) : null);

  const notes = isOrigin ? (e.notes ?? undefined) : undefined;

  return { amount, isPaid, dueDate, notes };
}

/** An expense is visible in a given month if it's recurring OR the month matches its origin month */
export function isVisibleInMonth(expense: ExpenseItem, month: string): boolean {
  if (expense.isRecurring) {
    // Installment-based: visible from origin month through the last installment month
    if (expense.totalInstallments && expense.currentInstallment) {
      const remainingMonths = expense.totalInstallments - expense.currentInstallment;
      const [yr, mo] = expense.month.split("-").map(Number);
      const endDate = new Date(yr, mo - 1 + remainingMonths, 1);
      const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;
      return month >= expense.month && month <= endMonth;
    }
    // Pure recurring: always visible
    return true;
  }
  return (expense.month || currentMonth()) === month;
}

export const useExpenseStore = create<ExpenseStore>()(
    (set, get) => ({
      currency: "CLP",
      selectedMonth: currentMonth(),
      activeView: "household",
      incomeSources: [{ id: generateId(), name: "Persona 1", amount: 0, scope: "household" }],
      expenses: [],
      bankAccounts: [],
      dailyBudget: 0,
      _hydrated: false,
      _hydrate: (data: AppData) =>
        set({
          currency: data.currency,
          dailyBudget: data.dailyBudget,
          incomeSources: data.incomeSources,
          expenses: data.expenses,
          bankAccounts: data.bankAccounts,
        }),

      setCurrency: (currency) => set({ currency }),
      setSelectedMonth: (month) => set({ selectedMonth: month }),
      setActiveView: (view) => set({ activeView: view }),
      setDailyBudget: (amount) => set({ dailyBudget: amount }),

      // Income
      addIncomeSource: (source) =>
        set((state) => ({
          incomeSources: [...state.incomeSources, { ...source, id: generateId(), scope: state.activeView }],
        })),
      updateIncomeSource: (id, updates) =>
        set((state) => ({
          incomeSources: state.incomeSources.map((s) => s.id === id ? { ...s, ...updates } : s),
        })),
      updateIncomeSourceAmount: (id, month, amount) =>
        set((state) => ({
          incomeSources: state.incomeSources.map((s) =>
            s.id === id ? { ...s, monthlyAmounts: { ...s.monthlyAmounts, [month]: amount } } : s
          ),
        })),
      removeIncomeSource: (id) =>
        set((state) => ({
          incomeSources: state.incomeSources.filter((s) => s.id !== id),
          expenses: state.expenses.map((e) =>
            e.assignedTo === id ? { ...e, splitMode: "proportional" as SplitMode, assignedTo: null } : e
          ),
        })),

      // Expenses
      addExpense: (expense) =>
        set((state) => ({
          expenses: [...state.expenses, { ...expense, id: generateId(), scope: state.activeView }],
        })),
      updateExpense: (id, updates) =>
        set((state) => ({
          expenses: state.expenses.map((e) => e.id === id ? { ...e, ...updates } : e),
        })),
      updateExpenseMonthData: (id, month, data) =>
        set((state) => ({
          expenses: state.expenses.map((e) => {
            if (e.id !== id) return e;
            const existing = getMonthData(e, month);
            return {
              ...e,
              monthlyData: {
                ...e.monthlyData,
                [month]: { ...existing, ...data },
              },
            };
          }),
        })),
      removeExpense: (id) =>
        set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),
      toggleExpensePaid: (id, month) =>
        set((state) => ({
          expenses: state.expenses.map((e) => {
            if (e.id !== id) return e;
            const existing = getMonthData(e, month);
            return {
              ...e,
              monthlyData: {
                ...e.monthlyData,
                [month]: { ...existing, isPaid: !existing.isPaid },
              },
            };
          }),
        })),

      // Bank accounts
      addBankAccount: (account) =>
        set((state) => ({
          bankAccounts: [...state.bankAccounts, { ...account, id: generateId(), scope: state.activeView }],
        })),
      updateBankAccount: (id, updates) =>
        set((state) => ({
          bankAccounts: state.bankAccounts.map((a) => a.id === id ? { ...a, ...updates } : a),
        })),
      removeBankAccount: (id) =>
        set((state) => ({
          bankAccounts: state.bankAccounts.filter((a) => a.id !== id),
        })),

      // Computed: income
      totalIncome: (month) => {
        const { incomeSources, activeView, selectedMonth } = get();
        const m = month === null ? null : (month ?? selectedMonth);
        return incomeSources
          .filter((s) => scopeOf(s) === activeView)
          .reduce((sum, s) => sum + getIncomeAmount(s, m ?? selectedMonth), 0);
      },

      // Computed: expenses
      totalExpenses: (month) => {
        const { activeView, selectedMonth } = get();
        const m = resolveMonth(month, selectedMonth);
        const resolvedM = m ?? selectedMonth;
        return get().expenses
          .filter((e) => scopeOf(e) === activeView && (m ? isVisibleInMonth(e, resolvedM) : true))
          .reduce((sum, e) => sum + getMonthData(e, resolvedM).amount, 0);
      },

      balance: (month) => get().totalIncome(month) - get().totalExpenses(month),

      expensesByCategory: (month) => {
        const { activeView, selectedMonth } = get();
        const m = resolveMonth(month, selectedMonth);
        const resolvedM = m ?? selectedMonth;
        const filtered = get().expenses.filter(
          (e) => scopeOf(e) === activeView && (m ? isVisibleInMonth(e, resolvedM) : true)
        );
        const result: Partial<Record<ExpenseCategory, number>> = {};
        for (const e of filtered) {
          const amount = getMonthData(e, resolvedM).amount;
          result[e.category] = (result[e.category] || 0) + amount;
        }
        return result;
      },

      expensesByPerson: (month) => {
        const { expenses, incomeSources, activeView, selectedMonth } = get();
        const m = resolveMonth(month, selectedMonth);
        const resolvedM = m ?? selectedMonth;
        const scopedSources = incomeSources.filter((s) => scopeOf(s) === activeView);
        const filtered = expenses.filter(
          (e) => scopeOf(e) === activeView && (m ? isVisibleInMonth(e, resolvedM) : true)
        );
        const totalSalary = scopedSources.reduce((s, i) => s + getIncomeAmount(i, resolvedM), 0);
        const result: Record<string, PersonExpenseBreakdown> = {};
        for (const p of scopedSources) result[p.id] = { total: 0, byCategory: {} };
        for (const expense of filtered) {
          const amount = getMonthData(expense, resolvedM).amount;
          if (expense.splitMode === "assigned" && expense.assignedTo && result[expense.assignedTo]) {
            result[expense.assignedTo].total += amount;
            result[expense.assignedTo].byCategory[expense.category] =
              (result[expense.assignedTo].byCategory[expense.category] || 0) + amount;
          } else {
            for (const p of scopedSources) {
              const ratio = totalSalary > 0
                ? getIncomeAmount(p, resolvedM) / totalSalary
                : 1 / scopedSources.length;
              const share = amount * ratio;
              if (result[p.id]) {
                result[p.id].total += share;
                result[p.id].byCategory[expense.category] =
                  (result[p.id].byCategory[expense.category] || 0) + share;
              }
            }
          }
        }
        return result;
      },

      personStats: (month) => {
        const { incomeSources, activeView, selectedMonth } = get();
        const resolvedM = resolveMonth(month, selectedMonth) ?? selectedMonth;
        const scopedSources = incomeSources.filter((s) => scopeOf(s) === activeView);
        const totalSalary = scopedSources.reduce((s, i) => s + getIncomeAmount(i, resolvedM), 0);
        const totalExp = get().totalExpenses(month);
        const byPerson = get().expensesByPerson(month);
        return scopedSources.map((p, idx) => {
          const pSalary = getIncomeAmount(p, resolvedM);
          const salaryRatio = totalSalary > 0 ? pSalary / totalSalary : 1 / scopedSources.length;
          const expectedExpenses = totalExp * salaryRatio;
          const actualExpenses = byPerson[p.id]?.total ?? 0;
          return {
            id: p.id,
            name: p.name,
            salary: pSalary,
            salaryRatio,
            color: PERSON_COLORS[idx % PERSON_COLORS.length],
            expectedExpenses,
            actualExpenses,
            difference: actualExpenses - expectedExpenses,
          };
        });
      },

      monthlyTrend: (months = 6) => {
        const { expenses, incomeSources, activeView } = get();
        const scopedSources = incomeSources.filter((s) => scopeOf(s) === activeView);
        const now = new Date();
        return Array.from({ length: months }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
          const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const label = d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
          const monthExpenses = expenses.filter(
            (e) => scopeOf(e) === activeView && isVisibleInMonth(e, monthStr)
          );
          const totalSalary = scopedSources.reduce((s, i) => s + getIncomeAmount(i, monthStr), 0);
          const byPerson: Record<string, number> = {};
          for (const p of scopedSources) byPerson[p.id] = 0;
          let total = 0;
          for (const expense of monthExpenses) {
            const amount = getMonthData(expense, monthStr).amount;
            total += amount;
            if (expense.splitMode === "assigned" && expense.assignedTo && byPerson[expense.assignedTo] !== undefined) {
              byPerson[expense.assignedTo] += amount;
            } else {
              for (const p of scopedSources) {
                const ratio = totalSalary > 0
                  ? getIncomeAmount(p, monthStr) / totalSalary
                  : 1 / scopedSources.length;
                byPerson[p.id] = (byPerson[p.id] || 0) + amount * ratio;
              }
            }
          }
          return { month: monthStr, label, byPerson, total };
        });
      },

      totalBankBalance: () =>
        get().bankAccounts
          .filter((a) => scopeOf(a) === get().activeView)
          .reduce((sum, a) => sum + (a.balance || 0), 0),

      pendingExpensesTotal: (month) => {
        const { activeView, selectedMonth } = get();
        const m = resolveMonth(month, selectedMonth);
        const resolvedM = m ?? selectedMonth;
        return get().expenses
          .filter((e) => {
            if (scopeOf(e) !== activeView) return false;
            if (m && !isVisibleInMonth(e, resolvedM)) return false;
            return !getMonthData(e, resolvedM).isPaid;
          })
          .reduce((sum, e) => sum + getMonthData(e, resolvedM).amount, 0);
      },

      netAvailable: (month) =>
        get().totalBankBalance() - get().pendingExpensesTotal(month),

      daysRemainingInMonth: () => {
        const { selectedMonth } = get();
        const [year, month] = selectedMonth.split("-").map(Number);
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        // Use local midnight so getDate() is stable regardless of time-of-day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
        // Remaining = last day − today's date. E.g. Oct 31 − Oct 27 = 4 days left.
        if (isCurrentMonth) return lastDayOfMonth - today.getDate();
        const monthStart = new Date(year, month - 1, 1);
        if (monthStart > today) return lastDayOfMonth;
        return 0;
      },

      dailyAvailable: (month) => {
        const days = get().daysRemainingInMonth();
        if (days <= 0) return 0;
        return get().netAvailable(month) / days;
      },

      projectedSavings: (month) => {
        const days = get().daysRemainingInMonth();
        return get().netAvailable(month) - get().dailyBudget * days;
      },

      upcomingDueItems: (days = 7) => {
        const { expenses, activeView, selectedMonth } = get();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() + days);

        const results: DueAlert[] = [];
        for (const expense of expenses) {
          if (scopeOf(expense) !== activeView) continue;
          if (!isVisibleInMonth(expense, selectedMonth)) continue;
          const md = getMonthData(expense, selectedMonth);
          if (md.isPaid || !md.dueDate) continue;
          const dueDate = parseLocalDate(md.dueDate);
          if (dueDate > cutoff) continue;
          const diff = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          let urgency: DueAlert["urgency"];
          if (diff < 0) urgency = "overdue";
          else if (diff === 0) urgency = "today";
          else if (diff <= 3) urgency = "soon";
          else urgency = "upcoming";
          results.push({ expense, monthData: md, daysUntilDue: diff, urgency });
        }
        return results.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
      },
    }),
);
