"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  color: string;
}

export function StatsCard({ title, value, change, trend, icon: Icon, color }: StatsCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow transition-all hover:scale-[1.02]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-xl bg-opacity-10", color.replace('bg-', 'bg-opacity-10 text-'))}>
          <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trend === "up" ? "bg-whatsapp-green/10 text-whatsapp-green" : "bg-red-100 text-red-600"
          )}>
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold dark:text-white mt-1">{value}</h3>
      </div>
    </motion.div>
  );
}
