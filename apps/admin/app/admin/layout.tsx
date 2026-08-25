"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Search, Bell, User, Rss, UserSquare2, BookOpen, ScrollText, Sparkles, FileText, HelpCircle, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ROOT_ADMIN_EMAILS = [
  "viniciuscirne@gmail.com",
  "agenciaiconedigital@gmail.com",
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

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
      <div className="flex h-screen w-screen items-center justify-center bg-[#0e1117] text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-whatsapp-teal/20 border border-whatsapp-teal/30 flex items-center justify-center text-whatsapp-teal animate-pulse">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-200">Painel Administrativo</h3>
            <p className="text-xs text-gray-400 mt-1">Verificando credenciais de acesso...</p>
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
    <div className="flex h-screen overflow-hidden bg-whatsapp-light dark:bg-whatsapp-dark">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-whatsapp-darkLighter px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 flex-1 overflow-visible">
            <div className="relative w-full max-w-[160px] xl:max-w-[200px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar..."
                className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-full pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-whatsapp-green transition-all"
              />
            </div>

            {/* Links Rápidos (Abas Sobrepostas) */}
            <nav className="hidden lg:flex items-center pl-4 pt-1">
              {[
                { name: 'Notas', href: '/notes', icon: BookOpen },
                { name: 'Bíblia', href: '/bible', icon: ScrollText },
                { name: 'Versículo', href: '/admin/mensagem-do-dia', icon: Sparkles },
                { name: 'Páginas', href: '/admin/pages', icon: FileText },
                { name: 'FAQ', href: '/admin/faq', icon: HelpCircle },
              ].map((link, index) => (
                <Link
                  key={link.name}
                  href={link.href}
                  style={{ zIndex: 10 - index }}
                  className="relative flex items-center gap-1.5 px-4 py-2 -ml-3 first:ml-0 bg-gray-100 dark:bg-white/5 border-2 border-white dark:border-whatsapp-darkLighter rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-gray-500 hover:text-whatsapp-teal hover:bg-white dark:hover:bg-white/10 hover:-translate-y-0.5 hover:z-20 transition-all shadow-sm"
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Feed Social + Meu Perfil — atalhos rápidos */}
            <div className="flex items-center gap-1 border-r border-gray-200 dark:border-white/10 pr-4 mr-0">
              <Link href="/" title="Feed Social" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-whatsapp-teal transition-colors">
                <Rss className="w-5 h-5" />
              </Link>
              <Link href="/profile" title="Meu Perfil" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-whatsapp-teal transition-colors">
                <UserSquare2 className="w-5 h-5" />
              </Link>
            </div>
            <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-whatsapp-green rounded-full border-2 border-white dark:border-whatsapp-darkLighter" />
            </button>
            <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-2" />
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold dark:text-white truncate max-w-[150px]">
                  {currentUser?.email || 'Admin FéConecta'}
                </p>
                <p className="text-[11px] text-gray-500">Superusuário</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-whatsapp-teal flex items-center justify-center border-2 border-whatsapp-green/20">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
