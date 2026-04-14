"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const PUBLIC_ROUTES = ["/login", "/register"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { requestPermission, listenToForegroundMessages } = usePushNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        const user = session?.user;

        if (error) throw error;

        const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

        if (!user) {
          if (!isPublicRoute) {
            router.replace("/login");
            setAuthorized(false);
          } else {
            setAuthorized(true);
          }
        } else {
          // Usuário logado: Garantir registro de Push
          if (!isPublicRoute) {
            requestPermission(user.id);
            listenToForegroundMessages();
          }

          if (isPublicRoute) {
            router.replace("/");
            setAuthorized(false);
          } else {
            setAuthorized(true);
          }
        }
      } catch (err) {
        // Erro silencioso para rotas públicas (usuário não logado é esperado aqui)
        const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

        if (!isPublicRoute) {
          // REMOVIDO: signOut agressivo para evitar deslogar usuário por erro de rede
          router.replace("/login");
          setAuthorized(false);
        } else {
          setAuthorized(true);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listener para mudanças de estado (Ex: Logout em outra aba)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace("/login");
        setAuthorized(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!mounted || loading) {
    return (
      <div className="fixed inset-0 bg-whatsapp-dark flex flex-col items-center justify-center z-[9999]">
        <div className="w-16 h-16 rounded-full bg-whatsapp-teal/10 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-whatsapp-teal animate-spin" />
        </div>
        <span className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] animate-pulse">Carregando...</span>
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
}
