"use client";

import { Home, User } from "lucide-react";
import { useExpenseStore } from "@/store/expenseStore";
import { cn } from "@/lib/utils";

export function TabSwitcher() {
  const { activeView, setActiveView } = useExpenseStore();

  return (
    <div className="flex gap-1 bg-secondary/60 rounded-xl p-1 w-fit">
      <button
        type="button"
        onClick={() => setActiveView("household")}
        className={cn(
          "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
          activeView === "household"
            ? "bg-background shadow text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Home className="h-4 w-4" />
        Hogar
      </button>
      <button
        type="button"
        onClick={() => setActiveView("personal")}
        className={cn(
          "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
          activeView === "personal"
            ? "bg-background shadow text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <User className="h-4 w-4" />
        Personal
      </button>
    </div>
  );
}
