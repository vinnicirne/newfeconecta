"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Layers, BarChart3, Receipt, Wallet, ArrowLeft } from "lucide-react";
import clsx from "clsx";

export function AdminAdsNavbar() {
  const pathname = usePathname();

  const links = [
    { href: "/ads", label: "Fila de Moderação", icon: Layers, exact: true },
    { href: "/ads/carteira", label: "Fila de Reembolsos", icon: Wallet },
    { href: "/ads/desempenho", label: "Desempenho Global", icon: BarChart3 },
    { href: "/ads/pagamentos", label: "Recargas & Config", icon: Receipt },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Painel Geral Admin</span>
          </Link>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">FéConecta Ads</span>
              <span className="ml-1.5 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                Admin
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const isActive = link.exact
                ? pathname === link.href || pathname === `/admin${link.href}`
                : pathname?.startsWith(link.href) || pathname?.startsWith(`/admin${link.href}`);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all",
                    isActive
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <Link
            href="/campanha"
            className="text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            Visualizar como Parceiro &rarr;
          </Link>
        </div>
      </div>
    </header>
  );
}
