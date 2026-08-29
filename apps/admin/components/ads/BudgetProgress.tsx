import React from "react";
import { formatCurrency, formatPercentage } from "@/lib/ads-utils";

interface BudgetProgressProps {
  spent: number;
  total: number;
}

export function BudgetProgress({ spent, total }: BudgetProgressProps) {
  const pctNumber = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const pctFormatted = formatPercentage(spent, total);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-xs text-zinc-300">
        <span className="font-medium text-white">{formatCurrency(spent)}</span>
        <span className="text-zinc-500">de {formatCurrency(total)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
          style={{ width: `${Math.max(pctNumber, spent > 0 ? 0.8 : 0)}%` }}
        />
      </div>
      <div className="text-right text-[10px] text-zinc-400">
        {pctFormatted} consumido
      </div>
    </div>
  );
}
