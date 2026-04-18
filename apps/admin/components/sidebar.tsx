"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Rss,
  ClipboardList, 
  MessageSquare, 
  ShieldAlert, 
  Settings, 
  CreditCard,
  Target,
  Palette,
  Wrench,
  FileText,
  Activity,
  History,
  HelpCircle,
  Menu,
  ChevronLeft,
  UserSquare2,
  LogOut,
  ShieldCheck,
  ScrollText,
  Cookie,
  Megaphone,
  Mic,
  BookOpen,
  Sparkles,
  Bell,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const menuItems: any[] = [
  // ── PLATAFORMA ─────────────────────────────
  { type: 'divider', label: 'Plataforma' },
  { name: "Meu Diário", icon: BookOpen, href: "/notes" },
  { name: "Bíblia Sagrada", icon: ScrollText, href: "/bible" },

  // ── PAINEL ADMIN ───────────────────────────
  { type: 'divider', label: 'Painel Admin' },
  { name: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { name: "Usuários", icon: Users, href: "/admin/users" },
  { name: "Verificações", icon: ShieldCheck, href: "/admin/verifications" },
  { name: "Moderação de Posts", icon: MessageSquare, href: "/admin/posts" },
  { name: "Denúncias", icon: ShieldAlert, href: "/admin/reports" },
  { name: "Salas de Guerra", icon: Mic, href: "/admin/rooms" },

  // ── CONTEÚD0 ────────────────────────────────
  { type: 'divider', label: 'Conteúdo' },
  { name: "Versículo do Dia", icon: Sparkles, href: "/admin/mensagem-do-dia" },
  { name: "Notificações Push", icon: Bell, href: "/admin/push" },
  { name: "Páginas", icon: FileText, href: "/admin/pages" },
  { name: "FAQ", icon: HelpCircle, href: "/admin/faq" },

  // ── MONETIZAÇÃO ─────────────────────────────
  { type: 'divider', label: 'Monetização' },
  { name: "Painel Monetização", icon: CreditCard, href: "/admin/monetization" },
  { name: "Configurar Valores", icon: DollarSign, href: "/admin/pricing" },
  { name: "Recursos PRO", icon: Target, href: "/admin/pro-features" },

  // ── SISTEMA ──────────────────────────────────
  { type: 'divider', label: 'Sistema' },
  { name: "Design", icon: Palette, href: "/admin/design" },
  { name: "Ferramentas", icon: Wrench, href: "/admin/tools" },
  { name: "Configurações API", icon: Settings, href: "/admin/api-settings" },
  { name: "Monitoramento", icon: Activity, href: "/admin/monitoramento" },
  { name: "Status do Sistema", icon: Activity, href: "/admin/status" },
  { name: "Registro Alterações", icon: History, href: "/admin/changelog" },

  // ── LEGAL ────────────────────────────────────
  // Páginas gerenciadas em /admin/pages
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const [adminProfile, setAdminProfile] = React.useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => setAdminProfile(data || user));
      }
    }).catch(() => { /* lock collision ignorável do GoTrue */ });
  }, []);

  return (
    <div 
      className={cn(
        "relative h-screen bg-whatsapp-dark text-white transition-all duration-300 flex flex-col border-r border-white/10",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-whatsapp-green flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-whatsapp-dark">F</span>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">FéConecta</span>
            <span className="text-[10px] text-whatsapp-green uppercase tracking-wider">Um lugar de adoração</span>
          </div>
        )}
      </div>

      {/* Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-whatsapp-teal p-1 rounded-full border border-white/10 hover:bg-whatsapp-tealLight transition-colors"
      >
        <ChevronLeft className={cn("w-4 h-4 transition-transform", isCollapsed && "rotate-180")} />
      </button>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menuItems.map((item) => {
          if (item.type === 'divider') {
            return isCollapsed
              ? <div key={item.label} className="h-px bg-white/5 mx-2 my-2" />
              : <p key={item.label} className="px-3 pt-5 pb-1 text-[9px] font-black uppercase tracking-widest text-white/30">{item.label}</p>;
          }
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group",
                isActive 
                  ? "bg-whatsapp-teal text-white shadow-lg" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 flex-shrink-0",
                isActive ? "text-whatsapp-green" : "group-hover:text-whatsapp-green"
              )} />
              {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 space-y-2">
         <div className={cn(
           "flex items-center gap-3 p-2 rounded-lg bg-white/5",
           isCollapsed ? "justify-center" : ""
         )}>
           <div className="w-8 h-8 rounded-md bg-whatsapp-tealLight flex-shrink-0 overflow-hidden">
             {adminProfile?.avatar_url && <img src={adminProfile.avatar_url} className="w-full h-full object-cover" alt="" />}
           </div>
           {!isCollapsed && (
             <div className="flex flex-col overflow-hidden">
               <span className="text-xs font-medium truncate">{adminProfile?.full_name || adminProfile?.email || 'Conectando...'}</span>
               <span className="text-[10px] text-gray-400 truncate">{adminProfile?.username ? `@${adminProfile.username}` : (adminProfile?.email || 'Aguarde')}</span>
             </div>
           )}
         </div>

         <button 
           onClick={handleLogout}
           className={cn(
             "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-all",
             isCollapsed ? "justify-center" : ""
           )}
         >
           <LogOut className="w-5 h-5 flex-shrink-0" />
           {!isCollapsed && <span className="text-sm font-medium">Sair da Conta</span>}
         </button>
      </div>
    </div>
  );
}
