"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Search, Bell, User, Rss, UserSquare2, Loader2, ShieldCheck, Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ROOT_ADMIN_EMAILS = [
  "viniciuscirne@gmail.com",
  "agenciaiconedigital@gmail.com",
];

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Alternar modo claro e escuro"
      title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
      className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
    </button>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (isMounted) {
            router.replace('/login?redirect=/admin');
          }
          return;
        }

        const userEmail = (session.user.email || '').toLowerCase();
        setCurrentUser(session.user);

        // 1. Acesso prioritário direto para e-mails de administradores raiz
        if (ROOT_ADMIN_EMAILS.includes(userEmail)) {
          if (isMounted) {
            setIsAuthorized(true);
            setIsLoading(false);
          }
          return;
        }

        // 2. Consulta a role no perfil
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
          if (isMounted) {
            setIsAuthorized(true);
            setIsLoading(false);
          }
        } else {
          console.warn('[Admin Guard] Acesso negado para:', userEmail, profile?.role);
          if (isMounted) {
            toast.error('Acesso restrito', {
              description: 'Sua conta não possui permissão de administrador.',
            });
            router.replace('/');
          }
        }
      } catch (err) {
        console.error('[Admin Guard] Erro na verificação:', err);
        if (isMounted) {
          router.replace('/login?redirect=/admin');
        }
      }
    }

    checkAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-whatsapp-teal/20 border border-whatsapp-teal/30 flex items-center justify-center text-whatsapp-teal animate-pulse">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Painel Administrativo</h3>
            <p className="text-xs text-muted-foreground mt-1">Verificando credenciais de acesso...</p>
          </div>
          <Loader2 className="w-5 h-5 text-whatsapp-teal animate-spin mt-2" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {/* Drawer Mobile / Tablet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)} 
          />
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-10 flex flex-col bg-card border-r border-border">
            <div className="absolute right-3 top-4 z-20">
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} isMobile />
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Minimalista */}
        <header className="h-16 shrink-0 border-b border-border bg-card/80 backdrop-blur px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 z-10">
          {/* Lado Esquerdo: Botão Mobile + Busca */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação"
              className="lg:hidden grid h-9 w-9 place-items-center rounded-lg border border-border bg-muted/50 text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar usuários, igrejas, posts, denúncias..."
                className="w-full bg-muted/60 border border-border rounded-lg pl-9 pr-12 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green focus:border-whatsapp-green transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                ⌘K
              </span>
            </div>
          </div>
          
          {/* Lado Direito: Status Ao Vivo + ThemeToggle + Atalhos + Perfil */}
          <div className="flex items-center gap-3">
            {/* Status Ao Vivo */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Painel Ativo</span>
            </div>

            {/* Alternador de Tema Dark / Light */}
            <ThemeToggle />

            {/* Atalhos Rápidos para a Aplicação */}
            <div className="flex items-center gap-1 border-x border-border px-2">
              <Link 
                href="/" 
                title="Feed Social da Comunidade" 
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Rss className="h-4 w-4" />
              </Link>
              <Link 
                href="/profile" 
                title="Meu Perfil" 
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <UserSquare2 className="h-4 w-4" />
              </Link>
            </div>

            {/* Identificação do Administrador */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="h-8 w-8 rounded-full bg-whatsapp-teal text-white flex items-center justify-center text-xs font-bold border border-whatsapp-green/30 shadow-sm shrink-0">
                {(currentUser?.email || "A")[0]?.toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight text-left">
                <div className="text-xs font-medium text-foreground truncate max-w-[140px]">
                  {currentUser?.email?.split("@")[0] || "Administrador"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Admin Master
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Área Principal de Conteúdo */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
