"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PlusSquare,
  Mic,
  UserCircle2,
  Bell,
  Swords,
  Flame,
  Music,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import MobilePostSheet from "./MobilePostSheet";
import { supabase } from "@/lib/supabase";

export default function BottomNav() {
  const pathname = usePathname();
  const [isPostSheetOpen, setIsPostSheetOpen] = React.useState(false);
  const [user, setUser] = React.useState<any>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fc_profile_cache');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });

  // Esconde a nav em páginas de autenticação e legais
  const hiddenRoutes = ["/login", "/register", "/terms", "/privacy", "/messages"];
  const isHidden = hiddenRoutes.includes(pathname) || pathname.includes('/celula/');

  React.useEffect(() => {
    // Listener para hidratação vinda do AuthGuard
    const handleHydration = (e: any) => {
      setUser((prev: any) => ({ ...prev, ...e.detail }));
    };
    window.addEventListener('profile-hydrated', handleHydration);

    return () => window.removeEventListener('profile-hydrated', handleHydration);
  }, []);

  if (isHidden) return null;

  const navItems = [
    { id: 'home', icon: Home, href: "/", label: "Home" },
    { id: 'room', icon: Swords, href: "/room", label: "Sala" },
    { id: 'post', icon: PlusSquare, href: "#", label: "Postar", action: () => setIsPostSheetOpen(true) },
    { id: 'tribo', icon: Flame, href: "/tribo", label: "Tribo" },
    { id: 'profile', icon: UserCircle2, href: "/profile", label: "Perfil" },
  ];

  return (
    <>
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-t border-gray-100 dark:border-white/5 z-[100] px-6 pt-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 56px)' }}
      >
        <div className="flex items-center justify-between w-full max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname === item.href;
            const Icon = item.icon;

            if (item.action) {
              return (
                <div key={item.id} className="relative -mt-12">
                  <button
                    onClick={item.action}
                    className="w-16 h-16 rounded-full bg-whatsapp-teal text-white flex items-center justify-center shadow-2xl shadow-whatsapp-teal/40 active:scale-90 transition-all border-4 border-white dark:border-black"
                  >
                    <PlusSquare className="w-8 h-8" />
                  </button>
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[40px] transition-all active:scale-90",
                  isActive ? "text-whatsapp-teal dark:text-whatsapp-green" : "text-gray-400"
                )}
              >
                {item.label === "Perfil" ? (
                  <div className={cn(
                    "w-9 h-9 rounded-xl overflow-hidden border-2 transition-all shadow-sm",
                    isActive ? "border-whatsapp-teal scale-110 shadow-whatsapp-teal/20" : "border-gray-200 dark:border-white/10"
                  )}>
                    {user?.avatar_url && !user.avatar_url.includes('vercel.sh') ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-emerald-600 flex items-center justify-center text-white text-[10px] font-black uppercase shadow-inner">
                        {(() => {
                          const name = user?.full_name || user?.username || "U";
                          const parts = name.trim().split(/\s+/);
                          return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase();
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <Icon className={cn("w-6 h-6", isActive && item.id === "home" && "fill-current")} />
                )}
                <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter opacity-80">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <MobilePostSheet
        open={isPostSheetOpen}
        onClose={() => setIsPostSheetOpen(false)}
        user={user}
      />
    </>
  );
}
