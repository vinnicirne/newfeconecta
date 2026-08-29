"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, Wallet, PlusCircle, LayoutDashboard, Receipt, ArrowLeft } from "lucide-react";
import clsx from "clsx";

interface PartnerNavProps {
  saldoDisponivel?: string;
}

export function PartnerNavbar({ saldoDisponivel }: PartnerNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/campanha", label: "FéAds", icon: LayoutDashboard, exact: true },
    { href: "/campanha/nova", label: "Nova Campanha", icon: PlusCircle },
    { href: "/campanha/carteira", label: "Carteira", icon: Wallet },
    { href: "/campanha/pagamentos", label: "Extrato", icon: Receipt },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex items-center gap-6">
          <Link
            href="/campanha"
            className="flex items-center gap-2.5 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Megaphone className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">FéConecta</span>
              <span className="ml-1.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                Parceiros
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const isActive = link.exact
                ? pathname === link.href
                : pathname?.startsWith(link.href);
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

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm"
            title="Retornar à página principal da rede social"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-emerald-400" />
            <span>Voltar ao Feed</span>
          </Link>

          {saldoDisponivel && (
            <Link
              href="/campanha/carteira"
              className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>Saldo: {saldoDisponivel}</span>
            </Link>
          )}

          <Link
            href="/campanha/nova"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Criar Campanha</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
