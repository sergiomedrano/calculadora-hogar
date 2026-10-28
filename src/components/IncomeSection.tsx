"use client";

import { Plus, Trash2 } from "lucide-react";
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
import { useExpenseStore } from "@/store/expenseStore";
import { formatCurrency, formatMonth } from "@/lib/utils";
import type { Currency } from "@/types";

const incomeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  amount: z.number().min(0, "El monto debe ser mayor o igual a 0"),
});

type IncomeFormValues = z.infer<typeof incomeSchema>;

export function IncomeSection() {
  const {
    incomeSources,
    currency,
    activeView,
    selectedMonth,
    setCurrency,
    addIncomeSource,
    updateIncomeSource,
    updateIncomeSourceAmount,
    removeIncomeSource,
  } = useExpenseStore();

  const scopedSources = incomeSources.filter((s) => (s.scope ?? "household") === activeView);
  const isPersonal = activeView === "personal";

  const { register, handleSubmit, reset, formState: { errors } } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { name: "", amount: 0 },
  });

  const onSubmit = (data: IncomeFormValues) => {
    addIncomeSource({ name: data.name, amount: data.amount });
    reset();
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            💰 {isPersonal ? "Mis Ingresos" : "Ingresos del Hogar"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Moneda:</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLP">CLP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Los valores son por mes — editando aquí afectas solo{" "}
          <span className="font-medium text-foreground">{formatMonth(selectedMonth)}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {scopedSources.map((source) => {
          // Show the month-specific amount if it exists, otherwise the base amount
          const monthlyValue = source.monthlyAmounts?.[selectedMonth];
          const displayAmount = monthlyValue ?? source.amount;
          const hasMonthOverride = monthlyValue !== undefined && monthlyValue !== source.amount;

          return (
            <div key={source.id} className="space-y-1">
              <div className="flex items-center gap-2 group">
                <Input
                  className="flex-1 text-sm"
                  value={source.name}
                  onChange={(e) => updateIncomeSource(source.id, { name: e.target.value })}
                  placeholder="Nombre (ej. Sueldo)"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    className="pl-7 w-40 text-sm"
                    type="number"
                    min={0}
                    value={displayAmount || ""}
                    onChange={(e) =>
                      updateIncomeSourceAmount(source.id, selectedMonth, parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => removeIncomeSource(source.id)}
                  disabled={scopedSources.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {/* Show base value hint when this month has an override */}
              {hasMonthOverride && (
                <div className="flex items-center gap-2 pl-0.5 text-xs text-muted-foreground">
                  <span className="text-amber-500">●</span>
                  <span>
                    Base habitual: {formatCurrency(source.amount, currency)}
                    <button
                      type="button"
                      className="ml-2 text-primary hover:underline"
                      onClick={() => updateIncomeSourceAmount(source.id, selectedMonth, source.amount)}
                    >
                      Restablecer
                    </button>
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
            {isPersonal ? "Agregar ingreso" : "Agregar fuente de ingreso"}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                className="text-sm"
                placeholder="Nombre (ej. Sueldo 2)"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                className="pl-7 w-full sm:w-40 text-sm"
                type="number"
                min={0}
                placeholder="0"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>
              )}
            </div>
            <Button type="submit" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </form>
        </div>

        <div className="flex justify-between items-center bg-secondary/50 rounded-lg p-3">
          <span className="text-sm font-semibold text-foreground">Total Ingresos</span>
          <span className="text-lg font-bold text-blue-500">
            {formatCurrency(
              scopedSources.reduce((s, i) => s + (i.monthlyAmounts?.[selectedMonth] ?? (i.amount || 0)), 0),
              currency
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
