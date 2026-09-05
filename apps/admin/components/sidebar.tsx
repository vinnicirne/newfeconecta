"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  ShieldAlert, 
  Settings, 
  CreditCard, 
  Target, 
  Wrench, 
  FileText, 
  Activity, 
  History, 
  LogOut, 
  ShieldCheck, 
  Megaphone, 
  Mic, 
  Sparkles, 
  Bell, 
  DollarSign, 
  Church, 
  Mail,
  ChevronRight,
  BookOpen,
  Music,
  Gamepad2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { TrustedSiteBadge } from "@/components/TrustedSiteBadge";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "pendingReports" | "pendingVerifications" | "pendingCampaigns";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Gestão de Igrejas", href: "/admin/churches", icon: Church },
      { name: "Usuários", href: "/admin/users", icon: Users },
      { name: "Verificações", href: "/admin/verifications", icon: ShieldCheck, badgeKey: "pendingVerifications" },
    ],
  },
  {
    label: "Moderação & Conteúdo",
    items: [
      { name: "Waroom (Incidentes)", href: "/admin/waroom", icon: ShieldAlert },
      { name: "Moderação de Posts", href: "/admin/posts", icon: MessageSquare },
      { name: "Denúncias", href: "/admin/reports", icon: ShieldAlert, badgeKey: "pendingReports" },
      { name: "Campanhas Ads", href: "/ads", icon: Megaphone, badgeKey: "pendingCampaigns" },
      { name: "Salas de Oração", href: "/admin/rooms", icon: Mic },
      { name: "Mensagem do Dia", href: "/admin/mensagem-do-dia", icon: Sparkles },
      { name: "Bíblia Sagrada", href: "/admin/bible", icon: BookOpen },
      { name: "FéMusic (Louvores)", href: "/admin/music", icon: Music },
      { name: "Jogos & Quiz", href: "/jogos", icon: Gamepad2 },
      { name: "Páginas Institucionais", href: "/admin/pages", icon: FileText },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { name: "Notificações Push", href: "/admin/push", icon: Bell },
      { name: "Sistema de E-mails", href: "/admin/emails", icon: Mail },
      { name: "Marketing & Avisos", href: "/admin/marketing", icon: Megaphone },
    ],
  },
  {
    label: "Gestão & Sistema",
    items: [
      { name: "Monetização & Planos", href: "/admin/monetization", icon: CreditCard },
      { name: "Configurar Valores", href: "/admin/pricing", icon: DollarSign },
      { name: "Recursos PRO", href: "/admin/pro-features", icon: Target },
      { name: "Configurações API", href: "/admin/api-settings", icon: Settings },
      { name: "Monitoramento", href: "/admin/monitoramento", icon: Activity },
      { name: "Registro Alterações", href: "/admin/changelog", icon: History },
      { name: "Documentação", href: "/docs", icon: FileText },
    ],
  },
];

interface SidebarProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ onNavigate, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [badges, setBadges] = useState<{ pendingReports: number; pendingVerifications: number; pendingCampaigns: number }>({
    pendingReports: 0,
    pendingVerifications: 0,
    pendingCampaigns: 0,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setAdminProfile(data || user));
      }
    }).catch(() => {});

    const fetchBadges = async () => {
      try {
        const [{ count: reportsCount }, { count: verificationsCount }, { count: campaignsCount }] = await Promise.all([
          supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "pendente"),
        ]);

        setBadges({
          pendingReports: reportsCount || 0,
          pendingVerifications: verificationsCount || 0,
          pendingCampaigns: campaignsCount || 0,
        });
      } catch (err) {
        // Silencioso caso a tabela/política tenha outro nome
      }
    };

    fetchBadges();

    // Listener Realtime para novas campanhas enviadas para análise
    const campaignsChannel = supabase
      .channel("sidebar-campaigns-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        () => {
          fetchBadges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(campaignsChannel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className={cn(
      "flex h-full flex-col bg-card border-r border-border text-foreground select-none transition-colors",
      isMobile ? "w-full" : "w-64"
    )}>
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-5 shrink-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-whatsapp-tealLight to-whatsapp-green font-bold text-white shadow-md shadow-whatsapp-green/10">
          <span className="text-sm font-black">Fé</span>
        </div>
        <div className="leading-tight overflow-hidden">
          <div className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
            <span>FéConecta</span>
            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-whatsapp-teal/15 text-whatsapp-teal dark:text-whatsapp-green border border-whatsapp-green/20">
              Admin
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            Painel de Controle
          </p>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navigationGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
                const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-all group relative",
                        isActive
                          ? "bg-whatsapp-teal/15 text-whatsapp-teal dark:bg-whatsapp-teal/25 dark:text-whatsapp-green font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-whatsapp-teal dark:text-whatsapp-green" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      <span className="truncate flex-1">{item.name}</span>
                      
                      {badgeCount > 0 ? (
                        <span className="ml-auto rounded-full bg-red-500/15 border border-red-500/30 px-1.5 py-0.2 text-[10px] font-bold text-red-500">
                          {badgeCount}
                        </span>
                      ) : isActive ? (
                        <ChevronRight className="h-3 w-3 opacity-60 ml-auto" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Telemetria & Status Card */}
      <div className="p-3 border-t border-border space-y-2.5 shrink-0 bg-card">
        <div className="rounded-lg bg-muted/40 p-2.5 border border-border">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-whatsapp-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-whatsapp-green"></span>
              </span>
              Infraestrutura
            </span>
            <span className="text-[10px] font-bold text-whatsapp-teal dark:text-whatsapp-green bg-whatsapp-green/10 px-1.5 py-0.5 rounded">
              99.98%
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[99%] rounded-full bg-whatsapp-green" />
          </div>
        </div>

        {/* Selo TrustedSite */}
        <TrustedSiteBadge isCollapsed={false} />

        {/* Perfil & Logout */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-whatsapp-teal/20 text-whatsapp-teal dark:text-whatsapp-green border border-border flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
              {adminProfile?.avatar_url ? (
                <Image 
                  src={adminProfile.avatar_url} 
                  width={32} 
                  height={32} 
                  unoptimized
                  className="w-full h-full object-cover" 
                  alt="" 
                />
              ) : (
                <span>{(adminProfile?.full_name || "A")[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="leading-none truncate min-w-0">
              <div className="text-xs font-medium text-foreground truncate">
                {adminProfile?.full_name || "Administrador"}
              </div>
              <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                {adminProfile?.email || "Admin Master"}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sair da Conta"
            aria-label="Sair da Conta"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
