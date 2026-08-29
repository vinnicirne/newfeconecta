import React from "react";
import { LucideIcon, HelpCircle } from "lucide-react";
import clsx from "clsx";

interface KpiCardProps {
  label: string;
  value: string | number;
  description?: string;
  tooltip?: string;
  icon?: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning";
  linkText?: string;
  onLinkClick?: () => void;
}

export function KpiCard({
  label,
  value,
  description,
  tooltip,
  icon: Icon,
  variant = "default",
  linkText,
  onLinkClick,
}: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 p-5 backdrop-blur-md transition-all hover:border-white/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <span>{label}</span>
          {tooltip && (
            <div className="group relative cursor-help">
              <HelpCircle className="h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300" />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-normal text-zinc-200 opacity-0 shadow-xl ring-1 ring-white/10 transition-opacity group-hover:opacity-100 w-48 text-center">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-xl",
              variant === "primary" && "bg-emerald-500/10 text-emerald-400",
              variant === "success" && "bg-teal-500/10 text-teal-400",
              variant === "warning" && "bg-amber-500/10 text-amber-400",
              variant === "default" && "bg-white/5 text-zinc-400"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div
          className={clsx(
            "text-2xl font-bold tracking-tight",
            variant === "primary" ? "text-emerald-400" : "text-white"
          )}
        >
          {value}
        </div>
        {description && (
          <p className="mt-1 text-xs text-zinc-400">{description}</p>
        )}
      </div>

      {linkText && onLinkClick && (
        <button
          onClick={onLinkClick}
          className="mt-3 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors inline-block"
        >
          {linkText} &rarr;
        </button>
      )}
    </div>
  );
}
