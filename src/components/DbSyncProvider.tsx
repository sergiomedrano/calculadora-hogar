"use client";

import { useEffect, useRef } from "react";
import { useExpenseStore } from "@/store/expenseStore";

const DEBOUNCE_MS = 1_000;

export function DbSyncProvider({ children }: { children: React.ReactNode }) {
  const hasFetched = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch("/api/data")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          useExpenseStore.getState()._hydrate(data);
        }
        useExpenseStore.setState({ _hydrated: true });
      })
      .catch(() => {
        useExpenseStore.setState({ _hydrated: true });
      });
  }, []);

  useEffect(() => {
    const unsub = useExpenseStore.subscribe((state, prev) => {
      if (!state._hydrated) return;
      if (
        state.currency === prev.currency &&
        state.dailyBudget === prev.dailyBudget &&
        state.incomeSources === prev.incomeSources &&
        state.expenses === prev.expenses &&
        state.bankAccounts === prev.bankAccounts
      ) {
        return;
      }

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const { currency, dailyBudget, incomeSources, expenses, bankAccounts } =
          useExpenseStore.getState();
        fetch("/api/data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currency, dailyBudget, incomeSources, expenses, bankAccounts }),
        }).catch(() => {});
      }, DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return <>{children}</>;
}
