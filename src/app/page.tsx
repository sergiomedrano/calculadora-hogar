import { IncomeSection } from "@/components/IncomeSection";
import { ExpenseSection } from "@/components/ExpenseSection";
import { SummaryDashboard } from "@/components/SummaryDashboard";
import { ExpenseChart } from "@/components/ExpenseChart";
import { PersonBreakdownTable } from "@/components/PersonBreakdownTable";
import { BankAccountsSection } from "@/components/BankAccountsSection";
import { MonthlyBudgetSection } from "@/components/MonthlyBudgetSection";
import { TabSwitcher } from "@/components/TabSwitcher";
import { DueAlertsBar } from "@/components/DueAlertsBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ActiveViewGate } from "@/components/ActiveViewGate";
import { Home } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary rounded-lg p-1.5">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                Calculadora del Hogar
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Control de finanzas familiares
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TabSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Due date alerts — only shows when there are upcoming items */}
        <DueAlertsBar />

        <SummaryDashboard />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <BankAccountsSection />
          <MonthlyBudgetSection />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <IncomeSection />
          <ExpenseSection />
        </div>

        {/* Person breakdown and stacked charts only make sense with multiple people (household view) */}
        <ActiveViewGate view="household">
          <PersonBreakdownTable />
        </ActiveViewGate>

        <ExpenseChart />
      </main>

      <footer className="border-t border-border mt-12 py-6 text-center text-xs text-muted-foreground">
        Calculadora del Hogar — Los datos se guardan automáticamente en tu navegador
      </footer>
    </div>
  );
}
