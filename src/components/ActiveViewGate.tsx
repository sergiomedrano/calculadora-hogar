"use client";

import { useExpenseStore } from "@/store/expenseStore";
import type { ViewScope } from "@/types";

export function ActiveViewGate({ view, children }: { view: ViewScope; children: React.ReactNode }) {
  const { activeView } = useExpenseStore();
  if (activeView !== view) return null;
  return <>{children}</>;
}
