'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music, Search, Library, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MusicTopNav() {
  const pathname = usePathname();

  const navItems = [
    { id: 'home', href: '/music', icon: Music, label: 'Músicas', exact: true },
    { id: 'search', href: '/music/search', icon: Search, label: 'Pesquisar' },
    { id: 'library', href: '/music/library', icon: Library, label: 'Biblioteca' },
  ];

  return (
    <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-100 dark:border-white/10 pt-[env(safe-area-inset-top)]">
      {/* BETA Banner */}
      <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-amber-400/20">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-400 text-black shadow-sm shrink-0">
          BETA
        </span>
        <span className="text-[9px] sm:text-[10px] text-amber-700 dark:text-amber-400 font-medium truncate">
          Fase de testes &bull; Algumas m&uacute;sicas podem falhar
        </span>
      </div>

      {/* Nav row com botão de voltar */}
      <div className="flex items-center px-3 pt-2 pb-1.5 max-w-lg mx-auto gap-2">

        {/* Botão voltar ao Feed */}
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-whatsapp-teal transition-all shrink-0"
          title="Voltar ao Feed"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-tight hidden sm:block">Feed</span>
        </Link>

        {/* Nav items com indicador animado */}
        <div className="flex flex-1 items-center justify-around relative">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center py-1 min-w-[60px] transition-all active:scale-90 outline-none",
                  isActive
                    ? "text-whatsapp-teal dark:text-whatsapp-green font-black"
                    : "text-gray-400 font-medium"
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Icon className={cn("w-5 h-5", isActive && item.id === "home" && "fill-current")} />
                <span className={cn(
                  "text-[10px] mt-0.5 uppercase tracking-tight",
                  !isActive && "opacity-75"
                )}>
                  {item.label}
                </span>

                {/* Underline animado */}
                {isActive && (
                  <motion.div
                    layoutId="activeMusicTab"
                    className="absolute -bottom-1.5 inset-x-3 h-0.5 bg-whatsapp-teal rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
