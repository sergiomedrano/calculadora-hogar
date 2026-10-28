export type Currency = "CLP" | "USD";

export type SplitMode = "proportional" | "assigned";

export type ViewScope = "household" | "personal";

export type ExpenseCategory =
  | "housing"
  | "food"
  | "transport"
  | "utilities"
  | "health"
  | "education"
  | "entertainment"
  | "banking"
  | "others";

export interface CategoryInfo {
  key: ExpenseCategory;
  label: string;
  color: string;
  emoji: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { key: "housing",       label: "Vivienda",          color: "#6366f1", emoji: "🏠" },
  { key: "food",          label: "Alimentación",       color: "#f59e0b", emoji: "🛒" },
  { key: "transport",     label: "Transporte",         color: "#10b981", emoji: "🚗" },
  { key: "utilities",     label: "Servicios Básicos",  color: "#3b82f6", emoji: "💡" },
  { key: "health",        label: "Salud",              color: "#ef4444", emoji: "🏥" },
  { key: "education",     label: "Educación",          color: "#8b5cf6", emoji: "📚" },
  { key: "entertainment", label: "Entretenimiento",    color: "#ec4899", emoji: "🎮" },
  { key: "banking",       label: "Banco / Créditos",   color: "#0d9488", emoji: "🏦" },
  { key: "others",        label: "Otros",              color: "#6b7280", emoji: "📦" },
];

export const PERSON_COLORS = [
  "#0ea5e9",
  "#f97316",
  "#84cc16",
  "#a855f7",
  "#14b8a6",
  "#f43f5e",
];

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;                          // base/default amount
  monthlyAmounts?: Record<string, number>; // per-month overrides (YYYY-MM → amount)
  scope: ViewScope;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
  scope: ViewScope;
}

/** All mutable data for one expense in one specific month */
export interface MonthlyExpenseData {
  amount: number;
  isPaid: boolean;
  notes?: string;
  dueDate?: string | null;
}

export interface ExpenseItem {
  id: string;
  category: ExpenseCategory;
  name: string;
  /** Origin/creation month (YYYY-MM).
   *  Non-recurring: only appears in this month.
   *  Recurring: appears in all months; this is just the first month.
   *  Installment-based: the month where `currentInstallment` lives. */
  month: string;
  splitMode: SplitMode;
  assignedTo: string | null;
  scope: ViewScope;
  isRecurring: boolean;
  /** Fallback amount used for recurring months that have no monthlyData entry yet */
  defaultAmount: number;
  /** All per-month data: amount, paid, notes, dueDate — keyed by "YYYY-MM" */
  monthlyData: Record<string, MonthlyExpenseData>;
  /** For installment-based recurring: which installment number lives in `month` (1-based).
   *  E.g. 2 means `month` contains installment 2. */
  currentInstallment?: number;
  /** For installment-based recurring: total number of installments.
   *  The expense appears from `month` for (totalInstallments - currentInstallment + 1) months. */
  totalInstallments?: number;
}

export interface PersonStat {
  id: string;
  name: string;
  salary: number;
  salaryRatio: number;
  color: string;
  expectedExpenses: number;
  actualExpenses: number;
  difference: number;
}

export interface DueAlert {
  expense: ExpenseItem;
  monthData: MonthlyExpenseData;
  daysUntilDue: number;
  urgency: "overdue" | "today" | "soon" | "upcoming";
}
