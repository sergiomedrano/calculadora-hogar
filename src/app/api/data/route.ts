import { prisma } from "@/lib/prisma";
import type { BankAccount, Currency, ExpenseItem, IncomeSource } from "@/types";

interface AppData {
  currency: Currency;
  dailyBudget: number;
  incomeSources: IncomeSource[];
  expenses: ExpenseItem[];
  bankAccounts: BankAccount[];
}

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await prisma.appState.findUnique({ where: { id: 1 } });
  if (!row) {
    return Response.json(null);
  }
  const data: AppData = {
    currency: row.currency as Currency,
    dailyBudget: row.dailyBudget,
    incomeSources: row.incomeSources as unknown as IncomeSource[],
    expenses: row.expenses as unknown as ExpenseItem[],
    bankAccounts: row.bankAccounts as unknown as BankAccount[],
  };
  return Response.json(data);
}

export async function PUT(request: Request) {
  const body = (await request.json()) as AppData;
  const row = await prisma.appState.upsert({
    where: { id: 1 },
    update: {
      currency: body.currency,
      dailyBudget: body.dailyBudget,
      incomeSources: body.incomeSources as unknown as any,
      expenses: body.expenses as unknown as any,
      bankAccounts: body.bankAccounts as unknown as any,
    },
    create: {
      id: 1,
      currency: body.currency,
      dailyBudget: body.dailyBudget,
      incomeSources: body.incomeSources as unknown as any,
      expenses: body.expenses as unknown as any,
      bankAccounts: body.bankAccounts as unknown as any,
    },
  });
  return Response.json({ ok: true, updatedAt: row.updatedAt });
}
