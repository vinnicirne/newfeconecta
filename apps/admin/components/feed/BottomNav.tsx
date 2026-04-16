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
  Search,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import MobilePostSheet from "./MobilePostSheet";
import { supabase } from "@/lib/supabase";

export default function BottomNav() {
  const pathname = usePathname();
  const [isPostSheetOpen, setIsPostSheetOpen] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);

  // Esconde a nav em páginas de autenticação e legais
  const hiddenRoutes = ["/login", "/register", "/terms", "/privacy", "/messages"];
  const isHidden = hiddenRoutes.includes(pathname);

  React.useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single();
        
        setUser({ ...session.user, avatar_url: profile?.avatar_url });
      }
    }).catch(err => {
      if (err?.message?.includes('lock') || err?.message?.includes('steal')) return;
      console.error("Auth session error:", err);
    });
  }, []);

  if (isHidden) return null;

  const navItems = [
    { id: 'home', icon: Home, href: "/", label: "Home" },
    { id: 'explore', icon: Search, href: "/explore", label: "Busca" },
    { id: 'post', icon: PlusSquare, href: "#", label: "Postar", action: () => setIsPostSheetOpen(true) },
    { id: 'lumes', icon: Flame, href: "/lumes", label: "Lumes" },
    { id: 'profile', icon: UserCircle2, href: "/profile", label: "Perfil" },
  ];

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#080808]/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 py-3 z-[100] px-4 pb-6">
      <div className="flex items-center justify-around w-full">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname === item.href;
          const Icon = item.icon;
          
          if (item.action) {
            return (
              <div key={item.id} className="relative -mt-10">
                <button 
                  onClick={item.action}
                  className="w-14 h-14 rounded-2xl bg-whatsapp-teal text-white flex items-center justify-center shadow-xl shadow-whatsapp-teal/40 active:scale-95 transition-all border-4 border-white dark:border-[#080808]"
                >
                  <Icon className="w-7 h-7" />
                </button>
              </div>
            );
          }

          return (
            <Link 
              key={item.id} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[50px] transition-all active:scale-90",
                isActive ? "text-whatsapp-teal dark:text-whatsapp-green" : "text-gray-400"
              )}
            >
              {item.label === "Perfil" ? (
                <div className={cn(
                  "w-9 h-9 rounded-xl overflow-hidden border-2 transition-all shadow-sm",
                  isActive ? "border-whatsapp-teal scale-110 shadow-whatsapp-teal/20" : "border-gray-200 dark:border-white/10"
                )}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
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
