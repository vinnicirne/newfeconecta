'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music, Search, Compass, Library } from 'lucide-react';
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
      <div className="flex items-center justify-between px-2 pt-2 pb-2 overflow-x-auto no-scrollbar max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center min-w-[60px] transition-all active:scale-90 outline-none",
                isActive 
                  ? "text-whatsapp-teal dark:text-whatsapp-green" 
                  : "text-gray-400"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon className={cn("w-6 h-6", isActive && item.id === "home" && "fill-current")} />
              <span className={cn(
                "text-[9px] font-bold mt-1 uppercase tracking-tighter",
                !isActive && "opacity-80"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
