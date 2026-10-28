"use client";

import { Plus, Trash2, Landmark } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpenseStore } from "@/store/expenseStore";
import { formatCurrency } from "@/lib/utils";

const accountSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  balance: z.number().min(0, "El saldo debe ser ≥ 0"),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export function BankAccountsSection() {
  const { bankAccounts, currency, addBankAccount, updateBankAccount, removeBankAccount, totalBankBalance } =
    useExpenseStore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: "", balance: 0 },
  });

  const onSubmit = (data: AccountFormValues) => {
    addBankAccount({ name: data.name, balance: data.balance });
    reset();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Landmark className="h-5 w-5 text-teal-500" />
          Cuentas Disponibles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bankAccounts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Agrega tus cuentas para calcular el disponible del mes
          </p>
        )}

        {bankAccounts.map((account) => (
          <div key={account.id} className="flex items-center gap-2 group">
            <Input
              className="flex-1 text-sm h-9"
              value={account.name}
              onChange={(e) => updateBankAccount(account.id, { name: e.target.value })}
              placeholder="Nombre de cuenta"
            />
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                className="pl-6 w-36 text-sm h-9"
                type="number"
                min={0}
                value={account.balance || ""}
                onChange={(e) =>
                  updateBankAccount(account.id, { balance: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => removeBankAccount(account.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* Add account form */}
        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
            Agregar cuenta
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                className="text-sm h-9"
                placeholder="Ej: Cuenta Corriente BCI"
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name.message}</p>}
            </div>
            <div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  className="pl-6 w-full sm:w-36 text-sm h-9"
                  type="number"
                  min={0}
                  placeholder="0"
                  {...register("balance", { valueAsNumber: true })}
                />
              </div>
              {errors.balance && <p className="text-xs text-destructive mt-0.5">{errors.balance.message}</p>}
            </div>
            <Button type="submit" size="sm" className="h-9 gap-1.5">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </form>
        </div>

        {/* Total */}
        {bankAccounts.length > 0 && (
          <div className="flex justify-between items-center bg-teal-50 dark:bg-teal-950/40 rounded-lg p-3 border border-teal-200 dark:border-teal-900">
            <span className="text-sm font-semibold text-foreground">Total Disponible</span>
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
              {formatCurrency(totalBankBalance(), currency)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
