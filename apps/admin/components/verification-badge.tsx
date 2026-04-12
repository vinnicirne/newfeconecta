"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface VerificationBadgeProps {
  role?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function VerificationBadge({ role, className, size = "md", showLabel = false }: VerificationBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const label = role || "Verificado";
  const displayLabel = showLabel || isHovered;

  const getStyle = (l: string) => {
    const low = l.toLowerCase();
    
    // HIERARQUIA DOURADA (OURO)
    if (low.includes("pastor") || low.includes("bispo") || low.includes("apóstolo") || low.includes("missionário")) {
      return {
        bg: "linear-gradient(135deg, #FFD700 0%, #FDB931 50%, #B8860B 100%)",
        glow: "0 0 15px rgba(212,175,55,0.6)",
        icon: "text-white"
      };
    }

    // IGREJA (VERMELHO)
    if (low.includes("igreja")) {
      return {
        bg: "linear-gradient(135deg, #E31C25 0%, #8B0000 100%)",
        glow: "0 0 15px rgba(227,28,37,0.4)",
        icon: "text-white"
      };
    }

    // LEVITA (ROXO)
    if (low.includes("levita")) {
      return {
        bg: "linear-gradient(135deg, #8A2BE2 0%, #4B0082 100%)",
        glow: "0 0 15px rgba(138,43,226,0.4)",
        icon: "text-white"
      };
    }

    // LIDERANÇA APOIO (AZUL)
    if (low.includes("evangelista") || low.includes("diácono") || low.includes("presbítero") || low.includes("líder")) {
      return {
        bg: "linear-gradient(135deg, #0070f3 0%, #004a99 100%)",
        glow: "0 0 15px rgba(0,112,243,0.4)",
        icon: "text-white"
      };
    }

    // PADRÃO (VERDE PREMIUM)
    return {
      bg: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
      glow: "0 0 15px rgba(37,211,102,0.4)",
      icon: "text-white"
    };
  };

  const style = getStyle(label);

  const containerSizes = {
    xs: "h-3.5 px-0.5",
    sm: "h-4.5 px-1",
    md: "h-5.5 px-1.5",
    lg: "h-7 px-2"
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all duration-500 border border-white/30",
        containerSizes[size],
        className
      )}
      style={{ 
        background: style.bg,
        boxShadow: style.glow
      }}
      initial={false}
      animate={{ width: displayLabel ? "auto" : "fit-content" }}
    >
      <div className="flex items-center gap-1.5 px-0.5">
        <div className="relative flex items-center justify-center">
            {/* Pulsing effect for the badge */}
            <div className="absolute inset-0 rounded-full bg-white animate-ping opacity-20 scale-150" style={{ animationDuration: '2s' }} />
            <Check className={cn("stroke-[4.5px] relative z-10", style.icon, iconSizes[size])} />
        </div>

        <AnimatePresence>
          {displayLabel && (
            <motion.span
              initial={{ opacity: 0, x: -5, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "auto" }}
              exit={{ opacity: 0, x: -5, width: 0 }}
              className="text-[9px] font-black uppercase tracking-tighter text-white pr-1 whitespace-nowrap"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
