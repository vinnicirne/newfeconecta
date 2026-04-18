"use client";

import React from "react";
import Link from "next/link";
import { 
  X, 
  BookOpen, 
  UserSquare2, 
  LayoutDashboard, 
  Settings, 
  ShieldCheck, 
  ScrollText, 
  LogOut,
  Flame,
  ChevronRight,
  ShieldQuestion,
  Star,
  Sparkles,
  Home,
  Mic,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  user: any;
}

export default function MobileMenu({ open, onClose, user }: MobileMenuProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    onClose();
  };

  if (!open) return null;

  const menuItems = [
    { name: "Deus Falou", icon: Sparkles, href: "/dfch", color: "text-whatsapp-teal", bg: "bg-whatsapp-teal/10" },
    { name: "Meu Diário", icon: BookOpen, href: "/notes", color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "Bíblia Sagrada", icon: ScrollText, href: "/bible", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Meu Perfil", icon: UserSquare2, href: user?.username ? `/profile/${user.username}` : "/profile", color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Dashboard", icon: LayoutDashboard, href: "/admin", color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  const legalItems = [
    { name: "Sobre Nós", icon: ShieldQuestion, href: "/about" },
    { name: "Privacidade", icon: ShieldCheck, href: "/privacy" },
    { name: "Termos", icon: ScrollText, href: "/terms" },
  ];

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute top-0 left-0 bottom-0 w-[80%] max-w-sm bg-white dark:bg-whatsapp-dark shadow-2xl animate-in slide-in-from-left duration-500 ease-out flex flex-col">
        
        {/* Profile Section */}
        <div className="p-6 pt-12 pb-8 bg-gradient-to-br from-whatsapp-teal to-emerald-700 relative overflow-hidden">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 text-white"
          >
            <X size={20} />
          </button>

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 p-1 backdrop-blur-md">
              {user?.avatar_url ? (
                <img src={user.avatar_url} className="w-full h-full object-cover rounded-xl" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/10 rounded-xl">
                  <UserSquare2 className="text-white w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white leading-tight">
                {user?.full_name || user?.email?.split('@')[0] || "Irmão(ã)"}
              </span>
              <span className="text-xs text-white/70 font-medium">#{user?.username || "usuario"}</span>
            </div>
          </div>
          <Flame className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 rotate-12" />
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div className="space-y-1">
            <label className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Principal</label>
            {menuItems.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-active:scale-90", item.bg)}>
                    <item.icon className={cn("w-5 h-5", item.color)} />
                  </div>
                  <span className="font-bold text-gray-700 dark:text-gray-200">{item.name}</span>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
            ))}
          </div>

          <div className="space-y-1">
            <label className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Informações</label>
            {legalItems.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-500" />
                  </div>
                  <span className="font-semibold text-gray-600 dark:text-gray-300">{item.name}</span>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold"
          >
            <LogOut size={20} />
            Sair da Conta
          </button>
          
          <div className="mt-4 text-center">
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">FéConecta v1.0.5</span>
          </div>
        </div>

      </div>
    </div>
  );
}
