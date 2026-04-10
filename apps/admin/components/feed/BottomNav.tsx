"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  PlusSquare, 
  PlaySquare, 
  ShoppingBag, 
  UserCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import MobilePostSheet from "./MobilePostSheet";
import { supabase } from "@/lib/supabase";

export default function BottomNav() {
  const pathname = usePathname();
  const [isPostSheetOpen, setIsPostSheetOpen] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user);
    });
  }, []);

  const navItems = [
    { icon: Home, href: "/", label: "Home" },
    { icon: PlaySquare, href: "/lumes", label: "Lumes" },
    { icon: PlusSquare, href: "#", label: "Postar", action: () => setIsPostSheetOpen(true) },
    { icon: ShoppingBag, href: "/shop", label: "Loja" },
    { icon: UserCircle2, href: "/profile", label: "Perfil" },
  ];

  return (
    <>
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-whatsapp-dark/80 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 px-6 py-3 z-[100]">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          if (item.action) {
            return (
              <div key={item.label} className="relative -mt-8">
                <button 
                  onClick={item.action}
                  className="w-14 h-14 rounded-2xl bg-whatsapp-teal text-white flex items-center justify-center shadow-xl shadow-whatsapp-teal/40 active:scale-90 transition-all border-4 border-white dark:border-whatsapp-dark"
                >
                  <Icon className="w-7 h-7" />
                </button>
              </div>
            );
          }

          return (
            <Link 
              key={item.label} 
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-90",
                isActive ? "text-whatsapp-teal dark:text-whatsapp-green" : "text-gray-400"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
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
